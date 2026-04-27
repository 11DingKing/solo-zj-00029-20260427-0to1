'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Calendar, Heart, MessageCircle, Clock, User, ChevronLeft, Loader2, Share2, Edit, Trash2, List, Map } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import type { Diary, ScheduleNode, Comment } from '@/types';
import { diaryApi, getImageUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const DiaryMap = dynamic(() => import('@/components/DiaryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center bg-gray-100 rounded-xl">
      <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
    </div>
  ),
});

const TimelineView = dynamic(() => import('@/components/TimelineView'), {
  ssr: false,
});

const CommentSection = dynamic(() => import('@/components/CommentSection'), {
  ssr: false,
});

export default function DiaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const diaryId = params.id as string;

  const [diary, setDiary] = useState<Diary | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'map'>('timeline');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchDiary();
  }, [diaryId]);

  const fetchDiary = async () => {
    try {
      setLoading(true);
      const response = await diaryApi.getDiary(parseInt(diaryId));
      setDiary(response.data);
      setIsLiked(response.data.is_liked_by_current_user || false);
      setLikesCount(response.data.likes_count);
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      setLikeLoading(true);
      const response = await diaryApi.toggleLike(parseInt(diaryId));
      setIsLiked(response.data.is_liked);
      setLikesCount(response.data.likes_count);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await diaryApi.deleteDiary(parseInt(diaryId));
      router.push('/');
    } catch (err) {
      console.error('Failed to delete diary:', err);
    }
  };

  const isOwner = user && diary && user.id === diary.user_id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (error || !diary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{error || '日记不存在'}</h2>
          <Link href="/" className="text-primary-600 hover:text-primary-700">
            ← 返回首页
          </Link>
        </div>
      </div>
    );
  }

  const validNodes = diary.nodes?.filter((n) => n.latitude && n.longitude) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-64 md:h-96 bg-gray-800">
        {diary.cover_image ? (
          <img
            src={getImageUrl(diary.cover_image)}
            alt={diary.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        <div className="absolute top-4 left-4">
          <Link
            href={router.back ? () => router.back() : '/'}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>返回</span>
          </Link>
        </div>

        {isOwner && (
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <Link
              href={`/diary/${diary.id}/edit`}
              className="inline-flex items-center space-x-1 px-3 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full hover:bg-white/30 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden md:inline">编辑</span>
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center space-x-1 px-3 py-2 bg-red-500/80 backdrop-blur-sm text-white rounded-full hover:bg-red-600/80 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">删除</span>
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
          <div className="flex flex-wrap gap-2 mb-3">
            {diary.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm"
              >
                {tag.name_cn}
              </span>
            ))}
          </div>
          <h1 className="text-2xl md:text-4xl font-bold mb-2">{diary.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/80">
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{diary.destination_city}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>
                {diary.start_date && diary.end_date
                  ? `${format(new Date(diary.start_date), 'yyyy年MM月dd日', { locale: zhCN })} - ${format(new Date(diary.end_date), 'yyyy年MM月dd日', { locale: zhCN })} (${diary.duration_days}天)`
                  : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {diary.author && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <Link
              href={`/user/${diary.author.id}`}
              className="flex items-center space-x-4 hover:opacity-80 transition-opacity"
            >
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                {diary.author.avatar ? (
                  <img
                    src={getImageUrl(diary.author.avatar)}
                    alt={diary.author.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-primary-600" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{diary.author.username}</h3>
                <p className="text-sm text-gray-500">
                  {diary.author.bio || '还没有个人介绍'}
                </p>
              </div>
            </Link>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center space-x-2 transition-colors ${
                  isLiked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                }`}
              >
                <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">{likesCount}</span>
              </button>
              <div className="flex items-center space-x-2 text-gray-600">
                <MessageCircle className="w-6 h-6" />
                <span className="font-medium">{diary.comments_count}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {validNodes.length > 0 && (
                <>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'timeline'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="w-5 h-5" />
                    <span className="hidden sm:inline">时间轴</span>
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      viewMode === 'map'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Map className="w-5 h-5" />
                    <span className="hidden sm:inline">地图路线</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'map' && validNodes.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">旅行路线地图</h2>
              <p className="text-sm text-gray-500 mt-1">点击标记查看该节点的详情</p>
            </div>
            <div className="h-96">
              <DiaryMap nodes={diary.nodes || []} />
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <TimelineView nodes={diary.nodes || []} />
          </div>
        )}

        {diary.description && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">旅行简介</h2>
            <div className="prose prose-gray max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-content">
                {diary.description}
              </ReactMarkdown>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              评论 ({diary.comments_count})
            </h2>
          </div>
          <div className="p-4">
            <CommentSection diaryId={parseInt(diaryId)} />
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除这篇旅行日记吗？此操作无法撤销。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
