'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { usePosStore, Register } from '@/app/pos/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Store, MonitorPlay, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';

export function RegisterList() {
	const [registers, setRegisters] = useState<Register[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	const { setRegister, setSession } = usePosStore();
	const router = useRouter();

	const [openDialogId, setOpenDialogId] = useState<string | null>(null);
	const [openingBalance, setOpeningBalance] = useState('0');
	const [openingLoading, setOpeningLoading] = useState(false);

	useEffect(() => {
		fetchRegisters();
	}, []);

	const fetchRegisters = async () => {
		try {
			setLoading(true);
			const res = await api.get('/registers');
			setRegisters(res.data);
		} catch (err: any) {
			console.error(err);
			setError(err.response?.data?.message || 'Failed to load registers');
		} finally {
			setLoading(false);
		}
	};

	const handleEnterRegister = async (registerId: string) => {
		try {
			const res = await api.get(
				`/registers/${registerId}/sessions/current`,
			);
			if (res.data && res.data._id) {
				setSession(res.data);
				const reg = registers.find((r) => r._id === registerId);
				if (reg) setRegister(reg);
				router.push('/pos');
			}
		} catch (err: any) {
			toast.error(
				err?.response?.data?.message || 'Failed to enter register',
			);
		}
	};

	const handleOpenRegister = async (registerId: string) => {
		setOpeningLoading(true);
		try {
			const res = await api.post(`/registers/${registerId}/open`, {
				openingBalance: Number(openingBalance),
			});
			setSession(res.data);
			const reg = registers.find((r) => r._id === registerId);
			if (reg) {
				setRegister(reg);
			}
			setOpenDialogId(null);
			router.push('/pos');
		} catch (err: any) {
			toast.error(
				err?.response?.data?.message || 'Failed to open register',
			);
		} finally {
			setOpeningLoading(false);
		}
	};

	if (loading) {
		return (
			<div className='flex-1 flex items-center justify-center h-full'>
				<p className='text-zinc-500 font-medium'>
					Loading registers...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className='flex-1 flex items-center justify-center p-8'>
				<p className='text-red-500 bg-red-50 px-4 py-2 rounded-lg font-medium'>
					{error}
				</p>
			</div>
		);
	}

	return (
		<div className='flex-1 overflow-auto bg-zinc-50/50 p-6 md:p-10 hide-scrollbar'>
			<div className='max-w-5xl mx-auto space-y-6'>
				<div className='flex flex-col space-y-2'>
					<h1 className='text-3xl font-bold tracking-tight'>
						Select Register
					</h1>
					<p className='text-muted-foreground whitespace-pre-wrap'>
						Choose a register from the list below. Opening a closed
						register starts a new session.
					</p>
				</div>

				{registers.length === 0 ? (
					<Card className='border-dashed shadow-sm'>
						<CardContent className='flex flex-col items-center justify-center p-12 text-center h-64'>
							<Store className='w-12 h-12 text-zinc-300 mb-4' />
							<p className='text-xl font-medium text-zinc-900 mb-1'>
								No Registers Found
							</p>
							<p className='text-sm text-zinc-500'>
								There are currently no registers configured for
								your store.
							</p>
						</CardContent>
					</Card>
				) : (
					<div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
						{registers.map((reg) => {
							const isOpen = (reg as any).status === 'open';

							return (
								<Card
									key={reg._id}
									className={`transition-all duration-200 border-2 ${isOpen ? 'border-primary shadow-md' : 'border-zinc-200 hover:border-zinc-300'}`}
								>
									<CardHeader className='pb-4'>
										<CardTitle className='flex justify-between items-center text-xl'>
											{reg.name}
											<div
												className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
													isOpen
														? 'bg-primary/10 text-primary'
														: 'bg-zinc-100 text-zinc-500'
												}`}
											>
												{isOpen ? 'Active' : 'Closed'}
											</div>
										</CardTitle>
										<div className='text-xs font-mono pt-1 text-zinc-400'>
											ID: {reg._id}
										</div>
									</CardHeader>
									<CardContent>
										{isOpen ? (
											<Button
												onClick={() =>
													handleEnterRegister(reg._id)
												}
												className='w-full font-bold h-12'
											>
												<MonitorPlay className='w-4 h-4 mr-2' />{' '}
												Enter POS
											</Button>
										) : (
											<Dialog
												open={openDialogId === reg._id}
												onOpenChange={(open) =>
													setOpenDialogId(
														open ? reg._id : null,
													)
												}
											>
												<DialogTrigger asChild>
													<Button
														variant='outline'
														className='w-full font-semibold h-12 text-zinc-600 border-zinc-300 hover:bg-zinc-100'
													>
														<KeyRound className='w-4 h-4 mr-2' />{' '}
														Open Register
													</Button>
												</DialogTrigger>
												<DialogContent className='sm:max-w-md'>
													<DialogHeader>
														<DialogTitle>
															Start New Session
														</DialogTitle>
														<p className='text-sm text-muted-foreground mt-1'>
															Register:{' '}
															<span className='font-semibold text-foreground'>
																{reg.name}
															</span>
														</p>
													</DialogHeader>
													<div className='grid gap-4 py-4'>
														<div className='grid gap-2'>
															<label
																htmlFor='balance'
																className='text-sm font-medium'
															>
																Opening Balance
																(රු)
															</label>
															<Input
																id='balance'
																type='number'
																min='0'
																step='0.01'
																value={
																	openingBalance
																}
																onChange={(e) =>
																	setOpeningBalance(
																		e.target
																			.value,
																	)
																}
																className='h-12 text-lg px-4'
																placeholder='0.00'
																autoFocus
															/>
														</div>
														<Button
															onClick={() =>
																handleOpenRegister(
																	reg._id,
																)
															}
															disabled={
																openingLoading
															}
															className='w-full h-12 text-base font-bold'
														>
															{openingLoading
																? 'Processing...'
																: 'Confirm & Open'}
														</Button>
													</div>
												</DialogContent>
											</Dialog>
										)}
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
