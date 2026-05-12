'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SectionGuard from '@/components/SectionGuard';

interface DailySalesRow {
	storeId: string;
	storeName: string;
	day: string;
	totalSales: number;
	orderCount: number;
}

interface MonthlySalesRow {
	storeId: string;
	storeName: string;
	month: string;
	totalSales: number;
	orderCount: number;
}

interface SalesByProductRow {
	_id: string;
	sku: string;
	name: string;
	totalQuantity: number;
	totalRevenue: number;
}

interface SalesByRegisterRow {
	_id: string;
	registerName: string;
	storeName: string;
	totalSales: number;
	totalOrders: number;
}

interface TaxCollectedRow {
	storeId: string;
	storeName: string;
	totalTax: number;
	totalSales: number;
	orderCount: number;
}

interface StockLevelRow {
	_id: string;
	productName: string;
	sku: string;
	storeName: string;
	quantity: number;
	reservedQuantity: number;
	availableQuantity: number;
}

interface TotalStockRow {
	_id: string;
	productName: string;
	sku: string;
	quantity: number;
	reservedQuantity: number;
	availableQuantity: number;
	storeCount: number;
}

interface CreditRow {
	_id: string;
	name: string;
	currentBalance: number;
	creditLimit: number;
}

interface CreditSettlementRow {
	_id: string;
	customerId: string;
	customerName: string;
	type: string;
	amount: number;
	balance: number;
	orderNumber: string | null;
	description: string;
	createdAt: string;
}

interface SupplierPayablesHistoryRow {
	_id: string;
	supplierId: string;
	supplierName: string;
	type: string;
	amount: number;
	balance: number;
	poNumber: string | null;
	description: string;
	createdAt: string;
}

