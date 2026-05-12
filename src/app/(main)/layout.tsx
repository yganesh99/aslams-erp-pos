'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
	LayoutDashboard,
	Package,
	FileText,
	Building2,
	Truck,
	BarChart3,
	Settings,
	LogOut,
	HomeIcon,
	ClipboardList,
	Receipt,
	Warehouse,
	ChevronDown,
	FolderTree,
	ArrowRightLeft,
	Users,
	Menu,
	ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import RoleGuard from '@/components/RoleGuard';
import { BrandLogo } from '@/components/BrandLogo';
import { ERP_SECTION_KEYS } from '@/lib/sections';
import {
	Sheet,
	SheetContent,
	SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { User } from '@/context/AuthContext';
import type { SectionKey } from '@/lib/sections';

type NavLinkItem = {
	kind: 'link';
	name: string;
	href: string;
	icon: LucideIcon;
	section: SectionKey;
};

type NavGroupItem = {
	kind: 'group';
	name: string;
	icon: LucideIcon;
	children: {
		name: string;
		href: string;
		icon?: LucideIcon;
		section: SectionKey;
	}[];
};

type FilteredNavItem = NavLinkItem | NavGroupItem;

function childIsActive(pathname: string, href: string) {
	if (href === '/inventory') {
		return (
			pathname === '/inventory' ||
			pathname.startsWith('/inventory/products')
		);
	}
	if (href === '/inventory/transfers') {
		return (
			pathname.startsWith('/inventory/transfers') ||
			pathname === '/inventory/transfer' ||
			pathname.startsWith('/inventory/transfer/')
		);
	}
	if (href === '/users') {
		return pathname === '/users' || pathname.match(/^\/users\/[^/]+$/);
	}
	return pathname === href || pathname.startsWith(`${href}/`);
}

function ErpNavPanel({
	user,
	logout,
	pathname,
	filteredNav,
	openGroups,
	toggleGroup,
	onNavigate,
}: {
	user: User | null;
	logout: () => void;
	pathname: string;
	filteredNav: FilteredNavItem[];
	openGroups: Set<string>;
	toggleGroup: (name: string) => void;
	onNavigate?: () => void;
}) {
	const afterNav = () => {
		onNavigate?.();
	};

	return (
		<>
			<div className='border-b border-zinc-100 p-6'>
				<div className='flex flex-col'>
					<BrandLogo
						className='h-10 w-auto max-w-[200px]'
						priority
					/>
				</div>
			</div>

			<div className='flex-1 overflow-y-auto py-6'>
				<div className='mb-4 px-6'>
					<span className='text-xs font-semibold tracking-wider text-zinc-400'>
						MENU
					</span>
				</div>
				<nav className='space-y-1 px-3'>
					{filteredNav.map((item) => {
						if (item.kind === 'link') {
							const isActive = pathname.startsWith(item.href);
							const Icon = item.icon;
							return (
								<Link
									key={item.name}
									href={item.href}
									onClick={afterNav}
									className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
										isActive
											? 'bg-zinc-100 text-black'
											: 'text-zinc-600 hover:bg-zinc-50 hover:text-black'
									}`}
								>
									<Icon
										className={`h-5 w-5 ${
											isActive
												? 'text-black'
												: 'text-zinc-500'
										}`}
									/>
									<span>{item.name}</span>
								</Link>
							);
						}

						const Icon = item.icon;
						const isOpen = openGroups.has(item.name);
						const groupActive = item.children.some((c) =>
							childIsActive(pathname, c.href),
						);
						return (
							<div key={item.name} className='space-y-0.5'>
								<button
									type='button'
									onClick={() => toggleGroup(item.name)}
									className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
										groupActive
											? 'bg-zinc-100 text-black'
											: 'text-zinc-600 hover:bg-zinc-50 hover:text-black'
									}`}
									aria-expanded={isOpen}
								>
									<Icon
										className={`h-5 w-5 flex-shrink-0 ${
											groupActive
												? 'text-black'
												: 'text-zinc-500'
										}`}
									/>
									<span className='min-w-0 flex-1'>
										{item.name}
									</span>
									<ChevronDown
										className={`h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200 ${
											isOpen ? 'rotate-180' : ''
										}`}
									/>
								</button>
								{isOpen && (
									<div className='ml-2 space-y-0.5 border-l border-zinc-200 py-0.5 pl-2'>
										{item.children.map((child) => {
											const active = childIsActive(
												pathname,
												child.href,
											);
											const ChildIcon = child.icon;
											return (
												<Link
													key={child.href}
													href={child.href}
													onClick={afterNav}
													className={`flex items-center gap-2 rounded-md px-2 py-2 text-[12px] font-medium transition-colors ${
														active
															? 'bg-zinc-100 text-black'
															: 'text-zinc-600 hover:bg-zinc-50 hover:text-black'
													}`}
												>
													{ChildIcon ? (
														<ChildIcon
															className={`h-4 w-4 flex-shrink-0 ${
																active
																	? 'text-black'
																	: 'text-zinc-400'
															}`}
														/>
													) : null}
													<span>{child.name}</span>
												</Link>
											);
										})}
									</div>
								)}
							</div>
						);
					})}
				</nav>
			</div>

			<div className='mt-auto border-t border-zinc-100 p-4'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center space-x-3'>
						<div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold'>
							{user?.name?.charAt(0) ||
								user?.email?.charAt(0) ||
								'U'}
						</div>
						<div className='max-w-[130px] overflow-hidden'>
							<p className='truncate text-sm font-bold leading-tight text-black'>
								{user?.name || 'User'}
							</p>
							<p className='truncate text-xs font-medium text-zinc-500'>
								{user?.role || 'Role'}
							</p>
						</div>
					</div>
					<Link
						href='/'
						onClick={afterNav}
						className='rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black'
						title='App Selection'
					>
						<HomeIcon className='h-5 w-5' />
					</Link>
					<button
						type='button'
						onClick={() => {
							afterNav();
							logout();
						}}
						className='rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-black'
						title='Log out'
					>
						<LogOut className='h-5 w-5' />
					</button>
				</div>
			</div>
		</>
	);
}

