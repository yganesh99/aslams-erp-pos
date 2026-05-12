'use client';

import { usePosStore } from './store';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartPanel } from '@/components/pos/CartPanel';
import { CartDrawer } from '@/components/pos/CartDrawer';
import { CheckoutBar } from '@/components/pos/CheckoutBar';
import { Product } from './store';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function PosPage() {
	const [searchQuery, setSearchQuery] = useState('');
	const [mounted, setMounted] = useState(false);
	const [categories, setCategories] = useState<any[]>([]);
	const [products, setProducts] = useState<Product[]>([]);
	const [selectedCategory, setSelectedCategory] = useState<string>('All');
	const [expandedCategories, setExpandedCategories] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [systemTaxRate, setSystemTaxRate] = useState<number>(0);
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	const addItem = usePosStore((state) => state.addItem);
	const session = usePosStore((state) => state.session);
	const router = useRouter();

	// Fetch products from backend using debounced search (tax from system setting)
	const fetchProducts = useCallback(
		async (search: string, category: string) => {
			if (!session) return;
			try {
				setIsLoading(true);
				const params: any = {
					storeId: session.storeId,
					limit: 50,
				};
				if (search.trim()) params.search = search.trim();
				if (category !== 'All') {
					// Find the category ID from our categories list
					const cat = categories.find((c) => c.name === category);
					if (cat) params.category = cat._id;
				}

				const res = await api.get('/products/pos-search', { params });
				const prodData =
					res.data.items || res.data.data || res.data || [];
				const formattedProducts: Product[] = (
					Array.isArray(prodData) ? prodData : []
				).map((p: any) => ({
					id: p._id,
					name: p.name,
					price: p.posPrice,
					images: p.images || [],
					barcode: p.sku,
					category: p.categories?.[0]?.name || 'Uncategorized',
					categories: p.categories || [],
					stock: p.stock ?? undefined,
					taxRate: systemTaxRate,
					unit: p.unit || 'pcs',
				}));
				setProducts(formattedProducts);
			} catch (error) {
				console.error('Failed to fetch POS products:', error);
			} finally {
				setIsLoading(false);
			}
		},
		[session, categories, systemTaxRate],
	);

	// Initial mount: fetch categories and system tax rate
	useEffect(() => {
		setMounted(true);

		const fetchInitialData = async () => {
			try {
				const [catRes, taxRes] = await Promise.all([
					api.get('/categories?isActive=true'),
					api.get('/settings/tax-rate').catch(() => ({ data: { taxRate: 0 } })),
				]);
				const catData =
					catRes.data.items || catRes.data.data || catRes.data || [];
				setCategories(Array.isArray(catData) ? catData : []);
				setSystemTaxRate(Number(taxRes.data?.taxRate) || 0);
			} catch (error) {
				console.error('Failed to fetch initial data:', error);
			}
		};
		fetchInitialData();
	}, []);

	// Fetch products when session or categories load (initial load)
	useEffect(() => {
		if (session && mounted) {
			fetchProducts('', selectedCategory);
		}
	}, [session, mounted, categories]); // eslint-disable-line react-hooks/exhaustive-deps

	// Debounced search: triggers on searchQuery or selectedCategory change
	useEffect(() => {
		if (!mounted || !session) return;

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(() => {
			fetchProducts(searchQuery, selectedCategory);
		}, 300);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [searchQuery, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleAddProduct = useCallback(
		(product: Product) => {
			addItem(product);
		},
		[addItem],
	);

	if (!mounted) return null;

	if (!session) {
		router.replace('/registers');
		return null;
	}

	const renderCategories = (isMobile = false) => {
		const visibleCount = 3;
		const displayedCategories =
			expandedCategories || isMobile
				? categories
				: categories.slice(0, visibleCount);
		const hasMore = categories.length > visibleCount && !isMobile;

		return (
			<>
				<button
					className={`px-4 py-2 rounded-full text-sm font-semibold touch-manipulation transition-all border shrink-0 ${selectedCategory === 'All' ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
					onClick={() => setSelectedCategory('All')}
				>
					All
				</button>
				{displayedCategories.map((cat) => (
					<button
						key={cat._id}
						className={`px-4 py-2 rounded-full text-sm font-semibold touch-manipulation transition-all border shrink-0 ${selectedCategory === cat.name ? 'bg-black text-white border-black shadow-sm' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
						onClick={() => setSelectedCategory(cat.name)}
					>
						{cat.name}
					</button>
				))}
				{hasMore && !expandedCategories && (
					<button
						className='px-4 py-2 rounded-full text-sm font-semibold touch-manipulation transition-all border bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 flex items-center gap-1 shrink-0'
						onClick={() => setExpandedCategories(true)}
					>
						More
						<ChevronDown className='w-4 h-4 ml-1' />
					</button>
				)}
				{hasMore && expandedCategories && (
					<button
						className='px-4 py-2 rounded-full text-sm font-semibold touch-manipulation transition-all border bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 flex items-center gap-1 shrink-0'
						onClick={() => setExpandedCategories(false)}
					>
						Less
						<ChevronUp className='w-4 h-4 ml-1' />
					</button>
				)}
			</>
		);
	};

	return (
		<div className='flex-1 flex overflow-hidden relative'>
			{/* Main Content Area */}
			<div className='flex-1 flex flex-col lg:mr-96 h-[calc(100vh-64px)] overflow-hidden'>
				{/* Desktop Integrated Categories & Search */}
				<div className='p-4 border-b shrink-0 bg-white z-10 hidden md:block'>
					<div className='flex items-start justify-between gap-4'>
						<div className='flex gap-2 flex-1 flex-wrap items-center'>
							{renderCategories(false)}
						</div>
						<div className='relative w-full max-w-sm shrink-0'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
							<Input
								type='search'
								placeholder='Search products...'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className='w-full pl-9 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 focus:ring-zinc-200 h-10 transition-all rounded-lg text-base'
							/>
						</div>
					</div>
				</div>

				{/* Mobile Search & Categories */}
				<div className='p-4 border-b md:hidden shrink-0 space-y-3'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
						<Input
							type='search'
							placeholder='Search products...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='w-full pl-9 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 focus:ring-zinc-200 h-10 transition-all rounded-lg text-base'
						/>
					</div>
					<div className='flex gap-2 overflow-x-auto whitespace-nowrap hide-scrollbar pb-1'>
						{renderCategories(true)}
					</div>
				</div>

				{/* Scrollable Product Grid */}
				<ScrollArea className='flex-1 lg:h-[calc(100vh-64px-90px)]'>
					{isLoading ? (
						<div className='flex items-center justify-center h-full pt-20'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
						</div>
					) : (
						<ProductGrid
							products={products}
							onAddProduct={handleAddProduct}
						/>
					)}
				</ScrollArea>
			</div>

			{/* Desktop Cart Right Panel */}
			<CartPanel />

			{/* Mobile Cart Floating Action Button / Drawer */}
			<CartDrawer />

			{/* Mobile Checkout Sticky Bar */}
			<CheckoutBar />
		</div>
	);
}
