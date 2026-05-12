'use client';

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { ImageIcon, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';

const MAX_PENDING_IMAGES = 10;

interface CategoryOption {
	_id: string;
	name: string;
}

interface AddProductModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function AddProductModal({
	isOpen,
	onClose,
	onSuccess,
}: AddProductModalProps) {
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const [pendingPreviewUrls, setPendingPreviewUrls] = useState<string[]>(
		[],
	);
	const pendingFileInputRef = useRef<HTMLInputElement>(null);

	const [formData, setFormData] = useState({
		sku: '',
		name: '',
		description: '',
		categories: [] as string[],
		unit: 'pcs',
		posPrice: '',
		reorderLevel: '',
	});

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);

	useEffect(() => {
		if (!isOpen) {
			setPendingFiles([]);
			setError(null);
		}
	}, [isOpen]);

	useEffect(() => {
		if (isOpen) {
			api.get('/categories')
				.then((res) => {
					const data =
						res.data.items || res.data.data || res.data || [];
					setCategoriesList(
						Array.isArray(data) ? (data as CategoryOption[]) : [],
					);
				})
				.catch((err) => {
					console.error('Failed to fetch categories:', err);
				});
		}
	}, [isOpen]);

	useEffect(() => {
		const urls = pendingFiles.map((f) => URL.createObjectURL(f));
		setPendingPreviewUrls(urls);
		return () => {
			urls.forEach((u) => URL.revokeObjectURL(u));
		};
	}, [pendingFiles]);

	const handlePendingFilesChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const list = e.target.files;
		if (!list?.length) return;
		setPendingFiles((prev) => {
			const added = Array.from(list);
			const combined = [...prev, ...added];
			if (combined.length > MAX_PENDING_IMAGES) {
				toast.info(`At most ${MAX_PENDING_IMAGES} images per product.`);
			}
			return combined.slice(0, MAX_PENDING_IMAGES);
		});
		e.target.value = '';
	};

	const removePendingAt = (index: number) => {
		setPendingFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleCategoryToggle = (id: string) => {
		setFormData((prev) => ({
			...prev,
			categories: prev.categories.includes(id)
				? prev.categories.filter((cId) => cId !== id)
				: [...prev.categories, id],
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsLoading(true);

		try {
			const filledFormData = Object.fromEntries(
				Object.entries(formData).filter(([, value]) => value !== ''),
			);
			const {
				reorderLevel: reorderLevelStr,
				...restFilled
			} = filledFormData as typeof filledFormData & {
				reorderLevel?: string;
			};
			const payload = {
				...restFilled,
				posPrice: Number(restFilled.posPrice),
				categories: formData.categories,
				...(reorderLevelStr !== undefined && reorderLevelStr !== ''
					? { reorderLevel: Number(reorderLevelStr) }
					: {}),
			};

			const res = await api.post('/products', payload);
			const created = res.data?.data ?? res.data;
			const productId = created?._id ?? created?.id;
			if (productId && pendingFiles.length > 0) {
				let uploadFailed = false;
				for (const file of pendingFiles) {
					try {
						const fd = new FormData();
						fd.append('image', file);
						await api.post(`/products/${productId}/image`, fd, {
							headers: {
								'Content-Type': 'multipart/form-data',
							},
						});
					} catch {
						uploadFailed = true;
					}
				}
				if (uploadFailed) {
					toast.warning(
						'Product saved, but one or more images failed to upload. You can add them from the product page.',
					);
				}
			}
			onSuccess();
			onClose();
			setPendingFiles([]);
			setFormData({
				sku: '',
				name: '',
				description: '',
				categories: [],
				unit: 'pcs',
				posPrice: '',
				reorderLevel: '',
			});
		} catch (err: unknown) {
			console.error('Error adding product:', err);
			const apiError = err as {
				response?: { data?: { message?: string } };
			};
			setError(
				apiError.response?.data?.message ||
					'Failed to add product. Please try again.',
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={onClose}
		>
			<DialogContent className='sm:max-w-[600px] h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>Add New Product</DialogTitle>
					<DialogDescription>
						Enter the details of the new product to add it to your
						inventory.
					</DialogDescription>
				</DialogHeader>

				<form
					onSubmit={handleSubmit}
					className='space-y-6 pt-4'
				>
					{error && (
						<div className='p-3 text-sm text-red-500 bg-red-50 rounded-md'>
							{error}
						</div>
					)}
					<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<label
								htmlFor='sku'
								className='text-sm font-medium'
							>
								SKU *
							</label>
							<Input
								id='sku'
								name='sku'
								required
								value={formData.sku}
								onChange={handleChange}
								placeholder='e.g. C-1200'
							/>
						</div>
						<div className='space-y-2'>
							<label
								htmlFor='name'
								className='text-sm font-medium'
							>
								Product Name *
							</label>
							<Input
								id='name'
								name='name'
								required
								value={formData.name}
								onChange={handleChange}
								placeholder='e.g. Premium Cotton Blend'
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<label
							htmlFor='description'
							className='text-sm font-medium'
						>
							Description
						</label>
						<Input
							id='description'
							name='description'
							value={formData.description}
							onChange={handleChange}
							placeholder='Brief description of the product'
						/>
					</div>

					<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
						<div className='space-y-2'>
							<label className='text-sm font-medium'>
								Categories
							</label>
							<div className='max-h-32 overflow-y-auto border rounded-md p-2 space-y-2'>
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
							<label
								htmlFor='unit'
								className='text-sm font-medium'
							>
								Unit
							</label>
							<select
								id='unit'
								name='unit'
								value={formData.unit}
								onChange={handleChange}
								className='flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
							>
								<option value='pcs'>
									Pieces (pcs) — whole numbers
								</option>
								<option value='bales'>
									Bales — whole numbers
								</option>
								<option value='cartons'>
									Cartons — whole numbers
								</option>
								<option value='m'>Meters (m) — decimals</option>
								<option value='kg'>
									Kilograms (kg) — decimals
								</option>
								<option value='l'>Litres (l) — decimals</option>
							</select>
							<p className='text-xs text-muted-foreground'>
								POS and inventory quantities follow this unit
								(whole vs decimal).
							</p>
						</div>
					</div>

					<div className='space-y-2'>
						<label
							htmlFor='reorderLevel'
							className='text-sm font-medium'
						>
							Reorder level
						</label>
						<Input
							id='reorderLevel'
							name='reorderLevel'
							type='number'
							min='0'
							step='any'
							value={formData.reorderLevel}
							onChange={handleChange}
							placeholder='0 = no low-stock alert'
						/>
						<p className='text-xs text-muted-foreground'>
							Total available stock (all stores) below this triggers the
							dashboard low-stock alert. Leave empty or 0 to disable.
						</p>
					</div>

					<div className='space-y-2'>
						<label
							htmlFor='posPrice'
							className='text-sm font-medium'
						>
							POS Price *
						</label>
						<Input
							id='posPrice'
							name='posPrice'
							type='number'
							min='0'
							step='0.01'
							required
							value={formData.posPrice}
							onChange={handleChange}
							placeholder='0.00'
						/>
						<p className='text-xs text-muted-foreground'>
							Prices should be entered tax exclusive.
						</p>
					</div>

					<div className='space-y-3'>
						<div>
							<p className='text-sm font-medium'>Product images</p>
							<p className='text-xs text-muted-foreground mt-0.5'>
								Optional. JPEG or PNG, up to 5 MB each. Images are
								uploaded right after the product is created.
							</p>
						</div>
						<input
							ref={pendingFileInputRef}
							type='file'
							accept='image/jpeg,image/png,image/*'
							multiple
							className='hidden'
							onChange={handlePendingFilesChange}
						/>
						{pendingFiles.length > 0 ? (
							<div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
								{pendingFiles.map((file, idx) => (
									<div
										key={`${file.name}-${idx}-${file.lastModified}`}
										className='relative aspect-square rounded-md border overflow-hidden bg-zinc-50'
									>
										{pendingPreviewUrls[idx] ? (
											<img
												src={pendingPreviewUrls[idx]}
												alt=''
												className='w-full h-full object-cover'
											/>
										) : (
											<div
												className='h-full w-full animate-pulse bg-zinc-200'
												aria-hidden
											/>
										)}
										<Button
											type='button'
											variant='destructive'
											size='icon'
											className='absolute top-0.5 right-0.5 h-7 w-7 opacity-95 shadow-sm'
											onClick={() => removePendingAt(idx)}
											disabled={isLoading}
											aria-label='Remove image'
										>
											<X className='h-3.5 w-3.5' />
										</Button>
									</div>
								))}
							</div>
						) : (
							<div className='flex items-center gap-2 rounded-md border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-6 text-zinc-400'>
								<ImageIcon className='h-8 w-8 shrink-0' />
								<span className='text-sm'>No images selected</span>
							</div>
						)}
						<Button
							type='button'
							variant='outline'
							className='w-full'
							disabled={
								isLoading ||
								pendingFiles.length >= MAX_PENDING_IMAGES
							}
							onClick={() =>
								pendingFileInputRef.current?.click()
							}
						>
							<Upload className='w-4 h-4 mr-2' />
							{pendingFiles.length > 0
								? 'Add more images'
								: 'Add images'}
						</Button>
					</div>

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={onClose}
							disabled={isLoading}
						>
							Cancel
						</Button>
						<Button
							type='submit'
							className='bg-black text-white hover:bg-zinc-800'
							disabled={isLoading}
						>
							{isLoading ? 'Saving...' : 'Save Product'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
