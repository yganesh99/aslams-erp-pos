'use client';

import { useState } from 'react';
import { usePosStore } from '@/app/pos/store';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { XCircle } from 'lucide-react';
import api from '@/lib/api';

export function CloseRegisterButton() {
	const { session, setSession, setRegister } = usePosStore();
	const [open, setOpen] = useState(false);
	const [closingBalance, setClosingBalance] = useState('0');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	if (!session) return null;

	const handleClose = async () => {
		setLoading(true);
		setError('');
		try {
			await api.post(`/registers/sessions/${session._id}/close`, {
				closingBalance: Number(closingBalance),
			});
			setSession(null);
			setRegister(null);
			setOpen(false);
		} catch (err: unknown) {
			const apiError = err as {
				response?: { data?: { message?: string } };
			};
			setError(
				apiError.response?.data?.message || 'Failed to close register',
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={setOpen}
		>
			<DialogTrigger asChild>
				<Button
					variant='ghost'
					size='icon'
					className='h-10 w-10 touch-manipulation text-zinc-600 hover:text-black hover:bg-zinc-100 rounded-lg'
					title='Close Register'
				>
					<XCircle className='w-5 h-5' />
				</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Close Register Session</DialogTitle>
				</DialogHeader>

				<div className='grid gap-4 py-4'>
					{error && (
						<div className='text-red-500 text-sm font-medium'>
							{error}
						</div>
					)}
					<div className='grid gap-2'>
						<label className='text-sm font-medium'>
							Closing Balance (රු)
						</label>
						<Input
							type='number'
							min='0'
							step='0.01'
							value={closingBalance}
							onChange={(e) => setClosingBalance(e.target.value)}
						/>
					</div>

					<Button
						onClick={handleClose}
						disabled={loading}
						variant='destructive'
					>
						{loading ? 'Closing...' : 'Close Register'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
