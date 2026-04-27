import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '旅行日记 - 分享你的旅行故事',
  description: '一个分享旅行日记的平台，记录你的每一次旅行，发现更多精彩目的地',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1">{children}</main>
            <footer className="bg-white border-t mt-auto">
              <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="text-center text-gray-500 text-sm">
                  <p>© 2026 旅行日记. 记录每一次精彩旅程</p>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
