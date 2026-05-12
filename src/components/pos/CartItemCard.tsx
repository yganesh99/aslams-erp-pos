'use client';

import { CartItem, usePosStore } from '@/app/pos/store';
import { allowsDecimalQuantity, quantityStep } from '@/lib/quantityByUnit';
import { apiOrigin } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

export function CartItemCard({ item }: { item: CartItem }) {
	const { updateQuantity, removeItem } = usePosStore();
	const isDecimal = allowsDecimalQuantity(item.unit);
	const step = quantityStep(item.unit);
	const [inputVal, setInputVal] = useState(String(item.quantity));

	useEffect(() => {
		setInputVal(String(item.quantity));
	}, [item.quantity]);

	const handleQuantityChange = (newQty: number) => {
		if (newQty <= 0) {
			removeItem(item.id);
			return;
		}
		updateQuantity(item.id, newQty);
	};

	const handleInputBlur = () => {
		const parsed = parseFloat(inputVal);
		if (Number.isFinite(parsed) && parsed > 0) {
			updateQuantity(item.id, parsed);
		} else {
			setInputVal(String(item.quantity));
		}
	};

	const displayQty =
		isDecimal && Number.isFinite(Number(inputVal))
			? Number(inputVal)
			: item.quantity;

	const imageSrc =
		item.images && item.images.length > 0 && item.images[0]
			? `${apiOrigin}${item.images[0]}`
			: null;

	return (
		<div className='flex items-center gap-3 p-3 border-b border-border bg-card'>
			{imageSrc ? (
				<img
					src={imageSrc}
					alt={item.name}
					className='w-12 h-12 rounded object-cover'
				/>
			) : (
				<div
					className='w-12 h-12 shrink-0 rounded bg-muted'
					aria-hidden
				/>
			)}
			<div className='flex-1 min-w-0'>
				<h4 className='font-medium text-sm truncate'>{item.name}</h4>
				<div className='text-sm font-bold text-primary'>
					රු{(item.price * displayQty).toFixed(2)}
				</div>
			</div>
			<div className='flex items-center gap-2'>
				<div className='flex items-center bg-muted rounded-md border border-border'>
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 rounded-r-none touch-manipulation'
						onClick={() =>
							handleQuantityChange(item.quantity - step)
						}
					>
						<Minus className='h-3 w-3' />
					</Button>
					{isDecimal ? (
						<Input
							type='number'
							min={0.01}
							step={0.01}
							value={inputVal}
							onChange={(e) => setInputVal(e.target.value)}
							onBlur={handleInputBlur}
							onKeyDown={(e) =>
								e.key === 'Enter' &&
								(e.target as HTMLInputElement).blur()
							}
							className='w-14 h-8 text-center text-sm font-medium border-0 bg-transparent px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
						/>
					) : (
						<div className='w-8 text-center text-sm font-medium'>
							{Math.round(item.quantity)}
						</div>
					)}
					<Button
						variant='ghost'
						size='icon'
						className='h-8 w-8 rounded-l-none touch-manipulation'
						onClick={() =>
							handleQuantityChange(item.quantity + step)
						}
					>
						<Plus className='h-3 w-3' />
					</Button>
				</div>
				<Button
					variant='ghost'
					size='icon'
					className='h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation'
					onClick={() => removeItem(item.id)}
				>
					<Trash2 className='h-4 w-4' />
				</Button>
			</div>
		</div>
	);
}
