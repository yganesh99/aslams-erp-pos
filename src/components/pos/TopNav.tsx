'use client';

import { LayoutGrid, Receipt, Users, Monitor, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/BrandLogo';
import { CloseRegisterButton } from './CloseRegisterButton';

export function TopNav() {
	const { user, logout } = useAuth();
	const pathname = usePathname();

	const navLinks = [
		{
			href: '/pos',
			label: 'Register',
			icon: <LayoutGrid className='mr-2 h-4 w-4' />,
			exact: true,
		},
		{
			href: '/pos/orders',
			label: 'Orders',
			icon: <Receipt className='mr-2 h-4 w-4' />,
		},
		{
			href: '/pos/customers',
			label: 'Customers',
			icon: <Users className='mr-2 h-4 w-4' />,
		},
	];

	const isActive = (href: string, exact?: boolean) =>
		exact ? pathname === href : pathname.startsWith(href);

	return (
		<header className='h-16 border-b bg-background flex items-center justify-between px-4 sticky top-0 z-40'>
			<div className='flex items-center gap-6'>
				<div className='flex items-center gap-2 font-bold text-xl tracking-tight'>
					<Link
						href='/pos'
						className='flex items-center gap-2'
					>
						<BrandLogo className='h-8 w-auto max-w-[140px]' />
						<span className='text-zinc-500 text-xs font-bold bg-zinc-100 px-2 py-1 rounded-md tracking-wider'>
							POS
						</span>
					</Link>
				</div>

				<nav className='hidden lg:flex items-center gap-1 ml-4'>
					{navLinks.map(({ href, label, icon, exact }) => (
						<Button
							key={href}
							variant='ghost'
							className={`touch-manipulation min-h-[48px] ${
								isActive(href, exact)
									? 'font-semibold text-primary'
									: 'text-muted-foreground'
							}`}
							asChild
						>
							<Link href={href}>
								{icon} {label}
							</Link>
						</Button>
					))}
				</nav>
			</div>

			<div className='flex items-center gap-4 flex-1 justify-end'>
				{user?.role === 'admin' && (
					<Button
						variant='outline'
						className='hidden sm:flex border-zinc-200 text-zinc-700 hover:bg-zinc-50 touch-manipulation h-10 rounded-lg'
						asChild
					>
						<Link href='/dashboard'>
							<Monitor className='w-4 h-4 mr-2' /> ERP
						</Link>
					</Button>
				)}

				<CloseRegisterButton />

				<Button
					variant='ghost'
					size='icon'
					onClick={logout}
					className='h-10 w-10 touch-manipulation text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg'
					title='Log Out'
				>
					<LogOut className='w-5 h-5' />
				</Button>
			</div>
		</header>
	);
}
