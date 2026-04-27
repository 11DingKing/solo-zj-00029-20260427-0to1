'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Calendar, MapPin, Clock, User } from 'lucide-react';
import type { Diary } from '@/types';
import { getImageUrl } from '@/lib/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DiaryCardProps {
  diary: Diary;
}

export default function DiaryCard({ diary }: DiaryCardProps) {
  const [imageError, setImageError] = useState(false);

  const startDate = diary.start_date ? new Date(diary.start_date) : null;
  const endDate = diary.end_date ? new Date(diary.end_date) : null;

  return (
    <div className="masonry-item">
      <Link href={`/diary/${diary.id}`} className="block group">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
            {!imageError && diary.cover_image ? (
              <img
                src={getImageUrl(diary.cover_image)}
                alt={diary.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                <MapPin className="w-12 h-12 text-primary-400" />
              </div>
            )}

            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
              {diary.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 bg-black/50 text-white text-xs rounded-full backdrop-blur-sm"
                >
                  {tag.name_cn}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition-colors mb-2">
              {diary.title}
            </h3>

            <div className="flex items-center space-x-1 text-sm text-gray-500 mb-3">
              <MapPin className="w-4 h-4" />
              <span className="truncate">{diary.destination_city}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
              <div className="flex items-center space-x-3">
                {startDate && endDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{diary.duration_days}天</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Heart className={`w-3.5 h-3.5 ${diary.is_liked_by_current_user ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{diary.likes_count}</span>
                </div>
              </div>
            </div>

            {diary.author && (
              <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {diary.author.avatar ? (
                    <img
                      src={getImageUrl(diary.author.avatar)}
                      alt={diary.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
                <span className="text-sm text-gray-600 truncate">{diary.author.username}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
