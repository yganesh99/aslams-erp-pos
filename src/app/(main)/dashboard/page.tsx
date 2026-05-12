'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	TrendingUp,
	Package,
	AlertTriangle,
	DollarSign,
	Users,
	CalendarRange,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import SectionGuard from '@/components/SectionGuard';

interface SalesItem {
	_id: string;
	totalSales: number;
	totalOrders: number;
	storeName?: string;
}

interface LowStockItem {
	_id: string;
	name: string;
	sku: string;
	totalStock: number;
	reorderLevel: number;
}

interface CreditItem {
	_id: string;
	name: string;
	currentBalance: number;
	creditLimit: number;
}

interface SupplierPayable {
	_id: string;
	name: string;
	currentBalance: number;
}

/** Backend returns `[{ totalUnits, totalValue }]` (FIFO cost layers). */
interface InventoryValuationItem {
	totalUnits?: number;
	totalValue?: number;
	/** Legacy shape */
	value?: number;
}

function sumInventoryValuation(data: unknown): number {
	if (data == null) return 0;
	if (Array.isArray(data)) {
		return data.reduce((sum, row: InventoryValuationItem) => {
			const v = row?.totalValue ?? row?.value;
			return sum + (typeof v === 'number' && Number.isFinite(v) ? v : 0);
		}, 0);
	}
	if (typeof data === 'object' && data !== null && 'totalValue' in data) {
		const v = (data as { totalValue?: number }).totalValue;
		return typeof v === 'number' && Number.isFinite(v) ? v : 0;
	}
	return 0;
}

interface RecentOrder {
	_id: string;
	orderNumber: string;
	totalAmount: number;
	status: string;
	channel: string;
	customerId?: { name: string } | null;
	createdAt: string;
}

