'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SectionGuard from '@/components/SectionGuard';
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
import { UserPlus, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import { EntityStatusBadge } from '@/components/EntityStatusArchiveCard';

type Audience = 'all' | 'staff' | 'customers';

interface UserRow {
	_id: string;
	name: string;
	email: string;
	phone?: string;
	role: string;
	isActive: boolean;
}

interface StaffRole {
	slug: string;
	label: string;
}

const emptyForm = {
	name: '',
	email: '',
	password: '',
	phone: '',
	role: 'cashier' as string,
};

function formatRole(role: string) {
	return role.replace(/_/g, ' ');
}

const PAGE_SIZE = 25;

export default function UsersPage() {
	const router = useRouter();
	const [audience, setAudience] = useState<Audience>('all');
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [users, setUsers] = useState<UserRow[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [formData, setFormData] = useState({ ...emptyForm });
	const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);

	const fetchUsers = useCallback(async () => {
		try {
			setIsLoading(true);
			const params = new URLSearchParams();
			params.set('page', String(page));
			params.set('limit', String(PAGE_SIZE));
			if (audience !== 'all') {
				params.set('audience', audience);
			}
			const response = await api.get(`/users?${params.toString()}`);
			const data = response.data;
			const list = data.items ?? [];
			setUsers(Array.isArray(list) ? list : []);
			setTotal(typeof data.total === 'number' ? data.total : 0);
		} catch (error) {
			console.error('Failed to fetch users:', error);
			toast.error('Failed to load users.');
		} finally {
			setIsLoading(false);
		}
	}, [audience, page]);

	useEffect(() => {
		fetchUsers();
	}, [fetchUsers]);

	useEffect(() => {
		api.get<StaffRole[]>('/roles/staff')
			.then((res) => {
				setStaffRoles(res.data);
				if (
					res.data.length > 0 &&
					!res.data.some((r) => r.slug === formData.role)
				) {
					setFormData((prev) => ({
						...prev,
						role: res.data[0].slug,
					}));
				}
			})
			.catch(() => {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleAddSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await api.post('/users', {
				name: formData.name,
				email: formData.email,
				password: formData.password,
				phone: formData.phone,
				role: formData.role,
			});
			setIsAddOpen(false);
			setFormData({ ...emptyForm });
			fetchUsers();
			toast.success('User created.');
		} catch {
			toast.error('Failed to create user.');
		}
	};

	const filterTabs: { key: Audience; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'staff', label: 'Staff' },
		{ key: 'customers', label: 'Customers' },
	];

	return (
		<SectionGuard requiredSection='users'>
			<div className='space-y-8'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<h1 className='text-3xl font-bold tracking-tight'>
							Users
						</h1>
						<p className='text-zinc-500 mt-1'>
							Manage staff accounts and customer login access.
							Customer profile fields are not editable here.
						</p>
					</div>
					<Dialog
						open={isAddOpen}
						onOpenChange={setIsAddOpen}
					>
						<DialogTrigger asChild>
							<Button className='bg-black text-white hover:bg-zinc-800 w-full sm:w-auto'>
								<UserPlus className='w-4 h-4 mr-2' />
								Add Staff User
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Create staff user</DialogTitle>
							</DialogHeader>
							<form
								onSubmit={handleAddSubmit}
								className='space-y-4'
							>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
									<div className='space-y-2'>
										<label className='text-sm font-medium'>
											Full name *
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
											Email *
										</label>
										<Input
											type='email'
											required
											value={formData.email}
											onChange={(e) =>
												setFormData({
													...formData,
													email: e.target.value,
												})
											}
										/>
									</div>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Password *
									</label>
									<Input
										type='password'
										required
										minLength={8}
										value={formData.password}
										onChange={(e) =>
											setFormData({
												...formData,
												password: e.target.value,
											})
										}
									/>
								</div>
								<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
											Role *
										</label>
										<select
											className='w-full h-10 px-3 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-brand-blue bg-white'
											value={formData.role}
											onChange={(e) =>
												setFormData({
													...formData,
													role: e.target.value,
												})
											}
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
								</div>
								<DialogFooter>
									<Button
										type='button'
										variant='outline'
										onClick={() => setIsAddOpen(false)}
									>
										Cancel
									</Button>
									<Button type='submit'>Create user</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>

				<div className='flex flex-wrap gap-2'>
					{filterTabs.map((t) => (
						<Button
							key={t.key}
							type='button'
							variant={audience === t.key ? 'default' : 'outline'}
							size='sm'
							className={
								audience === t.key
									? 'bg-black text-white hover:bg-zinc-800'
									: ''
							}
							onClick={() => {
								setAudience(t.key);
								setPage(1);
							}}
						>
							{t.label}
						</Button>
					))}
				</div>

				<Card>
					<CardContent className='p-0'>
						{isLoading ? (
							<p className='text-center text-zinc-500 py-8'>
								Loading users...
							</p>
						) : users.length === 0 ? (
							<p className='text-center text-zinc-500 py-8'>
								No users in this view.
							</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Name</TableHead>
										<TableHead>Email</TableHead>
										<TableHead>Role</TableHead>
										<TableHead>Status</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{users.map((user) => (
										<TableRow
											key={user._id}
											className='cursor-pointer hover:bg-zinc-50'
											onClick={() =>
												router.push(`/users/${user._id}`)
											}
										>
											<TableCell className='font-medium'>
												{user.name}
											</TableCell>
											<TableCell>{user.email}</TableCell>
											<TableCell>
												<span className='px-2 py-1 bg-zinc-100 border border-zinc-200 rounded-md text-xs font-bold uppercase tracking-wider text-zinc-600'>
													{formatRole(user.role)}
												</span>
											</TableCell>
											<TableCell>
												<EntityStatusBadge
													variant={
														user.isActive
															? 'active'
															: 'suspended'
													}
												>
													{user.isActive
														? 'Active'
														: 'Suspended'}
												</EntityStatusBadge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
						{!isLoading && total > 0 ? (
							<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-zinc-100 px-4 py-3'>
								<p className='text-sm text-zinc-500'>
									Showing{' '}
									<span className='font-medium text-zinc-800'>
										{total === 0
											? 0
											: (page - 1) * PAGE_SIZE + 1}
										–{Math.min(page * PAGE_SIZE, total)}
									</span>{' '}
									of{' '}
									<span className='font-medium text-zinc-800'>
										{total}
									</span>
								</p>
								<div className='flex items-center gap-2'>
									<Button
										type='button'
										variant='outline'
										size='sm'
										disabled={page <= 1}
										onClick={() =>
											setPage((p) => Math.max(1, p - 1))
										}
										className='gap-1'
									>
										<ChevronLeft className='w-4 h-4' />
										Previous
									</Button>
									<span className='text-xs text-zinc-500 tabular-nums px-1'>
										Page {page} of{' '}
										{Math.max(
											1,
											Math.ceil(total / PAGE_SIZE),
										)}
									</span>
									<Button
										type='button'
										variant='outline'
										size='sm'
										disabled={page * PAGE_SIZE >= total}
										onClick={() => setPage((p) => p + 1)}
										className='gap-1'
									>
										Next
										<ChevronRight className='w-4 h-4' />
									</Button>
								</div>
							</div>
						) : null}
					</CardContent>
				</Card>
			</div>
		</SectionGuard>
	);
}
