'use client';

import { usePosStore } from '@/app/pos/store';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function CheckoutBar() {
	const [mounted, setMounted] = useState(false);
	const cart = usePosStore((state) => state.cart);
	const discountType = usePosStore((state) => state.discountType);
	const discountValue = usePosStore((state) => state.discountValue);
	const includeTax = usePosStore((state) => state.includeTax);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || cart.length === 0) return null;

	const subtotal = cart.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	);
	const taxAmount = includeTax
		? cart.reduce(
				(sum, item) =>
					sum +
					item.price * item.quantity * ((item.taxRate ?? 0) / 100),
				0,
			)
		: 0;
	let discountAmount = 0;
	if (discountType === 'percentage' && discountValue > 0) {
		discountAmount = (subtotal * discountValue) / 100;
	} else if (discountType === 'fixed' && discountValue > 0) {
		discountAmount = discountValue;
	}
	discountAmount = Math.min(discountAmount, subtotal);
	const total = subtotal + taxAmount - discountAmount;
	const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

	return (
		<div className='fixed bottom-[64px] left-0 right-0 p-3 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-30 lg:hidden'>
			<Button
				className='w-full min-h-[48px] text-lg font-bold touch-manipulation flex justify-between items-center px-4'
				size='lg'
			>
				<div className='flex items-center gap-2'>
					<span className='bg-primary-foreground text-primary px-2 py-0.5 rounded text-sm'>
						{itemCount}
					</span>
					<span>Charge</span>
				</div>
				<span>රු{total.toFixed(2)}</span>
			</Button>
		</div>
	);
}