interface PayablesRow {
	_id: string;
	name: string;
	currentBalance: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RevenuePerProductRow {
	_id: string;
	sku: string;
	name: string;
	totalQuantity: number;
	totalRevenue: number;
}

interface ReturnsSummaryRow {
	type: string;
	storeName: string;
	totalAmount: number;
	count: number;
}

interface PurchaseOrderStatusRow {
	_id: string;
	totalAmount: number;
	count: number;
}

interface SupplierInvoiceStatusRow {
	_id: string;
	invoiceNumber: string;
	supplierName: string;
	totalAmount: number;
	paidAmount: number;
	outstandingAmount: number;
	status: string;
	createdAt: string;
}

export default function ReportsPage() {
	const [isLoading, setIsLoading] = useState(true);
	const [mainTab, setMainTab] = useState<
		'sales' | 'inventory' | 'financial' | 'credit' | 'operational'
	>('sales');
	const [salesTab, setSalesTab] = useState<
		'summary' | 'product' | 'registers'
	>('summary');
	const [inventoryTab, setInventoryTab] = useState<'total' | 'by-store'>(
		'total',
	);

	const [stores, setStores] = useState<
		{ _id: string; name: string; code?: string }[]
	>([]);
	const [selectedStoreId, setSelectedStoreId] = useState<string>('');
	const [startDate, setStartDate] = useState<string>('');
	const [endDate, setEndDate] = useState<string>('');

	const [dailySales, setDailySales] = useState<DailySalesRow[]>([]);
	const [monthlySales, setMonthlySales] = useState<MonthlySalesRow[]>([]);
	const [salesByProduct, setSalesByProduct] = useState<SalesByProductRow[]>(
		[],
	);
	const [salesByRegister, setSalesByRegister] = useState<
		SalesByRegisterRow[]
	>([]);
	const [taxCollected, setTaxCollected] = useState<TaxCollectedRow[]>([]);
	const [totalStock, setTotalStock] = useState<TotalStockRow[]>([]);
	const [stockLevels, setStockLevels] = useState<StockLevelRow[]>([]);
	const [creditSummary, setCreditSummary] = useState<CreditRow[]>([]);
	const [creditSettlement, setCreditSettlement] = useState<
		CreditSettlementRow[]
	>([]);
	const [supplierPayables, setSupplierPayables] = useState<PayablesRow[]>([]);
	const [supplierPayablesHistory, setSupplierPayablesHistory] = useState<
		SupplierPayablesHistoryRow[]
	>([]);
	// const [revenuePerProduct, setRevenuePerProduct] = useState<
	// 	RevenuePerProductRow[]
	// >([]);
	const [returnsSummary, setReturnsSummary] = useState<ReturnsSummaryRow[]>(
		[],
	);
	const [poStatus, setPoStatus] = useState<PurchaseOrderStatusRow[]>([]);
	const [invoiceStatus, setInvoiceStatus] = useState<
		SupplierInvoiceStatusRow[]
	>([]);

	useEffect(() => {
		const load = async () => {
			try {
				setIsLoading(true);

				const params: Record<string, string> = {};
				if (startDate) params.startDate = startDate;
				if (endDate) params.endDate = endDate;
				if (selectedStoreId) params.storeId = selectedStoreId;

				const [
					dailyRes,
					monthlyRes,
					salesProdRes,
					salesRegRes,
					taxRes,
					stockRes,
					totalStockRes,
					creditRes,
					creditSettlementRes,
					payableRes,
					payableHistoryRes,
					revenueRes, // eslint-disable-line @typescript-eslint/no-unused-vars
					returnsRes,
					poRes,
					invoiceRes,
				] = await Promise.allSettled([
					api.get('/reports/sales/daily-summary', { params }),
					api.get('/reports/sales/monthly-summary', { params }),
					api.get('/reports/sales/by-product', { params }),
					api.get('/reports/sales/by-register', { params }),
					api.get('/reports/finance/tax-collected', { params }),
					api.get('/reports/inventory/current-stock-levels', {
						params,
					}),
					api.get('/reports/inventory/total-stock', { params }),
					api.get('/reports/finance/credit-exposure', { params }),
					api.get(
						'/reports/finance/customer-credit-settlement-history',
						{ params },
					),
					api.get('/reports/finance/supplier-payables', { params }),
					api.get(
						'/reports/finance/supplier-payables-history',
						{ params },
					),
					api.get('/reports/finance/revenue-per-product', {
						params,
					}),
					api.get('/reports/operations/returns-summary', {
						params,
					}),
					api.get('/reports/operations/purchase-order-status', {
						params,
					}),
					api.get(
						'/reports/finance/supplier-invoice-payment-status',
						{
							params,
						},
					),
				]);

				if (dailyRes.status === 'fulfilled') {
					const d = dailyRes.value.data;
					setDailySales(Array.isArray(d) ? d : d.data || []);
				}
				if (monthlyRes.status === 'fulfilled') {
					const d = monthlyRes.value.data;
					setMonthlySales(Array.isArray(d) ? d : d.data || []);
				}
				if (salesProdRes.status === 'fulfilled') {
					const d = salesProdRes.value.data;
					setSalesByProduct(Array.isArray(d) ? d : d.data || []);
				}
				if (salesRegRes.status === 'fulfilled') {
					const d = salesRegRes.value.data;
					setSalesByRegister(Array.isArray(d) ? d : d.data || []);
				}
				if (taxRes.status === 'fulfilled') {
					const d = taxRes.value.data;
					setTaxCollected(Array.isArray(d) ? d : d.data || []);
				}
				if (stockRes.status === 'fulfilled') {
					const d = stockRes.value.data;
					setStockLevels(Array.isArray(d) ? d : d.data || []);
				}
				if (totalStockRes.status === 'fulfilled') {
					const d = totalStockRes.value.data;
					setTotalStock(Array.isArray(d) ? d : d.data || []);
				}
				if (creditRes.status === 'fulfilled') {
					const d = creditRes.value.data;
					setCreditSummary(Array.isArray(d) ? d : d.data || []);
				}
				if (creditSettlementRes.status === 'fulfilled') {
					const d = creditSettlementRes.value.data;
					setCreditSettlement(Array.isArray(d) ? d : d.data || []);
				}
				if (payableRes.status === 'fulfilled') {
					const d = payableRes.value.data;
					setSupplierPayables(Array.isArray(d) ? d : d.data || []);
				}
				if (payableHistoryRes.status === 'fulfilled') {
					const d = payableHistoryRes.value.data;
					setSupplierPayablesHistory(
						Array.isArray(d) ? d : d.data || [],
					);
				}
				// if (revenueRes.status === 'fulfilled') {
				// 	const d = revenueRes.value.data;
				// 	setRevenuePerProduct(Array.isArray(d) ? d : d.data || []);
				// }
				if (returnsRes.status === 'fulfilled') {
					const d = returnsRes.value.data;
					setReturnsSummary(Array.isArray(d) ? d : d.data || []);
				}
				if (poRes.status === 'fulfilled') {
					const d = poRes.value.data;
					setPoStatus(Array.isArray(d) ? d : d.data || []);
				}
				if (invoiceRes.status === 'fulfilled') {
					const d = invoiceRes.value.data;
					setInvoiceStatus(Array.isArray(d) ? d : d.data || []);
				}
			} catch (err) {
				console.error('Failed to load reports', err);
			} finally {
				setIsLoading(false);
			}
		};

		load();
	}, [startDate, endDate, selectedStoreId]);

	useEffect(() => {
		const loadStores = async () => {
			try {
				const res = await api.get('/stores');
				const data = res.data?.data || res.data || [];
				setStores(Array.isArray(data) ? data : []);
			} catch (err) {
				console.error('Failed to load stores', err);
			}
		};
		loadStores();
	}, []);

	const fmtMoney = (v: number | undefined | null) =>
		`රු${(v || 0).toLocaleString('en-US', {
			minimumFractionDigits: 2,
		})}`;

	return (
		<SectionGuard requiredSection='reports'>
		<div className='space-y-6'>
			<div>
				<h1 className='text-3xl font-bold tracking-tight text-black'>
					Reports
				</h1>
				<p className='text-zinc-500 mt-1'>
					View sales, inventory, financial, and operational
					performance.
				</p>
			</div>

			{isLoading ? (
				<p className='text-center text-zinc-500 py-12'>
					Loading reports...
				</p>
			) : (
				<Tabs
					value={mainTab}
					onValueChange={(v) => setMainTab(v as typeof mainTab)}
				>
					<TabsList className='mb-4'>
						<TabsTrigger value='sales'>Sales</TabsTrigger>
						<TabsTrigger value='inventory'>Inventory</TabsTrigger>
						<TabsTrigger value='financial'>
							Supplier Payables
						</TabsTrigger>
						<TabsTrigger value='credit'>
							Customer Credit
						</TabsTrigger>
						<TabsTrigger value='operational'>
							Operational
						</TabsTrigger>
					</TabsList>

					<TabsContent value='sales'>
						<Tabs
							value={salesTab}
							onValueChange={(v) =>
								setSalesTab(v as typeof salesTab)
							}
							className='space-y-4'
						>
							<TabsList className='mb-2'>
								<TabsTrigger value='summary'>
									Summary
								</TabsTrigger>
								<TabsTrigger value='product'>
									By Product
								</TabsTrigger>
								<TabsTrigger value='registers'>
									By Register &amp; Tax
								</TabsTrigger>
							</TabsList>

							<div className='flex flex-wrap items-end gap-4 mb-2'>
								<div>
									<label className='block text-xs font-medium text-zinc-500 mb-1'>
										Store
									</label>
									<select
										value={selectedStoreId}
										onChange={(e) =>
											setSelectedStoreId(e.target.value)
										}
										className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
									>
										<option value=''>All stores</option>
										{stores.map((s) => (
											<option
												key={s._id}
												value={s._id}
											>
												{s.name}
												{s.code ? ` (${s.code})` : ''}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className='block text-xs font-medium text-zinc-500 mb-1'>
										Start date
									</label>
									<input
										type='date'
										value={startDate}
										onChange={(e) =>
											setStartDate(e.target.value)
										}
										className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
									/>
								</div>
								<div>
									<label className='block text-xs font-medium text-zinc-500 mb-1'>
										End date
									</label>
									<input
										type='date'
										value={endDate}
										onChange={(e) =>
											setEndDate(e.target.value)
										}
										className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
									/>
								</div>
							</div>

							<TabsContent
								value='summary'
								className='space-y-6'
							>
								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Daily Sales Summary (by store)
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/sales/daily-summary',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																		startDate,
																		endDate,
																		storeId:
																			selectedStoreId ||
																			undefined,
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'daily-sales-summary.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{dailySales.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No sales data available.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Date
														</TableHead>
														<TableHead>
															Store
														</TableHead>
														<TableHead className='text-right'>
															Orders
														</TableHead>
														<TableHead className='text-right'>
															Sales
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{dailySales.map(
														(row, idx) => (
															<TableRow key={idx}>
																<TableCell>
																	{row.day}
																</TableCell>
																<TableCell>
																	{
																		row.storeName
																	}
																</TableCell>
																<TableCell className='text-right'>
																	{
																		row.orderCount
																	}
																</TableCell>
																<TableCell className='text-right font-medium'>
																	{fmtMoney(
																		row.totalSales,
																	)}
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Monthly Sales Summary (by store)
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/sales/monthly-summary',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																		startDate,
																		endDate,
																		storeId:
																			selectedStoreId ||
																			undefined,
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'monthly-sales-summary.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{monthlySales.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No sales data available.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Month
														</TableHead>
														<TableHead>
															Store
														</TableHead>
														<TableHead className='text-right'>
															Orders
														</TableHead>
														<TableHead className='text-right'>
															Sales
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{monthlySales.map(
														(row, idx) => (
															<TableRow key={idx}>
																<TableCell>
																	{row.month}
																</TableCell>
																<TableCell>
																	{
																		row.storeName
																	}
																</TableCell>
																<TableCell className='text-right'>
																	{
																		row.orderCount
																	}
																</TableCell>
																<TableCell className='text-right font-medium'>
																	{fmtMoney(
																		row.totalSales,
																	)}
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent
								value='product'
								className='space-y-6'
							>
								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Sales by Product
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/sales/by-product',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																		startDate,
																		endDate,
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'sales-by-product.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{salesByProduct.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No sales data available.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															SKU
														</TableHead>
														<TableHead>
															Product
														</TableHead>
														<TableHead className='text-right'>
															Qty
														</TableHead>
														<TableHead className='text-right'>
															Revenue
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{salesByProduct.map(
														(row) => (
															<TableRow
																key={row._id}
															>
																<TableCell>
																	{row.sku}
																</TableCell>
																<TableCell>
																	{row.name}
																</TableCell>
																<TableCell className='text-right'>
																	{
																		row.totalQuantity
																	}
																</TableCell>
																<TableCell className='text-right font-medium'>
																	{fmtMoney(
																		row.totalRevenue,
																	)}
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent
								value='registers'
								className='space-y-6'
							>
								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Sales by Register
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/sales/by-register',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																		startDate,
																		endDate,
																		storeId:
																			selectedStoreId ||
																			undefined,
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'sales-by-register.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{salesByRegister.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No register sales data.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Register
														</TableHead>
														<TableHead>
															Store
														</TableHead>
														<TableHead className='text-right'>
															Orders
														</TableHead>
														<TableHead className='text-right'>
															Sales
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{salesByRegister.map(
														(row) => (
															<TableRow
																key={row._id}
															>
																<TableCell>
																	{row.registerName ||
																		row._id}
																</TableCell>
																<TableCell>
																	{
																		row.storeName
																	}
																</TableCell>
																<TableCell className='text-right'>
																	{
																		row.totalOrders
																	}
																</TableCell>
																<TableCell className='text-right font-medium'>
																	{fmtMoney(
																		row.totalSales,
																	)}
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>

								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Tax Collected (by store)
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/finance/tax-collected',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																		startDate,
																		endDate,
																		storeId:
																			selectedStoreId ||
																			undefined,
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'tax-collected.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{taxCollected.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No tax data available.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Store
														</TableHead>
														<TableHead className='text-right'>
															Orders
														</TableHead>
														<TableHead className='text-right'>
															Sales
														</TableHead>
														<TableHead className='text-right'>
															Tax Collected
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{taxCollected.map(
														(row, idx) => (
															<TableRow key={idx}>
																<TableCell>
																	{
																		row.storeName
																	}
																</TableCell>
																<TableCell className='text-right'>
																	{
																		row.orderCount
																	}
																</TableCell>
																<TableCell className='text-right'>
																	{fmtMoney(
																		row.totalSales,
																	)}
																</TableCell>
																<TableCell className='text-right font-medium'>
																	{fmtMoney(
																		row.totalTax,
																	)}
																</TableCell>
															</TableRow>
														),
													)}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</TabsContent>

					<TabsContent value='inventory'>
						<Tabs
							value={inventoryTab}
							onValueChange={(v) =>
								setInventoryTab(v as typeof inventoryTab)
							}
							className='space-y-4'
						>
							<TabsList className='mb-2'>
								<TabsTrigger value='total'>
									Total Stock Report
								</TabsTrigger>
								<TabsTrigger value='by-store'>
									By Store
								</TabsTrigger>
							</TabsList>

							<TabsContent
								value='total'
								className='space-y-6'
							>
								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Total Stock Report
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/inventory/total-stock',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'total-stock-report.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{totalStock.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No stock data available.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															SKU
														</TableHead>
														<TableHead>
															Product
														</TableHead>
														<TableHead className='text-right'>
															Total On Hand
														</TableHead>
														<TableHead className='text-right'>
															Total Reserved
														</TableHead>
														<TableHead className='text-right'>
															Total Available
														</TableHead>
														<TableHead className='text-right'>
															Stores
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{totalStock.map((row) => (
														<TableRow key={row._id}>
															<TableCell>
																{row.sku}
															</TableCell>
															<TableCell>
																{
																	row.productName
																}
															</TableCell>
															<TableCell className='text-right'>
																{row.quantity}
															</TableCell>
															<TableCell className='text-right'>
																{
																	row.reservedQuantity
																}
															</TableCell>
															<TableCell className='text-right font-medium'>
																{
																	row.availableQuantity
																}
															</TableCell>
															<TableCell className='text-right'>
																{row.storeCount}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>
							</TabsContent>

							<TabsContent
								value='by-store'
								className='space-y-6'
							>
								<div className='flex flex-wrap items-end gap-4'>
									<div>
										<label className='block text-xs font-medium text-zinc-500 mb-1'>
											Store
										</label>
										<select
											value={selectedStoreId}
											onChange={(e) =>
												setSelectedStoreId(
													e.target.value,
												)
											}
											className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
										>
											<option value=''>All stores</option>
											{stores.map((s) => (
												<option
													key={s._id}
													value={s._id}
												>
													{s.name}
													{s.code
														? ` (${s.code})`
														: ''}
												</option>
											))}
										</select>
									</div>
								</div>
								<Card>
									<CardHeader>
										<div className='flex items-center justify-between gap-4'>
											<CardTitle>
												Stock Levels by Store &amp;
												Product
											</CardTitle>
											<Button
												size='sm'
												variant='outline'
												onClick={async () => {
													try {
														const res =
															await api.get(
																'/reports/inventory/current-stock-levels',
																{
																	responseType:
																		'blob' as any,
																	params: {
																		format: 'csv',
																		storeId:
																			selectedStoreId ||
																			undefined,
																	},
																},
															);
														const blob = new Blob(
															[res.data],
															{
																type: 'text/csv;charset=utf-8;',
															},
														);
														const url =
															window.URL.createObjectURL(
																blob,
															);
														const link =
															document.createElement(
																'a',
															);
														link.href = url;
														link.download =
															'stock-levels-by-store.csv';
														document.body.appendChild(
															link,
														);
														link.click();
														document.body.removeChild(
															link,
														);
														window.URL.revokeObjectURL(
															url,
														);
													} catch (err) {
														console.error(
															'Failed to download CSV',
															err,
														);
													}
												}}
											>
												Download CSV
											</Button>
										</div>
									</CardHeader>
									<CardContent>
										{stockLevels.length === 0 ? (
											<p className='text-sm text-zinc-400'>
												No per-store stock data
												available.
											</p>
										) : (
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>
															Store
														</TableHead>
														<TableHead>
															SKU
														</TableHead>
														<TableHead>
															Product
														</TableHead>
														<TableHead className='text-right'>
															On Hand
														</TableHead>
														<TableHead className='text-right'>
															Reserved
														</TableHead>
														<TableHead className='text-right'>
															Available
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{stockLevels.map((row) => (
														<TableRow key={row._id}>
															<TableCell>
																{row.storeName}
															</TableCell>
															<TableCell>
																{row.sku}
															</TableCell>
															<TableCell>
																{
																	row.productName
																}
															</TableCell>
															<TableCell className='text-right'>
																{row.quantity}
															</TableCell>
															<TableCell className='text-right'>
																{
																	row.reservedQuantity
																}
															</TableCell>
															<TableCell className='text-right font-medium'>
																{
																	row.availableQuantity
																}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										)}
									</CardContent>
								</Card>
							</TabsContent>
						</Tabs>
					</TabsContent>

					<TabsContent
						value='financial'
						className='space-y-6'
					>
						<Card>
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Supplier Payables Summary (AP)
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/finance/supplier-payables',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'supplier-payables.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{supplierPayables.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No outstanding supplier balances.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Supplier</TableHead>
												<TableHead className='text-right'>
													Balance
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{supplierPayables.map((row) => (
												<TableRow key={row._id}>
													<TableCell>
														{row.name}
													</TableCell>
													<TableCell className='text-right font-medium'>
														{fmtMoney(
															row.currentBalance,
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
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Payables History
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/finance/supplier-payables-history',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
															startDate,
															endDate,
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'supplier-payables-history.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex flex-wrap items-end gap-4 mb-4'>
									<div>
										<label className='block text-xs font-medium text-zinc-500 mb-1'>
											Start date
										</label>
										<input
											type='date'
											value={startDate}
											onChange={(e) =>
												setStartDate(e.target.value)
											}
											className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
										/>
									</div>
									<div>
										<label className='block text-xs font-medium text-zinc-500 mb-1'>
											End date
										</label>
										<input
											type='date'
											value={endDate}
											onChange={(e) =>
												setEndDate(e.target.value)
											}
											className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
										/>
									</div>
								</div>
								{supplierPayablesHistory.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No supplier payables entries found.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Supplier</TableHead>
												<TableHead>Date</TableHead>
												<TableHead>Type</TableHead>
												<TableHead className='text-right'>
													Amount
												</TableHead>
												<TableHead className='text-right'>
													Balance
												</TableHead>
												<TableHead>PO #</TableHead>
												<TableHead>
													Description
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{supplierPayablesHistory.map(
												(row) => (
													<TableRow key={row._id}>
														<TableCell>
															{row.supplierName}
														</TableCell>
														<TableCell>
															{new Date(
																row.createdAt,
															).toLocaleDateString()}
														</TableCell>
														<TableCell className='capitalize'>
															{row.type.replace(
																/_/g,
																' ',
															)}
														</TableCell>
														<TableCell
															className={`text-right font-medium ${row.amount > 0 ? 'text-red-600' : 'text-green-600'}`}
														>
															{row.amount > 0
																? '+'
																: ''}
															{fmtMoney(
																row.amount,
															)}
														</TableCell>
														<TableCell className='text-right'>
															{fmtMoney(
																row.balance,
															)}
														</TableCell>
														<TableCell>
															{row.poNumber ||
																'—'}
														</TableCell>
														<TableCell className='text-zinc-500'>
															{row.description ||
																'—'}
														</TableCell>
													</TableRow>
												),
											)}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						value='credit'
						className='space-y-6'
					>
						<Card>
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Customer Credit Summary (AR)
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/finance/credit-exposure',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'customer-credit-summary.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{creditSummary.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No customers with outstanding balances.
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
													Credit Limit
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{creditSummary.map((row) => (
												<TableRow key={row._id}>
													<TableCell>
														{row.name}
													</TableCell>
													<TableCell className='text-right font-medium'>
														{fmtMoney(
															row.currentBalance,
														)}
													</TableCell>
													<TableCell className='text-right'>
														{fmtMoney(
															row.creditLimit,
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
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Credit Settlement History
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/finance/customer-credit-settlement-history',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
															startDate,
															endDate,
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'customer-credit-settlement-history.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className='flex flex-wrap items-end gap-4 mb-4'>
									<div>
										<label className='block text-xs font-medium text-zinc-500 mb-1'>
											Start date
										</label>
										<input
											type='date'
											value={startDate}
											onChange={(e) =>
												setStartDate(e.target.value)
											}
											className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
										/>
									</div>
									<div>
										<label className='block text-xs font-medium text-zinc-500 mb-1'>
											End date
										</label>
										<input
											type='date'
											value={endDate}
											onChange={(e) =>
												setEndDate(e.target.value)
											}
											className='h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm'
										/>
									</div>
								</div>
								{creditSettlement.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No credit settlement entries found.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Customer</TableHead>
												<TableHead>Date</TableHead>
												<TableHead>Type</TableHead>
												<TableHead className='text-right'>
													Amount
												</TableHead>
												<TableHead className='text-right'>
													Balance
												</TableHead>
												<TableHead>Order</TableHead>
												<TableHead>
													Description
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{creditSettlement.map((row) => (
												<TableRow key={row._id}>
													<TableCell>
														{row.customerName}
													</TableCell>
													<TableCell>
														{new Date(
															row.createdAt,
														).toLocaleDateString()}
													</TableCell>
													<TableCell className='capitalize'>
														{row.type}
													</TableCell>
													<TableCell
														className={`text-right font-medium ${row.amount > 0 ? 'text-red-600' : 'text-green-600'}`}
													>
														{row.amount > 0
															? '+'
															: ''}
														{fmtMoney(row.amount)}
													</TableCell>
													<TableCell className='text-right'>
														{fmtMoney(row.balance)}
													</TableCell>
													<TableCell>
														{row.orderNumber || '—'}
													</TableCell>
													<TableCell className='text-zinc-500'>
														{row.description || '—'}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					<TabsContent
						value='operational'
						className='space-y-6'
					>
						<Card>
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Returns &amp; Refunds Summary
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/operations/returns-summary',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
															startDate,
															endDate,
															storeId:
																selectedStoreId ||
																undefined,
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'returns-summary.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{returnsSummary.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No returns data available.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Type</TableHead>
												<TableHead>Store</TableHead>
												<TableHead className='text-right'>
													Count
												</TableHead>
												<TableHead className='text-right'>
													Total Amount
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{returnsSummary.map((row, idx) => (
												<TableRow key={idx}>
													<TableCell className='capitalize'>
														{row.type}
													</TableCell>
													<TableCell>
														{row.storeName}
													</TableCell>
													<TableCell className='text-right'>
														{row.count}
													</TableCell>
													<TableCell className='text-right font-medium'>
														{fmtMoney(
															row.totalAmount,
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
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Purchase Order Status Report
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/operations/purchase-order-status',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
															startDate,
															endDate,
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'purchase-order-status.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{poStatus.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No purchase orders found.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Status</TableHead>
												<TableHead className='text-right'>
													Count
												</TableHead>
												<TableHead className='text-right'>
													Total Amount
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{poStatus.map((row) => (
												<TableRow key={row._id}>
													<TableCell className='capitalize'>
														{row._id}
													</TableCell>
													<TableCell className='text-right'>
														{row.count}
													</TableCell>
													<TableCell className='text-right font-medium'>
														{fmtMoney(
															row.totalAmount,
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
							<CardHeader>
								<div className='flex items-center justify-between gap-4'>
									<CardTitle>
										Supplier Invoice Payment Status
									</CardTitle>
									<Button
										size='sm'
										variant='outline'
										onClick={async () => {
											try {
												const res = await api.get(
													'/reports/finance/supplier-invoice-payment-status',
													{
														responseType:
															'blob' as any,
														params: {
															format: 'csv',
															startDate,
															endDate,
														},
													},
												);
												const blob = new Blob(
													[res.data],
													{
														type: 'text/csv;charset=utf-8;',
													},
												);
												const url =
													window.URL.createObjectURL(
														blob,
													);
												const link =
													document.createElement('a');
												link.href = url;
												link.download =
													'supplier-invoice-payment-status.csv';
												document.body.appendChild(link);
												link.click();
												document.body.removeChild(link);
												window.URL.revokeObjectURL(url);
											} catch (err) {
												console.error(
													'Failed to download CSV',
													err,
												);
											}
										}}
									>
										Download CSV
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								{invoiceStatus.length === 0 ? (
									<p className='text-sm text-zinc-400'>
										No supplier invoices found.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Invoice</TableHead>
												<TableHead>Supplier</TableHead>
												<TableHead className='text-right'>
													Total
												</TableHead>
												<TableHead className='text-right'>
													Paid
												</TableHead>
												<TableHead className='text-right'>
													Outstanding
												</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{invoiceStatus.map((row) => (
												<TableRow key={row._id}>
													<TableCell>
														{row.invoiceNumber}
													</TableCell>
													<TableCell>
														{row.supplierName}
													</TableCell>
													<TableCell className='text-right'>
														{fmtMoney(
															row.totalAmount,
														)}
													</TableCell>
													<TableCell className='text-right'>
														{fmtMoney(
															row.paidAmount,
														)}
													</TableCell>
													<TableCell className='text-right font-medium'>
														{fmtMoney(
															row.outstandingAmount,
														)}
													</TableCell>
													<TableCell className='capitalize'>
														{row.status}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			)}
		</div>
		</SectionGuard>
	);
}
