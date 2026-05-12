'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
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

interface Supplier {
	_id: string;
	name: string;
}

interface Product {
	_id: string;
	name: string;
	sku: string;
	posPrice?: number;
}

interface LineItem {
	productId: string;
	sku: string;
	name: string;
	orderedQty: number;
	unitPrice: number;
}

export default function CreatePurchaseOrderPage() {
	const router = useRouter();
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [supplierId, setSupplierId] = useState('');
	const [notes, setNotes] = useState('');
	const [items, setItems] = useState<LineItem[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [productSearch, setProductSearch] = useState('');

	useEffect(() => {
		Promise.all([
			api.get('/suppliers').then((r) => {
				const d = r.data?.data ?? r.data;
				return Array.isArray(d) ? d : d?.items ?? [];
			}),
			api.get('/products', { params: { includeInactive: 'true' } }).then((r) => {
				const d = r.data?.data ?? r.data;
				return Array.isArray(d) ? d : d?.items ?? [];
			}),
		])
			.then(([sup, prods]) => {
				setSuppliers(Array.isArray(sup) ? sup : []);
				setProducts(Array.isArray(prods) ? prods : []);
			})
			.catch(() => {
				toast.error('Failed to load suppliers or products.');
			});
	}, []);

	const addLine = (product?: Product) => {
		const p = product ?? { _id: '', name: '', sku: '', posPrice: 0 };
		setItems((prev) => [
			...prev,
			{
				productId: p._id,
				sku: p.sku || '',
				name: p.name || '',
				orderedQty: 1,
				unitPrice: p.posPrice ?? 0,
			},
		]);
		setProductSearch('');
	};

	const removeLine = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};

	const updateLine = (
		index: number,
		field: keyof LineItem,
		value: string | number,
	) => {
		setItems((prev) =>
			prev.map((line, i) =>
				i === index ? { ...line, [field]: value } : line,
			),
		);
	};

	const totalAmount = items.reduce(
		(sum, line) => sum + line.orderedQty * line.unitPrice,
		0,
	);

	const filteredProducts = products.filter(
		(p) =>
			!items.some((i) => i.productId === p._id) &&
			(p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
				p.sku?.toLowerCase().includes(productSearch.toLowerCase())),
	);

	const handleSaveDraft = async () => {
		if (!supplierId) {
			toast.error('Please select a supplier.');
			return;
		}
		if (items.length === 0) {
			toast.error('Add at least one line item.');
			return;
		}
		const invalid = items.find(
			(i) => !i.productId || i.orderedQty < 1 || i.unitPrice < 0,
		);
		if (invalid) {
			toast.error('Ensure every line has a product, quantity ≥ 1, and unit price ≥ 0.');
			return;
		}

		setIsSubmitting(true);
		try {
			await api.post('/purchase-orders', {
				supplierId,
				items: items.map((i) => ({
					productId: i.productId,
					sku: i.sku,
					name: i.name,
					orderedQty: i.orderedQty,
					unitPrice: i.unitPrice,
				})),
				notes: notes || undefined,
			});
			toast.success('Purchase order created.');
			router.push('/inventory/purchase-orders');
		} catch (err: any) {
			toast.error(err.response?.data?.message || 'Failed to create PO.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SectionGuard requiredSection="inventory.purchase-orders">
			<div className="space-y-6">
				<div className="flex min-w-0 items-center gap-3 sm:gap-4">
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0"
						onClick={() => router.back()}
					>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<div className="min-w-0">
						<h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
							Create Purchase Order
						</h2>
						<p className="text-zinc-500">
							Draft a new PO to send to a supplier.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
					<div className="space-y-6 lg:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle>PO Details</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div className="space-y-2">
										<label className="text-sm font-medium">
											Select Supplier
										</label>
										<select
											className="w-full p-2 border rounded-md focus:ring-1 focus:ring-brand-blue bg-white"
											value={supplierId}
											onChange={(e) =>
												setSupplierId(e.target.value)
											}
										>
											<option value="">
												Select a supplier...
											</option>
											{suppliers.map((s) => (
												<option
													key={s._id}
													value={s._id}
												>
													{s.name}
												</option>
											))}
										</select>
									</div>
									<div className="col-span-2 space-y-2">
										<label className="text-sm font-medium">
											Notes / Terms
										</label>
										<textarea
											className="w-full min-h-[80px] p-3 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-blue"
											placeholder="Any special instructions for the supplier..."
											value={notes}
											onChange={(e) =>
												setNotes(e.target.value)
											}
										/>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
								<CardTitle>Line Items</CardTitle>
								<div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
									<Input
										placeholder="Search product..."
										className="min-w-0 flex-1 sm:max-w-xs"
										value={productSearch}
										onChange={(e) =>
											setProductSearch(e.target.value)
										}
									/>
								</div>
							</CardHeader>
							<CardContent>
								{filteredProducts.length > 0 && (
									<div className="mb-4 p-2 border rounded-md max-h-32 overflow-y-auto">
										<p className="text-xs text-zinc-500 mb-2">
											Click to add:
										</p>
										{filteredProducts.slice(0, 10).map((p) => (
											<button
												key={p._id}
												type="button"
												className="block w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded"
												onClick={() => addLine(p)}
											>
												{p.sku} — {p.name} (රු
												{(p.posPrice ?? 0).toFixed(2)})
											</button>
										))}
									</div>
								)}
								<Table className="min-w-[640px]">
									<TableHeader>
										<TableRow>
											<TableHead>Product</TableHead>
											<TableHead>SKU</TableHead>
											<TableHead className="w-[80px] text-right">
												Qty
											</TableHead>
											<TableHead className="w-[120px] text-right">
												Unit Price
											</TableHead>
											<TableHead className="w-[120px] text-right">
												Total
											</TableHead>
											<TableHead className="w-[50px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.map((line, idx) => (
											<TableRow key={idx}>
												<TableCell>
													<Input
														value={line.name}
														onChange={(e) =>
															updateLine(
																idx,
																'name',
																e.target.value,
															)
														}
														placeholder="Name"
													/>
												</TableCell>
												<TableCell>
													<Input
														value={line.sku}
														onChange={(e) =>
															updateLine(
																idx,
																'sku',
																e.target.value,
															)
														}
														placeholder="SKU"
													/>
												</TableCell>
												<TableCell>
													<Input
														type="number"
														min={1}
														className="text-right"
														value={line.orderedQty}
														onChange={(e) =>
															updateLine(
																idx,
																'orderedQty',
																parseInt(
																	e.target.value,
																	10,
																) || 0,
															)
														}
													/>
												</TableCell>
												<TableCell>
													<Input
														type="number"
														min={0}
														step={0.01}
														className="text-right"
														value={
															line.unitPrice || ''
														}
														onChange={(e) =>
															updateLine(
																idx,
																'unitPrice',
																parseFloat(
																	e.target.value,
																) || 0,
															)
														}
													/>
												</TableCell>
												<TableCell className="text-right font-medium">
													රු
													{(
														line.orderedQty *
														line.unitPrice
													).toFixed(2)}
												</TableCell>
												<TableCell>
													<Button
														variant="ghost"
														size="icon"
														className="text-red-500 hover:text-red-700"
														onClick={() =>
															removeLine(idx)
														}
													>
														<Trash2 className="w-4 h-4" />
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								{items.length === 0 && (
									<p className="text-sm text-zinc-500 py-4 text-center">
										Search and click a product above to add
										line items.
									</p>
								)}
								<div className="mt-6 flex flex-col items-stretch space-y-2 border-t pt-4 sm:items-end">
									<div className="flex w-full max-w-xs justify-between text-lg font-bold sm:w-64">
										<span>Total:</span>
										<span>රු{totalAmount.toFixed(2)}</span>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Actions</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Button
									className="w-full bg-black hover:bg-zinc-800 text-white"
									onClick={handleSaveDraft}
									disabled={isSubmitting}
								>
									<Save className="w-4 h-4 mr-2" />
									{isSubmitting
										? 'Saving...'
										: 'Save as Draft'}
								</Button>
								<Button
									variant="outline"
									className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200"
									onClick={() => router.back()}
								>
									Discard
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</SectionGuard>
	);
}
