import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '../context/AuthContext';
import { ToastContainer } from 'react-toastify';

export const metadata = {
	title: 'Aslams ERP/POS',
	description: 'Aslams ERP/POS',
	manifest: '/site.webmanifest',
	icons: {
		icon: [
			{ url: '/favicon.ico' },
			{
				url: '/favicon-16x16.png',
				sizes: '16x16',
				type: 'image/png',
			},
			{
				url: '/favicon-32x32.png',
				sizes: '32x32',
				type: 'image/png',
			},
		],
		apple: '/apple-touch-icon.png',
	},
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang='en'>
			<body>
				<AuthProvider>{children}</AuthProvider>
				<ToastContainer position='top-right' />
			</body>
		</html>
	);
}
