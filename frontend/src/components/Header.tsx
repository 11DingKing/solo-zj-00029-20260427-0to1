'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Search, Menu, X, User, LogOut, Plus, Home, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getImageUrl } from '@/lib/api';

export default function Header() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    router.push('/');
    setIsMenuOpen(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/');
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <MapPin className="w-8 h-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">旅行日记</span>
          </Link>

          <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索日记、目的地..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </form>

          <nav className="hidden md:flex items-center space-x-4">
            <Link
              href="/"
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>首页</span>
            </Link>

            <Link
              href="/destinations"
              className="flex items-center space-x-1 px-3 py-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>热门目的地</span>
            </Link>

            {!isLoading && (
              <>
                {user ? (
                  <>
                    <Link
                      href="/diary/create"
                      className="flex items-center space-x-1 px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>写日记</span>
                    </Link>

                    <div className="relative group">
                      <button className="flex items-center space-x-2 focus:outline-none">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                            <img
                              src={getImageUrl(user.avatar)}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-primary-600" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700">{user.username}</span>
                      </button>

                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <Link
                          href={`/user/${user.id}`}
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          我的主页
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                        >
                          设置
                        </Link>
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-50"
                        >
                          退出登录
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="px-4 py-2 text-gray-600 hover:text-primary-600 transition-colors"
                    >
                      登录
                    </Link>
                    <Link
                      href="/register"
                      className="px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                    >
                      注册
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索日记、目的地..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </form>

            <nav className="space-y-2">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Home className="w-5 h-5" />
                <span>首页</span>
              </Link>

              <Link
                href="/destinations"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Trophy className="w-5 h-5" />
                <span>热门目的地</span>
              </Link>

              {user && (
                <Link
                  href="/diary/create"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>写日记</span>
                </Link>
              )}

              <hr className="my-2" />

              {user ? (
                <>
                  <Link
                    href={`/user/${user.id}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <User className="w-5 h-5" />
                    <span>我的主页</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>退出登录</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <span>登录</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 bg-primary-600 text-white rounded-lg justify-center"
                  >
                    <span>注册</span>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
