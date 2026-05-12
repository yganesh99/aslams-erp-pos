'use client';

import SectionGuard from '@/components/SectionGuard';
import { ShieldAlert } from 'lucide-react';

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<SectionGuard requiredSection="settings">
			<div className='mx-auto w-full max-w-7xl space-y-8'>
				<div>
					<h2 className='text-3xl font-bold tracking-tight'>
						Settings
					</h2>
					<p className='text-zinc-500'>
						Manage your company details and system configuration.
					</p>
				</div>

				<div className='mb-4 px-3 py-2 bg-red-50 rounded-lg flex items-start space-x-2'>
					<ShieldAlert className='w-4 h-4 text-red-600 mt-0.5' />
					<div className='text-xs text-red-800 font-medium'>
						Admin access only. Changes here affect the entire system.
					</div>
				</div>

				<main>{children}</main>
			</div>
		</SectionGuard>
	);
}
