'use client';

import { useState, useEffect, use } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, DollarSign } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface InvoiceItem {
	productId: string;
	sku: string;
	name: string;
	quantity: number;
	unitPrice: number;
	lineTotal: number;
}

interface SupplierInvoice {
	_id: string;
	invoiceNumber: string;
	supplierId?: { _id: string; name: string; contactPerson?: string } | null;
	purchaseOrderId?: { _id: string; poNumber: string } | null;
	items: InvoiceItem[];
	totalAmount: number;
	paidAmount: number;
	status: string;
	createdAt: string;
}

const PAYMENT_METHODS = [
	{ value: 'bank_transfer', label: 'Bank transfer' },
	{ value: 'cash', label: 'Cash' },
	{ value: 'card', label: 'Card' },
	{ value: 'other', label: 'Other' },
];

export default function SingleSupplierInvoicePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);
	const [invoice, setInvoice] = useState<SupplierInvoice | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isPaymentOpen, setIsPaymentOpen] = useState(false);
	const [paymentAmount, setPaymentAmount] = useState('');
	const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
	const [paymentReference, setPaymentReference] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		api.get(`/supplier-invoices/${id}`)
			.then((res) => {
				const data = res.data?.data ?? res.data;
				setInvoice(data);
				const remaining = (data?.totalAmount ?? 0) - (data?.paidAmount ?? 0);
				setPaymentAmount(remaining > 0 ? String(remaining.toFixed(2)) : '');
			})
			.catch(() => setInvoice(null))
			.finally(() => setIsLoading(false));
	}, [id]);

	const handleRecordPayment = async () => {
		const amount = parseFloat(paymentAmount);
		if (!invoice || isNaN(amount) || amount <= 0) {
			toast.error('Enter a valid payment amount.');
			return;
		}
		setIsSubmitting(true);
		try {
			await api.post(`/supplier-invoices/${id}/payment`, {
				amount,
				method: paymentMethod,
				reference: paymentReference || undefined,
			});
			toast.success('Payment recorded.');
			setIsPaymentOpen(false);
			setPaymentAmount('');
			setPaymentReference('');
			const res = await api.get(`/supplier-invoices/${id}`);
			setInvoice(res.data?.data ?? res.data);
		} catch (err: any) {
			toast.error(err.response?.data?.message ?? 'Failed to record payment.');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isLoading) {
		return (
			<div className="p-8 text-center text-zinc-500">
				Loading invoice...
			</div>
		);
	}
	if (!invoice) {
		return (
			<div className="p-8 text-center text-red-500">
				Invoice not found.
			</div>
		);
	}

	const supplierName =
		typeof invoice.supplierId === 'object' ? invoice.supplierId?.name : '—';
	const poNumber =
		typeof invoice.purchaseOrderId === 'object'
			? invoice.purchaseOrderId?.poNumber
			: '—';
	const remaining = invoice.totalAmount - invoice.paidAmount;
	const getStatusBadge = (status: string) => {
		const colors: Record<string, string> = {
			pending: 'bg-amber-100 text-amber-700',
			partial_paid: 'bg-blue-100 text-blue-700',
			paid: 'bg-green-100 text-green-700',
		};
		return colors[status] || 'bg-zinc-100 text-zinc-700';
	};

	return (
		<SectionGuard requiredSection="inventory.supplier-invoices">
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center space-x-4">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => router.back()}
						>
							<ArrowLeft className="w-5 h-5" />
						</Button>
						<div>
							<h2 className="text-3xl font-bold tracking-tight">
								{invoice.invoiceNumber}
							</h2>
							<p className="text-zinc-500">
								Supplier: {supplierName} · PO: {poNumber} ·{' '}
								<span
									className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}
								>
									{invoice.status.replace('_', ' ')}
								</span>
							</p>
						</div>
					</div>
					{remaining > 0 && (
						<Button
							className="bg-green-600 hover:bg-green-700 text-white"
							onClick={() => setIsPaymentOpen(true)}
						>
							<DollarSign className="w-4 h-4 mr-2" />
							Record Payment
						</Button>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div className="md:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>Line Items</CardTitle>
							</CardHeader>
							<CardContent>
								<Table className="min-w-[560px]">
									<TableHeader>
										<TableRow>
											<TableHead>Product</TableHead>
											<TableHead>SKU</TableHead>
											<TableHead className="text-right">
												Qty
											</TableHead>
											<TableHead className="text-right">
												Unit Price
											</TableHead>
											<TableHead className="text-right">
												Total
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{invoice.items?.map((item, idx) => (
											<TableRow key={idx}>
												<TableCell className="font-medium">
													{item.name}
												</TableCell>
												<TableCell>{item.sku}</TableCell>
												<TableCell className="text-right">
													{item.quantity}
												</TableCell>
												<TableCell className="text-right">
													රු
													{(item.unitPrice ?? 0).toFixed(
														2,
													)}
												</TableCell>
												<TableCell className="text-right font-medium">
													රු
													{(item.lineTotal ?? 0).toFixed(
														2,
													)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="mt-6 border-t pt-4 flex flex-col items-end space-y-2">
									<div className="flex justify-between w-64">
										<span>Total:</span>
										<span className="font-bold">
											රු
											{invoice.totalAmount.toFixed(2)}
										</span>
									</div>
									<div className="flex justify-between w-64 text-green-600">
										<span>Paid:</span>
										<span>
											රු
											{invoice.paidAmount.toFixed(2)}
										</span>
									</div>
									{remaining > 0 && (
										<div className="flex justify-between w-64 text-amber-600 font-medium">
											<span>Due:</span>
											<span>රු{remaining.toFixed(2)}</span>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>
					<div>
						<Card>
							<CardHeader>
								<CardTitle>Details</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<p className="text-sm text-zinc-500">
										Supplier
									</p>
									<p className="font-medium">{supplierName}</p>
								</div>
								<div>
									<p className="text-sm text-zinc-500">
										Purchase Order
									</p>
									<p className="font-medium">{poNumber}</p>
								</div>
								<div>
									<p className="text-sm text-zinc-500">
										Created
									</p>
									<p className="font-medium">
										{new Date(
											invoice.createdAt,
										).toLocaleString()}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Record Payment</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<p className="text-sm text-zinc-500">
							Remaining due: රු{remaining.toFixed(2)}
						</p>
						<div>
							<label className="text-sm font-medium block mb-1">
								Amount
							</label>
							<Input
								type="number"
								min={0.01}
								step={0.01}
								value={paymentAmount}
								onChange={(e) => setPaymentAmount(e.target.value)}
								placeholder="0.00"
							/>
						</div>
						<div>
							<label className="text-sm font-medium block mb-1">
								Method
							</label>
							<select
								className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
								value={paymentMethod}
								onChange={(e) =>
									setPaymentMethod(e.target.value)
								}
							>
								{PAYMENT_METHODS.map((m) => (
									<option key={m.value} value={m.value}>
										{m.label}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="text-sm font-medium block mb-1">
								Reference (optional)
							</label>
							<Input
								value={paymentReference}
								onChange={(e) =>
									setPaymentReference(e.target.value)
								}
								placeholder="Check no., transaction ID..."
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsPaymentOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleRecordPayment}
							disabled={isSubmitting}
						>
							{isSubmitting ? 'Recording...' : 'Record Payment'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SectionGuard>
	);
}
