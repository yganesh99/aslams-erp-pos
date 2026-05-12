'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Plus } from 'lucide-react';
import axios from 'axios';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import {
	EntityStatusBadge,
	entityStatusToggleClassName,
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

const emptyForm = {
	name: '',
	code: '',
	phone: '',
	street: '',
	city: '',
	state: '',
	zip: '',
	country: '',
};

export default function StoresPage() {
	const router = useRouter();
	const [stores, setStores] = useState<Store[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [formData, setFormData] = useState({ ...emptyForm });

	const fetchStores = async () => {
		try {
			setIsLoading(true);
			const response = await api.get('/stores');
			const data = response.data;
			const list = data.items || data.data || data || [];
			setStores(Array.isArray(list) ? list : []);
		} catch (error) {
			console.error('Failed to fetch stores:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchStores();
	}, []);

	const buildPayload = () => ({
		name: formData.name,
		code: formData.code,
		phone: formData.phone,
		address: {
			street: formData.street,
			city: formData.city,
			state: formData.state,
			zip: formData.zip,
			country: formData.country,
		},
	});

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post('/stores', buildPayload());
			setIsAddOpen(false);
			setFormData({ ...emptyForm });
			fetchStores();
			toast.success('Store created.');
		} catch (error) {
			console.error('Failed to create store:', error);
			toast.error('Failed to create store.');
		}
	};

	const handleToggle = async (store: Store) => {
		try {
			await api.patch(`/stores/${store._id}/toggle`);
			fetchStores();
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

	return (
		<div className='space-y-6'>
			<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight text-black'>
						Stores & warehouses
					</h1>
					<p className='text-zinc-500'>
						Manage locations, then open a store to edit details or
						view on-hand inventory.
					</p>
				</div>
				<div className='flex flex-wrap items-center gap-2 sm:gap-3'>
					<Dialog
						open={isAddOpen}
						onOpenChange={setIsAddOpen}
					>
						<DialogTrigger asChild>
							<Button className='w-full bg-black text-white hover:bg-zinc-800 sm:w-auto'>
								<Plus className='w-4 h-4 mr-2' />
								Add store
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Add new store</DialogTitle>
							</DialogHeader>
							<form
								onSubmit={handleAddSubmit}
								className='space-y-4'
							>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
											Store code *
										</label>
										<Input
											required
											value={formData.code}
											onChange={(e) =>
												setFormData({
													...formData,
													code: e.target.value,
												})
											}
										/>
									</div>
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
								<DialogFooter>
									<Button
										type='button'
										variant='outline'
										onClick={() => setIsAddOpen(false)}
									>
										Cancel
									</Button>
									<Button type='submit'>Create store</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			</div>

			<Card>
				<CardContent className='p-0'>
					{isLoading ? (
						<p className='text-center text-zinc-500 py-8'>
							Loading stores...
						</p>
					) : stores.length === 0 ? (
						<p className='text-center text-zinc-500 py-8'>
							No stores found. Add your first store above.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Location</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className='text-right w-[160px]'>
										Actions
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{stores.map((store) => (
									<TableRow
										key={store._id}
										className='cursor-pointer hover:bg-zinc-50/80'
										onClick={() =>
											router.push(`/stores/${store._id}`)
										}
									>
										<TableCell className='font-medium'>
											{store.code}
										</TableCell>
										<TableCell className='font-medium'>
											{store.name}
										</TableCell>
										<TableCell>
											{store.address?.city
												? `${store.address.city}${store.address.state ? ', ' + store.address.state : ''}`
												: '—'}
										</TableCell>
										<TableCell>
											{store.phone || '—'}
										</TableCell>
										<TableCell>
											<EntityStatusBadge
												variant={
													store.isActive ? 'active' : 'inactive'
												}
											>
												{store.isActive ? 'Active' : 'Inactive'}
											</EntityStatusBadge>
										</TableCell>
										<TableCell className='text-right'>
											<div className='flex justify-end'>
												<Button
													variant='outline'
													size='sm'
													className={entityStatusToggleClassName}
													onClick={(e) => {
														e.stopPropagation();
														handleToggle(store);
													}}
												>
													{store.isActive
														? 'Deactivate'
														: 'Activate'}
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
		</div>
	);
}
