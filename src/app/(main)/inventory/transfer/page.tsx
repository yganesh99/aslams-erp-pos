'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import SectionGuard from '@/components/SectionGuard';
import { allowsDecimalQuantity, normalizeQuantity } from '@/lib/quantityByUnit';

interface StoreOption {
	_id: string;
	name: string;
	code?: string;
}

interface ProductOption {
	_id: string;
	name: string;
	sku: string;
	unit?: string;
}

interface TransferLine {
	productId: string;
	productName: string;
	productSku: string;
	unit?: string;
	quantity: string;
}

export default function TransferStockPage() {
	const router = useRouter();
	const [stores, setStores] = useState<StoreOption[]>([]);
	const [products, setProducts] = useState<ProductOption[]>([]);
	const [fromStoreId, setFromStoreId] = useState('');
	const [toStoreId, setToStoreId] = useState('');
	const [lines, setLines] = useState<TransferLine[]>([]);
	const [stockByProduct, setStockByProduct] = useState<
		Record<string, number>
	>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchStores = useCallback(async () => {
		try {
			const res = await api.get('/stores');
			const data = res.data?.items ?? res.data?.data ?? res.data ?? [];
			setStores(Array.isArray(data) ? data : []);
		} catch (e) {
			console.error('Failed to fetch stores:', e);
		}
	}, []);

	const fetchProducts = useCallback(async () => {
		try {
			const res = await api.get('/products', {
				params: { limit: 500, includeInactive: 'true' },
			});
			const data = res.data?.items ?? res.data?.data ?? [];
			setProducts(Array.isArray(data) ? data : []);
		} catch (e) {
			console.error('Failed to fetch products:', e);
		}
	}, []);

	const fetchStockForSourceStore = useCallback(async () => {
		if (!fromStoreId) {
			setStockByProduct({});
			return;
		}
		try {
			const res = await api.get('/inventory', {
				params: { storeId: fromStoreId },
			});
			const list = Array.isArray(res.data)
				? res.data
				: (res.data?.items ?? []);
			const byProduct: Record<string, number> = {};
			for (const row of list as {
				productId: { _id: string };
				quantity: number;
			}[]) {
				const id =
					typeof row.productId === 'object'
						? row.productId?._id
						: row.productId;
				if (id) byProduct[id] = Number(row.quantity) || 0;
			}
			setStockByProduct(byProduct);
		} catch (e) {
			console.error('Failed to fetch stock:', e);
			setStockByProduct({});
		}
	}, [fromStoreId]);

	useEffect(() => {
		fetchStores();
		fetchProducts();
	}, [fetchStores, fetchProducts]);

	useEffect(() => {
		fetchStockForSourceStore();
	}, [fetchStockForSourceStore]);

	const addLine = () => {
		setLines((prev) => [
			...prev,
			{
				productId: '',
				productName: '',
				productSku: '',
				unit: 'pcs',
				quantity: '',
			},
		]);
	};

	const removeLine = (index: number) => {
		setLines((prev) => prev.filter((_, i) => i !== index));
	};

	const setLineProduct = (index: number, productId: string) => {
		const product = products.find((p) => p._id === productId);
		if (!product) return;
		setLines((prev) => {
			const next = [...prev];
			next[index] = {
				...next[index],
				productId: product._id,
				productName: product.name,
				productSku: product.sku,
				unit: product.unit || 'pcs',
				quantity: next[index].quantity,
			};
			return next;
		});
	};

	const setLineQuantity = (index: number, value: string) => {
		setLines((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], quantity: value };
			return next;
		});
	};

	const handleSubmit = async () => {
		setError(null);
		if (!fromStoreId || !toStoreId) {
			setError('Please select both source and destination stores.');
			return;
		}
		if (fromStoreId === toStoreId) {
			setError('Source and destination stores must be different.');
			return;
		}
		const validLines = lines.filter(
			(l) => l.productId && l.quantity && Number(l.quantity) > 0,
		);
		if (validLines.length === 0) {
			setError('Add at least one product with a quantity.');
			return;
		}
		const productIds = new Set(validLines.map((l) => l.productId));
		if (productIds.size !== validLines.length) {
			setError(
				'Each product can only appear once. Combine quantities for the same product.',
			);
			return;
		}
		for (const line of validLines) {
			const qty = Number(line.quantity);
			const available = stockByProduct[line.productId] ?? 0;
			if (qty > available) {
				setError(
					`Insufficient stock for ${line.productSku}: requested ${qty}, available ${available}.`,
				);
				return;
			}
		}
		const items = validLines.map((l) => ({
			productId: l.productId,
			quantity: normalizeQuantity(Number(l.quantity), l.unit),
		}));
		try {
			setIsSubmitting(true);
			await api.post('/inventory/transfer', {
				fromStoreId,
				toStoreId,
				items,
			});
			router.push('/inventory/transfers');
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string } } })
					?.response?.data?.message ||
				'Transfer failed. Please try again.';
			setError(msg);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<SectionGuard requiredSection='inventory.transfers'>
		<div className='space-y-6'>
			<div className='flex min-w-0 items-center gap-3 sm:gap-4'>
				<Button
					variant='ghost'
					size='icon'
					className='shrink-0'
					onClick={() => router.push('/inventory/transfers')}
				>
					<ArrowLeft className='h-5 w-5' />
				</Button>
				<div className='min-w-0'>
					<h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
						Transfer Stock Between Stores
					</h2>
					<p className='text-zinc-500'>
						Move inventory from one store to another. FIFO cost
						layers move with the quantity; the movement is logged.
					</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Transfer details</CardTitle>
					<p className='text-sm text-zinc-500'>
						Select source and destination stores, then add products
						and quantities.
					</p>
				</CardHeader>
				<CardContent className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								From store *
							</label>
							<select
								className='w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
								value={fromStoreId}
								onChange={(e) => setFromStoreId(e.target.value)}
							>
								<option value=''>Select source store</option>
								{stores.map((s) => (
									<option
										key={s._id}
										value={s._id}
									>
										{s.name} {s.code ? `(${s.code})` : ''}
									</option>
								))}
							</select>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								To store *
							</label>
							<select
								className='w-full h-10 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
								value={toStoreId}
								onChange={(e) => setToStoreId(e.target.value)}
							>
								<option value=''>
									Select destination store
								</option>
								{stores
									.filter((s) => s._id !== fromStoreId)
									.map((s) => (
										<option
											key={s._id}
											value={s._id}
										>
											{s.name}{' '}
											{s.code ? `(${s.code})` : ''}
										</option>
									))}
							</select>
						</div>
					</div>

					<div>
						<div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
							<label className='text-sm font-medium'>
								Items to transfer *
							</label>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className='w-full sm:w-auto'
								onClick={addLine}
							>
								<Plus className='h-4 w-4 mr-1' />
								Add line
							</Button>
						</div>
						{lines.length === 0 ? (
							<p className='text-sm text-zinc-500 py-4 border rounded-md text-center'>
								Click &quot;Add line&quot; to add a product and
								quantity.
							</p>
						) : (
							<Table className='min-w-[520px]'>
								<TableHeader>
									<TableRow>
										<TableHead>Product</TableHead>
										<TableHead className='text-right'>
											Available (source)
										</TableHead>
										<TableHead className='w-[140px]'>
											Quantity
										</TableHead>
										<TableHead className='w-[60px]'></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{lines.map((line, index) => (
										<TableRow key={index}>
											<TableCell>
												<select
													className='w-full h-9 px-2 border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring'
													value={line.productId}
													onChange={(e) =>
														setLineProduct(
															index,
															e.target.value,
														)
													}
												>
													<option value=''>
														Select product
													</option>
													{products
														.filter(
															(p) =>
																p._id ===
																	line.productId ||
																!lines.some(
																	(l, i) =>
																		i !==
																			index &&
																		l.productId ===
																			p._id,
																),
														)
														.map((p) => (
															<option
																key={p._id}
																value={p._id}
															>
																{p.sku} —{' '}
																{p.name}
															</option>
														))}
												</select>
											</TableCell>
											<TableCell className='text-right text-zinc-600'>
												{line.productId
													? (stockByProduct[
															line.productId
														] ?? 0)
													: '-'}
											</TableCell>
											<TableCell>
												<Input
													type='number'
													min={0}
													step={
														allowsDecimalQuantity(
															line.unit,
														)
															? 0.01
															: 1
													}
													placeholder='Qty'
													value={line.quantity}
													onChange={(e) =>
														setLineQuantity(
															index,
															e.target.value,
														)
													}
													className='h-9'
												/>
											</TableCell>
											<TableCell>
												<Button
													type='button'
													variant='ghost'
													size='icon'
													className='h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50'
													onClick={() =>
														removeLine(index)
													}
												>
													<Trash2 className='h-4 w-4' />
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>

					{error && (
						<p className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2'>
							{error}
						</p>
					)}

					<div className='flex gap-3'>
						<Button
							onClick={handleSubmit}
							disabled={isSubmitting || lines.length === 0}
						>
							{isSubmitting ? 'Transferring…' : 'Submit transfer'}
						</Button>
						<Button
							variant='outline'
							onClick={() => router.push('/inventory')}
						>
							Cancel
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
		</SectionGuard>
	);
}
