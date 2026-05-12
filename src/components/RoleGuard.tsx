'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, Role } from '@/context/AuthContext';
import {
	getFirstAccessibleErpPath,
	getFirstAccessiblePosPath,
} from '@/lib/sections';
import type { SectionKey } from '@/lib/sections';

interface RoleGuardProps {
	children: React.ReactNode;
	allowedRoles?: Role[];
	requiredSections?: SectionKey[];
}

function getRedirectPath(hasSection: (key: string) => boolean): string {
	const erpPath = getFirstAccessibleErpPath((s) => hasSection(s));
	if (erpPath) return erpPath;
	const posPath = getFirstAccessiblePosPath((s) => hasSection(s));
	if (posPath) return posPath;
	return '/';
}

export default function RoleGuard({
	children,
	allowedRoles,
	requiredSections,
}: RoleGuardProps) {
	const { user, loading, hasSection } = useAuth();
	const router = useRouter();

	const hasSectionAccess = requiredSections
		? requiredSections.some((s) => hasSection(s))
		: true;

	const hasRoleAccess = allowedRoles
		? !!user && allowedRoles.includes(user.role)
		: true;

	const allowed = !!user && hasRoleAccess && hasSectionAccess;

	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.replace('/sign-in');
		} else if (!hasRoleAccess || !hasSectionAccess) {
			router.replace(getRedirectPath(hasSection));
		}
	}, [user, loading, hasRoleAccess, hasSectionAccess, hasSection, router]);

	if (loading || !allowed) {
		return (
			<div className='flex h-screen w-screen items-center justify-center'>
				<div className='h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-900 border-r-transparent' />
			</div>
		);
	}

	return <>{children}</>;
}
