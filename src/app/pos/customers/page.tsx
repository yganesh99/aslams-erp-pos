'use client';

import {
	Users,
	Search,
	Plus,
	Pencil,
	X,
	ChevronRight,
	Phone,
	Mail,
	MapPin,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePosStore } from '../store';
import { useRouter } from 'next/navigation';
import {
	getCustomers,
	createCustomer,
	updateCustomer,
	type Customer,
	type CreateCustomerPayload,
	type UpdateCustomerPayload,
} from '@/lib/customerApi';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CustomerFormState {
	name: string;
	email: string;
	phone: string;
	street: string;
	city: string;
	state: string;
	zip: string;
	country: string;
	creditLimit: string;
}

const emptyForm = (): CustomerFormState => ({
	name: '',
	email: '',
	phone: '',
	street: '',
	city: '',
	state: '',
	zip: '',
	country: '',
	creditLimit: '',
});

const customerToForm = (c: Customer): CustomerFormState => ({
	name: c.name,
	email: c.email ?? '',
	phone: c.phone ?? '',
	street: c.address?.street ?? '',
	city: c.address?.city ?? '',
	state: c.address?.state ?? '',
	zip: c.address?.zip ?? '',
	country: c.address?.country ?? '',
	creditLimit: c.creditLimit ? String(c.creditLimit) : '',
});

// ─── Component ───────────────────────────────────────────────────────────────

