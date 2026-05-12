'use client';

import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react';
import { authClient } from '@/lib/auth-client';
import { ERP_SECTION_KEYS, POS_SECTION_KEYS } from '@/lib/sections';
import { useRouter } from 'next/navigation';

export type Role = string | null;

export interface User {
	id: string;
	email: string;
	name?: string;
	role: Role;
	roleLabel?: string;
	allowedSections: string[];
}

interface AuthContextType {
	user: User | null;
	loading: boolean;
	logout: () => void;
	hasSection: (key: string) => boolean;
	refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	logout: () => {},
	hasSection: () => false,
	refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const session = authClient.useSession();
	const [user, setUser] = useState<User | null>(null);
	const [sectionsLoaded, setSectionsLoaded] = useState(false);
	const router = useRouter();

	const loading =
		session.isPending ||
		session.isRefetching ||
		(!!session.data?.user && !sectionsLoaded);

	const fetchSections = useCallback(async () => {
		setSectionsLoaded(false);
		try {
			const apiBase = process.env.NEXT_PUBLIC_API_URL?.trim();
			if (!apiBase) {
				setSectionsLoaded(true);
				return;
			}
			const origin = apiBase.replace(/\/api\/?$/, '');
			const url = `${origin}/api/auth/me`;
			console.log('fetching user sections from', url);
			const res = await fetch(url, { credentials: 'include' });
			if (!res.ok) {
				setUser(null);
				setSectionsLoaded(true);
				return;
			}
			const data = await res.json();
			console.log('fetched user data', data);
			setUser({
				id: data._id || data.id,
				email: data.email,
				name: data.name,
				role: data.role || null,
				roleLabel: data.roleLabel,
				allowedSections: data.allowedSections ?? [],
			});
		} catch {
			setUser(null);
		} finally {
			setSectionsLoaded(true);
		}
	}, []);

	useEffect(() => {
		if (session.isPending) return;
		if (session.data?.user) {
			console.log('calling fetch sessions');
			fetchSections();
			return;
		}
		// Avoid treating "no session" during a refetch (e.g. right after navigation)
		// as logged out — that was forcing a second login.
		if (!session.isRefetching) {
			setUser(null);
			setSectionsLoaded(true);
		}
	}, [session.data, session.isPending, session.isRefetching, fetchSections]);

	useEffect(() => {
		console.log('useSession debug:', {
			isPending: session.isPending,
			hasUser: !!session.data?.user,
			data: session.data,
		});

		if (session.isPending) {
			console.log('Session pending, waiting...');
			return;
		}

		if (session.data?.user) {
			console.log('User exists, calling fetchSections');
			fetchSections();
			return;
		}

		console.log('No user in session');
	}, [session.data, session.isPending]);

	const logout = useCallback(async () => {
		await authClient.signOut();
		setUser(null);
		setSectionsLoaded(false);
		router.push('/sign-in');
	}, [router]);

	const hasSection = useCallback(
		(key: string): boolean => {
			if (!user) return false;
			if (user.role === 'admin') return true;
			return user.allowedSections?.includes(key) ?? false;
		},
		[user],
	);

	const refreshUser = useCallback(async () => {
		await fetchSections();
	}, [fetchSections]);

	useEffect(() => {
		console.log('Session data:', JSON.stringify(session.data));
	}, [session.data]);

	return (
		<AuthContext.Provider
			value={{ user, loading, logout, hasSection, refreshUser }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
