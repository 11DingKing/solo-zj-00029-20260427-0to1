'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MapPin, Calendar, User as UserIcon, Map, List, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { User, Diary } from '@/types';
import { userApi, getImageUrl } from '@/lib/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const UserMap = dynamic(() => import('@/components/UserMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center bg-gray-100 rounded-xl">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  ),
});

export default function UserProfilePage() {
  const params = useParams();
  const userId = parseInt(params.id as string);

  const [user, setUser] = useState<User | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchUserData();
    fetchDiaries(1, true);
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await userApi.getUser(userId);
      setUser(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchDiaries = async (page: number, reset = false) => {
    try {
      const response = await userApi.getUserDiaries(userId, page, 12);
      const newDiaries = response.data.diaries || [];
      
      if (reset) {
        setDiaries(newDiaries);
      } else {
        setDiaries((prev) => [...prev, ...newDiaries]);
      }
      
      setHasMore(newDiaries.length === 12);
      setCurrentPage(page);
    } catch (err) {
      console.error('Failed to fetch diaries:', err);
    }
  };

  const handleLoadMore = () => {
    if (hasMore) {
      fetchDiaries(currentPage + 1);
    }
  };

  const visitedCities = user?.visited_cities || {};
  const hasMapData = Object.keys(visitedCities).length > 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || '用户不存在'}</h2>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border-4 border-white/30">
              {user.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 md:w-16 md:h-16 text-white" />
              )}
            </div>
            <div className="text-center md:text-left text-white">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{user.username}</h1>
              {user.bio && (
                <p className="text-white/80 mb-4">{user.bio}</p>
              )}
              <div className="flex items-center justify-center md:justify-start space-x-6 text-white/90">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{Object.keys(visitedCities).length} 个城市</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{user.diaries_count || 0} 篇日记</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {hasMapData && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">旅行足迹地图</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    鼠标悬停可查看城市名和去过的次数
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-white rounded-lg p-1 border">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-4 h-4" />
                    <span>日记列表</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      viewMode === 'map'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Map className="w-4 h-4" />
                    <span>足迹地图</span>
                  </button>
                </div>
              </div>
            </div>
            
            {viewMode === 'map' ? (
              <div className="h-96">
                <UserMap visitedCities={visitedCities} />
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {Object.entries(visitedCities).map(([city, info]) => (
                    <div
                      key={city}
                      className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors"
                    >
                      <MapPin className="w-5 h-5 text-primary-600 mx-auto mb-1" />
                      <p className="font-medium text-gray-900 text-sm truncate">{city}</p>
                      <p className="text-xs text-gray-500">{info.count} 次</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">旅行日记</h2>
            <p className="text-sm text-gray-500 mt-1">
              共 {user.diaries_count || 0} 篇公开日记
            </p>
          </div>

          {diaries.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">还没有公开的旅行日记</p>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diaries.map((diary) => (
                  <Link
                    key={diary.id}
                    href={`/diary/${diary.id}`}
                    className="group bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="relative h-40 bg-gray-200 overflow-hidden">
                      {diary.cover_image ? (
                        <img
                          src={getImageUrl(diary.cover_image)}
                          alt={diary.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                          <MapPin className="w-10 h-10 text-primary-400" />
                        </div>
                      )}
                      {diary.tags.length > 0 && (
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          {diary.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm"
                            >
                              {tag.name_cn}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors mb-2">
                        {diary.title}
                      </h3>
                      <div className="flex items-center space-x-3 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{diary.destination_city}</span>
                        </span>
                        <span>{diary.duration_days}天</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {hasMore && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMore}
                    className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
