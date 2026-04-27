'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MapPin, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ScheduleNode } from '@/types';
import { getImageUrl } from '@/lib/api';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TimelineViewProps {
  nodes: ScheduleNode[];
}

export default function TimelineView({ nodes }: TimelineViewProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const sortedNodes = [...nodes].sort((a, b) => {
    const dateCompare = a.node_date.localeCompare(b.node_date);
    if (dateCompare !== 0) return dateCompare;
    return a.node_order - b.node_order;
  });

  const nodesByDate: Record<string, ScheduleNode[]> = {};
  sortedNodes.forEach((node) => {
    if (!nodesByDate[node.node_date]) {
      nodesByDate[node.node_date] = [];
    }
    nodesByDate[node.node_date].push(node);
  });

  const dates = Object.keys(nodesByDate).sort();

  if (nodes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">这篇日记还没有日程节点</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-900">行程时间轴</h2>
          <p className="text-sm text-gray-500 mt-1">
            共 {dates.length} 天，{nodes.length} 个节点
          </p>
        </div>

        <div className="p-4 md:p-6">
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 md:left-8" />

            {dates.map((date, dateIndex) => {
              const dayNodes = nodesByDate[date];
              const dayNum = dateIndex + 1;

              return (
                <div key={date} className="relative mb-8 last:mb-0">
                  <div className="flex items-start mb-4">
                    <div className="relative z-10">
                      <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm md:text-base">
                        {dayNum}
                      </div>
                    </div>
                    <div className="ml-4 md:ml-6 flex-1">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {format(new Date(date), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ml-12 md:ml-20 space-y-6">
                    {dayNodes.map((node, nodeIndex) => (
                      <div
                        key={node.id}
                        className="relative bg-gray-50 rounded-xl p-4 md:p-6 border border-gray-100"
                      >
                        <div className="absolute -left-12 md:-left-16 top-6 w-4 h-4 rounded-full border-4 border-white bg-primary-400 shadow" />

                        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                          <MapPin className="w-5 h-5 text-primary-600 mr-2" />
                          {node.location_name}
                        </h3>

                        {node.description && (
                          <div className="mb-4">
                            <div className="prose prose-sm max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-content text-sm">
                                {node.description}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {node.images && node.images.length > 0 && (
                          <div className="mt-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {node.images.map((img) => (
                                <button
                                  key={img.id}
                                  onClick={() => setSelectedImage(getImageUrl(img.image_url))}
                                  className="relative aspect-square rounded-lg overflow-hidden group"
                                >
                                  <img
                                    src={getImageUrl(img.image_url)}
                                    alt={node.location_name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <ChevronRight className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={selectedImage}
            alt="查看大图"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
