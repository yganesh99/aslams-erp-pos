'use client';

import { memo } from 'react';
import { Product } from '@/app/pos/store';
import { ProductCard } from './ProductCard';

interface ProductGridProps {
	products: Product[];
	onAddProduct: (product: Product) => void;
}

export const ProductGrid = memo(function ProductGrid({
	products,
	onAddProduct,
}: ProductGridProps) {
	return (
		<div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-32 lg:pb-6 p-4'>
			{products.map((product) => (
				<ProductCard
					key={product.id}
					product={product}
					onAdd={onAddProduct}
				/>
			))}
		</div>
	);
});
