'use client';

import {
	Receipt,
	Clock,
	CreditCard,
	ChevronRight,
	RotateCcw,
	FileText,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePosStore } from '../store';
import { useRouter } from 'next/navigation';
import { getOrders, type Order } from '@/lib/orderApi';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefundModal } from '@/components/pos/RefundModal';
import api from '@/lib/api';

export default function PosOrdersPage() {
	const [mounted, setMounted] = useState(false);
	const session = usePosStore((state) => state.session);
	const router = useRouter();

	const [orders, setOrders] = useState<Order[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [orderForRefund, setOrderForRefund] = useState<Order | null>(null);
	const [refresh, setRefresh] = useState(0);
	const [invoiceLoadingId, setInvoiceLoadingId] = useState<string | null>(
		null,
	);

	const handleGenerateInvoice = async (orderId: string) => {
		setInvoiceLoadingId(orderId);
		try {
			const res = await api.get(`/orders/${orderId}/invoice`, {
				responseType: 'blob',
			});
			const blob = new Blob([res.data], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank');
		} catch (err) {
			console.error('Failed to generate invoice..', err);
			// Optional: show toast if you have it
		} finally {
			setInvoiceLoadingId(null);
		}
	};

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const isMounted = true;
		async function fetchSessionOrders() {
			if (!session || !session._id) return;
			try {
				setLoading(true);
				const data = await getOrders({
					sessionId: session._id,
					limit: 100,
				});
				if (isMounted) {
					setOrders(data.items);
					setError(null);
				}
			} catch (err: unknown) {
				console.error('Failed to load orders:', err);
				if (isMounted)
					setError('Failed to load orders. Please try again.');
			} finally {
				if (isMounted) setLoading(false);
			}
		}

		if (mounted && session) {
			fetchSessionOrders();
		}
	}, [mounted, session, refresh]);

	if (!mounted) return null;

	if (!session) {
		router.replace('/registers');
		return null;
	}

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatAmount = (amount: number) => {
		return `රු ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	};

	return (
		<div className='flex-1 flex flex-col p-6 h-[calc(100vh-64px)] overflow-hidden'>
			<div className='flex items-center justify-between mb-6'>
				<div className='flex items-center gap-3'>
					<Receipt className='w-8 h-8 text-black' />
					<h1 className='text-2xl font-bold text-black tracking-tight'>
						Session Orders
					</h1>
					{!loading && !error && (
						<Badge
							variant='outline'
							className='ml-2'
						>
							{orders.length} orders
						</Badge>
					)}
				</div>
			</div>

			<div className='flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col'>
				{loading ? (
					<div className='divide-y divide-zinc-100 flex-1 overflow-y-auto'>
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={i}
								className='p-5 flex items-center gap-4 animate-pulse'
							>
								<div className='w-12 h-12 bg-zinc-100 rounded-lg flex-shrink-0' />
								<div className='space-y-2 flex-1'>
									<div className='h-4 bg-zinc-100 rounded w-1/4' />
									<div className='h-3 bg-zinc-100 rounded w-1/3' />
								</div>
								<div className='h-6 bg-zinc-100 rounded w-20' />
							</div>
						))}
					</div>
				) : error ? (
					<div className='flex-1 flex flex-col items-center justify-center p-8 text-center'>
						<p className='text-red-500 font-medium mb-2'>{error}</p>
						<button
							onClick={() => window.location.reload()}
							className='text-sm text-zinc-500 hover:text-black hover:underline mt-2'
						>
							Refresh page
						</button>
					</div>
				) : orders.length === 0 ? (
					<div className='flex-1 flex flex-col items-center justify-center p-8 text-center'>
						<Receipt className='w-16 h-16 text-zinc-200 mb-4' />
						<h2 className='text-xl font-bold text-zinc-900 mb-2'>
							No Recent Orders
						</h2>
						<p className='text-zinc-500 max-w-sm'>
							You haven&apos;t processed any orders on this
							register yet in this session(from register opening
							to now). Your completed orders will appear here.
						</p>
					</div>
				) : (
					<div className='flex-1 overflow-y-auto'>
						<ul className='divide-y divide-zinc-100'>
							{orders.map((order) => (
								<li key={order._id}>
									<div className='w-full p-5 flex items-center gap-4 hover:bg-zinc-50 transition-colors text-left group'>
										<div className='w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0'>
											<Receipt className='w-6 h-6 text-zinc-600' />
										</div>

										<div className='flex-1 min-w-0'>
											<div className='flex items-center gap-2 mb-1'>
												<span className='font-semibold text-zinc-900 truncate'>
													{order.orderNumber}
												</span>
												<Badge
													variant='secondary'
													className='text-xs uppercase'
												>
													{order.status}
												</Badge>
											</div>
											<div className='flex items-center gap-4 text-sm text-zinc-500'>
												<span className='flex items-center gap-1.5'>
													<Clock className='w-3.5 h-3.5' />
													{formatTime(
														order.createdAt,
													)}
												</span>
												<span className='flex items-center gap-1.5 capitalize'>
													<CreditCard className='w-3.5 h-3.5' />
													{order.paymentMethod}
												</span>
												<span>
													{order.items.length} item
													{order.items.length !== 1 &&
														's'}
												</span>
											</div>
										</div>

										<div className='flex items-center gap-2 flex-shrink-0'>
											<Button
												variant='outline'
												size='sm'
												disabled={
													invoiceLoadingId ===
													order._id
												}
												onClick={(e) => {
													e.stopPropagation();
													handleGenerateInvoice(
														order._id,
													);
												}}
											>
												<FileText className='w-3.5 h-3.5 mr-1' />
												{invoiceLoadingId === order._id
													? 'Opening…'
													: 'Invoice'}
											</Button>
											{!['refunded'].includes(
												order.status,
											) && (
												<Button
													variant='outline'
													size='sm'
													className='text-amber-700 border-amber-200 hover:bg-amber-50'
													onClick={(e) => {
														e.stopPropagation();
														setOrderForRefund(
															order,
														);
													}}
												>
													<RotateCcw className='w-3.5 h-3.5 mr-1' />
													Return / Refund
												</Button>
											)}
											<span className='font-bold text-zinc-900 text-lg'>
												{formatAmount(
													order.totalAmount,
												)}
											</span>
											<ChevronRight className='w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors mt-1' />
										</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<RefundModal
				order={orderForRefund}
				open={!!orderForRefund}
				onClose={() => setOrderForRefund(null)}
				onSuccess={() => setRefresh((r) => r + 1)}
			/>
		</div>
	);
}