export default function Dashboard() {
	const router = useRouter();
	const { user, loading: authLoading, hasSection } = useAuth();

	const [isLoading, setIsLoading] = useState(true);
	const [startDate, setStartDate] = useState('');
	const [endDate, setEndDate] = useState('');

	// Dashboard data
	const [salesByStore, setSalesByStore] = useState<SalesItem[]>([]);
	const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
	const [creditExposure, setCreditExposure] = useState<CreditItem[]>([]);
	const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>(
		[],
	);
	const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
	const [inventoryValuation, setInventoryValuation] = useState<
		InventoryValuationItem[] | { totalValue?: number } | null
	>(null);

	const fetchDashboard = useCallback(async () => {
		const canReports = hasSection('reports');
		const canSales = hasSection('sales');

		try {
			setIsLoading(true);

			if (!canReports) {
				setSalesByStore([]);
				setLowStock([]);
				setCreditExposure([]);
				setSupplierPayables([]);
				setInventoryValuation(null);
			}
			if (!canSales) {
				setRecentOrders([]);
			}

			const reportParams: Record<string, string> = {};
			if (startDate) reportParams.startDate = startDate;
			if (endDate) reportParams.endDate = endDate;

			const orderParams: Record<string, string> = { limit: '5' };
			if (startDate) orderParams.startDate = startDate;
			if (endDate) orderParams.endDate = endDate;

			const reportPromises = canReports
				? Promise.allSettled([
						api.get('/reports/sales/by-store', {
							params: reportParams,
						}),
						api.get('/reports/inventory/low-stock'),
						api.get('/reports/finance/credit-exposure'),
						api.get('/reports/finance/supplier-payables'),
						api.get('/reports/inventory/valuation'),
					])
				: Promise.resolve([] as PromiseSettledResult<unknown>[]);

			const ordersPromise = canSales
				? Promise.allSettled([
						api.get('/orders', { params: orderParams }),
					])
				: Promise.resolve([] as PromiseSettledResult<unknown>[]);

			const [reportResults, ordersResults] = await Promise.all([
				reportPromises,
				ordersPromise,
			]);

			if (canReports && Array.isArray(reportResults)) {
				const [
					salesRes,
					lowStockRes,
					creditRes,
					payablesRes,
					valuationRes,
				] = reportResults;

				if (salesRes.status === 'fulfilled') {
					const d = (salesRes.value as { data: unknown }).data as
						| SalesItem[]
						| { data?: SalesItem[] };
					setSalesByStore(
						Array.isArray(d) ? d : d.data || [],
					);
				}
				if (lowStockRes.status === 'fulfilled') {
					const raw = (lowStockRes.value as { data: unknown }).data as
						| unknown[]
						| { data?: unknown[] };
					const list = Array.isArray(raw) ? raw : raw?.data || [];
					const byProduct = new Map<
						string,
						{
							_id: string;
							name: string;
							sku: string;
							totalStock: number;
							reorderLevel: number;
						}
					>();
					for (const row of list as Array<Record<string, unknown>>) {
						const pidRaw = row.productId as
							| { _id?: unknown; name?: string; sku?: string; reorderLevel?: number }
							| string
							| undefined
							| null;
						const productId =
							pidRaw && typeof pidRaw === 'object'
								? pidRaw._id ?? pidRaw
								: pidRaw ?? row._id;
						const id =
							typeof productId === 'string'
								? productId
								: (productId != null &&
										typeof (productId as { toString?: () => string })
											.toString === 'function'
										? (productId as { toString: () => string }).toString()
										: '') ||
									String(row._id ?? '');
						const name =
							(row.productId as { name?: string } | undefined)
								?.name ??
							(row.name as string | undefined) ??
							'Unknown';
						const sku =
							(row.productId as { sku?: string } | undefined)?.sku ??
							(row.sku as string | undefined) ??
							'';
						const available =
							(Number(row.quantity ?? 0) as number) -
							(Number(row.reservedQuantity ?? 0) as number);
						const reorderLevel =
							Number(row.reorderLevel ?? 0) ||
							Number(
								(row.productId as { reorderLevel?: number } | undefined)
									?.reorderLevel ?? 0,
							);
						const existing = byProduct.get(id);
						if (existing) {
							existing.totalStock += available;
						} else {
							byProduct.set(id, {
								_id: id,
								name,
								sku,
								totalStock: available,
								reorderLevel,
							});
						}
					}
					setLowStock(Array.from(byProduct.values()));
				}
				if (creditRes.status === 'fulfilled') {
					const d = (creditRes.value as { data: unknown }).data as
						| CreditItem[]
						| { data?: CreditItem[] };
					setCreditExposure(Array.isArray(d) ? d : d.data || []);
				}
				if (payablesRes.status === 'fulfilled') {
					const d = (payablesRes.value as { data: unknown }).data as
						| SupplierPayable[]
						| { data?: SupplierPayable[] };
					setSupplierPayables(Array.isArray(d) ? d : d.data || []);
				}
				if (valuationRes.status === 'fulfilled') {
					setInventoryValuation(
						(valuationRes.value as { data: unknown }).data as InventoryValuationItem[] | { totalValue?: number } | null,
					);
				}
			}

			if (canSales && ordersResults[0]?.status === 'fulfilled') {
				const d = (ordersResults[0].value as { data: { items?: RecentOrder[]; data?: RecentOrder[] } })
					.data;
				const list = d.items || d.data || d || [];
				setRecentOrders(Array.isArray(list) ? list : []);
			}
		} catch (error) {
			console.error('Failed to fetch dashboard data:', error);
		} finally {
			setIsLoading(false);
		}
	}, [startDate, endDate, hasSection]);

	useEffect(() => {
		if (authLoading || !user || !hasSection('dashboard')) return;
		fetchDashboard();
	}, [fetchDashboard, authLoading, user, hasSection]);

	const totalRevenue = salesByStore.reduce(
		(sum, s) => sum + (s.totalSales || 0),
		0,
	);
	const totalOrders = salesByStore.reduce(
		(sum, s) => sum + (s.totalOrders || 0),
		0,
	);
	const totalCreditExposure = creditExposure.reduce(
		(sum, c) => sum + (c.currentBalance || 0),
		0,
	);
	const totalPayables = supplierPayables.reduce(
		(sum, s) => sum + (s.currentBalance || 0),
		0,
	);
	const invValue = sumInventoryValuation(inventoryValuation);

	const showReports = hasSection('reports');
	const showSales = hasSection('sales');

	const hasDateRange = Boolean(startDate || endDate);
	const periodHint =
		startDate && endDate
			? `${startDate} → ${endDate}`
			: startDate
				? `From ${startDate}`
				: endDate
					? `Through ${endDate}`
					: null;

	const getStatusColor = (status: string) => {
		const m: Record<string, string> = {
			pending: 'bg-amber-100 text-amber-700',
			confirmed: 'bg-blue-100 text-blue-700',
			processing: 'bg-blue-100 text-blue-700',
			delivered: 'bg-green-100 text-green-700',
			cancelled: 'bg-red-100 text-red-700',
		};
		return m[status] || 'bg-zinc-100 text-zinc-700';
	};

	return (
		<SectionGuard requiredSection='dashboard'>
		<div className='min-w-0 space-y-6'>
			<div className='flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-8'>
				<div className='min-w-0 flex-1'>
					<h1 className='text-3xl font-bold tracking-tight text-black'>
						Dashboard
					</h1>
					<p className='text-zinc-500 mt-1'>
						Welcome back! Here&apos;s what&apos;s happening with
						your business today.
					</p>
					<p className='text-xs text-zinc-400 mt-2 max-w-xl'>
						Revenue, order counts, sales by store, and recent orders
						use the date range below when set. Inventory value,
						receivables, payables, and low stock reflect current
						positions.
					</p>
				</div>
				<div className='w-full shrink-0 md:w-auto md:max-w-full'>
					<div className='flex items-center gap-1.5 text-zinc-500 mb-2 md:justify-end'>
						<CalendarRange className='w-4 h-4 shrink-0' />
						<span className='text-xs font-medium'>Period</span>
					</div>
					<div className='flex flex-wrap items-end gap-3 sm:gap-x-4 md:justify-end'>
						<div className='min-w-0'>
							<label
								htmlFor='dashboard-start-date'
								className='block text-xs font-medium text-zinc-500 mb-1'
							>
								Start
							</label>
							<input
								id='dashboard-start-date'
								type='date'
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className='h-9 w-full min-w-[10.5rem] rounded-md border border-zinc-300 bg-white px-3 text-sm sm:w-auto'
							/>
						</div>
						<div className='min-w-0'>
							<label
								htmlFor='dashboard-end-date'
								className='block text-xs font-medium text-zinc-500 mb-1'
							>
								End
							</label>
							<input
								id='dashboard-end-date'
								type='date'
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className='h-9 w-full min-w-[10.5rem] rounded-md border border-zinc-300 bg-white px-3 text-sm sm:w-auto'
							/>
						</div>
						{(startDate || endDate) && (
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='h-9 shrink-0'
								onClick={() => {
									setStartDate('');
									setEndDate('');
								}}
							>
								All time
							</Button>
						)}
					</div>
				</div>
			</div>

			{isLoading ? (
				<p className='text-center text-zinc-500 py-12'>
					Loading dashboard...
				</p>
			) : (
				<>
					{!showReports && !showSales && (
						<p className='rounded-lg border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-600'>
							You have access to the dashboard, but no report or
							sales widgets match your role. Use the sidebar to open
							Inventory or another section.
						</p>
					)}
					{/* Stats Grid */}
					{showReports && (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
						<div className='bg-white rounded-xl p-6 border border-zinc-200 shadow-sm'>
							<div className='flex items-center justify-between'>
								<h3 className='text-[15px] font-medium text-zinc-500'>
									Total Revenue
								</h3>
								<DollarSign className='w-5 h-5 text-green-600' />
							</div>
							<div className='mt-2 text-2xl font-bold text-black'>
								රු
								{totalRevenue.toLocaleString('en-US', {
									minimumFractionDigits: 2,
								})}
							</div>
							<p className='mt-1 text-xs text-zinc-500'>
								{totalOrders} orders across{' '}
								{salesByStore.length} store(s)
								{hasDateRange && periodHint ? (
									<span className='block text-zinc-400 mt-0.5'>
										{periodHint}
									</span>
								) : null}
							</p>
						</div>

						<div className='bg-white rounded-xl p-6 border border-zinc-200 shadow-sm'>
							<div className='flex items-center justify-between'>
								<h3 className='text-[15px] font-medium text-zinc-500'>
									Inventory Value
								</h3>
								<Package className='w-5 h-5 text-blue-600' />
							</div>
							<div className='mt-2 text-2xl font-bold text-black'>
								රු
								{invValue.toLocaleString('en-US', {
									minimumFractionDigits: 2,
								})}
							</div>
							<p className='mt-1 text-xs text-zinc-500'>
								FIFO cost basis (purchase &amp; adjustments)
							</p>
						</div>

						<div className='bg-white rounded-xl p-6 border border-zinc-200 shadow-sm'>
							<div className='flex items-center justify-between'>
								<h3 className='text-[15px] font-medium text-zinc-500'>
									Credit Receivables
								</h3>
								<Users className='w-5 h-5 text-amber-600' />
							</div>
							<div className='mt-2 text-2xl font-bold text-amber-600'>
								රු
								{totalCreditExposure.toLocaleString('en-US', {
									minimumFractionDigits: 2,
								})}
							</div>
							<p className='mt-1 text-xs text-zinc-500'>
								{creditExposure.length} customer(s) with
								outstanding balance
							</p>
						</div>

						<div className='bg-white rounded-xl p-6 border border-zinc-200 shadow-sm'>
							<div className='flex items-center justify-between'>
								<h3 className='text-[15px] font-medium text-zinc-500'>
									Supplier Payables
								</h3>
								<TrendingUp className='w-5 h-5 text-red-600' />
							</div>
							<div className='mt-2 text-2xl font-bold text-red-600'>
								රු
								{totalPayables.toLocaleString('en-US', {
									minimumFractionDigits: 2,
								})}
							</div>
							<p className='mt-1 text-xs text-zinc-500'>
								{supplierPayables.length} supplier(s) owed
							</p>
						</div>
					</div>
					)}

					<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
						{/* Recent Orders */}
						{showSales && (
						<Card className='col-span-1 lg:col-span-2'>
							<CardHeader className='flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between'>
								<CardTitle>
									Recent Orders
									{hasDateRange ? (
										<span className='mt-1 block text-xs font-normal text-zinc-400'>
											In selected period
										</span>
									) : null}
								</CardTitle>
								<button
									type='button'
									onClick={() => router.push('/sales')}
									className='shrink-0 text-left text-sm font-medium text-blue-600 hover:underline sm:text-right'
								>
									View All
								</button>
							</CardHeader>
							<CardContent>
								{recentOrders.length === 0 ? (
									<p className='py-8 text-center text-zinc-400'>
										No orders yet.
									</p>
								) : (
									<>
										<div className='space-y-3 md:hidden'>
											{recentOrders.map((order) => {
												const custName =
													typeof order.customerId ===
														'object' &&
													order.customerId?.name
														? order.customerId.name
														: 'Walk-in';
												return (
													<div
														key={order._id}
														role='button'
														tabIndex={0}
														className='cursor-pointer rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:bg-zinc-50'
														onClick={() =>
															router.push(
																`/sales/orders/${order._id}`,
															)
														}
														onKeyDown={(e) => {
															if (
																e.key ===
																	'Enter' ||
																e.key === ' '
															) {
																e.preventDefault();
																router.push(
																	`/sales/orders/${order._id}`,
																);
															}
														}}
													>
														<div className='flex items-start justify-between gap-2'>
															<div>
																<p className='font-medium text-black'>
																	{
																		order.orderNumber
																	}
																</p>
																<p className='text-sm text-zinc-600'>
																	{custName}
																</p>
															</div>
															<span
																className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
															>
																{order.status}
															</span>
														</div>
														<div className='mt-2 flex flex-wrap items-center gap-2 text-sm'>
															<span className='rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase'>
																{order.channel}
															</span>
															<span className='ml-auto font-medium'>
																රු
																{(
																	order.totalAmount ||
																	0
																).toFixed(2)}
															</span>
														</div>
													</div>
												);
											})}
										</div>
										<div className='hidden md:block'>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Order
														</TableHead>
														<TableHead>
															Customer
														</TableHead>
														<TableHead>
															Channel
														</TableHead>
														<TableHead className='text-right'>
															Amount
														</TableHead>
														<TableHead>
															Status
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{recentOrders.map(
														(order) => (
															<TableRow
																key={order._id}
																className='cursor-pointer hover:bg-zinc-50'
																onClick={() =>
																	router.push(
																		`/sales/orders/${order._id}`,
																	)
																}
															>
																<TableCell className='font-medium'>
																	{
																		order.orderNumber
																	}
																</TableCell>
																<TableCell>
																	{typeof order.customerId ===
																		'object' &&
																	order
																		.customerId
																		?.name
																		? order
																				.customerId
																				.name
																		: 'Walk-in'}
																</TableCell>
																<TableCell>
																	<span className='rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase'>
																		{
																			order.channel
																		}
																	</span>
																</TableCell>
																<TableCell className='text-right font-medium'>
																	රු
																	{(
																		order.totalAmount ||
																		0
																	).toFixed(
																		2,
																	)}
																</TableCell>
																<TableCell>
																	<span
																		className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}
																	>
																		{
																			order.status
																		}
																	</span>
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										</div>
									</>
								)}
							</CardContent>
						</Card>
						)}

						{/* Low Stock Alert */}
						{showReports && (
						<Card
							className={
								showSales ? 'col-span-1' : 'col-span-1 lg:col-span-3'
							}
						>
							<CardHeader className='flex flex-row items-center justify-between space-y-0'>
								<CardTitle className='flex items-center space-x-2'>
									<AlertTriangle className='w-4 h-4 text-amber-500' />
									<span>Low Stock Alert</span>
								</CardTitle>
								<span className='text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium'>
									{lowStock.length}
								</span>
							</CardHeader>
							<CardContent>
								{lowStock.length === 0 ? (
									<p className='text-center text-zinc-400 py-8 text-sm'>
										No products below reorder level (set
										reorder level on products to enable
										alerts).
									</p>
								) : (
									<div className='space-y-3 max-h-[28rem] overflow-y-auto pr-1'>
										{lowStock.map((item) => (
											<div
												key={item._id}
												className='flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors'
												onClick={() =>
													router.push(
														`/inventory/products/${item._id}`,
													)
												}
											>
												<div>
													<p className='text-sm font-medium'>
														{item.name}
													</p>
													<p className='text-xs text-zinc-500'>
														SKU: {item.sku}
													</p>
												</div>
												<div className='text-right'>
													<p className='text-sm font-bold text-amber-700'>
														{item.totalStock}{' '}
														available
													</p>
													<p className='text-xs text-amber-800/80'>
														Reorder Level:{' '}
														{item.reorderLevel}
													</p>
												</div>
											</div>
										))}
									</div>
								)}
							</CardContent>
						</Card>
						)}
					</div>

					{/* Sales by Store + Credit Exposure */}
					{showReports && (
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
						<Card>
							<CardHeader>
								<CardTitle>
									Sales by Store
									{hasDateRange ? (
										<span className='block text-xs font-normal text-zinc-400 mt-1'>
											In selected period
										</span>
									) : null}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{salesByStore.length === 0 ? (
									<p className='text-center text-zinc-400 py-8 text-sm'>
										No sales data available.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Store</TableHead>
												<TableHead className='text-right'>
													Orders
												</TableHead>
												<TableHead className='text-right'>
													Revenue
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{salesByStore.map((store) => (
												<TableRow key={store._id}>
													<TableCell className='font-medium'>
														{store.storeName ||
															store._id}
													</TableCell>
													<TableCell className='text-right'>
														{store.totalOrders}
													</TableCell>
													<TableCell className='text-right font-medium'>
														රු
														{(
															store.totalSales ||
															0
														).toLocaleString(
															'en-US',
															{
																minimumFractionDigits: 2,
															},
														)}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader className='flex flex-row items-center justify-between space-y-0'>
								<CardTitle>Top Credit Exposure</CardTitle>
								{hasSection('accounts.customers') ? (
									<button
										type='button'
										onClick={() =>
											router.push('/accounts/customers')
										}
										className='text-sm font-medium text-blue-600 hover:underline'
									>
										View All
									</button>
								) : null}
							</CardHeader>
							<CardContent>
								{creditExposure.length === 0 ? (
									<p className='text-center text-zinc-400 py-8 text-sm'>
										No credit exposure.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Customer</TableHead>
												<TableHead className='text-right'>
													Balance
												</TableHead>
												<TableHead className='text-right'>
													Limit
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{creditExposure
												.slice(0, 5)
												.map((cust) => (
													<TableRow key={cust._id}>
														<TableCell className='font-medium'>
															{cust.name}
														</TableCell>
														<TableCell className='text-right text-red-600 font-medium'>
															රු
															{(
																cust.currentBalance ||
																0
															).toFixed(2)}
														</TableCell>
														<TableCell className='text-right text-zinc-500'>
															රු
															{(
																cust.creditLimit ||
																0
															).toFixed(2)}
														</TableCell>
													</TableRow>
												))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</div>
					)}
				</>
			)}
		</div>
		</SectionGuard>
	);
}
