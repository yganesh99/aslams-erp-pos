export const SECTION_KEYS = [
	'dashboard',
	'inventory.products',
	'inventory.categories',
	'inventory.purchase-orders',
	'inventory.transfers',
	'inventory.supplier-invoices',
	'sales',
	'accounts.customers',
	'accounts.suppliers',
	'stores',
	'reports',
	'users',
	'settings',
	'pos',
	'pos.orders',
	'pos.customers',
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export const ERP_SECTION_KEYS: SectionKey[] = SECTION_KEYS.filter(
	(k) => !k.startsWith('pos'),
) as SectionKey[];

export const POS_SECTION_KEYS: SectionKey[] = SECTION_KEYS.filter((k) =>
	k.startsWith('pos'),
) as SectionKey[];

/**
 * Default ERP entry paths in sidebar order: first section the user may access wins.
 * Keep in sync with `(main)/layout.tsx` navigation.
 */
export const ERP_SECTION_ROUTE_ORDER: { section: SectionKey; path: string }[] =
	[
		{ section: 'dashboard', path: '/dashboard' },
		{ section: 'inventory.products', path: '/inventory' },
		{ section: 'inventory.categories', path: '/inventory/categories' },
		{
			section: 'inventory.purchase-orders',
			path: '/inventory/purchase-orders',
		},
		{ section: 'inventory.transfers', path: '/inventory/transfers' },
		{
			section: 'inventory.supplier-invoices',
			path: '/inventory/supplier-invoices',
		},
		{ section: 'sales', path: '/sales' },
		{ section: 'accounts.customers', path: '/accounts/customers' },
		{ section: 'accounts.suppliers', path: '/accounts/suppliers' },
		{ section: 'stores', path: '/stores' },
		{ section: 'reports', path: '/reports' },
		{ section: 'users', path: '/users' },
		{ section: 'settings', path: '/settings' },
	];

/** POS app routes; `pos` opens register selection (same as app picker). */
export const POS_SECTION_ROUTE_ORDER: { section: SectionKey; path: string }[] =
	[
		{ section: 'pos', path: '/registers' },
		{ section: 'pos.orders', path: '/pos/orders' },
		{ section: 'pos.customers', path: '/pos/customers' },
	];

export function getFirstAccessibleErpPath(
	hasSection: (key: SectionKey) => boolean,
): string | null {
	for (const { section, path } of ERP_SECTION_ROUTE_ORDER) {
		if (hasSection(section)) return path;
	}
	return null;
}

export function getFirstAccessiblePosPath(
	hasSection: (key: SectionKey) => boolean,
): string | null {
	for (const { section, path } of POS_SECTION_ROUTE_ORDER) {
		if (hasSection(section)) return path;
	}
	return null;
}

export interface SectionMeta {
	label: string;
	group?: string;
}

export const SECTIONS: Record<SectionKey, SectionMeta> = {
	dashboard: { label: 'Dashboard' },
	'inventory.products': { label: 'Products', group: 'Inventory Management' },
	'inventory.categories': {
		label: 'Categories',
		group: 'Inventory Management',
	},
	'inventory.purchase-orders': {
		label: 'Purchase Orders',
		group: 'Inventory Management',
	},
	'inventory.transfers': {
		label: 'Transfers',
		group: 'Inventory Management',
	},
	'inventory.supplier-invoices': {
		label: 'Supplier Invoices',
		group: 'Inventory Management',
	},
	sales: { label: 'Sales & Invoicing' },
	'accounts.customers': { label: 'Customers', group: 'Accounts' },
	'accounts.suppliers': { label: 'Suppliers', group: 'Accounts' },
	stores: { label: 'Stores & Warehouses' },
	reports: { label: 'Reports' },
	users: { label: 'Users' },
	settings: { label: 'Settings' },
	pos: { label: 'POS', group: 'Point of Sale' },
	'pos.orders': { label: 'POS Orders', group: 'Point of Sale' },
	'pos.customers': { label: 'POS Customers', group: 'Point of Sale' },
};

export interface RoleInfo {
	slug: string;
	label: string;
	isSystem: boolean;
	isStaff: boolean;
}
