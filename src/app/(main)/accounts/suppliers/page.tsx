'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
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
import { Search, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';

interface Supplier {
	_id: string;
	name: string;
	contactPerson?: string;
	email?: string;
	phone?: string;
	address?: {
		street?: string;
		city?: string;
		state?: string;
		zip?: string;
		country?: string;
	};
	leadTimeDays?: number;
	currentBalance?: number;
	isActive?: boolean;
	totalActivePOs?: number;
}

export default function SuppliersPage() {
	const router = useRouter();
	const [suppliers, setSuppliers] = useState<Supplier[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddOpen, setIsAddOpen] = useState(false);

	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		contactPerson: '',
		street: '',
		city: '',
		state: '',
		zip: '',
		country: '',
		leadTimeDays: 0,
		isActive: true,
	});

	const fetchSuppliers = async () => {
		try {
			setIsLoading(true);
			const response = await api.get('/suppliers');
			const data = response.data;
			setSuppliers(data.items || data.data || data || []);
		} catch (error) {
			console.error('Failed to fetch suppliers:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchSuppliers();
	}, []);

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const payload = {
				name: formData.name,
				email: formData.email,
				phone: formData.phone,
				contactPerson: formData.contactPerson,
				address: {
					street: formData.street,
					city: formData.city,
					state: formData.state,
					zip: formData.zip,
					country: formData.country,
				},
				leadTimeDays: formData.leadTimeDays,
				isActive: formData.isActive,
			};
			await api.post('/suppliers', payload);
			setIsAddOpen(false);
			setFormData({
				name: '',
				email: '',
				phone: '',
				contactPerson: '',
				street: '',
				city: '',
				state: '',
				zip: '',
				country: '',
				leadTimeDays: 0,
				isActive: true,
			});
			fetchSuppliers();
		} catch (error) {
			console.error('Failed to create supplier:', error);
		}
	};

	const totalBalance = suppliers.reduce(
		(acc, curr) => acc + (curr.currentBalance || 0),
		0,
	);

	return (
		<SectionGuard requiredSection="accounts.suppliers">
			<div className='space-y-6'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h2 className='text-3xl font-bold tracking-tight'>
							Suppliers
						</h2>
						<p className='text-zinc-500'>
							Manage supplier relations, outstanding payables, and
							purchase orders.
						</p>
					</div>
					<div className='flex flex-wrap items-center gap-3'>
						{/* <Button variant='outline'>
							<Download className='w-4 h-4 mr-2' />
							Export list
						</Button> */}

						<Dialog
							open={isAddOpen}
							onOpenChange={setIsAddOpen}
						>
							<DialogTrigger asChild>
								<Button className='w-full bg-black text-white hover:bg-zinc-800 sm:w-auto'>
									<Plus className='w-4 h-4 mr-2' />
									Add Supplier
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Add New Supplier</DialogTitle>
								</DialogHeader>
								<form
									onSubmit={handleAddSubmit}
									className='space-y-4'
								>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Company Name *
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
											Contact Person
										</label>
										<Input
											value={formData.contactPerson}
											onChange={(e) =>
												setFormData({
													...formData,
													contactPerson:
														e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Email
										</label>
										<Input
											type='email'
											value={formData.email}
											onChange={(e) =>
												setFormData({
													...formData,
													email: e.target.value,
												})
											}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Phone Number
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
									<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
										<div className='space-y-2'>
											<label className='text-sm font-medium'>
												Lead Time (Days)
											</label>
											<Input
												type='number'
												min='0'
												value={formData.leadTimeDays}
												onChange={(e) =>
													setFormData({
														...formData,
														leadTimeDays:
															parseInt(
																e.target.value,
															) || 0,
													})
												}
											/>
										</div>
										<div className='space-y-2 flex flex-col justify-end pb-2'>
											<label className='flex items-center space-x-2 text-sm font-medium cursor-pointer'>
												<input
													type='checkbox'
													checked={formData.isActive}
													onChange={(e) =>
														setFormData({
															...formData,
															isActive:
																e.target
																	.checked,
														})
													}
													className='w-4 h-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue'
												/>
												<span>Active Supplier</span>
											</label>
										</div>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Street Address
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
												State/Province
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
												ZIP/Postal Code
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
										<Button type='submit'>
											Save Supplier
										</Button>
									</DialogFooter>
								</form>
							</DialogContent>
						</Dialog>
					</div>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Total Suppliers
							</p>
							<p className='text-3xl font-bold mt-2'>
								{suppliers.length}
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Active Purchase Orders
							</p>
							<p className='text-3xl font-bold mt-2'>--</p>
						</CardContent>
					</Card>
					<Card>
						<CardContent className='p-6 flex flex-col items-start'>
							<p className='text-sm font-medium text-zinc-500'>
								Outstanding Payables
							</p>
							<p
								className={`text-3xl font-bold mt-2 ${totalBalance > 0 ? 'text-red-600' : ''}`}
							>
								රු{totalBalance.toFixed(2)}
							</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader className='flex flex-col gap-4 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between'>
						<CardTitle>Supplier Directory</CardTitle>
						<div className='flex flex-wrap items-center gap-2'>
							<div className='relative min-w-0 flex-1 sm:max-w-xs'>
								<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400' />
								<Input
									type='text'
									placeholder='Search suppliers...'
									className='h-9 w-full pl-9 pr-4 py-1.5 text-sm'
								/>
							</div>
							<Button
								variant='outline'
								className='flex h-9 items-center space-x-2'
							>
								<Filter className='h-4 w-4' />
								<span>Show filters</span>
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className='py-8 text-center text-zinc-500'>
								Loading suppliers...
							</p>
						) : suppliers.length === 0 ? (
							<p className='py-8 text-center text-zinc-500'>
								No suppliers found.
							</p>
						) : (
							<>
								<div className='space-y-3 md:hidden'>
									{suppliers.map((supplier) => {
										const statusLabel =
											(supplier.currentBalance || 0) > 0
												? 'Payment Due'
												: supplier.isActive
													? 'Active'
													: 'Inactive';
										const statusClass =
											(supplier.currentBalance || 0) > 0
												? 'bg-red-100 text-red-700'
												: supplier.isActive
													? 'bg-green-100 text-green-700'
													: 'bg-zinc-100 text-zinc-700';
										return (
											<Card
												key={supplier._id}
												className='cursor-pointer border-zinc-200 shadow-sm transition-colors hover:bg-zinc-50'
												onClick={() =>
													router.push(
														`/accounts/suppliers/${supplier._id}`,
													)
												}
											>
												<CardContent className='space-y-3 p-4'>
													<div className='flex items-start justify-between gap-2'>
														<p className='font-medium text-black'>
															{supplier.name}
														</p>
														<span
															className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}
														>
															{statusLabel}
														</span>
													</div>
													<div className='text-sm text-zinc-600'>
														<span>
															{supplier.email ||
																supplier.contactPerson ||
																'—'}
														</span>
														<p className='text-xs text-zinc-500'>
															{supplier.phone ||
																'—'}
														</p>
													</div>
													<div className='flex flex-wrap gap-x-4 gap-y-1 text-sm'>
														<span className='text-zinc-500'>
															Active POs:{' '}
															{supplier.totalActivePOs ||
																0}
														</span>
														<span
															className={
																(supplier.currentBalance ||
																	0) > 0
																	? 'font-medium text-red-600'
																	: ''
															}
														>
															Payable: රු
															{(
																supplier.currentBalance ||
																0
															).toFixed(2)}
														</span>
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
												<TableHead>Supplier</TableHead>
												<TableHead>Contact</TableHead>
												<TableHead className='text-right'>
													Active POs
												</TableHead>
												<TableHead className='text-right'>
													Outstanding Payables
												</TableHead>
												<TableHead>Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{suppliers.map((supplier) => (
												<TableRow
													key={supplier._id}
													className='cursor-pointer hover:bg-zinc-50'
													onClick={() =>
														router.push(
															`/accounts/suppliers/${supplier._id}`,
														)
													}
												>
													<TableCell className='font-medium'>
														{supplier.name}
													</TableCell>
													<TableCell>
														<div className='flex flex-col'>
															<span>
																{supplier.email ||
																	supplier.contactPerson ||
																	'-'}
															</span>
															<span className='text-xs text-zinc-500'>
																{supplier.phone ||
																	'-'}
															</span>
														</div>
													</TableCell>
													<TableCell className='text-right'>
														{supplier.totalActivePOs ||
															0}
													</TableCell>
													<TableCell
														className={`text-right font-medium ${(supplier.currentBalance || 0) > 0 ? 'text-red-600' : ''}`}
													>
														රු
														{(
															supplier.currentBalance ||
															0
														).toFixed(2)}
													</TableCell>
													<TableCell>
														<span
															className={`rounded-full px-2 py-1 text-xs font-medium
													${supplier.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-700'}
													${(supplier.currentBalance || 0) > 0 ? 'bg-red-100 text-red-700' : ''}
												`}
														>
															{(supplier.currentBalance ||
																0) > 0
																? 'Payment Due'
																: supplier.isActive
																	? 'Active'
																	: 'Inactive'}
														</span>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</>
						)}
					</CardContent>
				</Card>
			</div>
		</SectionGuard>
	);
}
