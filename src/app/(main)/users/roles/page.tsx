'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Save,
	ShieldCheck,
	Info,
	Plus,
	Pencil,
	Trash2,
	X,
	Check,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';
import RoleGuard from '@/components/RoleGuard';
import {
	SECTION_KEYS,
	SECTIONS,
	type SectionKey,
	type RoleInfo,
} from '@/lib/sections';

type RolePermissions = Record<string, string[]>;

const grouped = (() => {
	const groups: { group: string; keys: SectionKey[] }[] = [];
	const ungrouped: SectionKey[] = [];
	const seen = new Set<string>();

	for (const key of SECTION_KEYS) {
		const meta = SECTIONS[key];
		if (meta.group) {
			if (!seen.has(meta.group)) {
				seen.add(meta.group);
				groups.push({
					group: meta.group,
					keys: SECTION_KEYS.filter(
						(k) => SECTIONS[k].group === meta.group,
					) as SectionKey[],
				});
			}
		} else {
			ungrouped.push(key);
		}
	}

	return { groups, ungrouped };
})();

export default function RolesAccessPage() {
	const [roles, setRoles] = useState<RoleInfo[]>([]);
	const [permissions, setPermissions] = useState<RolePermissions | null>(
		null,
	);
	const [original, setOriginal] = useState<RolePermissions | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [showCreate, setShowCreate] = useState(false);
	const [newSlug, setNewSlug] = useState('');
	const [newLabel, setNewLabel] = useState('');
	const [creating, setCreating] = useState(false);

	const [editingSlug, setEditingSlug] = useState<string | null>(null);
	const [editLabel, setEditLabel] = useState('');
	const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

	const configurableRoles = roles.filter((r) => r.isStaff && !r.isSystem);

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);
			const [rolesRes, permsRes] = await Promise.all([
				api.get<RoleInfo[]>('/roles'),
				api.get<{ role: string; sections: string[] }[]>(
					'/role-permissions',
				),
			]);
			setRoles(rolesRes.data);
			const configurable = rolesRes.data.filter(
				(r) => r.isStaff && !r.isSystem,
			);
			const map: RolePermissions = {};
			for (const role of configurable) {
				map[role.slug] = [];
			}
			for (const doc of permsRes.data) {
				if (doc.role in map) {
					map[doc.role] = doc.sections;
				}
			}
			setPermissions(map);
			setOriginal(JSON.parse(JSON.stringify(map)));
		} catch {
			toast.error('Failed to load data.');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const toggle = (role: string, section: SectionKey) => {
		if (!permissions) return;
		setPermissions((prev) => {
			if (!prev) return prev;
			const current = prev[role] ?? [];
			const next = current.includes(section)
				? current.filter((s) => s !== section)
				: [...current, section];
			return { ...prev, [role]: next };
		});
	};

	const toggleAllForRole = (role: string, checked: boolean) => {
		if (!permissions) return;
		setPermissions((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				[role]: checked ? [...SECTION_KEYS] : [],
			};
		});
	};

	const isDirty =
		permissions &&
		original &&
		JSON.stringify(permissions) !== JSON.stringify(original);

	const handleSave = async () => {
		if (!permissions || !original) return;
		setSaving(true);
		try {
			const changed = configurableRoles.filter(
				(r) =>
					JSON.stringify(
						(permissions[r.slug] ?? []).slice().sort(),
					) !==
					JSON.stringify(
						(original[r.slug] ?? []).slice().sort(),
					),
			);
			await Promise.all(
				changed.map((r) =>
					api.put(`/role-permissions/${r.slug}`, {
						sections: permissions[r.slug],
					}),
				),
			);
			setOriginal(JSON.parse(JSON.stringify(permissions)));
			toast.success('Permissions saved successfully.');
		} catch {
			toast.error('Failed to save permissions.');
		} finally {
			setSaving(false);
		}
	};

	const handleCreateRole = async () => {
		const slug = newSlug.trim().toLowerCase().replace(/\s+/g, '_');
		const label = newLabel.trim();
		if (!slug || !label) return;
		setCreating(true);
		try {
			await api.post('/roles', { slug, label });
			toast.success(`Role "${label}" created.`);
			setNewSlug('');
			setNewLabel('');
			setShowCreate(false);
			await fetchData();
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string } } })
					?.response?.data?.message || 'Failed to create role.';
			toast.error(msg);
		} finally {
			setCreating(false);
		}
	};

	const handleRenameRole = async (slug: string) => {
		const label = editLabel.trim();
		if (!label) return;
		try {
			await api.put(`/roles/${slug}`, { label });
			toast.success('Role renamed.');
			setEditingSlug(null);
			await fetchData();
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string } } })
					?.response?.data?.message || 'Failed to rename role.';
			toast.error(msg);
		}
	};

	const handleDeleteRole = async (slug: string) => {
		try {
			await api.delete(`/roles/${slug}`);
			toast.success('Role deleted.');
			setDeletingSlug(null);
			await fetchData();
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string } } })
					?.response?.data?.message || 'Failed to delete role.';
			toast.error(msg);
		}
	};

	return (
		<RoleGuard allowedRoles={['admin']}>
			<div className='space-y-8'>
				<div>
					<h1 className='text-3xl font-bold tracking-tight'>
						Roles & Access Control
					</h1>
					<p className='text-zinc-500 mt-1'>
						Manage roles and configure which sections each role
						can access.
					</p>
				</div>

				{loading ? (
					<div className='flex items-center justify-center py-16'>
						<div className='h-8 w-8 animate-spin rounded-full border-4 border-solid border-neutral-900 border-r-transparent' />
					</div>
				) : (
					<>
						{/* ── Role Management ─────────────────── */}
						<Card>
							<CardHeader>
								<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
									<div>
										<CardTitle className='flex items-center gap-2'>
											<ShieldCheck className='h-5 w-5' />
											Roles
										</CardTitle>
										<p className='text-sm text-zinc-500 mt-1'>
											Create, rename, or remove custom
											staff roles.
										</p>
									</div>
									{!showCreate && (
										<Button
											variant='outline'
											onClick={() =>
												setShowCreate(true)
											}
											className='flex items-center gap-2 w-full sm:w-auto'
										>
											<Plus className='h-4 w-4' />
											New Role
										</Button>
									)}
								</div>
							</CardHeader>
							<CardContent>
								<div className='rounded-lg border border-zinc-200 bg-blue-50/50 p-3 mb-5 flex items-start gap-2'>
									<Info className='h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0' />
									<p className='text-xs text-blue-800'>
										<strong>Admin</strong> and{' '}
										<strong>Customer</strong> are system
										roles and cannot be renamed or
										deleted.
									</p>
								</div>

								{showCreate && (
									<div className='flex items-end gap-3 mb-5 p-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50'>
										<div className='flex-1 space-y-1'>
											<label className='text-xs font-medium text-zinc-600'>
												Slug (identifier)
											</label>
											<Input
												value={newSlug}
												onChange={(e) =>
													setNewSlug(
														e.target.value
															.toLowerCase()
															.replace(
																/[^a-z0-9_]/g,
																'',
															),
													)
												}
												placeholder='e.g. warehouse_staff'
												className='font-mono text-sm'
											/>
										</div>
										<div className='flex-1 space-y-1'>
											<label className='text-xs font-medium text-zinc-600'>
												Display Name
											</label>
											<Input
												value={newLabel}
												onChange={(e) =>
													setNewLabel(
														e.target.value,
													)
												}
												placeholder='e.g. Warehouse Staff'
											/>
										</div>
										<Button
											onClick={handleCreateRole}
											disabled={
												creating ||
												!newSlug.trim() ||
												!newLabel.trim()
											}
											size='sm'
										>
											{creating
												? 'Creating...'
												: 'Create'}
										</Button>
										<Button
											variant='ghost'
											size='sm'
											onClick={() => {
												setShowCreate(false);
												setNewSlug('');
												setNewLabel('');
											}}
										>
											<X className='h-4 w-4' />
										</Button>
									</div>
								)}

								<div className='divide-y divide-zinc-100'>
									{roles.map((role) => (
										<div
											key={role.slug}
											className='flex items-center justify-between py-2.5 px-1'
										>
											<div className='flex items-center gap-3'>
												{editingSlug ===
												role.slug ? (
													<div className='flex items-center gap-2'>
														<Input
															value={
																editLabel
															}
															onChange={(e) =>
																setEditLabel(
																	e.target
																		.value,
																)
															}
															className='h-8 w-48 text-sm'
															autoFocus
															onKeyDown={(
																e,
															) => {
																if (
																	e.key ===
																	'Enter'
																)
																	handleRenameRole(
																		role.slug,
																	);
																if (
																	e.key ===
																	'Escape'
																)
																	setEditingSlug(
																		null,
																	);
															}}
														/>
														<button
															onClick={() =>
																handleRenameRole(
																	role.slug,
																)
															}
															className='text-green-600 hover:text-green-800'
														>
															<Check className='h-4 w-4' />
														</button>
														<button
															onClick={() =>
																setEditingSlug(
																	null,
																)
															}
															className='text-zinc-400 hover:text-zinc-600'
														>
															<X className='h-4 w-4' />
														</button>
													</div>
												) : (
													<>
														<span className='font-medium text-sm text-zinc-800'>
															{role.label}
														</span>
														<span className='text-xs text-zinc-400 font-mono'>
															{role.slug}
														</span>
														{role.isSystem && (
															<span className='text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded'>
																System
															</span>
														)}
														{!role.isStaff && (
															<span className='text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded'>
																Non-Staff
															</span>
														)}
													</>
												)}
											</div>

											{!role.isSystem &&
												editingSlug !==
													role.slug && (
													<div className='flex items-center gap-1'>
														<button
															onClick={() => {
																setEditingSlug(
																	role.slug,
																);
																setEditLabel(
																	role.label,
																);
															}}
															className='p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700'
															title='Rename'
														>
															<Pencil className='h-3.5 w-3.5' />
														</button>
														{deletingSlug ===
														role.slug ? (
															<div className='flex items-center gap-1 text-xs'>
																<span className='text-red-600'>
																	Delete?
																</span>
																<button
																	onClick={() =>
																		handleDeleteRole(
																			role.slug,
																		)
																	}
																	className='text-red-600 hover:text-red-800 font-semibold'
																>
																	Yes
																</button>
																<button
																	onClick={() =>
																		setDeletingSlug(
																			null,
																		)
																	}
																	className='text-zinc-500 hover:text-zinc-700'
																>
																	No
																</button>
															</div>
														) : (
															<button
																onClick={() =>
																	setDeletingSlug(
																		role.slug,
																	)
																}
																className='p-1.5 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600'
																title='Delete'
															>
																<Trash2 className='h-3.5 w-3.5' />
															</button>
														)}
													</div>
												)}
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						{/* ── Permission Matrix ───────────────── */}
						{!permissions ? (
							<div className='py-16 text-center text-zinc-500'>
								Failed to load permissions.
							</div>
						) : configurableRoles.length === 0 ? (
							<Card>
								<CardContent className='py-12 text-center text-zinc-500'>
									No configurable roles. Create a custom
									role above to assign section
									permissions.
								</CardContent>
							</Card>
						) : (
							<Card>
								<CardHeader>
									<div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
										<div>
											<CardTitle className='flex items-center gap-2'>
												<ShieldCheck className='h-5 w-5' />
												Section Permissions by Role
											</CardTitle>
											<p className='text-sm text-zinc-500 mt-1'>
												Check or uncheck sections to
												control what each role can
												see.
											</p>
										</div>
										<Button
											onClick={handleSave}
											disabled={saving || !isDirty}
											className='flex items-center gap-2 w-full sm:w-auto'
										>
											<Save className='h-4 w-4' />
											{saving
												? 'Saving...'
												: 'Save Changes'}
										</Button>
									</div>
								</CardHeader>
								<CardContent>
									<div className='overflow-x-auto'>
										<table className='w-full text-sm'>
											<thead>
												<tr className='border-b border-zinc-200'>
													<th className='text-left py-3 pr-4 font-semibold text-zinc-700 min-w-[200px]'>
														Section
													</th>
													{configurableRoles.map(
														(role) => {
															const secs =
																permissions[
																	role
																		.slug
																] ?? [];
															const allChecked =
																SECTION_KEYS.every(
																	(k) =>
																		secs.includes(
																			k,
																		),
																);
															const someChecked =
																secs.length >
																	0 &&
																!allChecked;
															return (
																<th
																	key={
																		role.slug
																	}
																	className='text-center py-3 px-3 font-semibold text-zinc-700 min-w-[130px]'
																>
																	<div className='flex flex-col items-center gap-1'>
																		<span className='text-xs'>
																			{
																				role.label
																			}
																		</span>
																		<input
																			type='checkbox'
																			checked={
																				allChecked
																			}
																			ref={(
																				el,
																			) => {
																				if (
																					el
																				)
																					el.indeterminate =
																						someChecked;
																			}}
																			onChange={(
																				e,
																			) =>
																				toggleAllForRole(
																					role.slug,
																					e
																						.target
																						.checked,
																				)
																			}
																			className='h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500'
																		/>
																	</div>
																</th>
															);
														},
													)}
												</tr>
											</thead>
											<tbody>
												{grouped.ungrouped.map(
													(key) => (
														<SectionRow
															key={key}
															sectionKey={
																key
															}
															roles={
																configurableRoles
															}
															permissions={
																permissions
															}
															toggle={
																toggle
															}
														/>
													),
												)}

												{grouped.groups.map(
													({
														group,
														keys,
													}) => (
														<GroupBlock
															key={group}
															group={
																group
															}
															keys={keys}
															roles={
																configurableRoles
															}
															permissions={
																permissions
															}
															toggle={
																toggle
															}
														/>
													),
												)}
											</tbody>
										</table>
									</div>
								</CardContent>
							</Card>
						)}
					</>
				)}
			</div>
		</RoleGuard>
	);
}

function SectionRow({
	sectionKey,
	roles,
	permissions,
	toggle,
	indent = false,
}: {
	sectionKey: SectionKey;
	roles: RoleInfo[];
	permissions: RolePermissions;
	toggle: (role: string, section: SectionKey) => void;
	indent?: boolean;
}) {
	return (
		<tr className='border-b border-zinc-100 hover:bg-zinc-50/50'>
			<td
				className={`py-2.5 pr-4 text-zinc-700 ${indent ? 'pl-6' : ''}`}
			>
				{SECTIONS[sectionKey].label}
			</td>
			{roles.map((role) => (
				<td key={role.slug} className='text-center py-2.5 px-3'>
					<input
						type='checkbox'
						checked={(permissions[role.slug] ?? []).includes(
							sectionKey,
						)}
						onChange={() => toggle(role.slug, sectionKey)}
						className='h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500'
					/>
				</td>
			))}
		</tr>
	);
}

function GroupBlock({
	group,
	keys,
	roles,
	permissions,
	toggle,
}: {
	group: string;
	keys: SectionKey[];
	roles: RoleInfo[];
	permissions: RolePermissions;
	toggle: (role: string, section: SectionKey) => void;
}) {
	return (
		<>
			<tr>
				<td
					colSpan={roles.length + 1}
					className='pt-4 pb-1.5 px-0'
				>
					<span className='text-xs font-semibold uppercase tracking-wider text-zinc-400'>
						{group}
					</span>
				</td>
			</tr>
			{keys.map((key) => (
				<SectionRow
					key={key}
					sectionKey={key}
					roles={roles}
					permissions={permissions}
					toggle={toggle}
					indent
				/>
			))}
		</>
	);
}
