'use client';

import { useState, useEffect, use } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	ArrowLeft,
	Save,
	CreditCard,
	History,
	FileText,
	Archive,
} from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'react-toastify';
import {
	EntityDetailPageHeader,
	EntityStatusBadge,
	entityHeaderActionClassName,
	entityHeaderArchiveButtonClassName,
} from '@/components/EntityStatusArchiveCard';

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
}

interface SupplierPurchaseOrder {
	_id: string;
	poNumber?: string;
	createdAt?: string;
	orderDate?: string;
	totalAmount?: number;
	paymentStatus?: string;
	status?: string;
}

interface SupplierInvoice {
	_id: string;
	invoiceNumber: string;
	createdAt: string;
	totalAmount?: number;
	paidAmount?: number;
	status: 'paid' | 'partial_paid' | 'unpaid' | string;
}

export default function SingleSupplierPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);

	const [supplier, setSupplier] = useState<Supplier | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
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

	// For now, mock recent POs or fetch if there's an endpoint
	const [recentPOs, setRecentPOs] = useState<SupplierPurchaseOrder[]>([]);
	const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
	const [isInvoicesOpen, setIsInvoicesOpen] = useState(false);
	const [isPaymentOpen, setIsPaymentOpen] = useState(false);
	const [paymentData, setPaymentData] = useState({
		invoiceId: '',
		amount: '',
	});
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [archiving, setArchiving] = useState(false);

	const fetchSupplier = async () => {
		try {
			setIsLoading(true);
			const response = await api.get(`/suppliers/${id}`);
			const data = response.data.data || response.data;
			setSupplier(data);
			setFormData({
				name: data.name || '',
				email: data.email || '',
				phone: data.phone || '',
				contactPerson: data.contactPerson || '',
				street: data.address?.street || '',
				city: data.address?.city || '',
				state: data.address?.state || '',
				zip: data.address?.zip || '',
				country: data.address?.country || '',
				leadTimeDays: data.leadTimeDays || 0,
				isActive: data.isActive !== false,
			});
		} catch (error) {
			console.error('Failed to fetch supplier details:', error);
		} finally {
			setIsLoading(false);
		}
	};

	const fetchRelatedPOs = async () => {
		try {
			// Assuming there's a purchase-orders endpoint that filters by supplierId
			const response = await api.get(`/purchase-orders?supplierId=${id}`);
			const data = response.data;
			const posArray: SupplierPurchaseOrder[] =
				(data.items || data.data || data || []) as SupplierPurchaseOrder[];
			// Just slice first 5 for history if needed
			setRecentPOs(posArray.slice(0, 5));
		} catch (error) {
			console.error('Failed to fetch related POs:', error);
		}
	};

	const fetchInvoices = async () => {
		try {
			const response = await api.get(
				`/supplier-invoices?supplierId=${id}`,
			);
			const data = response.data;
			const invoicesArray: SupplierInvoice[] =
				(data.items || data.data || data || []) as SupplierInvoice[];
			setInvoices(invoicesArray);
		} catch (error) {
			console.error('Failed to fetch invoices:', error);
		}
	};

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		if (id) {
			fetchSupplier();
			fetchRelatedPOs();
			fetchInvoices();
		}
	}, [id]);

	const handlePayInvoice = async (invoiceId: string, amount: number) => {
		try {
			await api.post(`/supplier-invoices/${invoiceId}/payment`, {
				amount,
			});
			toast.success('Payment recorded successfully!');
			fetchInvoices();
			fetchSupplier(); // update balance
			setIsPaymentOpen(false);
			setPaymentData({ invoiceId: '', amount: '' });
		} catch (error) {
			console.error('Failed to record payment:', error);
			toast.error('Failed to record payment.');
		}
	};

	const handleSaveChanges = async () => {
		try {
			setIsSaving(true);

			const updateData = {
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

			await api.put(`/suppliers/${id}`, updateData);
			await fetchSupplier();
			toast.success('Supplier details updated successfully!');
		} catch (error) {
			console.error('Failed to update supplier:', error);
			toast.error('Failed to update supplier details.');
		} finally {
			setIsSaving(false);
		}
	};

	const handleArchiveSupplier = async () => {
		try {
			setArchiving(true);
			await api.delete(`/suppliers/${id}`);
			setArchiveOpen(false);
			toast.success('Supplier archived.');
			router.push('/accounts/suppliers');
		} catch (error: unknown) {
			console.error('Failed to archive supplier:', error);
			const msg =
				(error as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to archive supplier.');
		} finally {
			setArchiving(false);
		}
	};

	if (isLoading) {
		return (
			<div className='p-8 text-center text-zinc-500'>
				Loading supplier details...
			</div>
		);
	}

	if (!supplier) {
		return (
			<div className='p-8 text-center text-red-500'>
				Supplier not found.
			</div>
		);
	}

	return (
		<SectionGuard requiredSection="accounts.suppliers">
			<div className='space-y-6'>
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
									<h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
										{supplier.name}
									</h2>
									<EntityStatusBadge
										variant={
											formData.isActive ? 'active' : 'inactive'
										}
									>
										{formData.isActive ? 'Active' : 'Inactive'}
									</EntityStatusBadge>
									<span className='max-w-xl text-xs text-zinc-500'>
										Uncheck to pause treating them as an active vendor (saved
										with Supplier details). Archive removes them from lists
										(soft delete).
									</span>
								</div>
								<p className='text-zinc-500'>
									Supplier ID: SUP-
									{supplier._id?.substring(supplier._id.length - 6)}
								</p>
							</div>
						</div>
					}
					actions={
						<>
							<label
								className={cn(
									'flex cursor-pointer items-center gap-2 text-sm font-medium',
									entityHeaderActionClassName,
								)}
							>
								<input
									type='checkbox'
									checked={formData.isActive}
									onChange={(e) =>
										setFormData({
											...formData,
											isActive: e.target.checked,
										})
									}
									className='h-4 w-4 shrink-0 rounded border-gray-300 text-brand-blue focus:ring-brand-blue'
								/>
								<span className='whitespace-nowrap'>Active supplier</span>
							</label>
							<Button
								type='button'
								variant='outline'
								size='sm'
								className={entityHeaderArchiveButtonClassName}
								onClick={() => setArchiveOpen(true)}
							>
								<Archive className='mr-2 h-4 w-4' />
								Archive supplier
							</Button>
						</>
					}
				/>

				<Dialog
					open={archiveOpen}
					onOpenChange={setArchiveOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Archive this supplier?</DialogTitle>
						</DialogHeader>
						<p className='text-sm text-zinc-600'>
							They will disappear from supplier lists. The active checkbox only
							controls whether you treat them as an ongoing vendor.
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
								onClick={handleArchiveSupplier}
								disabled={archiving}
							>
								{archiving ? 'Archiving…' : 'Archive supplier'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
					<div className='md:col-span-2 space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>Supplier Details</CardTitle>
								<p className='text-sm text-zinc-500'>
									Requires admin access to update.
								</p>
							</CardHeader>
							<CardContent className='space-y-4'>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Company Name
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
											Contact Email
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
									<div className='space-y-2 md:col-span-2 md:max-w-xs'>
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
														parseInt(e.target.value, 10) || 0,
												})
											}
										/>
									</div>
									<div className='space-y-2 md:col-span-2'>
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
									<div className='grid grid-cols-1 gap-4 md:col-span-2 md:grid-cols-2'>
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
								</div>
								<div className='pt-4 flex justify-end'>
									<Button
										className='flex items-center space-x-2'
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

						<Card>
							<CardHeader className='flex flex-row items-center justify-between'>
								<div>
									<CardTitle>
										Purchase Order History
									</CardTitle>
									<p className='text-sm text-zinc-500'>
										Recent POs associated with this
										supplier.
									</p>
								</div>
								<Button
									variant='outline'
									size='sm'
								>
									View All
								</Button>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>PO Number</TableHead>
											<TableHead>Date</TableHead>
											<TableHead className='text-right'>
												Total
											</TableHead>
											<TableHead>Payment</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{recentPOs.length === 0 ? (
											<TableRow>
												<TableCell
													colSpan={5}
													className='text-center py-4 text-zinc-500'
												>
													No purchase orders found.
												</TableCell>
											</TableRow>
										) : (
											recentPOs.map((po) => (
												<TableRow
													key={po._id}
													className='cursor-pointer hover:bg-zinc-50'
													onClick={() =>
														router.push(
															`/inventory/purchase-orders/${po._id}`,
														)
													}
												>
													<TableCell className='font-medium'>
														{po.poNumber ||
															po._id.substring(
																po._id.length -
																	6,
															)}
													</TableCell>
												<TableCell>
													{(() => {
														const value =
															po.createdAt ||
															po.orderDate;
														return value
															? new Date(
																	value,
																).toLocaleDateString()
															: '—';
													})()}
												</TableCell>
													<TableCell className='text-right font-medium'>
														රු
														{(
															po.totalAmount || 0
														).toFixed(2)}
													</TableCell>
													<TableCell>
														<span
															className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${po.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
														>
															{po.paymentStatus ||
																'UNPAID'}
														</span>
													</TableCell>
													<TableCell>
														<span
															className={`px-2 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${po.status === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}
														>
															{po.status ||
																'PENDING'}
														</span>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>

					<div className='space-y-6'>
						<Card>
							<CardHeader>
								<CardTitle>Credit & Payments</CardTitle>
							</CardHeader>
							<CardContent className='space-y-6'>
								<div className='space-y-4'>
									<div className='p-4 bg-red-50 rounded-lg border border-red-100 flex flex-col items-center justify-center'>
										<span className='text-sm text-red-600 font-semibold mb-1'>
											Outstanding Payables
										</span>
										<span className='text-3xl font-bold text-red-700'>
											රු
											{(
												supplier.currentBalance || 0
											).toFixed(2)}
										</span>
									</div>
								</div>

								<div className='space-y-3 pt-2'>
									<Dialog
										open={isPaymentOpen}
										onOpenChange={setIsPaymentOpen}
									>
										<DialogTrigger asChild>
											<Button className='w-full bg-black hover:bg-zinc-800 text-white'>
												<CreditCard className='w-4 h-4 mr-2' />
												Make Payment
											</Button>
										</DialogTrigger>
										<DialogContent>
											<DialogHeader>
												<DialogTitle>
													Record Payment
												</DialogTitle>
											</DialogHeader>
											<div className='space-y-4 pt-4'>
												<div className='space-y-2'>
													<label className='text-sm font-medium'>
														Select Invoice
													</label>
													<select
														className='w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-brand-blue'
														value={
															paymentData.invoiceId
														}
														onChange={(e) => {
															const invId =
																e.target.value;
															const inv =
																invoices.find(
																	(i) =>
																		i._id ===
																		invId,
																);
															setPaymentData({
																invoiceId:
																	invId,
																amount: inv
																	? String(
																			(inv.totalAmount ||
																				0) -
																				(inv.paidAmount ||
																					0),
																		)
																	: '',
															});
														}}
													>
														<option value=''>
															Select an invoice...
														</option>
														{invoices
															.filter(
																(inv) =>
																	inv.status !==
																	'paid',
															)
															.map((inv) => (
																<option
																	key={
																		inv._id
																	}
																	value={
																		inv._id
																	}
																>
																	{
																		inv.invoiceNumber
																	}{' '}
																	- Balance:
																	රු
																	{(
																		(inv.totalAmount ||
																			0) -
																		(inv.paidAmount ||
																			0)
																	).toFixed(
																		2,
																	)}
																</option>
															))}
													</select>
												</div>
												<div className='space-y-2'>
													<label className='text-sm font-medium'>
														Payment Amount (රු)
													</label>
													<Input
														type='number'
														min='0'
														step='0.01'
														value={
															paymentData.amount
														}
														onChange={(e) =>
															setPaymentData({
																...paymentData,
																amount: e.target
																	.value,
															})
														}
														placeholder='e.g., 5000.00'
													/>
												</div>
												<Button
													className='w-full mt-4'
													onClick={() => {
														if (
															!paymentData.invoiceId
														) {
															toast.warning(
																'Please select an invoice',
															);
															return;
														}
														if (
															!paymentData.amount ||
															Number(
																paymentData.amount,
															) <= 0
														) {
															toast.warning(
																'Please enter a valid amount',
															);
															return;
														}
														handlePayInvoice(
															paymentData.invoiceId,
															Number(
																paymentData.amount,
															),
														);
													}}
												>
													Confirm Payment
												</Button>
											</div>
										</DialogContent>
									</Dialog>
									<Dialog
										open={isInvoicesOpen}
										onOpenChange={setIsInvoicesOpen}
									>
										<DialogTrigger asChild>
											<Button
												variant='outline'
												className='w-full'
											>
												<FileText className='w-4 h-4 mr-2' />
												Supplier Invoices
											</Button>
										</DialogTrigger>
										<DialogContent className='max-w-3xl'>
											<DialogHeader>
												<DialogTitle>
													Invoices for {supplier.name}
												</DialogTitle>
											</DialogHeader>
											<div className='mt-4 max-h-[60vh] overflow-y-auto'>
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>
																Invoice #
															</TableHead>
															<TableHead>
																Date
															</TableHead>
															<TableHead>
																Amount
															</TableHead>
															<TableHead>
																Paid
															</TableHead>
															<TableHead>
																Status
															</TableHead>
															<TableHead>
																Action
															</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{invoices.length ===
														0 ? (
															<TableRow>
																<TableCell
																	colSpan={6}
																	className='text-center py-4'
																>
																	No invoices
																	found.
																</TableCell>
															</TableRow>
														) : (
															invoices.map(
																(inv) => (
																	<TableRow
																		key={
																			inv._id
																		}
																	>
																		<TableCell className='font-medium'>
																			{
																				inv.invoiceNumber
																			}
																		</TableCell>
																		<TableCell>
																			{new Date(
																				inv.createdAt,
																			).toLocaleDateString()}
																		</TableCell>
																		<TableCell>
																			රු
																			{(
																				inv.totalAmount ||
																				0
																			).toFixed(
																				2,
																			)}
																		</TableCell>
																		<TableCell>
																			රු
																			{(
																				inv.paidAmount ||
																				0
																			).toFixed(
																				2,
																			)}
																		</TableCell>
																		<TableCell>
																			<span
																				className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'partial_paid' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
																			>
																				{
																					inv.status
																				}
																			</span>
																		</TableCell>
																		<TableCell>
																			{inv.status !==
																				'paid' && (
																				<Button
																					size='sm'
																					variant='outline'
																					onClick={() => {
																						setPaymentData(
																							{
																								invoiceId:
																									inv._id,
																								amount: String(
																									(inv.totalAmount ||
																										0) -
																										(inv.paidAmount ||
																											0),
																								),
																							},
																						);
																						setIsInvoicesOpen(
																							false,
																						);
																						setIsPaymentOpen(
																							true,
																						);
																					}}
																				>
																					Pay
																					Balance
																				</Button>
																			)}
																		</TableCell>
																	</TableRow>
																),
															)
														)}
													</TableBody>
												</Table>
											</div>
										</DialogContent>
									</Dialog>
									<Button
										variant='outline'
										className='w-full'
									>
										<History className='w-4 h-4 mr-2' />
										View Statement
									</Button>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</SectionGuard>
	);
}
