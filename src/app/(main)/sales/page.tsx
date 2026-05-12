'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getOrders } from '@/lib/orderApi';
import { getCustomers } from '@/lib/customerApi';
import type { Customer } from '@/lib/customerApi';

interface Order {
	_id: string;
	orderNumber: string;
	channel: string;
	status: string;
	customerId?: { _id: string; name?: string } | string | null;
	totalAmount: number;
	subtotal: number;
	taxAmount: number;
	paymentMethod: string;
	createdAt: string;
}

const PAYMENT_OPTIONS = [
	{ value: '', label: 'All payment types' },
	{ value: 'cash', label: 'Cash' },
	{ value: 'card', label: 'Card' },
	{ value: 'qr', label: 'QR' },
	{ value: 'split', label: 'Split' },
	{ value: 'credit', label: 'Credit' },
];

const CHANNEL_OPTIONS = [
	{ value: '', label: 'All channels' },
	{ value: 'pos', label: 'POS' },
];

const STATUS_OPTIONS = [
	{ value: '', label: 'All statuses' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'confirmed', label: 'Confirmed' },
	{ value: 'processing', label: 'Processing' },
	{ value: 'shipped', label: 'Shipped' },
	{ value: 'delivered', label: 'Delivered' },
	{ value: 'cancelled', label: 'Cancelled' },
	{ value: 'partially_returned', label: 'Partially returned' },
	{ value: 'refunded', label: 'Refunded' },
];

