import { Product } from '@/app/pos/store';
import { apiOrigin } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface ProductCardProps {
	product: Product;
	onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
	const stockAvailable = product.stock ?? null;
	const isOutOfStock = stockAvailable !== null && stockAvailable <= 0;
	const imageSrc =
		product.images && product.images.length > 0 && product.images[0]
			? `${apiOrigin}${product.images[0]}`
			: null;

	return (
		<Card
			className={`overflow-hidden cursor-pointer touch-manipulation hover:border-black transition-all bg-white rounded-xl border border-zinc-200 shadow-sm h-full flex flex-col group ${isOutOfStock ? 'opacity-50' : ''}`}
			onClick={() => !isOutOfStock && onAdd(product)}
		>
			<div className='relative aspect-square bg-muted'>
				{imageSrc ? (
					<img
						src={imageSrc}
						alt={product.name}
						className='object-cover w-full h-full'
						loading='lazy'
					/>
				) : (
					<div className='flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium text-muted-foreground'>
						No image
					</div>
				)}
				{stockAvailable !== null && (
					<span
						className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
							isOutOfStock
								? 'bg-red-100 text-red-700'
								: stockAvailable <= 5
									? 'bg-amber-100 text-amber-700'
									: 'bg-emerald-100 text-emerald-700'
						}`}
					>
						{isOutOfStock
							? 'Out of stock'
							: `${stockAvailable} in stock`}
					</span>
				)}
			</div>
			<CardContent className='p-3 flex-1 flex flex-col justify-between gap-2'>
				<div>
					<h3 className='font-medium text-sm line-clamp-2 leading-tight'>
						{product.name}
					</h3>
					<p className='text-xs text-muted-foreground mt-1'>
						{product.barcode}
					</p>
				</div>
				<div className='flex items-center justify-between mt-2'>
					<span className='font-bold text-base'>
						රු{product.price.toFixed(2)}
					</span>
					<Button
						size='icon'
						variant='default'
						disabled={isOutOfStock}
						className='h-8 w-8 rounded-full shrink-0 touch-manipulation relative z-10 bg-black text-white hover:bg-zinc-800 transition-colors'
					>
						<Plus className='h-4 w-4' />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