export default function MainLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const { user, logout, hasSection } = useAuth();
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	const groupPrefixes: Record<string, string> = {
		'Inventory Management': '/inventory',
		'User Management': '/users',
	};

	const initOpenGroups = () => {
		const set = new Set<string>();
		for (const [name, prefix] of Object.entries(groupPrefixes)) {
			if (pathname.startsWith(prefix)) set.add(name);
		}
		return set;
	};

	const [openGroups, setOpenGroups] = useState<Set<string>>(initOpenGroups);
	const prevPathname = useRef(pathname);

	useEffect(() => {
		const prev = prevPathname.current;
		prevPathname.current = pathname;
		setOpenGroups((current) => {
			const next = new Set(current);
			for (const [name, prefix] of Object.entries(groupPrefixes)) {
				const wasInside = prev.startsWith(prefix);
				const isInside = pathname.startsWith(prefix);
				if (isInside && !wasInside) next.add(name);
				if (!isInside && wasInside) next.delete(name);
			}
			return next;
		});
	}, [pathname]);

	const toggleGroup = (name: string) => {
		setOpenGroups((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	};

	useEffect(() => {
		setMobileNavOpen(false);
	}, [pathname]);

	const navigation: (NavLinkItem | NavGroupItem)[] = [
		{
			kind: 'link',
			name: 'Dashboard',
			href: '/dashboard',
			icon: LayoutDashboard,
			section: 'dashboard',
		},
		{
			kind: 'group',
			name: 'Inventory Management',
			icon: Package,
			children: [
				{
					name: 'Products',
					href: '/inventory',
					icon: Package,
					section: 'inventory.products',
				},
				{
					name: 'Categories',
					href: '/inventory/categories',
					icon: FolderTree,
					section: 'inventory.categories',
				},
				{
					name: 'Purchase orders',
					href: '/inventory/purchase-orders',
					icon: ClipboardList,
					section: 'inventory.purchase-orders',
				},
				{
					name: 'Transfers',
					href: '/inventory/transfers',
					icon: ArrowRightLeft,
					section: 'inventory.transfers',
				},
				{
					name: 'Supplier invoices',
					href: '/inventory/supplier-invoices',
					icon: Receipt,
					section: 'inventory.supplier-invoices',
				},
			],
		},
		{
			kind: 'link',
			name: 'Sales & Invoicing',
			href: '/sales',
			icon: FileText,
			section: 'sales',
		},
		{
			kind: 'link',
			name: 'Customers',
			href: '/accounts/customers',
			icon: Building2,
			section: 'accounts.customers',
		},
		{
			kind: 'link',
			name: 'Suppliers',
			href: '/accounts/suppliers',
			icon: Truck,
			section: 'accounts.suppliers',
		},
		{
			kind: 'link',
			name: 'Stores & warehouses',
			href: '/stores',
			icon: Warehouse,
			section: 'stores',
		},
		{
			kind: 'link',
			name: 'Reports',
			href: '/reports',
			icon: BarChart3,
			section: 'reports',
		},
		{
			kind: 'group',
			name: 'User Management',
			icon: Users,
			children: [
				{
					name: 'Users',
					href: '/users',
					icon: Users,
					section: 'users',
				},
				{
					name: 'Roles & Access',
					href: '/users/roles',
					icon: ShieldCheck,
					section: 'users',
				},
			],
		},
		{
			kind: 'link',
			name: 'Settings',
			href: '/settings',
			icon: Settings,
			section: 'settings',
		},
	];

	const filteredNav = navigation
		.map((item) => {
			if (item.kind === 'link') {
				if (!user || hasSection(item.section)) {
					return item;
				}
				return null;
			}
			const children = item.children.filter(
				(c) => user && hasSection(c.section),
			);
			if (children.length === 0) return null;
			return { ...item, children };
		})
		.filter(Boolean) as FilteredNavItem[];

	const navPanelProps = {
		user,
		logout,
		pathname,
		filteredNav,
		openGroups,
		toggleGroup,
	};

	return (
		<RoleGuard requiredSections={[...ERP_SECTION_KEYS]}>
			<div className='flex h-screen bg-[#F8F9FA] font-sans text-zinc-900'>
				<aside className='hidden w-[280px] flex-shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex'>
					<ErpNavPanel {...navPanelProps} />
				</aside>

				<div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
					<header className='flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3 lg:hidden'>
						<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
							<SheetTrigger asChild>
								<Button
									type='button'
									variant='outline'
									size='icon'
									className='shrink-0 border-zinc-200 bg-white'
									aria-label='Open menu'
								>
									<Menu className='h-5 w-5' />
								</Button>
							</SheetTrigger>
							<SheetContent
								side='left'
								className='flex h-full w-[min(280px,100vw)] max-w-[min(280px,100vw)] flex-col gap-0 border-r border-zinc-200 bg-white p-0 sm:max-w-[280px]'
							>
								<ErpNavPanel
									{...navPanelProps}
									onNavigate={() => setMobileNavOpen(false)}
								/>
							</SheetContent>
						</Sheet>
						<BrandLogo
							className='h-8 w-auto max-w-[160px]'
							priority
						/>
					</header>

					<main className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
						<div className='min-h-0 min-w-0 flex-1 overflow-auto px-4 py-6 md:px-6 md:py-8'>
							{children}
						</div>
					</main>
				</div>
			</div>
		</RoleGuard>
	);
}