export default function SalesOrdersPage() {
	const router = useRouter();
	const [orders, setOrders] = useState<Order[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [customers, setCustomers] = useState<Customer[]>([]);

	const [searchInput, setSearchInput] = useState('');
	const [search, setSearch] = useState('');
	const [paymentType, setPaymentType] = useState('');
	const [channel, setChannel] = useState('');
	const [customerId, setCustomerId] = useState('');
	const [status, setStatus] = useState('');
	const [showFilters, setShowFilters] = useState(true);

	const fetchOrders = useCallback(async () => {
		try {
			setIsLoading(true);
			const params: Parameters<typeof getOrders>[0] = {
				page: 1,
				limit: 200,
			};
			if (search.trim()) params.search = search.trim();
			if (paymentType) params.paymentMethod = paymentType;
			if (channel) params.channel = channel;
			if (customerId) params.customerId = customerId;
			if (status) params.status = status;
			const result = await getOrders(params);
			const list = result?.items ?? [];
			setOrders(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error('Failed to fetch orders:', error);
			setOrders([]);
		} finally {
			setIsLoading(false);
		}
	}, [search, paymentType, channel, customerId, status]);

	useEffect(() => {
		const t = setTimeout(() => setSearch(searchInput), 300);
		return () => clearTimeout(t);
	}, [searchInput]);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders]);

	useEffect(() => {
		getCustomers(undefined, 1, 500)
			.then((res) => setCustomers(res.items ?? []))
			.catch(() => setCustomers([]));
	}, []);

	const todayStr = new Date().toISOString().split('T')[0];
	const todayOrders = orders.filter((o) => o.createdAt?.startsWith(todayStr));
	const todaySales = todayOrders.reduce(
		(sum, o) => sum + (o.totalAmount || 0),
		0,
	);
	const pendingOrders = orders.filter(
		(o) => o.status === 'pending' || o.status === 'processing',
	);
	const monthTotal = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

	const getCustomerName = (order: Order) => {
		if (!order.customerId) return 'Walk-in Customer';
		if (typeof order.customerId === 'object' && order.customerId?.name) {
			return order.customerId.name;
		}
		return 'Customer';
	};

	const getPaymentBadge = (method: string) => {
		const colors: Record<string, string> = {
			cash: 'bg-green-100 text-green-700',
			card: 'bg-blue-100 text-blue-700',
			credit: 'bg-amber-100 text-amber-700',
			qr: 'bg-purple-100 text-purple-700',
			split: 'bg-zinc-100 text-zinc-700',
		};
		return colors[method] || 'bg-zinc-100 text-zinc-700';
	};

	const getStatusBadge = (status: string) => {
		const colors: Record<string, string> = {
			pending: 'bg-amber-100 text-amber-700',
			confirmed: 'bg-blue-100 text-blue-700',
			processing: 'bg-blue-100 text-blue-700',
			shipped: 'bg-indigo-100 text-indigo-700',
			delivered: 'bg-green-100 text-green-700',
			cancelled: 'bg-red-100 text-red-700',
			partially_returned: 'bg-orange-100 text-orange-700',
			refunded: 'bg-zinc-100 text-zinc-700',
		};
		return colors[status] || 'bg-zinc-100 text-zinc-700';
	};

	const hasActiveFilters =
		searchInput.trim() || paymentType || channel || customerId || status;
	const clearFilters = () => {
		setSearchInput('');
		setSearch('');
		setPaymentType('');
		setChannel('');
		setCustomerId('');
		setStatus('');
	};

	const selectClass =
		'h-9 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-1';

	return (
		<SectionGuard requiredSection='sales'>
			<div className='space-y-6'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h2 className='text-3xl font-bold tracking-tight'>
							Sales & Invoicing
						</h2>
						<p className='text-zinc-500'>
							Manage customer orders, invoices, and analytics.
						</p>
					</div>
					{/* <div className='flex items-center space-x-3'>
						<Button variant='outline'>
							<Download className='w-4 h-4 mr-2' />
							Export Sales
						</Button>
					</div> */}
				</div>

				<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Total Sales (Today)
							</p>
							<p className='text-2xl font-bold mt-2'>
								රු{todaySales.toFixed(2)}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Orders (Today)
							</p>
							<p className='text-2xl font-bold mt-2'>
								{todayOrders.length}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Pending Orders
							</p>
							<p className='text-2xl font-bold mt-2 text-amber-600'>
								{pendingOrders.length}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Total (All Time)
							</p>
							<p className='text-2xl font-bold mt-2'>
								රු{monthTotal.toFixed(2)}
							</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader className='flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between'>
						<CardTitle>Recent Orders</CardTitle>
						<div className='flex flex-wrap items-center gap-2'>
							<div className='relative min-w-0 flex-1 sm:max-w-xs'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400' />
								<Input
									type='text'
									placeholder='Search by order number...'
									className='h-9 w-full min-w-0 pl-9 pr-4 py-1.5 text-sm sm:w-56'
									value={searchInput}
									onChange={(e) =>
										setSearchInput(e.target.value)
									}
								/>
							</div>
							<Button
								variant='outline'
								size='sm'
								className='h-9'
								onClick={() => setShowFilters((v) => !v)}
							>
								<Filter className='w-4 h-4 mr-1.5' />
								{showFilters ? 'Hide filters' : 'Show filters'}
								{hasActiveFilters && (
									<span className='ml-1.5 h-2 w-2 rounded-full bg-zinc-600' />
								)}
							</Button>
							{hasActiveFilters && (
								<Button
									variant='ghost'
									size='sm'
									className='h-9 text-zinc-600'
									onClick={clearFilters}
								>
									<X className='w-4 h-4 mr-1' />
									Clear
								</Button>
							)}
						</div>
					</CardHeader>
					{showFilters && (
						<div className='px-6 pb-4 flex flex-wrap items-center gap-3 border-b border-zinc-100'>
							<div className='flex items-center gap-2'>
								<label className='text-xs font-medium text-zinc-500 whitespace-nowrap'>
									Payment
								</label>
								<select
									className={selectClass}
									value={paymentType}
									onChange={(e) =>
										setPaymentType(e.target.value)
									}
								>
									{PAYMENT_OPTIONS.map((o) => (
										<option
											key={o.value || 'all'}
											value={o.value}
										>
											{o.label}
										</option>
									))}
								</select>
							</div>
							<div className='flex items-center gap-2'>
								<label className='text-xs font-medium text-zinc-500 whitespace-nowrap'>
									Channel
								</label>
								<select
									className={selectClass}
									value={channel}
									onChange={(e) => setChannel(e.target.value)}
								>
									{CHANNEL_OPTIONS.map((o) => (
										<option
											key={o.value || 'all'}
											value={o.value}
										>
											{o.label}
										</option>
									))}
								</select>
							</div>
							<div className='flex items-center gap-2'>
								<label className='text-xs font-medium text-zinc-500 whitespace-nowrap'>
									Customer
								</label>
								<select
									className={`${selectClass} min-w-[160px]`}
									value={customerId}
									onChange={(e) =>
										setCustomerId(e.target.value)
									}
								>
									<option value=''>All customers</option>
									{customers.map((c) => (
										<option
											key={c._id}
											value={c._id}
										>
											{c.name}
										</option>
									))}
								</select>
							</div>
							<div className='flex items-center gap-2'>
								<label className='text-xs font-medium text-zinc-500 whitespace-nowrap'>
									Status
								</label>
								<select
									className={selectClass}
									value={status}
									onChange={(e) => setStatus(e.target.value)}
								>
									{STATUS_OPTIONS.map((o) => (
										<option
											key={o.value || 'all'}
											value={o.value}
										>
											{o.label}
										</option>
									))}
								</select>
							</div>
						</div>
					)}
					<CardContent>
						{isLoading ? (
							<p className='py-8 text-center text-zinc-500'>
								Loading orders...
							</p>
						) : orders.length === 0 ? (
							<p className='py-8 text-center text-zinc-500'>
								No orders found.
							</p>
						) : (
							<>
								<div className='space-y-3 md:hidden'>
									{orders.map((order) => (
										<Card
											key={order._id}
											className='cursor-pointer border-zinc-200 shadow-sm transition-colors hover:bg-zinc-50'
											onClick={() =>
												router.push(
													`/sales/orders/${order._id}`,
												)
											}
										>
											<CardContent className='space-y-2 p-4'>
												<div className='flex items-start justify-between gap-2'>
													<div>
														<p className='font-medium text-black'>
															{order.orderNumber}
														</p>
														<p className='text-xs text-zinc-500'>
															{new Date(
																order.createdAt,
															).toLocaleDateString()}
														</p>
													</div>
													<span
														className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(order.status)}`}
													>
														{order.status}
													</span>
												</div>
												<p className='text-sm text-zinc-600'>
													{getCustomerName(order)}
												</p>
												<div className='flex flex-wrap items-center gap-2 text-sm'>
													<span className='rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-700'>
														{order.channel}
													</span>
													<span
														className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getPaymentBadge(order.paymentMethod)}`}
													>
														{order.paymentMethod}
													</span>
													<span className='ml-auto font-medium'>
														රු
														{(
															order.totalAmount ||
															0
														).toFixed(2)}
													</span>
												</div>
											</CardContent>
										</Card>
									))}
								</div>
								<div className='hidden md:block'>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Order ID</TableHead>
												<TableHead>Date</TableHead>
												<TableHead>Customer</TableHead>
												<TableHead>Channel</TableHead>
												<TableHead className='text-right'>
													Total
												</TableHead>
												<TableHead>Payment</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{orders.map((order) => (
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
														{order.orderNumber}
													</TableCell>
													<TableCell>
														{new Date(
															order.createdAt,
														).toLocaleDateString()}
													</TableCell>
													<TableCell>
														{getCustomerName(order)}
													</TableCell>
													<TableCell>
														<span className='rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium uppercase text-zinc-700'>
															{order.channel}
														</span>
													</TableCell>
													<TableCell className='text-right font-medium'>
														රු
														{(
															order.totalAmount ||
															0
														).toFixed(2)}
													</TableCell>
													<TableCell>
														<span
															className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getPaymentBadge(order.paymentMethod)}`}
														>
															{
																order.paymentMethod
															}
														</span>
													</TableCell>
													<TableCell>
														<span
															className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(order.status)}`}
														>
															{order.status}
														</span>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</SectionGuard>
	);
}
