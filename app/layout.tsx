import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Edge Function Ping',
  description: 'Prove the app can call Supabase Edge Functions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
