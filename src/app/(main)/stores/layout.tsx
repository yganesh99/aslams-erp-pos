'use client';

import SectionGuard from '@/components/SectionGuard';

export default function StoresLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SectionGuard requiredSection="stores">
			<div className='min-w-0 w-full space-y-8'>{children}</div>
		</SectionGuard>
	);
}
