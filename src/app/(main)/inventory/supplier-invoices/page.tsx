'use client';

import { useState, useEffect } from 'react';
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
import { Search, Plus, FileText } from 'lucide-react';
import api from '@/lib/api';

interface SupplierInvoice {
	_id: string;
	invoiceNumber: string;
	supplierId?: { _id: string; name: string } | null;
	purchaseOrderId?: { _id: string; poNumber: string } | null;
	totalAmount: number;
	paidAmount: number;
	status: string;
	createdAt: string;
}

export default function SupplierInvoicesPage() {
	const router = useRouter();
	const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		api.get('/supplier-invoices')
			.then((res) => {
				const data = res.data;
				const list = data.items ?? data.data ?? data;
				setInvoices(Array.isArray(list) ? list : []);
			})
			.catch(() => setInvoices([]))
			.finally(() => setIsLoading(false));
	}, []);

	const getSupplierName = (inv: SupplierInvoice) => {
		if (!inv.supplierId) return '—';
		if (typeof inv.supplierId === 'object' && inv.supplierId?.name)
			return inv.supplierId.name;
		return '—';
	};

	const getPONumber = (inv: SupplierInvoice) => {
		if (!inv.purchaseOrderId) return '—';
		if (
			typeof inv.purchaseOrderId === 'object' &&
			inv.purchaseOrderId?.poNumber
		)
			return inv.purchaseOrderId.poNumber;
		return '—';
	};

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
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-3xl font-bold tracking-tight">
							Supplier Invoices
						</h2>
						<p className="text-zinc-500">
							Manage supplier invoices and record payments.
						</p>
					</div>
					<Button
						className="w-full bg-black text-white hover:bg-zinc-800 sm:w-auto"
						onClick={() =>
							router.push(
								'/inventory/supplier-invoices/create',
							)
						}
					>
						<Plus className="w-4 h-4 mr-2" />
						Create Invoice
					</Button>
				</div>

				<Card>
					<CardHeader className="flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
						<CardTitle>Invoices</CardTitle>
						<div className="relative w-full max-w-xs sm:w-64 sm:max-w-none">
							<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
							<Input
								type="text"
								placeholder="Search..."
								className="pl-9 h-9 text-sm"
							/>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className="text-center text-zinc-500 py-8">
								Loading invoices...
							</p>
						) : invoices.length === 0 ? (
							<p className="text-center text-zinc-500 py-8">
								No supplier invoices found.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Invoice #</TableHead>
										<TableHead>Supplier</TableHead>
										<TableHead>PO</TableHead>
										<TableHead className="text-right">
											Total
										</TableHead>
										<TableHead className="text-right">
											Paid
										</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>Date</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{invoices.map((inv) => (
										<TableRow
											key={inv._id}
											className="cursor-pointer hover:bg-zinc-50"
											onClick={() =>
												router.push(
													`/inventory/supplier-invoices/${inv._id}`,
												)
											}
										>
											<TableCell className="font-medium">
												<div className="flex items-center gap-2">
													<FileText className="w-4 h-4 text-zinc-400" />
													{inv.invoiceNumber}
												</div>
											</TableCell>
											<TableCell>
												{getSupplierName(inv)}
											</TableCell>
											<TableCell>
												{getPONumber(inv)}
											</TableCell>
											<TableCell className="text-right">
												රු
												{(inv.totalAmount ?? 0).toFixed(
													2,
												)}
											</TableCell>
											<TableCell className="text-right">
												රු
												{(inv.paidAmount ?? 0).toFixed(
													2,
												)}
											</TableCell>
											<TableCell>
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(inv.status)}`}
												>
													{inv.status.replace(
														'_',
														' ',
													)}
												</span>
											</TableCell>
											<TableCell>
												{new Date(
													inv.createdAt,
												).toLocaleDateString()}
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
