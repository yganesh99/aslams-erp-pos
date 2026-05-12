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
import { Input } from '@/components/ui/input';
import {
	ArrowLeft,
	Printer,
	Download,
	CheckCircle,
	PackageCheck,
	Ban,
	Send,
	Archive,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
	EntityDetailPageHeader,
	entityHeaderArchiveButtonClassName,
} from '@/components/EntityStatusArchiveCard';

interface POItem {
	productId: string;
	sku: string;
	name: string;
	orderedQty: number;
	receivedQty: number;
	unitPrice: number;
	lineTotal: number;
}

interface PurchaseOrder {
	_id: string;
	poNumber: string;
	status: string;
	supplierId?: {
		_id: string;
		name: string;
		email?: string;
		phone?: string;
	} | null;
	items: POItem[];
	totalAmount: number;
	notes?: string;
	createdBy?: { _id: string; name: string } | null;
	approvedBy?: { _id: string; name: string } | null;
	createdAt: string;
}

export default function SinglePurchaseOrderPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);
	const { user } = useAuth();

	const [po, setPo] = useState<PurchaseOrder | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isActioning, setIsActioning] = useState(false);

	// Receive dialog state
	const [isReceiveOpen, setIsReceiveOpen] = useState(false);
	const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});
	const [receiveStoreId, setReceiveStoreId] = useState<string>('');
	const [stores, setStores] = useState<{ _id: string; name: string; code?: string }[]>([]);
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [archiving, setArchiving] = useState(false);

	const fetchPO = async () => {
		try {
			setIsLoading(true);
			const response = await api.get(`/purchase-orders/${id}`);
			const data = response.data.data || response.data;
			setPo(data);
		} catch (error) {
			console.error('Failed to fetch PO:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (id) fetchPO();
	}, [id]);

	useEffect(() => {
		api.get('/stores')
			.then((res) => {
				const list = res.data?.data ?? res.data;
				const arr = Array.isArray(list) ? list : list?.items ?? [];
				setStores(arr);
				if (arr.length > 0 && !receiveStoreId) setReceiveStoreId(arr[0]._id);
			})
			.catch(() => {});
	}, []);

	const handleApprove = async () => {
		try {
			setIsActioning(true);
			await api.patch(`/purchase-orders/${id}/approve`);
			await fetchPO();
			toast.success('Purchase order approved!');
		} catch (error) {
			console.error('Failed to approve PO:', error);
			toast.error('Failed to approve purchase order.');
		} finally {
			setIsActioning(false);
		}
	};

	const handleSend = async () => {
		try {
			setIsActioning(true);
			await api.patch(`/purchase-orders/${id}/send`);
			await fetchPO();
			toast.success('Purchase order marked as sent!');
		} catch (error) {
			console.error('Failed to send PO:', error);
			toast.error('Failed to mark as sent.');
		} finally {
			setIsActioning(false);
		}
	};

	const handleCancel = async () => {
		if (!confirm('Are you sure you want to cancel this purchase order?'))
			return;
		try {
			setIsActioning(true);
			await api.patch(`/purchase-orders/${id}/cancel`);
			await fetchPO();
			toast.success('Purchase order cancelled.');
		} catch (error) {
			console.error('Failed to cancel PO:', error);
			toast.error('Failed to cancel purchase order.');
		} finally {
			setIsActioning(false);
		}
	};

	const canArchivePo =
		user?.role === 'admin' &&
		po &&
		(po.status === 'draft' || po.status === 'cancelled');

	const handleArchivePo = async () => {
		try {
			setArchiving(true);
			await api.delete(`/purchase-orders/${id}`);
			setArchiveOpen(false);
			toast.success('Purchase order archived.');
			router.push('/inventory/purchase-orders');
		} catch (error: unknown) {
			console.error('Failed to archive PO:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to archive purchase order.');
		} finally {
			setArchiving(false);
		}
	};

	const openReceiveDialog = () => {
		if (!po) return;
		const initial: Record<string, number> = {};
		po.items.forEach((item) => {
			const remaining = item.orderedQty - item.receivedQty;
			initial[item.productId] = remaining > 0 ? remaining : 0;
		});
		setReceiveQtys(initial);
		if (stores.length > 0 && !receiveStoreId) setReceiveStoreId(stores[0]._id);
		setIsReceiveOpen(true);
	};

	const handleReceive = async () => {
		try {
			const items = Object.entries(receiveQtys)
				.filter(([, qty]) => qty > 0)
				.map(([productId, quantity]) => ({ productId, quantity }));
			if (items.length === 0) {
				toast.info('No quantities to receive.');
				return;
			}
			if (!receiveStoreId) {
				toast.error('Please select a store to receive into.');
				return;
			}
			setIsActioning(true);
			await api.post(`/purchase-orders/${id}/receive`, {
				storeId: receiveStoreId,
				items,
			});
			setIsReceiveOpen(false);
			await fetchPO();
			toast.success('Goods received successfully!');
		} catch (error) {
			console.error('Failed to receive goods:', error);
			toast.error('Failed to receive goods.');
		} finally {
			setIsActioning(false);
		}
	};

	const getStatusBadge = (status: string) => {
		const colors: Record<string, string> = {
			draft: 'bg-zinc-100 text-zinc-700',
			approved: 'bg-blue-100 text-blue-700',
			sent: 'bg-indigo-100 text-indigo-700',
			partial_received: 'bg-amber-100 text-amber-700',
			closed: 'bg-green-100 text-green-700',
			cancelled: 'bg-red-100 text-red-700',
		};
		return colors[status] || 'bg-zinc-100 text-zinc-700';
	};

	if (isLoading) {
		return (
			<div className='p-8 text-center text-zinc-500'>
				Loading purchase order...
			</div>
		);
	}

	if (!po) {
		return (
			<div className='p-8 text-center text-red-500'>
				Purchase order not found.
			</div>
		);
	}

	const supplierName =
		typeof po.supplierId === 'object' ? po.supplierId?.name : '—';
	const supplierEmail =
		typeof po.supplierId === 'object' ? po.supplierId?.email : undefined;
	const supplierPhone =
		typeof po.supplierId === 'object' ? po.supplierId?.phone : undefined;
	const supplierObjId =
		typeof po.supplierId === 'object' ? po.supplierId?._id : undefined;
	const isTerminal = po.status === 'closed' || po.status === 'cancelled';

	return (
		<SectionGuard requiredSection="inventory.purchase-orders">
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
										{po.poNumber}
									</h2>
									<span
										className={cn(
											'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
											getStatusBadge(po.status),
										)}
									>
										{po.status.replace('_', ' ')}
									</span>
									{canArchivePo ? (
										<span className='max-w-xl text-xs text-zinc-500'>
											Only draft or cancelled POs can be archived (soft
											delete). Cancel PO keeps the record but marks it
											cancelled; archive hides it from lists.
										</span>
									) : null}
								</div>
								<p className='text-zinc-500'>
									Created:{' '}
									{new Date(po.createdAt).toLocaleString()}
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
							>
								<Printer className='mr-2 h-4 w-4' />
								Print
							</Button>
							<Button
								variant='outline'
								size='sm'
								className='min-h-9 min-w-[7rem] shrink-0'
							>
								<Download className='mr-2 h-4 w-4' />
								Download PDF
							</Button>
							{!isTerminal && (
								<Button
									variant='outline'
									size='sm'
									className='min-h-9 min-w-[7rem] shrink-0 text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700'
									onClick={handleCancel}
									disabled={isActioning}
								>
									<Ban className='mr-2 h-4 w-4' />
									Cancel PO
								</Button>
							)}
							{canArchivePo ? (
								<Button
									type='button'
									variant='outline'
									size='sm'
									className={entityHeaderArchiveButtonClassName}
									onClick={() => setArchiveOpen(true)}
								>
									<Archive className='mr-2 h-4 w-4' />
									Archive PO
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
							<DialogTitle>Archive this purchase order?</DialogTitle>
						</DialogHeader>
						<p className='text-sm text-zinc-600'>
							This PO will be hidden from lists. Cancel PO is separate and keeps
							the row with a cancelled status.
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
								onClick={handleArchivePo}
								disabled={archiving}
							>
								{archiving ? 'Archiving…' : 'Archive PO'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
					<div className='md:col-span-2 space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>PO Items</CardTitle>
							</CardHeader>
							<CardContent>
								<Table className='min-w-[640px]'>
									<TableHeader>
										<TableRow>
											<TableHead>Product</TableHead>
											<TableHead>SKU</TableHead>
											<TableHead className='text-right'>
												Ordered
											</TableHead>
											<TableHead className='text-right'>
												Received
											</TableHead>
											<TableHead className='text-right'>
												Unit Cost
											</TableHead>
											<TableHead className='text-right'>
												Total
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{po.items.map((item, idx) => (
											<TableRow key={idx}>
												<TableCell className='font-medium'>
													{item.name}
												</TableCell>
												<TableCell>
													{item.sku}
												</TableCell>
												<TableCell className='text-right'>
													{item.orderedQty}
												</TableCell>
												<TableCell
													className={`text-right font-medium ${item.receivedQty < item.orderedQty ? 'text-amber-600' : 'text-green-600'}`}
												>
													{item.receivedQty}
												</TableCell>
												<TableCell className='text-right'>
													රු
													{item.unitPrice.toFixed(2)}
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
									<div className='flex justify-between w-64 text-lg font-bold'>
										<span>Total Value:</span>
										<span>
											රු{po.totalAmount.toFixed(2)}
										</span>
									</div>
								</div>
							</CardContent>
						</Card>

						{po.notes && (
							<Card>
								<CardHeader>
									<CardTitle>Notes</CardTitle>
								</CardHeader>
								<CardContent>
									<p className='text-sm text-zinc-600'>
										{po.notes}
									</p>
								</CardContent>
							</Card>
						)}
					</div>

					<div className='space-y-6'>
						{/* Supplier Card */}
						<Card>
							<CardHeader>
								<CardTitle>Supplier Details</CardTitle>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div>
									<p className='text-sm text-zinc-500 font-medium'>
										Company
									</p>
									<p className='font-medium'>
										{supplierName}
									</p>
								</div>
								{supplierEmail && (
									<div>
										<p className='text-sm text-zinc-500 font-medium'>
											Contact
										</p>
										<p className='text-sm'>
											{supplierEmail}
										</p>
										{supplierPhone && (
											<p className='text-sm'>
												{supplierPhone}
											</p>
										)}
									</div>
								)}
								{supplierObjId && (
									<Button
										variant='outline'
										className='w-full text-sm'
										onClick={() =>
											router.push(
												`/accounts/suppliers/${supplierObjId}`,
											)
										}
									>
										View Full Profile
									</Button>
								)}
							</CardContent>
						</Card>

						{/* Lifecycle Actions */}
						{!isTerminal && (
							<Card>
								<CardHeader>
									<CardTitle>Actions</CardTitle>
								</CardHeader>
								<CardContent className='space-y-3'>
									{po.status === 'draft' && (
										<Button
											className='w-full bg-green-600 hover:bg-green-700 text-white'
											onClick={handleApprove}
											disabled={isActioning}
										>
											<CheckCircle className='w-4 h-4 mr-2' />
											Approve PO
										</Button>
									)}
									{po.status === 'approved' && (
										<Button
											className='w-full bg-blue-600 hover:bg-blue-700 text-white'
											onClick={handleSend}
											disabled={isActioning}
										>
											<Send className='w-4 h-4 mr-2' />
											Mark as Sent
										</Button>
									)}
									{(po.status === 'sent' ||
										po.status === 'partial_received') && (
										<Button
											className='w-full bg-black hover:bg-zinc-800 text-white'
											onClick={openReceiveDialog}
											disabled={isActioning}
										>
											<PackageCheck className='w-4 h-4 mr-2' />
											Receive Goods
										</Button>
									)}
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>

			{/* Receive Goods Dialog */}
			<Dialog
				open={isReceiveOpen}
				onOpenChange={setIsReceiveOpen}
			>
				<DialogContent className='max-w-lg'>
					<DialogHeader>
						<DialogTitle>Receive Goods — {po.poNumber}</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<div>
							<label className='text-sm font-medium text-zinc-700'>
								Receive into store
							</label>
							<select
								className='mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue'
								value={receiveStoreId}
								onChange={(e) => setReceiveStoreId(e.target.value)}
							>
								<option value="">Select store...</option>
								{stores.map((s) => (
									<option key={s._id} value={s._id}>
										{s.name} {s.code ? `(${s.code})` : ''}
									</option>
								))}
							</select>
						</div>
						<p className='text-sm text-zinc-500'>
							Enter the quantities received for each item.
						</p>
						{po.items.map((item, idx) => {
							const remaining =
								item.orderedQty - item.receivedQty;
							return (
								<div
									key={idx}
									className='flex items-center justify-between p-3 bg-zinc-50 rounded-lg border'
								>
									<div>
										<p className='text-sm font-medium'>
											{item.name}
										</p>
										<p className='text-xs text-zinc-500'>
											SKU: {item.sku} | Ordered:{' '}
											{item.orderedQty} | Already
											received: {item.receivedQty} |
											Remaining: {remaining}
										</p>
									</div>
									<Input
										type='number'
										min='0'
										max={remaining}
										className='w-24 text-right'
										value={receiveQtys[item.productId] ?? 0}
										onChange={(e) =>
											setReceiveQtys({
												...receiveQtys,
												[item.productId]:
													parseInt(e.target.value) ||
													0,
											})
										}
									/>
								</div>
							);
						})}
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setIsReceiveOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleReceive}
							disabled={isActioning}
						>
							{isActioning ? 'Processing...' : 'Confirm Receipt'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SectionGuard>
	);
}
