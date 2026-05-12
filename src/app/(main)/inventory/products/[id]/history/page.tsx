'use client';

import { useEffect, useState, use } from 'react';
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
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Search, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface AuditUser {
	name?: string;
	email?: string;
}

interface AuditChanges {
	[key: string]: any;
}

interface AuditRow {
	_id: string;
	action: string;
	createdAt: string;
	userId?: AuditUser;
	changes?: AuditChanges;
}

interface AuditResponse {
	items: AuditRow[];
	total: number;
	page: number;
	limit: number;
}

export default function StockHistoryPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const router = useRouter();
	const { id } = use(params);

	const [data, setData] = useState<AuditResponse | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState('');
	const [page, setPage] = useState(1);
	const limit = 50;

	useEffect(() => {
		const fetchHistory = async () => {
			try {
				setIsLoading(true);
				const res = await api.get('/reports/audit-logs', {
					params: {
						entity: 'Product',
						entityId: id,
						page,
						limit,
					},
				});
				setData(res.data);
			} catch (err) {
				console.error('Failed to fetch product history:', err);
				setData({ items: [], total: 0, page: 1, limit });
			} finally {
				setIsLoading(false);
			}
		};
		fetchHistory();
	}, [id, page]);

	const filtered =
		data?.items.filter((row) => {
			if (!search.trim()) return true;
			const q = search.toLowerCase();
			const action = row.action?.toLowerCase() || '';
			const user = row.userId?.name?.toLowerCase() || '';
			const changes = JSON.stringify(row.changes || {}).toLowerCase();
			return (
				action.includes(q) ||
				user.includes(q) ||
				changes.includes(q)
			);
		}) || [];

	const totalPages = data ? Math.ceil(data.total / limit) : 0;

	const formatDate = (value: string) => {
		try {
			return new Date(value).toLocaleString();
		} catch {
			return value;
		}
	};

	const formatAction = (action: string) => {
		switch (action) {
			case 'create':
				return 'Created';
			case 'update':
				return 'Updated';
			case 'update_image':
				return 'Image Updated';
			case 'delete_image':
				return 'Image Removed';
			default:
				return action;
		}
	};

	return (
		<SectionGuard requiredSection="inventory.products">
			<div className='space-y-6'>
				<div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
					<div className='flex min-w-0 items-center gap-3 sm:gap-4'>
						<Button
							variant='ghost'
							size='icon'
							className='shrink-0'
							onClick={() => router.back()}
						>
							<ArrowLeft className='w-5 h-5' />
						</Button>
						<div className='min-w-0'>
							<h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
								Product Change History
							</h2>
							<p className='text-zinc-500'>
								All configuration changes and image updates for
								this product.
							</p>
						</div>
					</div>
					<Button
						className='flex w-full items-center justify-center gap-2 sm:ml-auto sm:w-auto'
						variant='outline'
					>
						<Download className='h-4 w-4' />
						<span>Export CSV</span>
					</Button>
				</div>

				<Card>
					<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
						<CardTitle>Audit log</CardTitle>
						<div className='flex items-center space-x-2'>
							<div className='relative'>
								<Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
								<Input
									type='text'
									placeholder='Search action, user, or field...'
									className='w-64 pl-9 pr-4 py-1.5 h-9 text-sm'
									value={search}
									onChange={(e) =>
										setSearch(e.target.value)
									}
								/>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<p className='text-center py-8 text-zinc-500'>
								Loading history...
							</p>
						) : filtered.length === 0 ? (
							<p className='text-center py-8 text-zinc-500'>
								No history entries found for this product yet.
							</p>
						) : (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Action</TableHead>
											<TableHead>User</TableHead>
											<TableHead>Details</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filtered.map((row) => (
											<TableRow key={row._id}>
												<TableCell>
													{formatDate(row.createdAt)}
												</TableCell>
												<TableCell>
													{formatAction(row.action)}
												</TableCell>
												<TableCell>
													{row.userId?.name ||
														'-'}
												</TableCell>
												<TableCell className='text-xs text-zinc-600 max-w-xl'>
													<pre className='whitespace-pre-wrap break-words'>
														{JSON.stringify(
															row.changes || {},
															null,
															2,
														)}
													</pre>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								{data && data.total > limit && (
									<div className='flex items-center justify-between border-t pt-4 mt-4'>
										<p className='text-sm text-zinc-500'>
											Showing{' '}
											{(page - 1) * limit + 1}
											–
											{Math.min(
												page * limit,
												data.total,
											)}{' '}
											of {data.total}
										</p>
										<div className='flex gap-2'>
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													setPage((p) =>
														Math.max(1, p - 1),
													)
												}
												disabled={page <= 1}
											>
												Previous
											</Button>
											<span className='flex items-center px-2 text-sm text-zinc-600'>
												Page {page} of{' '}
												{totalPages || 1}
											</span>
											<Button
												variant='outline'
												size='sm'
												onClick={() =>
													setPage((p) =>
														p >= totalPages
															? p
															: p + 1,
													)
												}
												disabled={page >= totalPages}
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
			</div>
		</SectionGuard>
	);
}
