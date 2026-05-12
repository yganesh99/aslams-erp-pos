'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import axios from 'axios';
import api from '@/lib/api';
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
	EntityStatusBadge,
	entityHeaderActionClassName,
	entityHeaderArchiveButtonClassName,
} from '@/components/EntityStatusArchiveCard';

interface Store {
	_id: string;
	name: string;
	code: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		zip?: string;
		country?: string;
	};
	phone?: string;
	isActive: boolean;
}

interface PopulatedProduct {
	_id: string;
	name?: string;
	sku?: string;
}

interface InventoryRow {
	_id: string;
	productId: PopulatedProduct | string;
	quantity: number;
	reservedQuantity?: number;
	availableQuantity?: number;
}

const INV_PAGE_SIZE = 20;

export default function StoreDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = typeof params.id === 'string' ? params.id : '';

	const [store, setStore] = useState<Store | null>(null);
	const [storeLoading, setStoreLoading] = useState(true);
	const [loadError, setLoadError] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		phone: '',
		street: '',
		city: '',
		state: '',
		zip: '',
		country: '',
	});
	const [inventory, setInventory] = useState<InventoryRow[]>([]);
	const [invTotal, setInvTotal] = useState(0);
	/** Per-store page so switching locations does not reuse another store's page index. */
	const [storeInvPage, setStoreInvPage] = useState<Record<string, number>>(
		{},
	);
	const invPage = storeInvPage[id] ?? 1;
	const setInvPage = (updater: number | ((p: number) => number)) => {
		setStoreInvPage((prev) => {
			const cur = prev[id] ?? 1;
			const next =
				typeof updater === 'function'
					? (updater as (p: number) => number)(cur)
					: updater;
			return { ...prev, [id]: next };
		});
	};
	const [invLoading, setInvLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [archiving, setArchiving] = useState(false);

	const fetchStore = useCallback(async () => {
		if (!id) return;
		try {
			setStoreLoading(true);
			const res = await api.get(`/stores/${id}`);
			const s = res.data as Store;
			setStore(s);
			setLoadError(false);
			setFormData({
				name: s.name || '',
				phone: s.phone || '',
				street: s.address?.street || '',
				city: s.address?.city || '',
				state: s.address?.state || '',
				zip: s.address?.zip || '',
				country: s.address?.country || '',
			});
		} catch {
			setStore(null);
			setLoadError(true);
		} finally {
			setStoreLoading(false);
		}
	}, [id]);

	const fetchInventory = useCallback(async () => {
		if (!id) return;
		try {
			setInvLoading(true);
			const res = await api.get('/inventory', {
				params: {
					storeId: id,
					page: invPage,
					limit: INV_PAGE_SIZE,
				},
			});
			const data = res.data;
			if (Array.isArray(data)) {
				setInventory(data);
				setInvTotal(data.length);
			} else {
				setInventory(data.items ?? []);
				setInvTotal(
					typeof data.total === 'number' ? data.total : 0,
				);
			}
		} catch (e) {
			console.error('Failed to load inventory:', e);
			setInventory([]);
			setInvTotal(0);
		} finally {
			setInvLoading(false);
		}
	}, [id, invPage]);

	useEffect(() => {
		fetchStore();
	}, [fetchStore]);

	useEffect(() => {
		fetchInventory();
	}, [fetchInventory]);

	const invTotalPages = Math.ceil(invTotal / INV_PAGE_SIZE) || 1;

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!id) return;
		try {
			setSaving(true);
			await api.put(`/stores/${id}`, {
				name: formData.name,
				phone: formData.phone,
				address: {
					street: formData.street,
					city: formData.city,
					state: formData.state,
					zip: formData.zip,
					country: formData.country,
				},
			});
			toast.success('Store updated.');
			fetchStore();
		} catch (error) {
			console.error('Failed to update store:', error);
			toast.error('Failed to update store.');
		} finally {
			setSaving(false);
		}
	};

	const handleToggle = async () => {
		if (!id || !store) return;
		try {
			await api.patch(`/stores/${id}/toggle`);
			fetchStore();
			toast.success(
				store.isActive ? 'Store deactivated.' : 'Store activated.',
			);
		} catch (error) {
			console.error('Failed to toggle store:', error);
			const message = axios.isAxiosError(error)
				? error.response?.data?.message
				: undefined;
			toast.error(
				typeof message === 'string' ? message : 'Failed to update store status.',
			);
		}
	};

	const handleArchiveStore = async () => {
		if (!id) return;
		try {
			setArchiving(true);
			await api.delete(`/stores/${id}`);
			setArchiveOpen(false);
			toast.success('Store archived.');
			router.push('/stores');
		} catch (error) {
			console.error('Failed to archive store:', error);
			const message = axios.isAxiosError(error)
				? error.response?.data?.message
				: undefined;
			toast.error(
				typeof message === 'string'
					? message
					: 'Failed to archive store.',
			);
		} finally {
			setArchiving(false);
		}
	};

	if (!id) {
		return null;
	}

	if (storeLoading) {
		return (
			<p className='text-center text-zinc-500 py-12'>Loading store...</p>
		);
	}

	if (loadError || !store) {
		return (
			<div className='space-y-4'>
				<Button
					variant='ghost'
					size='sm'
					className='gap-1 pl-0'
					onClick={() => router.push('/stores')}
				>
					<ArrowLeft className='w-4 h-4' />
					Back to stores
				</Button>
				<p className='text-zinc-600'>Store not found.</p>
			</div>
		);
	}

	const available = (row: InventoryRow) => {
		if (row.availableQuantity != null) return row.availableQuantity;
		const q = row.quantity ?? 0;
		const r = row.reservedQuantity ?? 0;
		return q - r;
	};

	const productIdOf = (row: InventoryRow) => {
		const p = row.productId;
		if (p && typeof p === 'object' && '_id' in p) return p._id;
		return String(p);
	};

	const productName = (row: InventoryRow) => {
		const p = row.productId;
		if (p && typeof p === 'object' && 'name' in p) return p.name || '—';
		return '—';
	};

	const productSku = (row: InventoryRow) => {
		const p = row.productId;
		if (p && typeof p === 'object' && 'sku' in p) return p.sku || '—';
		return '—';
	};

	return (
		<div className='space-y-6'>
			<EntityDetailPageHeader
				leading={
					<div className='space-y-1'>
						<Button
							variant='ghost'
							size='sm'
							className='mb-2 gap-1 pl-0'
							asChild
						>
							<Link href='/stores'>
								<ArrowLeft className='h-4 w-4' />
								Back to stores
							</Link>
						</Button>
						<div className='flex flex-wrap items-center gap-x-2 gap-y-2'>
							<h2 className='text-3xl font-bold tracking-tight'>
								{store.name}
							</h2>
							<EntityStatusBadge
								variant={store.isActive ? 'active' : 'inactive'}
							>
								{store.isActive ? 'Active' : 'Inactive'}
							</EntityStatusBadge>
							<span className='max-w-xl text-xs text-zinc-500'>
								Deactivate pauses operations at this location. Archive removes
								the store from the directory (soft delete).
							</span>
						</div>
						<p className='text-zinc-500'>
							<span className='font-mono text-sm'>{store.code}</span>
							{store.address?.city
								? ` · ${store.address.city}${store.address.state ? ', ' + store.address.state : ''}`
								: ''}
						</p>
					</div>
				}
				actions={
					<>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className={entityHeaderActionClassName}
							onClick={handleToggle}
						>
							{store.isActive ? 'Deactivate' : 'Activate'}
						</Button>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className={entityHeaderArchiveButtonClassName}
							onClick={() => setArchiveOpen(true)}
						>
							<Archive className='mr-2 h-4 w-4' />
							Archive store
						</Button>
					</>
				}
			/>

			<Tabs
				defaultValue='details'
				className='w-full'
			>
				<TabsList>
					<TabsTrigger value='details'>Store details</TabsTrigger>
					<TabsTrigger value='inventory'>Available inventory</TabsTrigger>
				</TabsList>

				<TabsContent
					value='details'
					className='space-y-6'
				>
					<Card>
						<CardContent className='pt-6 space-y-6'>
							<form
								onSubmit={handleSave}
								className='space-y-4'
							>
								<div className='grid grid-cols-1 gap-4 md:max-w-xl'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Store code
										</label>
										<Input
											value={store.code}
											disabled
											className='bg-zinc-50'
										/>
										<p className='text-xs text-zinc-500'>
											Code cannot be changed after
											creation.
										</p>
									</div>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Store name *
									</label>
									<Input
										required
										value={formData.name}
										onChange={(e) =>
											setFormData({
												...formData,
												name: e.target.value,
											})
										}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Phone
									</label>
									<Input
										value={formData.phone}
										onChange={(e) =>
											setFormData({
												...formData,
												phone: e.target.value,
											})
										}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Street address
									</label>
									<Input
										value={formData.street}
										onChange={(e) =>
											setFormData({
												...formData,
												street: e.target.value,
											})
										}
									/>
								</div>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											City
										</label>
										<Input
											value={formData.city}
											onChange={(e) =>
												setFormData({
													...formData,
													city: e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											State
										</label>
										<Input
											value={formData.state}
											onChange={(e) =>
												setFormData({
													...formData,
													state: e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											ZIP
										</label>
										<Input
											value={formData.zip}
											onChange={(e) =>
												setFormData({
													...formData,
													zip: e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Country
										</label>
										<Input
											value={formData.country}
											onChange={(e) =>
												setFormData({
													...formData,
													country: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className='flex justify-end gap-2 pt-2'>
									<Button
										type='submit'
										disabled={saving}
										className='bg-black text-white hover:bg-zinc-800'
									>
										{saving ? 'Saving...' : 'Save changes'}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</TabsContent>

				<Dialog
					open={archiveOpen}
					onOpenChange={setArchiveOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Archive this store?</DialogTitle>
						</DialogHeader>
						<p className='text-sm text-zinc-600'>
							Archiving soft-deletes the store so it no longer appears in lists.
							Inventory history is retained. This is not the same as deactivating
							the location.
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
								onClick={handleArchiveStore}
								disabled={archiving}
							>
								{archiving ? 'Archiving…' : 'Archive store'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<TabsContent value='inventory'>
					<Card>
						<CardContent className='p-0'>
							{invLoading ? (
								<p className='text-center text-zinc-500 py-8'>
									Loading inventory...
								</p>
							) : invTotal === 0 ? (
								<p className='text-center text-zinc-500 py-8'>
									No stock records at this location yet.
								</p>
							) : (
								<div className='p-0'>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Product</TableHead>
												<TableHead>SKU</TableHead>
												<TableHead className='text-right'>
													On hand
												</TableHead>
												<TableHead className='text-right'>
													Reserved
												</TableHead>
												<TableHead className='text-right'>
													Available
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{inventory.map((row) => {
												const pid = productIdOf(row);
												const res =
													row.reservedQuantity ?? 0;
												return (
													<TableRow key={row._id}>
														<TableCell className='font-medium'>
															<Link
																href={`/inventory/products/${pid}`}
																className='hover:underline text-black'
															>
																{productName(row)}
															</Link>
														</TableCell>
														<TableCell className='text-zinc-600'>
															{productSku(row)}
														</TableCell>
														<TableCell className='text-right tabular-nums'>
															{row.quantity ?? 0}
														</TableCell>
														<TableCell className='text-right tabular-nums'>
															{res}
														</TableCell>
														<TableCell className='text-right tabular-nums font-medium'>
															{available(row)}
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
									{invTotal > 0 && (
										<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-200 px-4 py-4'>
											<p className='text-sm text-zinc-500'>
												Showing{' '}
												{(invPage - 1) * INV_PAGE_SIZE + 1}–
												{Math.min(
													invPage * INV_PAGE_SIZE,
													invTotal,
												)}{' '}
												of {invTotal} SKUs
											</p>
											<div className='flex items-center gap-2'>
												<Button
													variant='outline'
													size='sm'
													onClick={() =>
														setInvPage((p) =>
															Math.max(1, p - 1),
														)
													}
													disabled={
														invPage <= 1 || invLoading
													}
												>
													<ChevronLeft className='w-4 h-4' />
													Previous
												</Button>
												<span className='text-sm text-zinc-600 px-2'>
													Page {invPage} of{' '}
													{invTotalPages}
												</span>
												<Button
													variant='outline'
													size='sm'
													onClick={() =>
														setInvPage((p) =>
															p >= invTotalPages
																? p
																: p + 1,
														)
													}
													disabled={
														invPage >= invTotalPages ||
														invLoading
													}
												>
													Next
													<ChevronRight className='w-4 h-4' />
												</Button>
											</div>
										</div>
									)}
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
