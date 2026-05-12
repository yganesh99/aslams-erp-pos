import { LayoutGrid, Receipt, Users, Settings } from 'lucide-react';
import Link from 'next/link';

export function BottomNav() {
	return (
		<div className='fixed bottom-0 left-0 right-0 h-16 bg-background border-t flex justify-around items-center z-40 lg:hidden px-2 pb-safe'>
			<Link
				href='/pos'
				className='flex flex-col items-center justify-center w-full h-full text-primary gap-1 touch-manipulation'
			>
				<LayoutGrid className='h-5 w-5' />
				<span className='text-[10px] font-medium'>POS</span>
			</Link>
			<Link
				href='/pos/orders'
				className='flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground gap-1 touch-manipulation'
			>
				<Receipt className='h-5 w-5' />
				<span className='text-[10px] font-medium'>Orders</span>
			</Link>
			<Link
				href='/pos/customers'
				className='flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground gap-1 touch-manipulation'
			>
				<Users className='h-5 w-5' />
				<span className='text-[10px] font-medium'>Customers</span>
			</Link>
			<Link
				href='#settings'
				className='flex flex-col items-center justify-center w-full h-full text-muted-foreground hover:text-foreground gap-1 touch-manipulation'
			>
				<Settings className='h-5 w-5' />
				<span className='text-[10px] font-medium'>Settings</span>
			</Link>
		</div>
	);
}
