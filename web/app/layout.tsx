import type { Metadata } from 'next';
import { BASE_PATH } from '@/lib/paths';
import './globals.css';

export const metadata: Metadata = {
  icons: { icon: `${BASE_PATH}/favicon.svg` },
  title: 'Brush Atlas — A generative drawing playground',
  description:
    'Draw imaginary subway maps, architectural figures, and model-kit components. Three procedural brushes. An infinite field of possibilities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
