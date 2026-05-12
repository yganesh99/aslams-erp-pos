import { TopNav } from '@/components/pos/TopNav';
import { BottomNav } from '@/components/pos/BottomNav';
import RoleGuard from '@/components/RoleGuard';
import { POS_SECTION_KEYS } from '@/lib/sections';

export default function PosLayout({ children }: { children: React.ReactNode }) {
	return (
		<RoleGuard requiredSections={[...POS_SECTION_KEYS]}>
			<div className='min-h-screen bg-background text-foreground flex flex-col font-sans'>
				<TopNav />
				<main className='flex-1 flex overflow-hidden'>{children}</main>
				<BottomNav />
			</div>
		</RoleGuard>
	);
}