export default function PosCustomersPage() {
	const [mounted, setMounted] = useState(false);
	const session = usePosStore((s) => s.session);
	const router = useRouter();

	// List state
	const [customers, setCustomers] = useState<Customer[]>([]);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<Customer | null>(null);
	const [form, setForm] = useState<CustomerFormState>(emptyForm());
	const [formError, setFormError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	// Debounce ref
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// ── Data fetching ─────────────────────────────────────────────────────────

	const fetchCustomers = useCallback(async (query: string) => {
		const q = query.trim();
		if (q.length < 2) {
			setCustomers([]);
			setTotal(0);
			setError(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await getCustomers(q);
			setCustomers(res.items);
			setTotal(res.total);
		} catch (error: unknown) {
			const msg =
				error &&
				typeof error === 'object' &&
				'response' in error &&
				error.response &&
				typeof error.response === 'object' &&
				'data' in error.response &&
				error.response.data &&
				typeof error.response.data === 'object' &&
				'message' in error.response.data
					? String(
							(error.response.data as { message?: string })
								.message,
						)
					: null;
			setError(
				msg || 'Failed to load customers. Please try again.',
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Listing requires search (min 2 chars) for cashiers — see API. No initial bulk fetch.

	// Debounced search
	const handleSearchChange = (value: string) => {
		setSearch(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			fetchCustomers(value);
		}, 300);
	};

	// ── Dialog helpers ────────────────────────────────────────────────────────

	const openAdd = () => {
		setEditTarget(null);
		setForm(emptyForm());
		setFormError(null);
		setDialogOpen(true);
	};

	const openEdit = (customer: Customer) => {
		setEditTarget(customer);
		setForm(customerToForm(customer));
		setFormError(null);
		setDialogOpen(true);
	};

	const closeDialog = () => {
		setDialogOpen(false);
		setEditTarget(null);
		setFormError(null);
	};

	const setField = (key: keyof CustomerFormState, value: string) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	// ── Submit ────────────────────────────────────────────────────────────────

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name.trim()) {
			setFormError('Customer name is required.');
			return;
		}
		setFormError(null);
		setSubmitting(true);

		const address = {
			street: form.street,
			city: form.city,
			state: form.state,
			zip: form.zip,
			country: form.country,
		};

		try {
			if (editTarget) {
				const payload: UpdateCustomerPayload = {
					name: form.name.trim(),
					email: form.email.trim() || undefined,
					phone: form.phone.trim() || undefined,
					address,
					creditLimit: form.creditLimit
						? Number(form.creditLimit)
						: undefined,
				};
				const updated = await updateCustomer(editTarget._id, payload);
				setCustomers((prev) =>
					prev.map((c) => (c._id === updated._id ? updated : c)),
				);
			} else {
				const payload: CreateCustomerPayload = {
					name: form.name.trim(),
					email: form.email.trim() || undefined,
					phone: form.phone.trim() || undefined,
					address,
					creditLimit: form.creditLimit
						? Number(form.creditLimit)
						: undefined,
				};
				const created = await createCustomer(payload);
				setCustomers((prev) => [created, ...prev]);
				setTotal((t) => t + 1);
			}
			closeDialog();
		} catch (error: any) {
			if (error.response?.data?.message) {
				setFormError(error.response.data.message);
			} else {
				setFormError('Something went wrong. Please try again.');
			}
		} finally {
			setSubmitting(false);
		}
	};

	// ── Guards ────────────────────────────────────────────────────────────────

	if (!mounted) return null;

	if (!session) {
		router.replace('/registers');
		return null;
	}

	// ── Render ────────────────────────────────────────────────────────────────

	return (
		<div className='flex-1 flex flex-col p-6 h-[calc(100vh-64px)] overflow-hidden'>
			{/* Header */}
			<div className='flex items-center justify-between mb-6'>
				<div className='flex items-center gap-3'>
					<Users className='w-8 h-8 text-black' />
					<h1 className='text-2xl font-bold text-black tracking-tight'>
						Customers
					</h1>
					{!loading && (
						<span className='text-sm text-zinc-400 font-medium'>
							{total} total
						</span>
					)}
				</div>
				<Button
					className='bg-black text-white hover:bg-zinc-800 rounded-lg gap-2'
					onClick={openAdd}
				>
					<Plus className='w-4 h-4' />
					Add Customer
				</Button>
			</div>

			{/* Main card */}
			<div className='bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col flex-1'>
				{/* Search bar */}
				<div className='p-4 border-b border-zinc-200 flex items-center gap-3'>
					<div className='relative flex-1 max-w-md'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400' />
						<Input
							placeholder='Search by name, phone, or email…'
							value={search}
							onChange={(e) => handleSearchChange(e.target.value)}
							className='pl-9 bg-zinc-50 border-transparent focus:border-zinc-300 focus:bg-white rounded-lg'
						/>
						{search && (
							<button
								onClick={() => handleSearchChange('')}
								className='absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600'
							>
								<X className='w-4 h-4' />
							</button>
						)}
					</div>
				</div>

				{/* Content area */}
				<div className='flex-1 overflow-y-auto'>
					{/* Loading skeleton */}
					{loading && (
						<div className='divide-y divide-zinc-100'>
							{Array.from({ length: 6 }).map((_, i) => (
								<div
									key={i}
									className='flex items-center gap-4 px-5 py-4 animate-pulse'
								>
									<div className='w-10 h-10 rounded-full bg-zinc-100 flex-shrink-0' />
									<div className='flex-1 space-y-2'>
										<div className='h-3.5 bg-zinc-100 rounded w-40' />
										<div className='h-3 bg-zinc-100 rounded w-56' />
									</div>
									<div className='h-6 bg-zinc-100 rounded w-20' />
								</div>
							))}
						</div>
					)}

					{/* Error state */}
					{!loading && error && (
						<div className='flex flex-col items-center justify-center p-10 text-center'>
							<p className='text-red-500 font-medium mb-3'>
								{error}
							</p>
							<Button
								variant='outline'
								onClick={() => fetchCustomers(search)}
							>
								Retry
							</Button>
						</div>
					)}

					{/* Empty state */}
					{!loading && !error && customers.length === 0 && (
						<div className='flex flex-col items-center justify-center p-12 text-center text-zinc-500'>
							<Users className='w-16 h-16 text-zinc-200 mb-4' />
							<h2 className='text-xl font-bold text-zinc-900 mb-2'>
								{search.trim().length >= 2
									? 'No matches found'
									: 'Search customers'}
							</h2>
							<p className='max-w-sm text-sm'>
								{search.trim().length >= 2
									? `No customers match "${search.trim()}". Try a different search or add a new customer.`
									: search.trim().length === 1
										? 'Enter at least 2 characters to search.'
										: 'Type at least 2 characters (name, phone, or email) to find a customer, or add a new one.'}
							</p>
							{search.trim().length < 2 && (
								<Button
									className='mt-5 bg-black text-white hover:bg-zinc-800 rounded-lg gap-2'
									onClick={openAdd}
								>
									<Plus className='w-4 h-4' /> Add Customer
								</Button>
							)}
						</div>
					)}

					{/* Customer list */}
					{!loading && !error && customers.length > 0 && (
						<ul className='divide-y divide-zinc-100'>
							{customers.map((customer) => (
								<li key={customer._id}>
									<button
										className='w-full flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors text-left group'
										onClick={() => openEdit(customer)}
									>
										{/* Avatar */}
										<div className='w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 uppercase'>
											{customer.name.charAt(0)}
										</div>

										{/* Info */}
										<div className='flex-1 min-w-0'>
											<p className='font-semibold text-zinc-900 truncate'>
												{customer.name}
											</p>
											<div className='flex items-center gap-3 mt-0.5 flex-wrap'>
												{customer.phone && (
													<span className='flex items-center gap-1 text-xs text-zinc-500'>
														<Phone className='w-3 h-3' />
														{customer.phone}
													</span>
												)}
												{customer.email && (
													<span className='flex items-center gap-1 text-xs text-zinc-500'>
														<Mail className='w-3 h-3' />
														{customer.email}
													</span>
												)}
												{customer.address?.city && (
													<span className='flex items-center gap-1 text-xs text-zinc-500'>
														<MapPin className='w-3 h-3' />
														{customer.address.city}
													</span>
												)}
											</div>
										</div>

										{/* Credit info */}
										<div className='flex items-center gap-3 flex-shrink-0'>
											{customer.creditLimit > 0 && (
												<div className='text-right hidden sm:block'>
													<p className='text-xs text-zinc-400'>
														Credit available
													</p>
													<p className='text-sm font-semibold text-zinc-900'>
														රු{' '}
														{customer.availableCredit.toLocaleString()}
													</p>
												</div>
											)}
											{customer.creditLimit === 0 && (
												<Badge
													variant='secondary'
													className='text-xs'
												>
													No credit
												</Badge>
											)}
											<Pencil className='w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors' />
											<ChevronRight className='w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors' />
										</div>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			{/* Add / Edit dialog */}
			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => !open && closeDialog()}
			>
				<DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>
							{editTarget ? 'Edit Customer' : 'Add Customer'}
						</DialogTitle>
					</DialogHeader>

					<form
						onSubmit={handleSubmit}
						className='space-y-5 mt-2'
					>
						{/* Name */}
						<div className='space-y-1'>
							<label className='text-sm font-medium text-zinc-700'>
								Name <span className='text-red-500'>*</span>
							</label>
							<Input
								placeholder='Full name'
								value={form.name}
								onChange={(e) =>
									setField('name', e.target.value)
								}
								autoFocus
							/>
						</div>

						{/* Phone + Email */}
						<div className='grid grid-cols-2 gap-4'>
							<div className='space-y-1'>
								<label className='text-sm font-medium text-zinc-700'>
									Phone
								</label>
								<Input
									placeholder='+94 71 234 5678'
									value={form.phone}
									onChange={(e) =>
										setField('phone', e.target.value)
									}
								/>
							</div>
							<div className='space-y-1'>
								<label className='text-sm font-medium text-zinc-700'>
									Email
								</label>
								<Input
									type='email'
									placeholder='customer@example.com'
									value={form.email}
									onChange={(e) =>
										setField('email', e.target.value)
									}
								/>
							</div>
						</div>

						{/* Address */}
						<div className='space-y-3'>
							<p className='text-sm font-medium text-zinc-700'>
								Address
							</p>
							<Input
								placeholder='Street'
								value={form.street}
								onChange={(e) =>
									setField('street', e.target.value)
								}
							/>
							<div className='grid grid-cols-2 gap-4'>
								<Input
									placeholder='City'
									value={form.city}
									onChange={(e) =>
										setField('city', e.target.value)
									}
								/>
								<Input
									placeholder='State / Province'
									value={form.state}
									onChange={(e) =>
										setField('state', e.target.value)
									}
								/>
							</div>
							<div className='grid grid-cols-2 gap-4'>
								<Input
									placeholder='ZIP / Postal code'
									value={form.zip}
									onChange={(e) =>
										setField('zip', e.target.value)
									}
								/>
								<Input
									placeholder='Country'
									value={form.country}
									onChange={(e) =>
										setField('country', e.target.value)
									}
								/>
							</div>
						</div>

						{/* Credit limit */}
						<div className='space-y-1'>
							<label className='text-sm font-medium text-zinc-700'>
								Credit Limit (රු)
							</label>
							<Input
								type='number'
								min={0}
								step={0.01}
								placeholder='0.00'
								value={form.creditLimit}
								onChange={(e) =>
									setField('creditLimit', e.target.value)
								}
							/>
						</div>

						{/* Form error */}
						{formError && (
							<p className='text-sm text-red-500 font-medium'>
								{formError}
							</p>
						)}

						<DialogFooter className='gap-2 pt-2'>
							<Button
								type='button'
								variant='outline'
								onClick={closeDialog}
								disabled={submitting}
							>
								Cancel
							</Button>
							<Button
								type='submit'
								className='bg-black text-white hover:bg-zinc-800'
								disabled={submitting}
							>
								{submitting
									? editTarget
										? 'Saving…'
										: 'Adding…'
									: editTarget
										? 'Save Changes'
										: 'Add Customer'}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
