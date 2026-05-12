'use client';

import Link from 'next/link';
import { Store, Monitor, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import {
	ERP_SECTION_KEYS,
	POS_SECTION_KEYS,
	getFirstAccessibleErpPath,
	getFirstAccessiblePosPath,
} from '@/lib/sections';
import { cn } from '@/lib/utils';

export default function AppSelection() {
	const [mounted, setMounted] = useState(false);
	const { user, loading, logout, hasSection } = useAuth();

	const hasPosAccess = POS_SECTION_KEYS.some((s) => hasSection(s));
	const hasErpAccess = ERP_SECTION_KEYS.some((s) => hasSection(s));
	const erpEntryPath =
		getFirstAccessibleErpPath((s) => hasSection(s)) ?? '/dashboard';
	const posEntryPath =
		getFirstAccessiblePosPath((s) => hasSection(s)) ?? '/registers';
	const visibleAppCount =
		(hasPosAccess ? 1 : 0) + (hasErpAccess ? 1 : 0);
	const router = useRouter();

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (mounted && !loading && !user) {
			const q = window.location.search;
			router.replace(`/sign-in${q}`);
		}
	}, [mounted, loading, user, router]);

	if (!mounted || loading || !user) return null;

	const appCardClassName = cn(
		'group bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm hover:shadow-md transition-all hover:border-black flex flex-col items-center text-center gap-6',
		visibleAppCount === 1 && 'w-full max-w-md',
	);

	return (
		<div className='min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans text-zinc-900'>
			<div className='text-center mb-10'>
				<div className='flex justify-center mb-2'>
					<BrandLogo
						className='h-12 w-auto max-w-[260px]'
						priority
					/>
				</div>
				<p className='text-zinc-500 font-medium tracking-wide'>
					Select an application to continue
				</p>
			</div>

			<div
				className={cn(
					'grid gap-6 w-full max-w-4xl',
					visibleAppCount === 1
						? 'grid-cols-1 justify-items-center'
						: 'grid-cols-1 md:grid-cols-2',
				)}
			>
				{/* POS App Card */}
				{hasPosAccess && (
					<Link href={posEntryPath} className={appCardClassName}>
						<div className='w-20 h-20 rounded-full bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center text-zinc-600'>
							<Store className='w-10 h-10' />
						</div>
						<div>
							<h2 className='text-2xl font-bold text-black mb-2'>
								Point of Sale
							</h2>
							<p className='text-zinc-500 text-sm'>
								Mobile-first checkout terminal for fast in-store
								transactions.
							</p>
						</div>
					</Link>
				)}

				{/* ERP App Card */}
				{hasErpAccess && (
					<Link href={erpEntryPath} className={appCardClassName}>
						<div className='w-20 h-20 rounded-full bg-zinc-100 group-hover:bg-black group-hover:text-white transition-colors flex items-center justify-center text-zinc-600'>
							<Monitor className='w-10 h-10' />
						</div>
						<div>
							<h2 className='text-2xl font-bold text-black mb-2'>
								ERP Dashboard
							</h2>
							<p className='text-zinc-500 text-sm'>
								Manage inventory, sales, orders, and business
								reports.
							</p>
						</div>
					</Link>
				)}
			</div>

			<div className='mt-12 flex flex-col items-center gap-4'>
				<div className='text-sm text-zinc-500 font-medium flex items-center justify-center gap-2 bg-zinc-100 px-4 py-2 rounded-full'>
					Logged in as{' '}
					<strong className='text-zinc-800'>
						{user?.name || user?.email}
					</strong>
					<span className='text-xs px-2 py-0.5 bg-zinc-200 text-zinc-700 rounded-md font-bold'>
						{user?.role}
					</span>
				</div>
				<Button
					variant='ghost'
					className='text-sm text-zinc-500 hover:text-black hover:bg-zinc-200 rounded-lg px-4'
					onClick={logout}
				>
					<LogOut className='w-4 h-4 mr-2' /> Log out
				</Button>
			</div>
		</div>
	);
}
