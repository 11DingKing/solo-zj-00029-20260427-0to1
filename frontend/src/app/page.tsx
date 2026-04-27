'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import DiaryCard from '@/components/DiaryCard';
import type { Diary, Tag } from '@/types';
import { diaryApi, tagsApi, destinationsApi } from '@/lib/api';

const SORT_OPTIONS = [
  { value: 'created_at', label: '最新发布' },
  { value: 'likes', label: '最多点赞' },
  { value: 'start_date', label: '最近出发' },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const initialSearch = searchParams.get('search') || '';
  const initialDestination = searchParams.get('destination') || '';
  const initialTags = searchParams.get('tags')?.split(',') || [];

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedDestination, setSelectedDestination] = useState(initialDestination);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [sortBy, setSortBy] = useState('created_at');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async (page: number, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        per_page: 20,
        sort_by: sortBy,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }
      if (selectedDestination) {
        params.destination = selectedDestination;
      }
      if (selectedTags.length > 0) {
        params.tags = selectedTags;
      }

      const [diariesResponse, tagsResponse, destinationsResponse] = await Promise.all([
        diaryApi.getDiaries(params),
        tagsApi.getAll(),
        destinationsApi.getAll(),
      ]);

      const newDiaries = diariesResponse.data.diaries || [];
      
      if (reset) {
        setDiaries(newDiaries);
      } else {
        setDiaries((prev) => [...prev, ...newDiaries]);
      }

      setHasMore(newDiaries.length === 20);
      setCurrentPage(page);
      setTags(tagsResponse.data);
      setDestinations(destinationsResponse.data.map((d: any) => d.city));
    } catch (error) {
      console.error('Failed to fetch diaries:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedDestination, selectedTags, sortBy, loading]);

  useEffect(() => {
    setDiaries([]);
    setHasMore(true);
    setCurrentPage(1);
    fetchData(1, true);
  }, [searchQuery, selectedDestination, selectedTags, sortBy]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedDestination) params.set('destination', selectedDestination);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    
    const queryString = params.toString();
    if (queryString) {
      router.replace(`/?${queryString}`, { scroll: false });
    } else {
      router.replace('/', { scroll: false });
    }
  }, [searchQuery, selectedDestination, selectedTags, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDiaries([]);
    setHasMore(true);
    fetchData(1, true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchData(currentPage + 1);
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDestination('');
    setSelectedTags([]);
  };

  const hasActiveFilters = searchQuery || selectedDestination || selectedTags.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              发现精彩的旅行故事
            </h1>
            <p className="text-primary-100 text-lg">
              探索来自世界各地的旅行日记，记录你的每一次旅程
            </p>
          </div>

          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索日记、目的地、标签..."
                className="w-full pl-12 pr-32 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/30 text-base"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>筛选</span>
                {hasActiveFilters && (
                  <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedTags.length + (selectedDestination ? 1 : 0)}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                  <span>清除筛选</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">排序：</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t space-y-4">
              {destinations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">目的地</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedDestination('')}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        !selectedDestination
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      全部
                    </button>
                    {destinations.slice(0, 15).map((city) => (
                      <button
                        key={city}
                        onClick={() => setSelectedDestination(city === selectedDestination ? '' : city)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedDestination === city
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">标签</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.name)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag.name)
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag.name_cn}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {loading && diaries.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        ) : diaries.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到日记</h3>
            <p className="text-gray-500">尝试调整搜索条件或筛选标签</p>
          </div>
        ) : (
          <>
            <div className="masonry-grid">
              {diaries.map((diary) => (
                <DiaryCard key={diary.id} diary={diary} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-white border rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center space-x-2 mx-auto"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>加载更多</span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
