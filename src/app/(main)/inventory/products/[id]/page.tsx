'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	ArrowLeft,
	Save,
	PackagePlus,
	ArrowRightLeft,
	History,
	Upload,
	ImageIcon,
	X,
	Archive,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import api, { apiOrigin } from '@/lib/api';
import SectionGuard from '@/components/SectionGuard';
import {
	allowsDecimalQuantity,
	formatQuantityDisplay,
	normalizeQuantity,
} from '@/lib/quantityByUnit';
import { toast } from 'react-toastify';
import {
	EntityDetailPageHeader,
	EntityStatusBadge,
	entityHeaderActionClassName,
	entityHeaderArchiveButtonClassName,
} from '@/components/EntityStatusArchiveCard';

/** Backend stores `/uploads/...` paths; browser must load them from the API host, not the Next.js origin. */
function productImageSrc(path: string | undefined): string | null {
	const trimmed = path?.trim();
	if (!trimmed) return null;
	if (/^https?:\/\//i.test(trimmed)) return trimmed;
	return `${apiOrigin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

interface Category {
	_id: string;
	name: string;
}

interface StoreSummary {
	_id: string;
	name: string;
}

interface InventoryByStoreRow {
	_id: string;
	quantity: number;
	reservedQuantity?: number;
	storeId?:
		| { _id?: string; name?: string; code?: string }
		| string;
}

interface PaginatedInventoryResponse {
	items: InventoryByStoreRow[];
	total: number;
	page: number;
	limit: number;
}

interface Product {
	_id: string;
	sku: string;
	name: string;
	description?: string;
	categories?: any[];
	unit?: string;
	posPrice: number;
	ecommercePrice: number;
	taxRate: number;
	visibility: string;
	isActive: boolean;
	image?: string;
	images?: string[];
	isOnSale?: boolean;
	isNewArrival?: boolean;
	isBestSeller?: boolean;
	salePrice?: number;
	reorderLevel?: number;
}

function orderedProductImages(p: Product | null): string[] {
	if (!p) return [];
	const fromList =
		p.images?.filter((u) => Boolean(u && String(u).trim())) ?? [];
	if (fromList.length > 0) return fromList;
	if (p.image?.trim()) return [p.image.trim()];
	return [];
}

const STOCK_BY_STORE_PAGE_SIZE = 10;

export default function SingleProductPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [product, setProduct] = useState<Product | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		sku: '',
		description: '',
		categories: [] as string[],
		unit: 'pcs',
		posPrice: 0,
		ecommercePrice: 0,
		taxRate: 0,
		visibility: 'both',
		isOnSale: false,
		isNewArrival: false,
		isBestSeller: false,
		salePrice: 0,
		reorderLevel: 0,
	});

	// Stock adjustment dialog
	const [isAdjustOpen, setIsAdjustOpen] = useState(false);
	const [adjustStoreId, setAdjustStoreId] = useState('');
	const [adjustQty, setAdjustQty] = useState('');
	const [adjustUnitCost, setAdjustUnitCost] = useState('');
	const [adjustNote, setAdjustNote] = useState('');
	// Transfer stock dialog
	const [isTransferOpen, setIsTransferOpen] = useState(false);
	const [transferFromStoreId, setTransferFromStoreId] = useState('');
	const [transferToStoreId, setTransferToStoreId] = useState('');
	const [transferQty, setTransferQty] = useState('');
	const [stores, setStores] = useState<StoreSummary[]>([]);
	/** Available quantity (on hand) per store for this product */
	const [storeStockMap, setStoreStockMap] = useState<
		Record<string, number>
	>({});
	const [categoriesList, setCategoriesList] = useState<Category[]>([]);
	const [removingImageUrl, setRemovingImageUrl] = useState<string | null>(
		null,
	);

	const [stockByStorePage, setStockByStorePage] = useState(1);
	const [stockByStoreData, setStockByStoreData] =
		useState<PaginatedInventoryResponse | null>(null);
	const [stockByStoreLoading, setStockByStoreLoading] = useState(false);
	const [stockByStoreRefresh, setStockByStoreRefresh] = useState(0);
	const [stockByStoreLoadError, setStockByStoreLoadError] = useState(false);
	const [isArchiveOpen, setIsArchiveOpen] = useState(false);
	const [isArchiving, setIsArchiving] = useState(false);

	const fetchProduct = async () => {
		try {
			setIsLoading(true);
			const response = await api.get(`/products/${id}`);
			const data = response.data.data || response.data;
			setProduct(data);
			setFormData({
				name: data.name || '',
				sku: data.sku || '',
				description: data.description || '',
				categories: data.categories
					? data.categories.map((c: any) => c._id)
					: [],
				unit: data.unit || 'pcs',
				posPrice: data.posPrice || 0,
				ecommercePrice: data.ecommercePrice || 0,
				taxRate: data.taxRate || 0,
				visibility: data.visibility || 'both',
				isOnSale: data.isOnSale ?? false,
				isNewArrival: data.isNewArrival ?? false,
				isBestSeller: data.isBestSeller ?? false,
				salePrice: data.salePrice ?? 0,
				reorderLevel: data.reorderLevel ?? 0,
			});
		} catch (error) {
			console.error('Failed to fetch product:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchStores = async () => {
		try {
			const response = await api.get('/stores');
			const data = response.data;
			const list: StoreSummary[] =
				(data.items || data.data || data || []) as StoreSummary[];
			setStores(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error('Failed to fetch stores:', error);
		}
	};

	const fetchStoreStockForProduct = async () => {
		if (!id) return;
		try {
			const res = await api.get('/inventory', {
				params: { productId: id },
			});
			const list = Array.isArray(res.data)
				? res.data
				: (res.data?.items ?? []);
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
		} catch (error) {
			console.error('Failed to fetch stock by store:', error);
			setStoreStockMap({});
		}
	};

	const fetchCategories = async () => {
		try {
			const response = await api.get('/categories');
			const data =
				response.data.items ||
				response.data.data ||
				response.data ||
				[];
			setCategoriesList(Array.isArray(data) ? (data as Category[]) : []);
		} catch (error) {
			console.error('Failed to fetch categories:', error);
		}
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (id) {
			setStockByStorePage(1);
			fetchProduct();
			fetchStores();
			fetchStoreStockForProduct();
			fetchCategories();
		}
	}, [id]);

	useEffect(() => {
		if (!id) return;
		let cancelled = false;
		(async () => {
			try {
				setStockByStoreLoading(true);
				setStockByStoreLoadError(false);
				const res = await api.get('/inventory', {
					params: {
						productId: id,
						page: stockByStorePage,
						limit: STOCK_BY_STORE_PAGE_SIZE,
					},
				});
				const d = res.data;
				if (cancelled) return;
				if (
					d &&
					Array.isArray(d.items) &&
					typeof d.total === 'number'
				) {
					setStockByStoreData({
						items: d.items as InventoryByStoreRow[],
						total: d.total,
						page: d.page,
						limit: d.limit,
					});
				} else {
					setStockByStoreData({
						items: [],
						total: 0,
						page: 1,
						limit: STOCK_BY_STORE_PAGE_SIZE,
					});
				}
			} catch (error) {
				if (!cancelled) {
					console.error('Failed to fetch stock by store:', error);
					setStockByStoreData(null);
					setStockByStoreLoadError(true);
				}
			} finally {
				if (!cancelled) setStockByStoreLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [id, stockByStorePage, stockByStoreRefresh]);

	const handleSaveChanges = async () => {
		try {
			setIsSaving(true);
			await api.put(`/products/${id}`, {
				name: formData.name,
				sku: formData.sku,
				description: formData.description,
				categories: formData.categories,
				unit: formData.unit,
				posPrice: formData.posPrice,
				ecommercePrice: formData.ecommercePrice,
				taxRate: formData.taxRate,
				visibility: formData.visibility,
				isOnSale: formData.isOnSale,
				isNewArrival: formData.isNewArrival,
				isBestSeller: formData.isBestSeller,
				salePrice: formData.isOnSale ? formData.salePrice : null,
				reorderLevel: formData.reorderLevel,
			});
			await fetchProduct();
			toast.success('Product updated successfully!');
		} catch (error) {
			console.error('Failed to update product:', error);
			toast.error('Failed to update product.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleCategoryToggle = (id: string) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories.includes(id)
				? prev.categories.filter((c) => c !== id)
				: [...prev.categories, id],
		}));
	};

	const handleToggleActive = async () => {
		try {
			const { data } = await api.patch<{ isActive: boolean }>(
				`/products/${id}/toggle`,
			);
			await fetchProduct();
			toast.success(
				data.isActive ? 'Product activated.' : 'Product deactivated.',
			);
		} catch (error: unknown) {
			console.error('Failed to toggle product:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to update product status.');
		}
	};

	const handleArchiveProduct = async () => {
		try {
			setIsArchiving(true);
			await api.delete(`/products/${id}`);
			setIsArchiveOpen(false);
			toast.success('Product archived.');
			router.push('/inventory');
		} catch (error: unknown) {
			console.error('Failed to archive product:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to archive product.');
		} finally {
			setIsArchiving(false);
		}
	};

	const handleImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];
		if (!file) return;
		try {
			const formDataObj = new FormData();
			formDataObj.append('image', file);
			await api.post(`/products/${id}/image`, formDataObj, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			await fetchProduct();
			toast.success('Product image uploaded successfully!');
		} catch (error) {
			console.error('Failed to upload image:', error);
			toast.error('Failed to upload image.');
		}
	};

	const handleRemoveImage = async (url: string) => {
		const filename = url.split('/').pop();
		if (!filename) return;
		setRemovingImageUrl(url);
		try {
			await api.delete(
				`/products/${id}/images/${encodeURIComponent(filename)}`,
			);
			await fetchProduct();
			toast.success('Image removed.');
		} catch (error) {
			console.error('Failed to remove image:', error);
			toast.error('Failed to remove image.');
		} finally {
			setRemovingImageUrl(null);
		}
	};

	const handleAdjustStock = async () => {
		const parsed = parseFloat(adjustQty);
		if (!Number.isFinite(parsed) || parsed === 0 || !adjustStoreId) {
			toast.warning(
				'Please select a store and enter a quantity (positive to add, negative to remove).',
			);
			return;
		}
		const unit = formData.unit || 'pcs';
		const normalized =
			parsed > 0
				? normalizeQuantity(parsed, unit)
				: -normalizeQuantity(Math.abs(parsed), unit);
		if (normalized === 0) {
			toast.warning('Please enter a valid quantity change.');
			return;
		}
		if (normalized > 0) {
			const cost = parseFloat(adjustUnitCost);
			if (!Number.isFinite(cost) || cost < 0) {
				toast.warning(
					'When adding stock, enter a unit cost (≥ 0) for the new FIFO cost layer.',
				);
				return;
			}
		}
		try {
			const body: Record<string, unknown> = {
				productId: id,
				storeId: adjustStoreId,
				quantityChange: normalized,
			};
			if (normalized > 0) {
				body.unitCost = parseFloat(adjustUnitCost);
				if (adjustNote.trim()) {
					body.adjustmentNote = adjustNote.trim();
				}
			}
			await api.post('/inventory/adjust', body);
			setIsAdjustOpen(false);
			setAdjustQty('');
			setAdjustUnitCost('');
			setAdjustNote('');
			setAdjustStoreId('');
			await Promise.all([fetchProduct(), fetchStoreStockForProduct()]);
			setStockByStoreRefresh((n) => n + 1);
			toast.success('Stock adjusted successfully!');
		} catch (error) {
			console.error('Failed to adjust stock:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to adjust stock.');
		}
	};

	const handleTransferStock = async () => {
		const parsed = parseFloat(transferQty);
		if (
			!Number.isFinite(parsed) ||
			parsed <= 0 ||
			!transferFromStoreId ||
			!transferToStoreId
		) {
			toast.warning(
				'Please select both source and destination stores and enter a positive quantity.',
			);
			return;
		}
		if (transferFromStoreId === transferToStoreId) {
			toast.warning('Source and destination stores must be different.');
			return;
		}
		const unit = formData.unit || 'pcs';
		const normalized = normalizeQuantity(parsed, unit);
		if (normalized === 0) {
			toast.warning('Please enter a valid quantity.');
			return;
		}
		try {
			await api.post('/inventory/transfer', {
				fromStoreId: transferFromStoreId,
				toStoreId: transferToStoreId,
				items: [
					{
						productId: id,
						quantity: normalized,
					},
				],
			});
			setIsTransferOpen(false);
			setTransferQty('');
			setTransferFromStoreId('');
			setTransferToStoreId('');
			await Promise.all([fetchProduct(), fetchStoreStockForProduct()]);
			setStockByStoreRefresh((n) => n + 1);
			toast.success('Stock transferred successfully!');
		} catch (error) {
			console.error('Failed to transfer stock:', error);
			toast.error('Failed to transfer stock.');
		}
	};

	if (isLoading) {
		return (
			<SectionGuard requiredSection='inventory.products'>
				<div className='p-8 text-center text-zinc-500'>
					Loading product details...
				</div>
			</SectionGuard>
		);
	}

	if (!product) {
		return (
			<SectionGuard requiredSection='inventory.products'>
				<div className='p-8 text-center text-red-500'>
					Product not found.
				</div>
			</SectionGuard>
		);
	}

	const unitLabel = formData.unit || 'pcs';
	const storeStockLabel = (storeId: string) => {
		const qty = storeStockMap[storeId] ?? 0;
		return `${formatQuantityDisplay(qty, unitLabel)} ${unitLabel} on hand`;
	};

	const stockByStoreTotalPages = stockByStoreData
		? Math.max(
				1,
				Math.ceil(stockByStoreData.total / stockByStoreData.limit),
			)
		: 1;

	const resolveStoreFromRow = (row: InventoryByStoreRow) => {
		const raw = row.storeId;
		if (raw && typeof raw === 'object' && 'name' in raw) {
			return {
				name: raw.name || '—',
				code: raw.code,
			};
		}
		return { name: '—', code: undefined as string | undefined };
	};

	return (
		<SectionGuard requiredSection='inventory.products'>
		<div className='min-w-0 space-y-6'>
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
								<h2 className='break-words text-2xl font-bold tracking-tight sm:text-3xl'>
									{product.name}
								</h2>
								<EntityStatusBadge
									variant={
										product.isActive ? 'active' : 'inactive'
									}
								>
									{product.isActive ? 'Active' : 'Inactive'}
								</EntityStatusBadge>
								<span className='max-w-xl text-xs text-zinc-500'>
									Activate / deactivate controls visibility and sales eligibility
									while keeping the SKU in the system. Archive removes the
									product from the catalog (soft delete).
								</span>
							</div>
							<p className='break-words text-sm text-zinc-500 sm:text-base'>
								SKU: {product.sku}
							</p>
						</div>
					</div>
				}
				actions={
					<>
						<Button
							variant='outline'
							size='sm'
							className={entityHeaderActionClassName}
							onClick={handleToggleActive}
						>
							{product.isActive
								? 'Deactivate product'
								: 'Activate product'}
						</Button>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className={entityHeaderArchiveButtonClassName}
							onClick={() => setIsArchiveOpen(true)}
						>
							<Archive className='mr-2 h-4 w-4' />
							Archive product
						</Button>
					</>
				}
			/>

			<Dialog
				open={isArchiveOpen}
				onOpenChange={setIsArchiveOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Archive this product?</DialogTitle>
					</DialogHeader>
					<p className='text-sm text-zinc-600'>
						Archiving soft-deletes the product: it disappears from lists and
						search, but historical orders and stock records stay intact. This
						is not the same as deactivating, which only pauses selling.
					</p>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => setIsArchiveOpen(false)}
							disabled={isArchiving}
						>
							Cancel
						</Button>
						<Button
							type='button'
							variant='destructive'
							onClick={handleArchiveProduct}
							disabled={isArchiving}
						>
							{isArchiving ? 'Archiving…' : 'Archive product'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
				<div className='min-w-0 space-y-6 lg:col-span-2'>
					<Card className='min-w-0'>
						<CardHeader className='min-w-0'>
							<CardTitle>Product Details</CardTitle>
							<p className='text-sm text-zinc-500'>
								Update product information and pricing.
							</p>
						</CardHeader>
						<CardContent className='min-w-0 space-y-4'>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Name
									</label>
									<Input
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
										SKU
									</label>
									<Input
										value={formData.sku}
										onChange={(e) =>
											setFormData({
												...formData,
												sku: e.target.value,
											})
										}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Categories
									</label>
									<div className='max-h-32 overflow-y-auto border rounded-md p-2 space-y-2 bg-white w-full'>
										{categoriesList.length === 0 ? (
											<p className='text-xs text-zinc-500'>
												No active categories found
											</p>
										) : (
											categoriesList.map((cat) => (
												<label
													key={cat._id}
													className='flex items-center space-x-2 text-sm'
												>
													<input
														type='checkbox'
														checked={formData.categories.includes(
															cat._id,
														)}
														onChange={() =>
															handleCategoryToggle(
																cat._id,
															)
														}
														className='rounded border-zinc-300'
													/>
													<span>{cat.name}</span>
												</label>
											))
										)}
									</div>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Unit
									</label>
									<select
										className='flex h-10 w-full min-w-0 max-w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
										value={formData.unit}
										onChange={(e) =>
											setFormData({
												...formData,
												unit: e.target.value,
											})
										}
									>
										<option value='pcs'>Pieces (pcs) — whole numbers</option>
										<option value='bales'>Bales — whole numbers</option>
										<option value='cartons'>Cartons — whole numbers</option>
										<option value='m'>Meters (m) — decimals</option>
										<option value='kg'>Kilograms (kg) — decimals</option>
										<option value='l'>Litres (l) — decimals</option>
										{formData.unit &&
											!['pcs', 'bales', 'cartons', 'm', 'kg', 'l'].includes(
												formData.unit,
											) && (
												<option value={formData.unit}>
													{formData.unit} (current)
												</option>
											)}
									</select>
									<p className='text-xs text-zinc-500'>
										POS and inventory quantities follow this unit (whole vs decimal).
									</p>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Reorder level
									</label>
									<Input
										type='number'
										step='any'
										min='0'
										value={formData.reorderLevel}
										onChange={(e) =>
											setFormData({
												...formData,
												reorderLevel: Number.isFinite(
													parseFloat(e.target.value),
												)
													? parseFloat(e.target.value)
													: 0,
											})
										}
									/>
									<p className='text-xs text-zinc-500'>
										Total available stock (all stores) below this triggers the
										dashboard low-stock alert. Use 0 to disable.
									</p>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										POS Price (රු)
									</label>
									<Input
										type='number'
										step='0.01'
										min='0'
										value={formData.posPrice}
										onChange={(e) =>
											setFormData({
												...formData,
												posPrice:
													parseFloat(
														e.target.value,
													) || 0,
											})
										}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										E-commerce Price (රු)
									</label>
									<Input
										type='number'
										step='0.01'
										min='0'
										value={formData.ecommercePrice}
										onChange={(e) =>
											setFormData({
												...formData,
												ecommercePrice:
													parseFloat(
														e.target.value,
													) || 0,
											})
										}
									/>
								</div>
								<div className='space-y-3 md:col-span-2'>
									<label className='text-sm font-medium'>
										E-commerce storefront
									</label>
									<p className='text-xs text-zinc-500'>
										Controls sale, new arrivals, and best seller
										sections on the storefront.
									</p>
									<div className='flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6'>
										<label className='flex items-center gap-2 text-sm'>
											<input
												id='isOnSale'
												name='isOnSale'
												type='checkbox'
												checked={formData.isOnSale}
												onChange={(e) =>
													setFormData({
														...formData,
														isOnSale: e.target.checked,
													})
												}
												className='rounded border-zinc-300'
											/>
											<span>On sale</span>
										</label>
										<label className='flex items-center gap-2 text-sm'>
											<input
												id='isNewArrival'
												type='checkbox'
												checked={formData.isNewArrival}
												onChange={(e) =>
													setFormData({
														...formData,
														isNewArrival: e.target.checked,
													})
												}
												className='rounded border-zinc-300'
											/>
											<span>New arrival</span>
										</label>
										<label className='flex items-center gap-2 text-sm'>
											<input
												id='isBestSeller'
												type='checkbox'
												checked={formData.isBestSeller}
												onChange={(e) =>
													setFormData({
														...formData,
														isBestSeller: e.target.checked,
													})
												}
												className='rounded border-zinc-300'
											/>
											<span>Best seller</span>
										</label>
									</div>
									{formData.isOnSale && (
										<div className='max-w-full space-y-1 sm:max-w-xs'>
											<label className='text-xs font-medium text-zinc-600'>
												Sale price (E-com)
											</label>
											<Input
												type='number'
												step='0.01'
												min='0'
												value={formData.salePrice}
												onChange={(e) =>
													setFormData({
														...formData,
														salePrice:
															parseFloat(
																e.target.value,
															) || 0,
													})
												}
											/>
										</div>
									)}
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Tax Rate (%)
									</label>
									<Input
										type='number'
										step='0.01'
										min='0'
										value={formData.taxRate}
										onChange={(e) =>
											setFormData({
												...formData,
												taxRate:
													parseFloat(
														e.target.value,
													) || 0,
											})
										}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Visibility
									</label>
									<select
										className='h-10 w-full min-w-0 max-w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue'
										value={formData.visibility}
										onChange={(e) =>
											setFormData({
												...formData,
												visibility: e.target.value,
											})
										}
									>
										<option value='both'>
											POS & E-commerce
										</option>
										<option value='pos_only'>
											POS Only
										</option>
										<option value='ecommerce_only'>
											E-commerce Only
										</option>
									</select>
								</div>
								<div className='space-y-2 md:col-span-2'>
									<label className='text-sm font-medium'>
										Description
									</label>
									<textarea
										className='min-h-[80px] w-full min-w-0 max-w-full rounded-md border border-zinc-200 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue'
										value={formData.description}
										onChange={(e) =>
											setFormData({
												...formData,
												description: e.target.value,
											})
										}
									/>
								</div>
							</div>
							<div className='flex flex-col gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end'>
								<Button
									className='flex w-full items-center justify-center space-x-2 sm:w-auto'
									onClick={handleSaveChanges}
									disabled={isSaving}
								>
									<Save className='w-4 h-4' />
									<span>
										{isSaving
											? 'Saving...'
											: 'Save Changes'}
									</span>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='min-w-0 space-y-6'>
					{/* Product Image */}
					<Card className='min-w-0'>
						<CardHeader>
							<CardTitle>Product Images</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							{orderedProductImages(product).length > 0 ? (
								<div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
									{orderedProductImages(product).map(
										(imgUrl, idx) => {
											const src = productImageSrc(imgUrl);
											return (
											<div
												key={imgUrl + idx}
												className='relative aspect-square rounded-lg border overflow-hidden bg-zinc-50'
											>
												{src ? (
												<img
													src={src}
													alt={`${product.name} ${idx + 1}`}
													className='w-full h-full object-cover'
												/>
												) : (
													<div
														className='flex h-full w-full items-center justify-center bg-zinc-100 text-xs text-zinc-400'
														aria-hidden
													>
														Invalid path
													</div>
												)}
												<Button
													type='button'
													variant='destructive'
													size='icon'
													className='absolute top-1 right-1 h-8 w-8 opacity-90 shadow-sm'
													disabled={
														removingImageUrl ===
														imgUrl
													}
													onClick={() =>
														handleRemoveImage(
															imgUrl,
														)
													}
													aria-label='Remove image'
												>
													<X className='h-4 w-4' />
												</Button>
											</div>
											);
										},
									)}
								</div>
							) : (
								<div className='w-full aspect-square max-w-xs mx-auto rounded-lg border border-dashed border-zinc-300 bg-zinc-50 flex flex-col items-center justify-center text-zinc-400'>
									<ImageIcon className='w-12 h-12 mb-2' />
									<span className='text-sm'>
										No image uploaded
									</span>
								</div>
							)}
							<input
								ref={fileInputRef}
								type='file'
								accept='image/*'
								className='hidden'
								onChange={handleImageUpload}
							/>
							<Button
								variant='outline'
								className='w-full'
								onClick={() => fileInputRef.current?.click()}
							>
								<Upload className='w-4 h-4 mr-2' />
								{orderedProductImages(product).length > 0
									? 'Add Another Image'
									: 'Upload Image'}
							</Button>
						</CardContent>
					</Card>

					{/* Actions */}
					<Card className='min-w-0'>
						<CardHeader>
							<CardTitle>Stock Actions</CardTitle>
						</CardHeader>
						<CardContent className='space-y-3'>
							<Button
								className='w-full flex items-center justify-center space-x-2'
								variant='outline'
								onClick={() => setIsTransferOpen(true)}
							>
								<ArrowRightLeft className='w-4 h-4' />
								<span>Transfer Stock</span>
							</Button>
							<Button
								className='w-full flex items-center justify-center space-x-2'
								variant='outline'
								onClick={() => setIsAdjustOpen(true)}
							>
								<PackagePlus className='w-4 h-4' />
								<span>Adjust Stock</span>
							</Button>
							<Button
								className='w-full flex items-center justify-center space-x-2'
								variant='outline'
								onClick={() =>
									router.push(
										`/inventory/products/${id}/movements`,
									)
								}
							>
								<PackagePlus className='w-4 h-4' />
								<span>View Movements</span>
							</Button>
							<Button
								className='w-full flex items-center justify-center space-x-2'
								variant='outline'
								onClick={() =>
									router.push(
										`/inventory/products/${id}/history`,
									)
								}
							>
								<History className='w-4 h-4' />
								<span>View History</span>
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>

			<Card className='min-w-0'>
				<CardHeader>
					<CardTitle>Stock by store</CardTitle>
					<p className='text-sm text-zinc-500'>
						On-hand and reserved quantities from inventory records
						for this product.
					</p>
				</CardHeader>
				<CardContent>
					{stockByStoreLoading ? (
						<p className='py-8 text-center text-zinc-500'>
							Loading stock…
						</p>
					) : stockByStoreLoadError ? (
						<p className='py-8 text-center text-red-600'>
							Could not load stock by store. Try again or refresh
							the page.
						</p>
					) : !stockByStoreData ||
					  stockByStoreData.items.length === 0 ? (
						<p className='py-8 text-center text-zinc-500'>
							No inventory rows for this product yet. Adjust or
							receive stock to create store-level balances.
						</p>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Store</TableHead>
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
									{stockByStoreData.items.map((row) => {
										const store = resolveStoreFromRow(row);
										const onHand = Number(row.quantity) || 0;
										const reserved =
											Number(row.reservedQuantity) || 0;
										const available = Math.max(
											0,
											onHand - reserved,
										);
										return (
											<TableRow key={row._id}>
												<TableCell>
													<div className='font-medium'>
														{store.name}
													</div>
													{store.code ? (
														<div className='text-xs text-zinc-500'>
															{store.code}
														</div>
													) : null}
												</TableCell>
												<TableCell className='text-right tabular-nums'>
													{formatQuantityDisplay(
														onHand,
														unitLabel,
													)}{' '}
													<span className='text-zinc-500'>
														{unitLabel}
													</span>
												</TableCell>
												<TableCell className='text-right tabular-nums'>
													{formatQuantityDisplay(
														reserved,
														unitLabel,
													)}{' '}
													<span className='text-zinc-500'>
														{unitLabel}
													</span>
												</TableCell>
												<TableCell className='text-right font-medium tabular-nums'>
													{formatQuantityDisplay(
														available,
														unitLabel,
													)}{' '}
													<span className='text-zinc-500'>
														{unitLabel}
													</span>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
							{stockByStoreData.total > stockByStoreData.limit && (
								<div className='mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
									<p className='text-sm text-zinc-500'>
										Showing{' '}
										{(stockByStoreData.page - 1) *
											stockByStoreData.limit +
											1}
										–
										{Math.min(
											stockByStoreData.page *
												stockByStoreData.limit,
											stockByStoreData.total,
										)}{' '}
										of {stockByStoreData.total}
									</p>
									<div className='flex flex-wrap items-center gap-2'>
										<Button
											variant='outline'
											size='sm'
											onClick={() =>
												setStockByStorePage((p) =>
													Math.max(1, p - 1),
												)
											}
											disabled={stockByStorePage <= 1}
										>
											Previous
										</Button>
										<span className='px-2 text-sm text-zinc-600'>
											Page {stockByStoreData.page} of{' '}
											{stockByStoreTotalPages}
										</span>
										<Button
											variant='outline'
											size='sm'
											onClick={() =>
												setStockByStorePage((p) =>
													p >= stockByStoreTotalPages
														? p
														: p + 1,
												)
											}
											disabled={
												stockByStorePage >=
												stockByStoreTotalPages
											}
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

			{/* Adjust Stock Dialog */}
			<Dialog
				open={isAdjustOpen}
				onOpenChange={(open) => {
					setIsAdjustOpen(open);
					if (!open) {
						setAdjustQty('');
						setAdjustUnitCost('');
						setAdjustNote('');
						setAdjustStoreId('');
					}
				}}
			>
				<DialogContent className='max-h-[min(90dvh,36rem)] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle className='break-words pr-8 text-left'>
							Adjust Stock — {product.name}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								Store *
							</label>
							<select
								className='w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white'
								value={adjustStoreId}
								onChange={(e) =>
									setAdjustStoreId(e.target.value)
								}
							>
								<option value=''>Select a store</option>
								{stores.map((s) => (
									<option
										key={s._id}
										value={s._id}
									>
										{s.name} — {storeStockLabel(s._id)}
									</option>
								))}
							</select>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								Quantity Change * ({formData.unit || 'pcs'})
							</label>
							<Input
								type='number'
								step={allowsDecimalQuantity(formData.unit) ? 0.01 : 1}
								min={allowsDecimalQuantity(formData.unit) ? undefined : undefined}
								value={adjustQty}
								onChange={(e) => setAdjustQty(e.target.value)}
								placeholder={
									allowsDecimalQuantity(formData.unit)
										? 'e.g. 2.5 or -1.25'
										: 'e.g. 10 or -3'
								}
							/>
							<p className='text-xs text-zinc-500'>
								Positive to add, negative to remove.{' '}
								{allowsDecimalQuantity(formData.unit)
									? 'Decimals allowed (kg, m, etc.).'
									: 'Whole numbers only (pcs, bales, cartons).'}
							</p>
						</div>
						{(() => {
							const p = parseFloat(adjustQty);
							const showCost =
								Number.isFinite(p) &&
								p > 0 &&
								(() => {
									const u = formData.unit || 'pcs';
									const n = normalizeQuantity(p, u);
									return n > 0;
								})();
							if (!showCost) return null;
							return (
								<>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Unit cost (FIFO layer) *
										</label>
										<Input
											type='number'
											step={0.01}
											min={0}
											value={adjustUnitCost}
											onChange={(e) =>
												setAdjustUnitCost(e.target.value)
											}
											placeholder='e.g. 150.00'
										/>
										<p className='text-xs text-zinc-500'>
											Required when increasing quantity.
											Creates a new cost batch (oldest
											sold first on future sales).
										</p>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Note (optional)
										</label>
										<Input
											value={adjustNote}
											onChange={(e) =>
												setAdjustNote(e.target.value)
											}
											placeholder='e.g. Opening balance, count correction'
										/>
									</div>
								</>
							);
						})()}
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setIsAdjustOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleAdjustStock}>
							Apply Adjustment
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Transfer Stock Dialog */}
			<Dialog
				open={isTransferOpen}
				onOpenChange={setIsTransferOpen}
			>
				<DialogContent className='max-h-[min(90dvh,36rem)] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle className='break-words pr-8 text-left'>
							Transfer Stock — {product.name}
						</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								From Store *
							</label>
							<select
								className='w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white'
								value={transferFromStoreId}
								onChange={(e) =>
									setTransferFromStoreId(e.target.value)
								}
							>
								<option value=''>Select source store</option>
								{stores.map((s) => (
									<option
										key={s._id}
										value={s._id}
									>
										{s.name} — {storeStockLabel(s._id)}
									</option>
								))}
							</select>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								To Store *
							</label>
							<select
								className='w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white'
								value={transferToStoreId}
								onChange={(e) =>
									setTransferToStoreId(e.target.value)
								}
							>
								<option value=''>Select destination store</option>
								{stores
									.filter((s) => s._id !== transferFromStoreId)
									.map((s) => (
										<option
											key={s._id}
											value={s._id}
										>
											{s.name} — {storeStockLabel(s._id)}
										</option>
									))}
							</select>
						</div>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								Quantity * ({formData.unit || 'pcs'})
							</label>
							<Input
								type='number'
								step={allowsDecimalQuantity(formData.unit) ? 0.01 : 1}
								min={allowsDecimalQuantity(formData.unit) ? 0.01 : 1}
								value={transferQty}
								onChange={(e) => setTransferQty(e.target.value)}
								placeholder={
									allowsDecimalQuantity(formData.unit)
										? 'e.g. 2.5'
										: 'e.g. 10'
								}
							/>
							<p className='text-xs text-zinc-500'>
								Quantity to move from the source store to the destination store.
							</p>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setIsTransferOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleTransferStock}>
							Transfer
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
		</SectionGuard>
	);
}
