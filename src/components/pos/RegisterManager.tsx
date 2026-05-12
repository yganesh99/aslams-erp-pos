/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState } from 'react';
import { usePosStore, Register } from '@/app/pos/store';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export function RegisterManager() {
	const [open, setOpen] = useState(false);
	const [registers, setRegisters] = useState<Register[]>([]);
	const [selectedReg, setSelectedReg] = useState<string>('');
	const [openingBalance, setOpeningBalance] = useState<string>('0');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const { session, setRegister, setSession } = usePosStore();

	useEffect(() => {
		// Only show modal if no active session
		if (!session) {
			setOpen(true);
			fetchRegisters();
		} else {
			setOpen(false);
		}
	}, [session]);

	const fetchRegisters = async () => {
		try {
			// We can fetch all registers for now
			const res = await api.get('/registers');
			setRegisters(res.data);
		} catch (err: any) {
			console.error('Failed to fetch registers', err);
			setError(err.response?.data?.message || 'Failed to load registers');
		}
	};

	const checkCurrentSession = async (registerId: string) => {
		try {
			const res = await api.get(
				`/registers/${registerId}/sessions/current`,
			);
			if (res.data && res.data._id) {
				setSession(res.data);
				const reg = registers.find((r) => r._id === registerId);
				if (reg) setRegister(reg);
			}
		} catch (err: any) {
			// 404 means no active session, which is fine
			if (err.response?.status !== 404) {
				setError(err.response?.data?.message || '');
			}
		}
	};

	const handleRegisterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const val = e.target.value;
		setSelectedReg(val);
		if (val) {
			checkCurrentSession(val);
		}
	};

	const handleOpenSession = async () => {
		if (!selectedReg) return;
		setLoading(true);
		setError('');
		try {
			const res = await api.post(`/registers/${selectedReg}/open`, {
				openingBalance: Number(openingBalance),
			});
			setSession(res.data);
			const reg = registers.find((r) => r._id === selectedReg);
			if (reg) setRegister(reg);
		} catch (err: any) {
			setError(err.response?.data?.message || 'Failed to open register');
		} finally {
			setLoading(false);
		}
	};

	if (!open) return null;

	return (
		<Dialog
			open={open}
			onOpenChange={() => {}}
		>
			<DialogContent className='sm:max-w-[425px] [&>button]:hidden'>
				<DialogHeader>
					<DialogTitle>Open Register</DialogTitle>
				</DialogHeader>

				<div className='grid gap-4 py-4'>
					{error && (
						<div className='text-red-500 text-sm font-medium'>
							{error}
						</div>
					)}
					<div className='grid gap-2'>
						<label className='text-sm font-medium'>
							Select Register
						</label>
						<select
							className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
							value={selectedReg}
							onChange={handleRegisterChange}
						>
							<option value=''>-- Select a register --</option>
							{registers.map((r) => (
								<option
									key={r._id}
									value={r._id}
								>
									{r.name}
								</option>
							))}
						</select>
					</div>

					{selectedReg && (
						<div className='grid gap-2'>
							<label className='text-sm font-medium'>
								Opening Balance (රු)
							</label>
							<Input
								type='number'
								min='0'
								step='0.01'
								value={openingBalance}
								onChange={(e) =>
									setOpeningBalance(e.target.value)
								}
							/>
						</div>
					)}

					<Button
						onClick={handleOpenSession}
						disabled={!selectedReg || loading}
					>
						{loading ? 'Opening...' : 'Open Register'}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
