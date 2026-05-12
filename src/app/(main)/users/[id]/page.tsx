'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
import {
	EntityDetailPageHeader,
	EntityStatusBadge,
	entityHeaderActionClassName,
	entityHeaderArchiveButtonClassName,
} from '@/components/EntityStatusArchiveCard';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Archive } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'react-toastify';

interface ManagedUser {
	_id: string;
	name: string;
	email: string;
	phone?: string;
	role: string;
	isActive: boolean;
	firstName?: string;
	lastName?: string;
	address?: string;
	country?: string;
	city?: string;
	postalCode?: string;
}

interface StaffRole {
	slug: string;
	label: string;
}

function formatRole(role: string) {
	return role.replace(/_/g, ' ');
}

export default function UserDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { user: sessionUser } = useAuth();
	const id = typeof params.id === 'string' ? params.id : '';

	const [user, setUser] = useState<ManagedUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [archiveOpen, setArchiveOpen] = useState(false);
	const [archiving, setArchiving] = useState(false);
	const [name, setName] = useState('');
	const [phone, setPhone] = useState('');
	const [role, setRole] = useState('');
	const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);

	const load = useCallback(async () => {
		if (!id) return;
		try {
			setLoading(true);
			const res = await api.get(`/users/${id}`);
			const u = res.data as ManagedUser;
			setUser(u);
			setName(u.name || '');
			setPhone(u.phone || '');
			setRole(u.role || '');
		} catch {
			toast.error('Failed to load user.');
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		load();
	}, [load]);

	useEffect(() => {
		api.get<StaffRole[]>('/roles/staff')
			.then((res) => setStaffRoles(res.data))
			.catch(() => {});
	}, []);

	const isCustomer = user?.role === 'customer';
	const canEditStaffFields = user && !isCustomer;

	const handleSave = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!user || isCustomer) return;
		try {
			setSaving(true);
			await api.put(`/users/${user._id}`, {
				name,
				phone,
				role,
			});
			toast.success('User updated.');
			load();
		} catch {
			toast.error('Failed to update user.');
		} finally {
			setSaving(false);
		}
	};

	const handleToggleSuspend = async () => {
		if (!user) return;
		try {
			await api.patch(`/users/${user._id}/toggle`);
			toast.success(
				user.isActive
					? 'User suspended — they can no longer sign in.'
					: 'User activated.',
			);
			load();
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to update account status.');
		}
	};

	const handleArchiveUser = async () => {
		if (!user) return;
		try {
			setArchiving(true);
			await api.delete(`/users/${user._id}`);
			setArchiveOpen(false);
			toast.success('User archived.');
			router.push('/users');
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string } } })?.response
					?.data?.message;
			toast.error(msg || 'Failed to archive user.');
		} finally {
			setArchiving(false);
		}
	};

	const isSelf = sessionUser?.id === user?._id;

	if (loading) {
		return (
			<SectionGuard requiredSection="users">
				<div className='py-12 text-center text-zinc-500'>
					Loading…
				</div>
			</SectionGuard>
		);
	}

	if (!user) {
		return (
			<SectionGuard requiredSection="users">
				<div className='space-y-4'>
					<Button
						variant='ghost'
						asChild
						className='gap-2 -ml-2'
					>
						<Link href='/users'>
							<ArrowLeft className='w-4 h-4' />
							Back to users
						</Link>
					</Button>
					<p className='text-zinc-500'>User not found.</p>
				</div>
			</SectionGuard>
		);
	}

	return (
		<SectionGuard requiredSection="users">
			<div className='space-y-6'>
				<EntityDetailPageHeader
					leading={
						<div className='space-y-1'>
							<Button
								variant='ghost'
								asChild
								className='-ml-2 gap-2'
							>
								<Link href='/users'>
									<ArrowLeft className='h-4 w-4' />
									Back to users
								</Link>
							</Button>
							<div className='flex flex-wrap items-center gap-x-2 gap-y-2'>
								<h1 className='text-3xl font-bold tracking-tight'>
									{user.name}
								</h1>
								<EntityStatusBadge
									variant={
										user.isActive ? 'active' : 'suspended'
									}
								>
									{user.isActive ? 'Active' : 'Suspended'}
								</EntityStatusBadge>
								<span className='max-w-xl text-xs text-zinc-500'>
									{isSelf
										? 'Suspend blocks sign-in.'
										: 'Suspend blocks sign-in. Archive removes this account from the directory (soft delete).'}
								</span>
							</div>
							<p className='mt-1 text-zinc-500'>
								{formatRole(user.role)}
								{isCustomer ? ' · customer account' : ' · staff account'}
							</p>
						</div>
					}
					actions={
						<>
							<Button
								type='button'
								variant={user.isActive ? 'destructive' : 'default'}
								size='sm'
								className={entityHeaderActionClassName}
								onClick={handleToggleSuspend}
							>
								{user.isActive
									? 'Suspend account'
									: 'Activate account'}
							</Button>
							{!isSelf ? (
								<Button
									type='button'
									variant='outline'
									size='sm'
									className={entityHeaderArchiveButtonClassName}
									onClick={() => setArchiveOpen(true)}
								>
									<Archive className='mr-2 h-4 w-4' />
									Archive account
								</Button>
							) : null}
						</>
					}
				/>

				<Dialog
					open={archiveOpen}
					onOpenChange={setArchiveOpen}
				>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Archive this user?</DialogTitle>
						</DialogHeader>
						<p className='text-sm text-zinc-600'>
							The account will be soft-deleted and hidden from the user list.
							This is separate from suspend, which only toggles whether they
							can sign in.
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
								onClick={handleArchiveUser}
								disabled={archiving}
							>
								{archiving ? 'Archiving…' : 'Archive account'}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{isCustomer ? (
					<Card>
						<CardHeader>
							<CardTitle>Account details</CardTitle>
						</CardHeader>
						<CardContent className='space-y-4'>
							<p className='text-sm text-zinc-600'>
								Customer names, contact information, and addresses
								are owned by the customer and cannot be edited
								from the ERP. You can suspend login if needed.
							</p>
							<div className='grid gap-4 sm:grid-cols-2'>
								<ReadOnlyField
									label='Email'
									value={user.email}
								/>
								<ReadOnlyField
									label='Name'
									value={user.name}
								/>
								<ReadOnlyField
									label='Phone'
									value={user.phone || '—'}
								/>
								<ReadOnlyField
									label='City'
									value={user.city || '—'}
								/>
								<ReadOnlyField
									label='Country'
									value={user.country || '—'}
								/>
								<ReadOnlyField
									label='Postal code'
									value={user.postalCode || '—'}
								/>
							</div>
							{user.address ? (
								<ReadOnlyField
									label='Address'
									value={user.address}
								/>
							) : null}
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<CardTitle>Staff profile</CardTitle>
						</CardHeader>
						<CardContent>
							<form
								onSubmit={handleSave}
								className='space-y-4'
							>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Email
									</label>
									<Input
										value={user.email}
										disabled
										className='bg-zinc-50 text-zinc-600'
									/>
									<p className='text-xs text-zinc-500'>
										Email cannot be changed.
									</p>
								</div>
								<div className='grid gap-4 sm:grid-cols-2'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Full name
										</label>
										<Input
											value={name}
											onChange={(e) => setName(e.target.value)}
											disabled={!canEditStaffFields}
										/>
									</div>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Phone
										</label>
										<Input
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
											disabled={!canEditStaffFields}
										/>
									</div>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Role
									</label>
									<select
										className='w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white disabled:opacity-60'
										value={role}
										onChange={(e) => setRole(e.target.value)}
										disabled={!canEditStaffFields}
									>
										{staffRoles.map((r) => (
											<option
												key={r.slug}
												value={r.slug}
											>
												{r.label}
											</option>
										))}
									</select>
								</div>
								<Button
									type='submit'
									disabled={saving || !canEditStaffFields}
									className='bg-black text-white hover:bg-zinc-800'
								>
									{saving ? 'Saving…' : 'Save changes'}
								</Button>
							</form>
						</CardContent>
					</Card>
				)}
			</div>
		</SectionGuard>
	);
}

function ReadOnlyField({
	label,
	value,
}: {
	label: string;
	value: string;
}) {
	return (
		<div className='space-y-1'>
			<p className='text-xs font-medium text-zinc-500'>{label}</p>
			<p className='text-sm text-zinc-900'>{value}</p>
		</div>
	);
}
