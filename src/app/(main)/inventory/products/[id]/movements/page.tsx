'use client';

import { useEffect, useState, useRef, use } from 'react';
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
import { useRouter } from 'next/navigation';
import { Search, ArrowDownUp, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import SectionGuard from '@/components/SectionGuard';
import { formatQuantityDisplay } from '@/lib/quantityByUnit';

interface StoreRef {
	_id?: string;
	name?: string;
	code?: string;
}

interface StoreOption {
	_id: string;
	name: string;
	code?: string;
}

interface UserRef {
	name?: string;
	email?: string;
}

interface MovementRow {
	type: 'IN' | 'OUT' | 'ADJUSTMENT';
	date: string;
	quantityChange: number;
	store: StoreRef | null;
	user: UserRef | null;
	reference: string | null;
}

interface MovementsResponse {
	items: MovementRow[];
	total: number;
	page: number;
	limit: number;
}

export default function StockMovementsPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);

	const [data, setData] = useState<MovementsResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [filterStoreId, setFilterStoreId] = useState('');
	const [stores, setStores] = useState<StoreOption[]>([]);
	const [storeStockMap, setStoreStockMap] = useState<
		Record<string, number>
	>({});
	const [productUnit, setProductUnit] = useState('pcs');
	const [page, setPage] = useState(1);
	const limit = 50;
	const prevProductIdRef = useRef(id);
	if (id !== prevProductIdRef.current) {
		prevProductIdRef.current = id;
		setPage(1);
		setFilterStoreId('');
	}

	useEffect(() => {
		const fetchMovements = async () => {
			try {
				setIsLoading(true);
				const res = await api.get('/reports/inventory/movements', {
					params: {
						productId: id,
						page,
						limit,
						...(filterStoreId ? { storeId: filterStoreId } : {}),
					},
				});
				setData(res.data);
			} catch (err) {
				console.error('Failed to fetch movements:', err);
				setData({ items: [], total: 0, page: 1, limit });
			} finally {
				setIsLoading(false);
			}
		};
		fetchMovements();
	}, [id, page, filterStoreId]);

	useEffect(() => {
		if (!id) return;
		const loadStoresStockAndUnit = async () => {
			try {
				const [storesRes, invRes, productRes] = await Promise.all([
					api.get('/stores'),
					api.get('/inventory', { params: { productId: id } }),
					api.get(`/products/${id}`),
				]);
				const rawStores =
					storesRes.data?.items ??
					storesRes.data?.data ??
					storesRes.data ??
					[];
				setStores(Array.isArray(rawStores) ? rawStores : []);

				const list = Array.isArray(invRes.data)
					? invRes.data
					: (invRes.data?.items ?? []);
				const map: Record<string, number> = {};
				for (const row of list as {
					storeId?: { _id?: string } | string;
					quantity?: number;
					reservedQuantity?: number;
				}[]) {
					const raw = row.storeId;
					const sid =
						typeof raw === 'object' && raw && '_id' in raw
							? String((raw as { _id?: string })._id)
							: String(raw);
					if (!sid || sid === 'undefined') continue;
					const q = Number(row.quantity) || 0;
					const r = Number(row.reservedQuantity) || 0;
					map[sid] = Math.max(0, q - r);
				}
				setStoreStockMap(map);

				const pdata =
					productRes.data?.data ?? productRes.data ?? {};
				setProductUnit(
					typeof pdata.unit === 'string' ? pdata.unit : 'pcs',
				);
			} catch (e) {
				console.error('Failed to load stores/stock for movements:', e);
			}
		};
		loadStoresStockAndUnit();
	}, [id]);

	const filteredItems =
		data?.items.filter((row) => {
			if (!search.trim()) return true;
			const q = search.toLowerCase();
			const storeName = row.store?.name || '';
			const userName = row.user?.name || '';
			return (
				storeName.toLowerCase().includes(q) ||
				userName.toLowerCase().includes(q) ||
				(row.reference || '').toLowerCase().includes(q)
			);
		}) || [];

	const totalPages = data ? Math.ceil(data.total / limit) : 0;

	const formatDate = (value: string) => {
		try {
			return new Date(value).toLocaleString();
		} catch {
			return value;
		}
	};

	return (
		<SectionGuard requiredSection='inventory.products'>
		<div className='space-y-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
				<div className='flex min-w-0 items-center gap-3 sm:gap-4'>
					<Button
						variant='ghost'
						size='icon'
						className='shrink-0'
						onClick={() => router.back()}
					>
						<ArrowLeft className='w-5 h-5' />
					</Button>
					<div className='min-w-0'>
						<h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
							Stock Movements
						</h2>
						<p className='text-zinc-500'>
							All inventory in, out, and adjustments for this
							product.
						</p>
					</div>
				</div>
				<Button
					className='flex w-full items-center justify-center gap-2 sm:ml-auto sm:w-auto'
					variant='outline'
				>
					<ArrowDownUp className='h-4 w-4' />
					<span>Export Report</span>
				</Button>
			</div>

			<Card>
				<CardHeader className='flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between'>
					<CardTitle>Recent Activity</CardTitle>
					<div className='flex flex-wrap items-center gap-2'>
						<div className='relative min-w-0 flex-1 sm:max-w-xs'>
							<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400' />
							<Input
								type='text'
								placeholder='Search by store, user, reference...'
								className='h-9 w-full pl-9 pr-4 py-1.5 text-sm sm:w-64'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<select
							className='h-9 min-w-[12rem] max-w-[20rem] rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'
							value={filterStoreId}
							onChange={(e) => {
								setPage(1);
								setFilterStoreId(e.target.value);
							}}
							aria-label='Filter by store'
						>
							<option value=''>All stores</option>
							{stores.map((s) => {
								const qty = storeStockMap[s._id] ?? 0;
								const u = productUnit || 'pcs';
								return (
									<option key={s._id} value={s._id}>
										{s.name}
										{s.code ? ` (${s.code})` : ''} —{' '}
										{formatQuantityDisplay(qty, u)} {u} on
										hand
									</option>
								);
							})}
						</select>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className='text-center py-8 text-zinc-500'>
							Loading movements...
						</p>
					) : filteredItems.length === 0 ? (
						<p className='text-center py-8 text-zinc-500'>
							No stock movements found for this product.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Store</TableHead>
										<TableHead>Type</TableHead>
										<TableHead className='text-right'>
											Quantity
										</TableHead>
										<TableHead>Reference</TableHead>
										<TableHead>User</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredItems.map((mov, index) => (
										<TableRow key={index}>
											<TableCell>
												{formatDate(mov.date)}
											</TableCell>
											<TableCell>
												{mov.store?.name ||
													mov.store?.code ||
													'-'}
											</TableCell>
											<TableCell>
												<span
													className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase
											${mov.type === 'IN' ? 'bg-green-100 text-green-700' : ''}
											${mov.type === 'OUT' ? 'bg-blue-100 text-blue-700' : ''}
											${mov.type === 'ADJUSTMENT' ? 'bg-amber-100 text-amber-700' : ''}
										`}
												>
													{mov.type}
												</span>
											</TableCell>
											<TableCell
												className={`text-right font-medium
										${mov.type === 'IN' ? 'text-green-600' : ''}
										${mov.type === 'OUT' || mov.quantityChange < 0 ? 'text-red-600' : ''}
									`}
											>
												{mov.quantityChange > 0
													? '+'
													: ''}
												{mov.quantityChange}
											</TableCell>
											<TableCell>
												{mov.reference || '-'}
											</TableCell>
											<TableCell>
												{mov.user?.name || '-'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{data && data.total > limit && (
								<div className='flex items-center justify-between border-t pt-4 mt-4'>
									<p className='text-sm text-zinc-500'>
										Showing{' '}
										{(page - 1) * limit + 1}
										–
										{Math.min(page * limit, data.total)} of{' '}
										{data.total}
									</p>
									<div className='flex gap-2'>
										<Button
											variant='outline'
											size='sm'
											onClick={() =>
												setPage((p) => Math.max(1, p - 1))
											}
											disabled={page <= 1}
										>
											Previous
										</Button>
										<span className='flex items-center px-2 text-sm text-zinc-600'>
											Page {page} of{' '}
											{totalPages || 1}
										</span>
										<Button
											variant='outline'
											size='sm'
											onClick={() =>
												setPage((p) =>
													p >= totalPages
														? p
														: p + 1,
												)
											}
											disabled={page >= totalPages}
										>
											Next
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>
		</div>
		</SectionGuard>
	);
}
