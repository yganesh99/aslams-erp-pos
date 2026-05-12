'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Plus,
	Search,
	Filter,
	ChevronLeft,
	ChevronRight,
	ArrowRightLeft,
	History,
	X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { AddProductModal } from '@/components/inventory/AddProductModal';
import SectionGuard from '@/components/SectionGuard';

const PAGE_SIZE = 10;

function formatStockQty(n: number | undefined): string {
	const v = n ?? 0;
	if (!Number.isFinite(v)) return '0';
	return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

/** True when reorder is configured and total available (all stores) is at or below that level. */
function isAtOrBelowReorder(item: {
	reorderLevel?: number;
	totalAvailableStock?: number;
}): boolean {
	const rl = item.reorderLevel ?? 0;
	if (rl <= 0) return false;
	const avail = item.totalAvailableStock ?? 0;
	return avail <= rl;
}

interface Category {
	_id: string;
	name: string;
	isActive?: boolean;
}

export default function InventoryPage() {
	const router = useRouter();

	const [products, setProducts] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchInput, setSearchInput] = useState('');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [limit] = useState(PAGE_SIZE);
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
	const [showFilters, setShowFilters] = useState(true);
	const [includeInactive, setIncludeInactive] = useState(false);

	const fetchCategories = useCallback(async () => {
		try {
			const res = await api.get('/categories?isActive=true');
			const data = res.data;
			const list = data.items ?? data.data ?? data;
			setCategories(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error('Failed to fetch categories:', error);
		}
	}, []);

	const fetchProducts = useCallback(
		async (
			search?: string,
			pageNum: number = 1,
			categoryId?: string | null,
			withInactive?: boolean,
		) => {
			try {
				setIsLoading(true);
				const params: Record<string, string | number> = {
					page: pageNum,
					limit,
				};
				if (search?.trim()) params.search = search.trim();
				if (categoryId) params.category = categoryId;
				if (withInactive) params.includeInactive = 'true';
				const res = await api.get('/products', { params });
				const data = res.data;
				setProducts(data.items || []);
				setTotal(data.total ?? 0);
				setPage(data.page ?? pageNum);
			} catch (error) {
				console.error('Failed to fetch products:', error);
			} finally {
				setIsLoading(false);
			}
		},
		[limit],
	);

	useEffect(() => {
		fetchCategories();
	}, [fetchCategories]);

	const hasActiveFilters = !!categoryFilter || includeInactive;
	const clearFilters = () => {
		setCategoryFilter(null);
		setIncludeInactive(false);
		setPage(1);
	};

	const selectClass =
		'h-9 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-1';

	// Debounced search: apply searchQuery and refetch when it changes
	useEffect(() => {
		const timer = setTimeout(() => {
			setSearchQuery(searchInput);
			setPage(1);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchInput]);

	// Fetch when search, page, category filter, or inactive toggle changes
	useEffect(() => {
		fetchProducts(searchQuery, page, categoryFilter, includeInactive);
	}, [searchQuery, page, categoryFilter, includeInactive, fetchProducts]);

	return (
		<SectionGuard requiredSection='inventory.products'>
		<div className='space-y-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight text-black'>
						Products
					</h1>
					<p className=' text-zinc-500'>
						View and manage fabric stock levels and SKUs.
					</p>
				</div>
				<div className='flex flex-wrap items-center gap-2 sm:gap-3'>
					<Button
						variant='outline'
						onClick={() => router.push('/inventory/transfer')}
					>
						<ArrowRightLeft className='w-4 h-4 mr-2' />
						Transfer Stock
					</Button>
					<Button
						variant='outline'
						onClick={() => router.push('/inventory/transfers')}
					>
						<History className='w-4 h-4 mr-2' />
						Transfer History
					</Button>
					<Button
						className='bg-black text-white hover:bg-zinc-800'
						onClick={() => setIsAddModalOpen(true)}
					>
						<Plus className='w-4 h-4 mr-2' />
						Add Product
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader className='flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between'>
					<CardTitle>All Products</CardTitle>
					<div className='flex flex-wrap items-center gap-2'>
						<div className='relative min-w-0 flex-1 sm:flex-initial sm:max-w-xs'>
							<Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
							<Input
								type='text'
								placeholder='Search by name or SKU...'
								className='h-9 w-full min-w-0 pl-9 pr-4 py-1.5 text-sm sm:w-56'
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
							/>
						</div>
						<Button
							variant='outline'
							size='sm'
							className='h-9'
							onClick={() => setShowFilters((v) => !v)}
						>
							<Filter className='w-4 h-4 mr-1.5' />
							{showFilters ? 'Hide filters' : 'Show filters'}
							{hasActiveFilters && (
								<span className='ml-1.5 h-2 w-2 rounded-full bg-zinc-600' />
							)}
						</Button>
						{hasActiveFilters && (
							<Button
								variant='ghost'
								size='sm'
								className='h-9 text-zinc-600'
								onClick={clearFilters}
							>
								<X className='w-4 h-4 mr-1' />
								Clear
							</Button>
						)}
					</div>
				</CardHeader>
				{showFilters && (
					<div className='px-6 pb-4 flex flex-wrap items-center gap-3 border-b border-zinc-100'>
						<div className='flex items-center gap-2'>
							<label className='text-xs font-medium text-zinc-500 whitespace-nowrap'>
								Category
							</label>
							<select
								className={`${selectClass} min-w-[160px]`}
								value={categoryFilter ?? ''}
								onChange={(e) => {
									const v = e.target.value;
									setCategoryFilter(v || null);
									setPage(1);
								}}
							>
								<option value=''>All categories</option>
								{categories.map((c) => (
									<option
										key={c._id}
										value={c._id}
									>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<label className='flex items-center gap-2 cursor-pointer select-none'>
							<input
								type='checkbox'
								className='h-4 w-4 rounded border-zinc-300'
								checked={includeInactive}
								onChange={(e) => {
									setIncludeInactive(e.target.checked);
									setPage(1);
								}}
							/>
							<span className='text-sm text-zinc-700'>
								Show inactive products
							</span>
						</label>
					</div>
				)}
				<CardContent>
					{isLoading ? (
						<p className='py-8 text-center text-zinc-500'>
							Loading products...
						</p>
					) : products.length === 0 ? (
						<p className='py-8 text-center text-zinc-500'>
							No products found.
						</p>
					) : (
						<>
							<div className='space-y-3 md:hidden'>
								{products.map((item) => {
									const low = isAtOrBelowReorder(item);
									const catLabel =
										item.categories &&
										item.categories.length > 0
											? item.categories
													.map((c: { name: string }) => c.name)
													.join(', ')
											: '—';
									return (
										<Card
											key={item._id}
											className='cursor-pointer border-zinc-200 shadow-sm transition-colors hover:bg-zinc-50'
											onClick={() =>
												router.push(
													`/inventory/products/${item._id}`,
												)
											}
										>
											<CardContent className='space-y-2 p-4'>
												<div className='flex items-start justify-between gap-2'>
													<div className='min-w-0'>
														<p className='flex items-center gap-2 font-medium text-black'>
															{low ? (
																<span
																	className='h-2 w-2 shrink-0 rounded-full bg-red-500'
																	title='At or below reorder level (all stores)'
																	aria-hidden
																/>
															) : null}
															<span className='min-w-0'>
																{item.name}
															</span>
														</p>
														<p className='text-xs text-zinc-500'>
															{item.sku}
														</p>
													</div>
													<span
														className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
															item.isActive
																? 'bg-green-100 text-green-700'
																: 'bg-zinc-100 text-zinc-700'
														}`}
													>
														{item.isActive
															? 'Active'
															: 'Inactive'}
													</span>
												</div>
												<p className='text-xs text-zinc-600'>
													{catLabel}
												</p>
												<p className='text-sm text-zinc-700'>
													Total stock (all stores):{' '}
													<span className='font-medium tabular-nums text-black'>
														{formatStockQty(
															item.totalAvailableStock,
														)}
													</span>
													{item.reorderLevel != null &&
													item.reorderLevel > 0 ? (
														<span className='text-zinc-500'>
															{' '}
															· reorder{' '}
															{item.reorderLevel}
														</span>
													) : null}
												</p>
												<div className='flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-700'>
													<span>
														POS: රු
														{item.posPrice?.toFixed(
															2,
														)}
													</span>
													<span>
														E-com: රු
														{item.ecommercePrice?.toFixed(
															2,
														)}
													</span>
													{item.isOnSale &&
													item.salePrice != null ? (
														<span className='text-amber-700'>
															Sale: රු
															{item.salePrice.toFixed(
																2,
															)}
														</span>
													) : null}
												</div>
											</CardContent>
										</Card>
									);
								})}
							</div>
							<div className='hidden md:block'>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>SKU</TableHead>
											<TableHead>Name</TableHead>
											<TableHead>Categories</TableHead>
											<TableHead className='text-right'>
												Total stock
											</TableHead>
											<TableHead className='text-right'>
												POS Price
											</TableHead>
											<TableHead className='text-right'>
												E-com Price
											</TableHead>
											<TableHead className='text-right'>
												Sale (E-com)
											</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{products.map((item) => {
											const low = isAtOrBelowReorder(item);
											return (
											<TableRow
												key={item._id}
												className='cursor-pointer hover:bg-zinc-50'
												onClick={() =>
													router.push(
														`/inventory/products/${item._id}`,
													)
												}
											>
												<TableCell className='font-medium'>
													{item.sku}
												</TableCell>
												<TableCell>
													<span className='inline-flex items-center gap-2'>
														{low ? (
															<span
																className='h-2 w-2 shrink-0 rounded-full bg-red-500'
																title='At or below reorder level (all stores)'
																aria-hidden
															/>
														) : null}
														<span>{item.name}</span>
													</span>
												</TableCell>
												<TableCell>
													{item.categories &&
													item.categories.length > 0
														? item.categories
																.map(
																	(c: {
																		name: string;
																	}) => c.name,
																)
																.join(', ')
														: '-'}
												</TableCell>
												<TableCell className='text-right tabular-nums'>
													{formatStockQty(
														item.totalAvailableStock,
													)}
												</TableCell>
												<TableCell className='text-right'>
													රු{item.posPrice?.toFixed(2)}
												</TableCell>
												<TableCell className='text-right'>
													රු{item.ecommercePrice?.toFixed(
														2,
													)}
												</TableCell>
												<TableCell className='text-right'>
													{item.isOnSale &&
													item.salePrice != null
														? `රු${item.salePrice.toFixed(2)}`
														: '-'}
												</TableCell>
												<TableCell>
													<span
														className={`rounded-full px-2 py-1 text-xs font-medium ${
															item.isActive
																? 'bg-green-100 text-green-700'
																: 'bg-zinc-100 text-zinc-700'
														}`}
													>
														{item.isActive
															? 'Active'
															: 'Inactive'}
													</span>
												</TableCell>
											</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						</>
					)}
					{total > 0 && (
						<div className='mt-4 flex flex-col gap-4 border-t border-brand-border pt-4 sm:flex-row sm:items-center sm:justify-between'>
							<p className='text-sm text-zinc-500'>
								Showing {(page - 1) * limit + 1}–
								{Math.min(page * limit, total)} of {total}{' '}
								products
							</p>
							<div className='flex flex-wrap items-center justify-center gap-2 sm:justify-end'>
								<Button
									variant='outline'
									size='sm'
									onClick={() =>
										setPage((p) => Math.max(1, p - 1))
									}
									disabled={page <= 1 || isLoading}
								>
									<ChevronLeft className='w-4 h-4' />
									Previous
								</Button>
								<span className='text-sm text-zinc-600 px-2'>
									Page {page} of{' '}
									{Math.ceil(total / limit) || 1}
								</span>
								<Button
									variant='outline'
									size='sm'
									onClick={() =>
										setPage((p) =>
											p >= Math.ceil(total / limit)
												? p
												: p + 1,
										)
									}
									disabled={
										page >= Math.ceil(total / limit) ||
										isLoading
									}
								>
									Next
									<ChevronRight className='w-4 h-4' />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<AddProductModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onSuccess={() =>
					fetchProducts(
						searchQuery,
						page,
						categoryFilter,
						includeInactive,
					)
				}
			/>
		</div>
		</SectionGuard>
	);
}
