'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { SectionKey } from '@/lib/sections';
import { ERP_SECTION_KEYS, POS_SECTION_KEYS } from '@/lib/sections';

interface SectionGuardProps {
	children: React.ReactNode;
	requiredSection: SectionKey;
}

function getRedirectPath(allowedSections: string[]): string {
	if (allowedSections.some((s) => ERP_SECTION_KEYS.includes(s as SectionKey)))
		return '/dashboard';
	if (allowedSections.some((s) => POS_SECTION_KEYS.includes(s as SectionKey)))
		return '/pos';
	return '/';
}

export default function SectionGuard({
	children,
	requiredSection,
}: SectionGuardProps) {
	const { user, loading, hasSection } = useAuth();
	const router = useRouter();

	const allowed = !loading && !!user && hasSection(requiredSection);

	useEffect(() => {
		if (loading) return;
		if (!user) {
			router.replace('/sign-in');
		} else if (!hasSection(requiredSection)) {
			router.replace(getRedirectPath(user.allowedSections ?? []));
		}
	}, [user, loading, requiredSection, router, hasSection]);

	if (!allowed) {
		return (
			<div className='flex h-screen w-screen items-center justify-center'>
				<div className='h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-900 border-r-transparent' />
			</div>
		);
	}

	return <>{children}</>;
}
