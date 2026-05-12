'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import api from '@/lib/api';
import SectionGuard from '@/components/SectionGuard';

interface StoreRef {
	_id: string;
	name: string;
	code?: string;
}

interface ProductRef {
	_id: string;
	name: string;
	sku: string;
	unit?: string;
}

interface TransferItem {
	productId: ProductRef;
	quantity: number;
}

interface TransferRecord {
	_id: string;
	fromStoreId: StoreRef;
	toStoreId: StoreRef;
	items: TransferItem[];
	status: string;
	createdBy?: { name?: string; email?: string };
	createdAt: string;
}

interface TransfersResponse {
	items: TransferRecord[];
	total: number;
	page: number;
	limit: number;
}

export default function TransferHistoryPage() {
	const router = useRouter();
	const [data, setData] = useState<TransfersResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [storeFilter, setStoreFilter] = useState('');
	const [stores, setStores] = useState<StoreRef[]>([]);
	const limit = 20;

	const fetchStores = useCallback(async () => {
		try {
			const res = await api.get('/stores');
			const list = res.data?.items ?? res.data?.data ?? res.data ?? [];
			setStores(Array.isArray(list) ? list : []);
		} catch (e) {
			console.error('Failed to fetch stores:', e);
		}
	}, []);

	const fetchTransfers = useCallback(async () => {
		try {
			setIsLoading(true);
			const params: Record<string, string | number> = { page, limit };
			if (storeFilter) params.storeId = storeFilter;
			const res = await api.get('/inventory/transfers', { params });
			setData(res.data);
		} catch (e) {
			console.error('Failed to fetch transfers:', e);
			setData({ items: [], total: 0, page: 1, limit });
		} finally {
			setIsLoading(false);
		}
	}, [page, storeFilter]);

	useEffect(() => {
		fetchStores();
	}, [fetchStores]);

	useEffect(() => {
		fetchTransfers();
	}, [fetchTransfers]);

	const totalPages = data ? Math.ceil(data.total / limit) : 0;
	const fromName = (t: TransferRecord) =>
		typeof t.fromStoreId === 'object' && t.fromStoreId?.name
			? t.fromStoreId.name
			: String(t.fromStoreId);
	const toName = (t: TransferRecord) =>
		typeof t.toStoreId === 'object' && t.toStoreId?.name
			? t.toStoreId.name
			: String(t.toStoreId);
	const formatDate = (s: string) => {
		try {
			return new Date(s).toLocaleString();
		} catch {
			return s;
		}
	};

	return (
		<SectionGuard requiredSection='inventory.transfers'>
		<div className='space-y-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div className='flex min-w-0 items-center gap-4'>
					{/* <Button
						variant="ghost"
						size="icon"
						onClick={() => router.push('/inventory')}
					>
						<ArrowLeft className="h-5 w-5" />
					</Button> */}
					<div className='min-w-0'>
						<h2 className='text-3xl font-bold tracking-tight'>
							Transfer history
						</h2>
						<p className='text-zinc-500'>
							Log of stock movements between stores.
						</p>
					</div>
				</div>
				<Button
					className='w-full bg-black text-white hover:bg-zinc-800 sm:w-auto'
					onClick={() => router.push('/inventory/transfer')}
				>
					<ArrowRightLeft className='h-4 w-4 mr-2' />
					New transfer
				</Button>
			</div>

			<Card>
				<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
					<CardTitle>Transfers</CardTitle>
					<div className='flex items-center gap-2'>
						<select
							className='h-9 px-3 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'
							value={storeFilter}
							onChange={(e) => {
								setStoreFilter(e.target.value);
								setPage(1);
							}}
						>
							<option value=''>All stores</option>
							{stores.map((s) => (
								<option
									key={s._id}
									value={s._id}
								>
									{s.name}
								</option>
							))}
						</select>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p className='text-center py-8 text-zinc-500'>
							Loading transfers…
						</p>
					) : !data?.items?.length ? (
						<p className='text-center py-8 text-zinc-500'>
							No transfers found. Create one from the &quot;New
							transfer&quot; button.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>From</TableHead>
										<TableHead>To</TableHead>
										<TableHead>Items</TableHead>
										<TableHead>Status</TableHead>
										<TableHead>By</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.items.map((t) => (
										<TableRow key={t._id}>
											<TableCell className='text-zinc-600 whitespace-nowrap'>
												{formatDate(t.createdAt)}
											</TableCell>
											<TableCell>{fromName(t)}</TableCell>
											<TableCell>{toName(t)}</TableCell>
											<TableCell>
												<ul className='list-none text-sm'>
													{(t.items || []).map(
														(item, i) => {
															const prod =
																typeof item.productId ===
																'object'
																	? item.productId
																	: null;
															const name =
																prod?.name ??
																'Product';
															const sku =
																prod?.sku ?? '';
															return (
																<li key={i}>
																	{sku
																		? `${sku}: `
																		: ''}
																	{name} ×{' '}
																	{
																		item.quantity
																	}
																</li>
															);
														},
													)}
												</ul>
											</TableCell>
											<TableCell>
												<span
													className={`px-2 py-1 rounded-full text-xs font-medium ${
														t.status === 'completed'
															? 'bg-green-100 text-green-700'
															: t.status ===
																  'cancelled'
																? 'bg-red-100 text-red-700'
																: 'bg-amber-100 text-amber-700'
													}`}
												>
													{t.status}
												</span>
											</TableCell>
											<TableCell className='text-zinc-600 text-sm'>
												{t.createdBy &&
												typeof t.createdBy ===
													'object' &&
												'name' in t.createdBy
													? String(
															(
																t.createdBy as {
																	name?: string;
																}
															).name ?? '',
														)
													: '-'}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							{data.total > limit && (
								<div className='flex items-center justify-between border-t pt-4 mt-4'>
									<p className='text-sm text-zinc-500'>
										Showing {(page - 1) * limit + 1}–
										{Math.min(page * limit, data.total)} of{' '}
										{data.total}
									</p>
									<div className='flex gap-2'>
										<Button
											variant='outline'
											size='sm'
											onClick={() =>
												setPage((p) =>
													Math.max(1, p - 1),
												)
											}
											disabled={page <= 1}
										>
											Previous
										</Button>
										<span className='flex items-center px-2 text-sm text-zinc-600'>
											Page {page} of {totalPages || 1}
										</span>
										<Button
											variant='outline'
											size='sm'
											onClick={() =>
												setPage((p) =>
													p >= totalPages ? p : p + 1,
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
