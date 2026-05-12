'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import api from '@/lib/api';
import { toast } from 'react-toastify';

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
	supplierId: { _id: string; name: string } | string;
	items: POItem[];
	totalAmount: number;
	status: string;
}

export default function CreateSupplierInvoicePage() {
	const router = useRouter();
	const [pos, setPos] = useState<PurchaseOrder[]>([]);
	const [selectedPoId, setSelectedPoId] = useState('');
	const [invoiceNumber, setInvoiceNumber] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		api.get('/purchase-orders?limit=200')
			.then((res) => {
				const data = res.data?.items ?? res.data?.data ?? res.data ?? [];
				const list = Array.isArray(data) ? data : [];
				setPos(list);
				if (list.length > 0 && !selectedPoId) setSelectedPoId(list[0]._id);
			})
			.catch(() => toast.error('Failed to load purchase orders.'));
	}, []);

	const selectedPo = pos.find((p) => p._id === selectedPoId);
	const supplierId =
		selectedPo &&
		(typeof selectedPo.supplierId === 'object'
			? selectedPo.supplierId._id
			: selectedPo.supplierId);

	// Build invoice items from PO: use received qty if any, else ordered qty
	const invoiceItems =
		selectedPo?.items?.map((item) => {
			const qty = item.receivedQty > 0 ? item.receivedQty : item.orderedQty;
			const lineTotal = qty * item.unitPrice;
			return {
				productId: item.productId,
				sku: item.sku,
				name: item.name,
				quantity: qty,
				unitPrice: item.unitPrice,
				lineTotal,
			};
		}) ?? [];
	const totalAmount = invoiceItems.reduce((s, i) => s + i.lineTotal, 0);

	const handleCreate = async () => {
		if (!selectedPoId || !supplierId) {
			toast.error('Select a purchase order.');
			return;
		}
		if (!invoiceNumber.trim()) {
			toast.error('Enter an invoice number.');
			return;
		}
		if (invoiceItems.length === 0) {
			toast.error('Selected PO has no items.');
			return;
		}
		setIsSubmitting(true);
		try {
			await api.post('/supplier-invoices', {
				supplierId,
				purchaseOrderId: selectedPoId,
				invoiceNumber: invoiceNumber.trim(),
				items: invoiceItems,
				totalAmount,
			});
			toast.success('Supplier invoice created. AP has been updated.');
			router.push('/inventory/supplier-invoices');
		} catch (err: any) {
			toast.error(
				err.response?.data?.message ?? 'Failed to create invoice.',
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SectionGuard requiredSection="inventory.supplier-invoices">
			<div className="space-y-6">
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
							Create Supplier Invoice
						</h2>
						<p className="text-zinc-500">
							Create an invoice from a purchase order. This will
							increase accounts payable.
						</p>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Invoice Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="text-sm font-medium block mb-1">
									Purchase Order
								</label>
								<select
									className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
									value={selectedPoId}
									onChange={(e) =>
										setSelectedPoId(e.target.value)
									}
								>
									<option value="">Select PO...</option>
									{pos.map((po) => (
										<option key={po._id} value={po._id}>
											{po.poNumber} —{' '}
											{typeof po.supplierId === 'object'
												? po.supplierId?.name
												: '—'}{' '}
											(රු
											{(po.totalAmount ?? 0).toFixed(2)})
										</option>
									))}
								</select>
							</div>
							<div>
								<label className="text-sm font-medium block mb-1">
									Invoice Number
								</label>
								<Input
									value={invoiceNumber}
									onChange={(e) =>
										setInvoiceNumber(e.target.value)
									}
									placeholder="e.g. INV-2024-001"
								/>
							</div>
						</div>

						{selectedPo && (
							<>
								<p className="text-sm text-zinc-500">
									Items are based on received quantities (or
									ordered if none received). Prices must match
									the PO.
								</p>
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
										{invoiceItems.map((item, idx) => (
											<TableRow key={idx}>
												<TableCell>
													{item.name}
												</TableCell>
												<TableCell>
													{item.sku}
												</TableCell>
												<TableCell className="text-right">
													{item.quantity}
												</TableCell>
												<TableCell className="text-right">
													රු
													{item.unitPrice.toFixed(2)}
												</TableCell>
												<TableCell className="text-right font-medium">
													රු
													{item.lineTotal.toFixed(2)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="flex justify-end">
									<div className="text-lg font-bold">
										Total: රු{totalAmount.toFixed(2)}
									</div>
								</div>
							</>
						)}
					</CardContent>
				</Card>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						className="w-full bg-black text-white hover:bg-zinc-800 sm:w-auto"
						onClick={handleCreate}
						disabled={
							isSubmitting ||
							!selectedPoId ||
							!invoiceNumber.trim() ||
							invoiceItems.length === 0
						}
					>
						<Save className="w-4 h-4 mr-2" />
						{isSubmitting ? 'Creating...' : 'Create Invoice'}
					</Button>
					<Button
						variant="outline"
						className="w-full sm:w-auto"
						onClick={() => router.back()}
					>
						Cancel
					</Button>
				</div>
			</div>
		</SectionGuard>
	);
}
