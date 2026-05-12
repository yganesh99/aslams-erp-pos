'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
	ArrowLeft,
	Download,
	RotateCcw,
	CreditCard,
	History,
	ShoppingBag,
	RotateCcw as ReturnIcon,
	FileText,
	Archive,
} from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	EntityDetailPageHeader,
	entityHeaderArchiveButtonClassName,
} from '@/components/EntityStatusArchiveCard';
import { RefundModal } from '@/components/pos/RefundModal';
import type { Order as OrderApiType } from '@/lib/orderApi';

interface OrderItem {
	productId: string;
	sku: string;
	name: string;
	quantity: number;
	unitPrice: number;
	taxRate: number;
	taxAmount: number;
	lineTotal: number;
	cogsAmount?: number;
}

interface Payment {
	method: string;
	amount: number;
	reference?: string;
}

interface Order {
	_id: string;
	orderNumber: string;
	channel: string;
	status: string;
	customerId?: {
		_id: string;
		name: string;
		email?: string;
		phone?: string;
	} | null;
	storeId?: { _id: string; name: string } | null;
	items: OrderItem[];
	subtotal: number;
	taxAmount: number;
	/** Tax rate (%) in effect at order time (stored for reporting). */
	orderTaxRate?: number;
	shippingCost?: number;
	totalAmount: number;
	paymentMethod: string;
	payments: Payment[];
	/** POS cash / split cash: amount received and change given. */
	cashTendered?: number;
	cashChange?: number;
	creditUsed: number;
	notes?: string;
	shippingAddress?: string;
	customerName?: string;
	customerPhone?: string;
	createdAt: string;
}

interface AuditUser {
	name?: string;
	email?: string;
}

interface AuditLogEntry {
	_id: string;
	action: string;
	createdAt: string;
	userId?: AuditUser;
	changes?: Record<string, unknown>;
}

interface ReturnItem {
	productId: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
}

interface OrderReturn {
	_id: string;
	items: ReturnItem[];
	totalAmount: number;
	reason?: string;
	status: string;
	createdBy?: AuditUser;
	createdAt: string;
}

interface OrderHistoryResponse {
	auditLogs: AuditLogEntry[];
	returns: OrderReturn[];
}

/** Full lifecycle for ecommerce orders (POS status only changes via Refund/Return). */
const ECOMMERCE_STATUS_OPTIONS = [
	'pending',
	'confirmed',
	'processing',
	'shipped',
	'delivered',
	'cancelled',
	'partially_returned',
	'refunded',
];

