'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, MapPin, Calendar, Loader2, ChevronRight } from 'lucide-react';
import type { Destination, Diary } from '@/types';
import { destinationsApi, diaryApi, getImageUrl } from '@/lib/api';
import Link from 'next/link';

const RANKING_COLORS = [
  'from-yellow-400 to-amber-500',
  'from-gray-300 to-gray-400',
  'from-amber-600 to-amber-700',
];

const RANKING_BADGE_COLORS = [
  'bg-yellow-500',
  'bg-gray-400',
  'bg-amber-700',
];

export default function DestinationsPage() {
  const router = useRouter();

  const [ranking, setRanking] = useState<Array<Destination & { rank: number }>>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [diariesLoading, setDiariesLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    try {
      setLoading(true);
      const response = await destinationsApi.getRanking(20);
      setRanking(response.data.ranking);
    } catch (err) {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchCityDiaries = async (city: string) => {
    try {
      setDiariesLoading(true);
      const response = await diaryApi.getDiaries({
        destination: city,
        per_page: 12,
      });
      setDiaries(response.data.diaries || []);
      setSelectedCity(city);
    } catch (err) {
      console.error('Failed to fetch city diaries:', err);
    } finally {
      setDiariesLoading(false);
    }
  };

  const handleCityClick = (city: string) => {
    if (selectedCity === city) {
      setSelectedCity(null);
      setDiaries([]);
    } else {
      fetchCityDiaries(city);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <Trophy className="w-12 h-12 text-accent-500 mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">热门目的地排行榜</h1>
          <p className="text-gray-500">根据用户日记数量统计，发现最受欢迎的旅行目的地</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-900">目的地排名</h2>
                <p className="text-sm text-gray-500 mt-1">点击城市查看相关日记</p>
              </div>

              {ranking.length === 0 ? (
                <div className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">暂无数据</p>
                </div>
              ) : (
                <div className="divide-y">
                  {ranking.map((item) => (
                    <button
                      key={item.city}
                      onClick={() => handleCityClick(item.city)}
                      className={`w-full p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors text-left ${
                        selectedCity === item.city ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white bg-gradient-to-br ${
                          item.rank <= 3
                            ? RANKING_COLORS[item.rank - 1]
                            : 'from-gray-500 to-gray-600'
                        }`}
                      >
                        {item.rank}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-primary-600" />
                            <span>{item.city}</span>
                          </h3>
                          <ChevronRight className={`w-5 h-5 transition-transform ${
                            selectedCity === item.city ? 'rotate-90' : ''
                          } text-gray-400`} />
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-500 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{item.diary_count} 篇日记</span>
                          </span>
                        </div>
                      </div>

                      <div className="hidden sm:block">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full"
                            style={{
                              width: `${Math.min(100, (item.diary_count / Math.max(...ranking.map(r => r.diary_count), 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm sticky top-24">
              {selectedCity ? (
                <>
                  <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-semibold text-gray-900 flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-primary-600" />
                      <span>{selectedCity}</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      相关旅行日记
                    </p>
                  </div>

                  {diariesLoading ? (
                    <div className="p-8 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                    </div>
                  ) : diaries.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">暂无相关日记</p>
                    </div>
                  ) : (
                    <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
                      {diaries.map((diary) => (
                        <Link
                          key={diary.id}
                          href={`/diary/${diary.id}`}
                          className="block group"
                        >
                          <div className="flex space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="w-16 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                              {diary.cover_image ? (
                                <img
                                  src={getImageUrl(diary.cover_image)}
                                  alt={diary.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                                  <MapPin className="w-4 h-4 text-primary-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-primary-600 transition-colors">
                                {diary.title}
                              </h3>
                              <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                <span>{diary.duration_days}天</span>
                                <span>·</span>
                                <span>{diary.likes_count}赞</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">点击左侧城市</p>
                  <p className="text-gray-400 text-sm">查看相关旅行日记</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
