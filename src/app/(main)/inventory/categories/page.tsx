'use client';

import { useState, useEffect } from 'react';
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Edit2, Archive } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import {
	EntityStatusBadge,
	entityArchiveIconButtonClassName,
	entityStatusToggleClassName,
} from '@/components/EntityStatusArchiveCard';
import SectionGuard from '@/components/SectionGuard';

interface Category {
	_id: string;
	name: string;
	description?: string;
	isActive: boolean;
}

const emptyForm = {
	name: '',
	description: '',
};

export default function ProductCategoryManagementPage() {
	const [categories, setCategories] = useState<Category[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingCategory, setDeletingCategory] = useState<Category | null>(
		null,
	);
	const [formData, setFormData] = useState({ ...emptyForm });

	const fetchCategories = async () => {
		try {
			setIsLoading(true);
			const response = await api.get('/categories');
			const data = response.data;
			const list = data.items ?? data.data ?? data;
			setCategories(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error('Failed to fetch categories:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchCategories();
	}, []);

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post('/categories', {
				name: formData.name.trim(),
				description: formData.description?.trim() || '',
			});
			setIsAddOpen(false);
			setFormData({ ...emptyForm });
			fetchCategories();
		} catch (error: unknown) {
			console.error('Failed to create category:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })
					?.response?.data?.message ?? 'Failed to create category.';
			toast.error(msg);
		}
	};

	const openEdit = (category: Category) => {
		setEditingId(category._id);
		setFormData({
			name: category.name ?? '',
			description: category.description ?? '',
		});
		setIsEditOpen(true);
	};

	const handleEditSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!editingId) return;
		try {
			await api.put(`/categories/${editingId}`, {
				name: formData.name.trim(),
				description: formData.description?.trim() ?? '',
			});
			setIsEditOpen(false);
			setEditingId(null);
			setFormData({ ...emptyForm });
			fetchCategories();
		} catch (error: unknown) {
			console.error('Failed to update category:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })
					?.response?.data?.message ?? 'Failed to update category.';
			toast.error(msg);
		}
	};

	const openDelete = (category: Category) => {
		setDeletingCategory(category);
		setIsDeleteOpen(true);
	};

	const handleDeleteConfirm = async () => {
		if (!deletingCategory) return;
		try {
			await api.delete(`/categories/${deletingCategory._id}`);
			setIsDeleteOpen(false);
			setDeletingCategory(null);
			fetchCategories();
			toast.success('Category archived.');
		} catch (error: unknown) {
			console.error('Failed to archive category:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })
					?.response?.data?.message ?? 'Failed to archive category.';
			toast.error(msg);
		}
	};

	const handleToggle = async (category: Category) => {
		try {
			await api.patch(`/categories/${category._id}/toggle`);
			fetchCategories();
		} catch (error) {
			console.error('Failed to toggle category:', error);
		}
	};

	const renderForm = (
		onSubmit: (e: React.FormEvent) => void,
		submitLabel: string,
	) => (
		<form
			onSubmit={onSubmit}
			className='space-y-4'
		>
			<div className='space-y-2'>
				<label className='text-sm font-medium'>Name *</label>
				<Input
					required
					value={formData.name}
					onChange={(e) =>
						setFormData({ ...formData, name: e.target.value })
					}
					placeholder='e.g. Beverages'
				/>
			</div>
			<div className='space-y-2'>
				<label className='text-sm font-medium'>Description</label>
				<Input
					value={formData.description}
					onChange={(e) =>
						setFormData({
							...formData,
							description: e.target.value,
						})
					}
					placeholder='Optional description'
				/>
			</div>
			<DialogFooter>
				<Button
					type='button'
					variant='outline'
					onClick={() => {
						setIsAddOpen(false);
						setIsEditOpen(false);
						setFormData({ ...emptyForm });
					}}
				>
					Cancel
				</Button>
				<Button type='submit'>{submitLabel}</Button>
			</DialogFooter>
		</form>
	);

	return (
		<SectionGuard requiredSection='inventory.categories'>
		<div className='space-y-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<h1 className='text-3xl font-bold tracking-tight text-black'>
					Product Categories
				</h1>
				<Dialog
					open={isAddOpen}
					onOpenChange={setIsAddOpen}
				>
					<DialogTrigger asChild>
						<Button className='w-full bg-black text-white hover:bg-zinc-800 sm:w-auto'>
							<Plus className='w-4 h-4 mr-2' />
							Add Category
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Add New Category</DialogTitle>
						</DialogHeader>
						{renderForm(handleAddSubmit, 'Create Category')}
					</DialogContent>
				</Dialog>
			</div>

			<Card>
				<CardContent className='p-0'>
					{isLoading ? (
						<p className='text-center text-zinc-500 py-8'>
							Loading categories...
						</p>
					) : categories.length === 0 ? (
						<p className='text-center text-zinc-500 py-8'>
							No categories yet. Add your first category above.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Name</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className='text-right'>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{categories.map((cat) => (
									<TableRow key={cat._id}>
										<TableCell className='font-medium'>
											{cat.name}
										</TableCell>
										<TableCell>
											{cat.description || '—'}
										</TableCell>
										<TableCell>
											<EntityStatusBadge
												variant={
													cat.isActive ? 'active' : 'inactive'
												}
											>
												{cat.isActive ? 'Active' : 'Inactive'}
											</EntityStatusBadge>
										</TableCell>
										<TableCell className='text-right'>
											<div className='flex flex-wrap items-center justify-end gap-2'>
												<Button
													variant='ghost'
													size='icon'
													className='h-9 w-9 shrink-0'
													onClick={() => openEdit(cat)}
												>
													<Edit2 className='h-4 w-4 text-blue-600' />
												</Button>
												<Button
													variant='outline'
													size='sm'
													className={entityStatusToggleClassName}
													onClick={() => handleToggle(cat)}
												>
													{cat.isActive
														? 'Deactivate'
														: 'Activate'}
												</Button>
												<Button
													variant='outline'
													size='icon'
													title='Archive category'
													className={entityArchiveIconButtonClassName}
													onClick={() => openDelete(cat)}
												>
													<Archive className='h-4 w-4' />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={isEditOpen}
				onOpenChange={setIsEditOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Category</DialogTitle>
					</DialogHeader>
					{renderForm(handleEditSubmit, 'Save Changes')}
				</DialogContent>
			</Dialog>

			<Dialog
				open={isDeleteOpen}
				onOpenChange={setIsDeleteOpen}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Archive category</DialogTitle>
					</DialogHeader>
					<p className='text-zinc-600 text-sm'>
						Archive soft-deletes &quot;{deletingCategory?.name}&quot; so it
						disappears from lists. Products keep their other categories;
						this one is removed from their assignments. Activate / deactivate
						only hides a category from merchandising without archiving it.
					</p>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setIsDeleteOpen(false);
								setDeletingCategory(null);
							}}
						>
							Cancel
						</Button>
						<Button
							variant='destructive'
							onClick={handleDeleteConfirm}
						>
							Archive category
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
		</SectionGuard>
	);
}