export default function SingleOrderPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);
	const { user } = useAuth();

	const [order, setOrder] = useState<Order | null>(null);
	const [history, setHistory] = useState<OrderHistoryResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [invoiceDownloading, setInvoiceDownloading] = useState(false);
	const [orderForRefund, setOrderForRefund] = useState<Order | null>(null);
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [archiving, setArchiving] = useState(false);

	const totalFifoCogs =
		order?.items?.reduce(
			(sum, item) => sum + (item.cogsAmount ?? 0),
			0,
		) ?? 0;

	const fetchOrder = async () => {
		try {
			setIsLoading(true);
			const response = await api.get(`/orders/${id}`);
			const data = response.data.data || response.data;
			setOrder(data);
		} catch (error) {
			console.error('Failed to fetch order:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchHistory = async () => {
		try {
			const res = await api.get(`/orders/${id}/history`);
			setHistory(res.data);
		} catch (e) {
			console.error('Failed to fetch order history:', e);
			setHistory({ auditLogs: [], returns: [] });
		}
	};

	useEffect(() => {
		if (id) {
			fetchOrder();
		}
	}, [id]);

	useEffect(() => {
		if (id && order) {
			fetchHistory();
		}
	}, [id, order?._id]);

	const handleStatusChange = async (newStatus: string) => {
		try {
			setIsUpdatingStatus(true);
			await api.patch(`/orders/${id}/status`, { status: newStatus });
			await fetchOrder();
			toast.success(`Order status updated to "${newStatus}"`);
		} catch (error) {
			console.error('Failed to update status:', error);
			toast.error('Failed to update order status.');
		} finally {
			setIsUpdatingStatus(false);
		}
	};

	const handleDownloadInvoice = async () => {
		if (!order) return;
		setInvoiceDownloading(true);
		try {
			const res = await api.get(`/orders/${order._id}/invoice`, {
				responseType: 'blob',
			});
			const blob = new Blob([res.data], { type: 'application/pdf' });
			const url = URL.createObjectURL(blob);
			window.open(url, '_blank');
			toast.success('Invoice opened in new tab');
		} catch (err) {
			console.error('Failed to open invoice', err);
			toast.error(
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message ?? 'Failed to open invoice.',
			);
		} finally {
			setInvoiceDownloading(false);
		}
	};

	const handleRefundSuccess = () => {
		fetchOrder();
		fetchHistory();
		setOrderForRefund(null);
	};

	const canArchiveOrder =
		!!user &&
		['admin', 'store_manager', 'accountant'].includes(user.role ?? '');
	const canUpdateEcommerceOrderStatus = canArchiveOrder;
	const orderArchiveableStatuses = ['pending', 'cancelled'];
	/** Backend only allows soft-delete for these statuses (e.g. POS sales are usually `confirmed`). */
	const orderIsArchiveable =
		!!order && orderArchiveableStatuses.includes(order.status);

	const handleArchiveOrder = async () => {
		try {
			setArchiving(true);
			await api.delete(`/orders/${id}`);
			setArchiveOpen(false);
			toast.success('Order archived.');
			router.push('/sales');
		} catch (error: unknown) {
			console.error('Failed to archive order:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to archive order.');
		} finally {
			setArchiving(false);
		}
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

	const formatAuditAction = (action: string): string => {
		const labels: Record<string, string> = {
			pos_sale: 'Order created (POS)',
			ecommerce_confirm: 'Order confirmed',
			pos_return: 'Partial return processed',
			pos_refund: 'Refund processed',
			ecommerce_return: 'Return processed',
		};
		return labels[action] || action.replace(/_/g, ' ');
	};

	type TimelineEvent =
		| { type: 'audit'; date: string; entry: AuditLogEntry }
		| { type: 'return'; date: string; entry: OrderReturn };
	const timelineEvents: TimelineEvent[] = [
		...(history?.auditLogs ?? []).map((entry) => ({
			type: 'audit' as const,
			date: entry.createdAt,
			entry,
		})),
		...(history?.returns ?? []).map((entry) => ({
			type: 'return' as const,
			date: entry.createdAt,
			entry,
		})),
	].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	const formatDate = (dateStr: string) =>
		new Date(dateStr).toLocaleString(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		});

	if (isLoading) {
		return (
			<div className='p-8 text-center text-zinc-500'>
				Loading order details...
			</div>
		);
	}

	if (!order) {
		return (
			<div className='p-8 text-center text-red-500'>Order not found.</div>
		);
	}

	const customerName =
		typeof order.customerId === 'object' && order.customerId?.name
			? order.customerId.name
			: 'Walk-in Customer';
	const customerEmail =
		typeof order.customerId === 'object'
			? order.customerId?.email
			: undefined;
	const customerPhone =
		typeof order.customerId === 'object'
			? order.customerId?.phone
			: undefined;
	const customerId =
		typeof order.customerId === 'object'
			? order.customerId?._id
			: undefined;

	return (
		<SectionGuard requiredSection="sales">
			<div className='space-y-6'>
				<EntityDetailPageHeader
					leading={
						<div className='flex min-w-0 items-start gap-3 sm:gap-4'>
							<Button
								variant='ghost'
								size='icon'
								className='shrink-0'
								onClick={() => router.back()}
							>
								<ArrowLeft className='h-5 w-5' />
							</Button>
							<div className='min-w-0 flex-1 space-y-1'>
								<div className='flex flex-wrap items-center gap-x-2 gap-y-2'>
									<h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
										Order {order.orderNumber}
									</h2>
									<span
										className={cn(
											'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
											getStatusBadge(order.status),
										)}
									>
										{order.status}
									</span>
									{canArchiveOrder ? (
										<span className='max-w-xl text-xs text-zinc-500'>
											{orderIsArchiveable
												? 'Archiving soft-deletes this order so it no longer appears in lists. Use only for abandoned or cancelled orders. Invoices and refunds are separate.'
												: `Archiving is only available when status is pending or cancelled. This order is "${order.status}" (completed POS sales are usually confirmed).`}
										</span>
									) : null}
								</div>
								<p className='text-zinc-500'>
									{new Date(order.createdAt).toLocaleString()} | Channel:{' '}
									<span className='font-medium uppercase'>
										{order.channel}
									</span>
								</p>
							</div>
						</div>
					}
					actions={
						<>
							<Button
								variant='outline'
								size='sm'
								className='min-h-9 min-w-[7rem] shrink-0'
								disabled={
									invoiceDownloading ||
									order.status === 'pending' ||
									order.status === 'cancelled'
								}
								onClick={handleDownloadInvoice}
							>
								<Download className='mr-2 h-4 w-4' />
								{invoiceDownloading ? 'Opening…' : 'Open Invoice'}
							</Button>
							{!['cancelled', 'refunded'].includes(order.status) && (
								<Button
									variant='outline'
									size='sm'
									className='min-h-9 min-w-[7rem] shrink-0 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700'
									onClick={() => setOrderForRefund(order)}
								>
									<RotateCcw className='mr-2 h-4 w-4' />
									Refund / Return
								</Button>
							)}
							{canArchiveOrder ? (
								<Button
									type='button'
									variant='outline'
									size='sm'
									className={entityHeaderArchiveButtonClassName}
									disabled={!orderIsArchiveable}
									onClick={() => {
										if (orderIsArchiveable) setArchiveOpen(true);
									}}
								>
									<Archive className='mr-2 h-4 w-4' />
									Archive order
								</Button>
							) : null}
						</>
					}
				/>

				<Dialog
					open={archiveOpen}
					onOpenChange={setArchiveOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Archive this order?</DialogTitle>
						</DialogHeader>
						<p className='text-sm text-zinc-600'>
							This order will be hidden from lists. Status changes and refunds
							are separate from archiving.
						</p>
						<DialogFooter>
							<Button
								type='button'
								variant='outline'
								onClick={() => setArchiveOpen(false)}
								disabled={archiving}
							>
								Cancel
							</Button>
							<Button
								type='button'
								variant='destructive'
								onClick={handleArchiveOrder}
								disabled={archiving}
							>
								{archiving ? 'Archiving…' : 'Archive order'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
					<div className='md:col-span-2 space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>Order Items</CardTitle>
							</CardHeader>
							<CardContent>
								<Table className='min-w-[720px]'>
									<TableHeader>
										<TableRow>
											<TableHead>Product</TableHead>
											<TableHead>SKU</TableHead>
											<TableHead className='text-right'>
												Qty
											</TableHead>
											<TableHead className='text-right'>
												Unit Price
											</TableHead>
											<TableHead className='text-right'>
												Tax
											</TableHead>
											<TableHead className='text-right'>
												COGS (FIFO)
											</TableHead>
											<TableHead className='text-right'>
												Total
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{order.items.map((item, idx) => (
											<TableRow key={idx}>
												<TableCell className='font-medium'>
													{item.name}
												</TableCell>
												<TableCell>
													{item.sku}
												</TableCell>
												<TableCell className='text-right'>
													{item.quantity}
												</TableCell>
												<TableCell className='text-right'>
													රු
													{item.unitPrice.toFixed(2)}
												</TableCell>
												<TableCell className='text-right'>
													රු
													{(
														item.taxAmount || 0
													).toFixed(2)}
												</TableCell>
												<TableCell className='text-right text-zinc-600'>
													{item.cogsAmount != null
														? `රු${item.cogsAmount.toFixed(2)}`
														: '—'}
												</TableCell>
												<TableCell className='text-right font-medium'>
													රු
													{item.lineTotal.toFixed(2)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>

								<div className='mt-6 border-t pt-4 flex flex-col items-end space-y-2'>
									<div className='flex justify-between w-64 text-sm text-zinc-500'>
										<span>Subtotal:</span>
										<span>
											රු{order.subtotal.toFixed(2)}
										</span>
									</div>
									{totalFifoCogs > 0 && (
										<div className='flex justify-between w-64 text-sm text-zinc-600'>
											<span>COGS (FIFO, pre-tax basis):</span>
											<span>
												රු{totalFifoCogs.toFixed(2)}
											</span>
										</div>
									)}
									<div className='flex justify-between w-64 text-sm text-zinc-500'>
										<span>
											Tax
											{order.orderTaxRate != null &&
											order.orderTaxRate > 0
												? ` (${order.orderTaxRate}% at order time)`
												: ''}
											:
										</span>
										<span>
											රු
											{(order.taxAmount || 0).toFixed(2)}
										</span>
									</div>
									{order.channel === 'ecommerce' && (
										<div className='flex justify-between w-64 text-sm text-zinc-500'>
											<span>Shipping:</span>
											<span>
												{(order.shippingCost ?? 0) > 0
													? `රු${(order.shippingCost ?? 0).toFixed(2)}`
													: 'Free'}
											</span>
										</div>
									)}
									{order.creditUsed > 0 && (
										<div className='flex justify-between w-64 text-sm text-amber-600'>
											<span>Credit Used:</span>
											<span>
												-රු{order.creditUsed.toFixed(2)}
											</span>
										</div>
									)}
									<div className='flex justify-between w-64 text-lg font-bold'>
										<span>Total:</span>
										<span>
											රු{order.totalAmount.toFixed(2)}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className='space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>Customer Details</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div>
									<p className='text-sm text-zinc-500 font-medium'>
										Name
									</p>
									<p className='font-medium text-brand-dark'>
										{order.customerName || customerName}
									</p>
								</div>
								{(customerEmail || order.customerPhone || customerPhone) && (
									<div>
										<p className='text-sm text-zinc-500 font-medium'>
											Contact
										</p>
										{customerEmail && (
											<p className='text-sm'>
												{customerEmail}
											</p>
										)}
										{(order.customerPhone || customerPhone) && (
											<p className='text-sm'>
												{order.customerPhone || customerPhone}
											</p>
										)}
									</div>
								)}
								{order.shippingAddress && (
									<div>
										<p className='text-sm text-zinc-500 font-medium uppercase tracking-wider text-[10px]'>
											Shipping Address
										</p>
										<p className='text-sm whitespace-pre-line bg-zinc-50 p-3 rounded-md border mt-1'>
											{order.shippingAddress}
										</p>
									</div>
								)}
								{customerId && (
									<Button
										variant='outline'
										className='w-full text-sm'
										onClick={() =>
											router.push(
												`/accounts/customers/${customerId}`,
											)
										}
									>
										View Full Profile
									</Button>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Payment Details</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='flex items-center justify-between'>
									<p className='text-sm text-zinc-500 font-medium'>
										Method
									</p>
									<span className='px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 uppercase'>
										{order.paymentMethod}
									</span>
								</div>
								{order.cashTendered != null &&
									order.cashChange != null && (
										<>
											<div className='flex items-center justify-between text-sm'>
												<p className='text-zinc-500 font-medium'>
													Cash tendered
												</p>
												<span className='font-medium'>
													රු
													{order.cashTendered.toFixed(
														2,
													)}
												</span>
											</div>
											<div className='flex items-center justify-between text-sm'>
												<p className='text-zinc-500 font-medium'>
													Change
												</p>
												<span className='font-medium'>
													රු
													{order.cashChange.toFixed(2)}
												</span>
											</div>
										</>
									)}
								{order.payments &&
									order.payments.length > 0 && (
										<div className='space-y-2'>
											{order.payments.map((p, i) => (
												<div
													key={i}
													className='flex items-center space-x-2 p-3 bg-zinc-50 rounded-lg border'
												>
													<CreditCard className='w-5 h-5 text-zinc-400' />
													<div className='flex-1'>
														<p className='text-sm font-medium capitalize'>
															{p.method}
														</p>
														{p.reference && (
															<p className='text-xs text-zinc-500'>
																Ref:{' '}
																{p.reference}
															</p>
														)}
													</div>
													<span className='font-medium text-sm'>
														රු{p.amount.toFixed(2)}
													</span>
												</div>
											))}
										</div>
									)}
								{order.notes && (
									<div>
										<p className='text-sm text-zinc-500 font-medium'>
											Notes
										</p>
										<p className='text-sm mt-1'>
											{order.notes}
										</p>
									</div>
								)}
							</CardContent>
						</Card>

						{order.channel === 'ecommerce' &&
							canUpdateEcommerceOrderStatus && (
							<Card>
								<CardHeader>
									<CardTitle>Update Status</CardTitle>
								</CardHeader>
								<CardContent className='space-y-2'>
									<div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
										{ECOMMERCE_STATUS_OPTIONS.filter(
											(s) => s !== order.status,
										).map((status) => (
											<Button
												key={status}
												variant='outline'
												size='sm'
												className='capitalize text-xs'
												disabled={isUpdatingStatus}
												onClick={() =>
													handleStatusChange(status)
												}
											>
												{status}
											</Button>
										))}
									</div>
								</CardContent>
							</Card>
						)}
						{order.channel === 'ecommerce' &&
							!canUpdateEcommerceOrderStatus && (
							<Card>
								<CardHeader>
									<CardTitle>Status</CardTitle>
								</CardHeader>
								<CardContent>
									<p className='text-sm text-zinc-500'>
										You can view this order but cannot change
										its status with your current role.
									</p>
								</CardContent>
							</Card>
						)}
						{order.channel === 'pos' && (
							<Card>
								<CardHeader>
									<CardTitle>Status</CardTitle>
								</CardHeader>
								<CardContent>
									<p className='text-sm text-zinc-500'>
										POS order status can only be changed
										via Refund / Return above.
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<History className='w-5 h-5' />
							Order history
						</CardTitle>
						<p className='text-sm text-zinc-500 font-normal'>
							Creation, returns, refunds and other activity for audit.
						</p>
					</CardHeader>
					<CardContent>
						{timelineEvents.length === 0 ? (
							<p className='text-sm text-zinc-500 py-4'>
								No history entries yet. Order creation may not be audited for older orders.
							</p>
						) : (
							<div className='space-y-4'>
								{timelineEvents.map((ev) => (
									<div
										key={
											ev.type === 'audit'
												? ev.entry._id
												: `return-${ev.entry._id}`
										}
										className='flex gap-4 rounded-lg border p-4 text-sm'
									>
										<div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100'>
											{ev.type === 'audit' ? (
												ev.entry.action === 'pos_sale' ||
												ev.entry.action === 'ecommerce_confirm' ? (
													<ShoppingBag className='h-4 w-4 text-zinc-600' />
												) : ev.entry.action === 'pos_refund' ||
												  ev.entry.action === 'pos_return' ||
												  ev.entry.action === 'ecommerce_return' ? (
													<ReturnIcon className='h-4 w-4 text-amber-600' />
												) : (
													<FileText className='h-4 w-4 text-zinc-600' />
												)
											) : (
												<ReturnIcon className='h-4 w-4 text-amber-600' />
											)}
										</div>
										<div className='min-w-0 flex-1'>
											<div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
												<span className='font-medium text-zinc-900'>
													{ev.type === 'audit'
														? formatAuditAction(ev.entry.action)
														: 'Return / Refund'}
												</span>
												{ev.type === 'return' && (
													<>
														<span className='text-zinc-500'>·</span>
														<span className='font-medium'>
															රු{ev.entry.totalAmount.toFixed(2)}
														</span>
														<span
															className={`rounded px-1.5 py-0.5 text-xs font-medium ${
																ev.entry.status === 'completed'
																	? 'bg-green-100 text-green-700'
																	: ev.entry.status === 'approved'
																		? 'bg-blue-100 text-blue-700'
																		: 'bg-amber-100 text-amber-700'
															}`}
														>
															{ev.entry.status}
														</span>
													</>
												)}
											</div>
											{(ev.type === 'return' && ev.entry.reason) || (ev.type === 'audit' && ev.entry.changes && Object.keys(ev.entry.changes).length > 0) ? (
												<p className='mt-1 text-zinc-600'>
													{ev.type === 'return'
														? ev.entry.reason
														: (() => {
																const c = ev.type === 'audit' ? ev.entry.changes : {};
																const parts: string[] = [];
																if (c && typeof c === 'object') {
																	if (c.totalAmount != null) parts.push(`Amount: රු${Number(c.totalAmount).toFixed(2)}`);
																	if (c.refundTotal != null) parts.push(`Refund: රු${Number(c.refundTotal).toFixed(2)}`);
																	if (c.returnTotal != null) parts.push(`Return: රු${Number(c.returnTotal).toFixed(2)}`);
																	if (c.reason != null) parts.push(String(c.reason));
																	if (c.items != null) parts.push(`${c.items} item(s)`);
																}
																return parts.length ? parts.join(' · ') : JSON.stringify(c);
															})()}
												</p>
											) : null}
											<p className='mt-1 text-xs text-zinc-400'>
												{formatDate(ev.date)}
												{(ev.type === 'audit' ? ev.entry.userId : ev.entry.createdBy)?.name && (
													<> · by {(ev.type === 'audit' ? ev.entry.userId : ev.entry.createdBy)?.name}</>
												)}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<RefundModal
				order={orderForRefund as OrderApiType | null}
				open={!!orderForRefund}
				onClose={() => setOrderForRefund(null)}
				onSuccess={handleRefundSuccess}
			/>
		</SectionGuard>
	);
}
