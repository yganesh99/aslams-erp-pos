'use client';

import { useState, useEffect } from 'react';
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
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import SectionGuard from '@/components/SectionGuard';

interface Order {
	_id: string;
	orderNumber: string;
	channel: string;
	status: string;
	customerId?: { _id: string; name: string } | string | null;
	totalAmount: number;
	items: any[];
	createdAt: string;
}

export default function OrdersPage() {
	const router = useRouter();
	const [orders, setOrders] = useState<Order[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchOrders = async () => {
		try {
			setIsLoading(true);
			const response = await api.get('/orders');
			const data = response.data;
			const list = data.items || data.data || data || [];
			setOrders(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error('Failed to fetch orders:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchOrders();
	}, []);

	const getCustomerName = (order: Order) => {
		if (!order.customerId) return 'Walk-in Customer';
		if (typeof order.customerId === 'object' && order.customerId?.name) {
			return order.customerId.name;
		}
		return 'Customer';
	};

	const getStatusBadge = (status: string) => {
		const colors: Record<string, string> = {
			pending: 'bg-amber-100 text-amber-700',
			confirmed: 'bg-blue-100 text-blue-700',
			processing: 'bg-amber-100 text-amber-700',
			shipped: 'bg-blue-100 text-blue-700',
			delivered: 'bg-green-100 text-green-700',
			cancelled: 'bg-red-100 text-red-700',
			partially_returned: 'bg-orange-100 text-orange-700',
			refunded: 'bg-zinc-100 text-zinc-700',
		};
		return colors[status] || 'bg-zinc-100 text-zinc-700';
	};

	return (
		<SectionGuard requiredSection='sales'>
		<div className='space-y-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h2 className='text-3xl font-bold tracking-tight'>
						Orders
					</h2>
					<p className='text-zinc-500'>
						Manage customer orders, shipments, and returns.
					</p>
				</div>
				<Button
					variant='outline'
					className='w-full sm:w-auto'
				>
					<Download className='w-4 h-4 mr-2' />
					Export CSV
				</Button>
			</div>

			<Card>
				<CardHeader className='flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between'>
					<CardTitle>Recent Orders</CardTitle>
					<div className='relative w-full max-w-md'>
						<Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
						<input
							type='text'
							placeholder='Search by Order ID or Customer...'
							className='w-full pl-9 pr-4 py-1.5 border border-brand-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue sm:min-w-[16rem]'
						/>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className='text-center text-zinc-500 py-8'>
							Loading orders...
						</p>
					) : orders.length === 0 ? (
						<p className='text-center text-zinc-500 py-8'>
							No orders found.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Order ID</TableHead>
									<TableHead>Channel</TableHead>
									<TableHead>Date</TableHead>
									<TableHead>Customer</TableHead>
									<TableHead>Items</TableHead>
									<TableHead className='text-right'>
										Total Amount
									</TableHead>
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
										<TableCell className='font-medium text-brand-blue hover:underline'>
											{order.orderNumber}
										</TableCell>
										<TableCell>
											<span
												className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
													order.channel === 'pos'
														? 'bg-zinc-100 text-zinc-600'
														: 'bg-blue-50 text-blue-600 border border-blue-100'
												}`}
											>
												{order.channel}
											</span>
										</TableCell>
										<TableCell className='text-zinc-500'>
											{new Date(
												order.createdAt,
											).toLocaleDateString()}
										</TableCell>
										<TableCell>
											{getCustomerName(order)}
										</TableCell>
										<TableCell>
											{order.items?.length || 0}
										</TableCell>
										<TableCell className='text-right font-medium'>
											රු
											{(order.totalAmount || 0).toFixed(
												2,
											)}
										</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}
											>
												{order.status}
											</span>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
		</SectionGuard>
	);
}
