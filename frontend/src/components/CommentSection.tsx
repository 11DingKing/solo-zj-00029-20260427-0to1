'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, User, Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';
import type { Comment } from '@/types';
import { diaryApi, getImageUrl } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CommentSectionProps {
  diaryId: number;
}

interface CommentWithReplies extends Comment {
  replies?: CommentWithReplies[];
}

export default function CommentSection({ diaryId }: CommentSectionProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComments();
  }, [diaryId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await diaryApi.getComments(diaryId);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      setError('');

      await diaryApi.addComment(diaryId, {
        content: newComment.trim(),
        parent_id: replyTo?.id || undefined,
        reply_to_user_id: replyTo ? (
          comments.find(c => c.id === replyTo.id)?.author.id ||
          (() => {
            const findInReplies = (items: CommentWithReplies[]): number | undefined => {
              for (const item of items) {
                if (item.id === replyTo.id) return item.author.id;
                if (item.replies) {
                  const found = findInReplies(item.replies);
                  if (found !== undefined) return found;
                }
              }
              return undefined;
            };
            return findInReplies(comments);
          })()
        ) : undefined,
      });

      setNewComment('');
      setReplyTo(null);
      fetchComments();
    } catch (err: any) {
      setError(err.response?.data?.error || '评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
      await diaryApi.deleteComment(commentId);
      fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: CommentWithReplies; depth?: number }) => {
    const isOwner = user && user.id === comment.author.id;

    return (
      <div className={`${depth > 0 ? 'ml-8 mt-4 border-l-2 border-gray-100 pl-4' : ''}`}>
        <div className="flex space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {comment.author.avatar ? (
              <img
                src={getImageUrl(comment.author.avatar)}
                alt={comment.author.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-gray-400" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{comment.author.username}</span>
                {comment.reply_to_user && (
                  <span className="text-gray-400 text-sm">
                    回复 <span className="text-gray-600">@{comment.reply_to_user.username}</span>
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {format(new Date(comment.created_at), 'yyyy-MM-dd HH:mm', { locale: zhCN })}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {user && depth === 0 && (
                  <button
                    onClick={() => setReplyTo({ id: comment.id, username: comment.author.username })}
                    className="text-xs text-gray-400 hover:text-primary-600 flex items-center space-x-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>回复</span>
                  </button>
                )}
                {isOwner && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center space-x-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>删除</span>
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-gray-700 mt-1 break-words">{comment.content}</p>
          </div>
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {user && (
        <form onSubmit={handleSubmit} className="mb-6">
          {replyTo && (
            <div className="flex items-center space-x-2 mb-2 text-sm text-gray-600">
              <span>回复 @{replyTo.username}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex space-x-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
              {user.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-gray-400" />
              )}
            </div>
            
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyTo ? `回复 @${replyTo.username}...` : '写下你的评论...'}
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
              />
              
              {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
              )}
              
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>发送</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {!user && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-gray-500">
            <button
              onClick={() => router.push('/login')}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              登录
            </button>
            {' '}后发表评论
          </p>
        </div>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">还没有评论，来发表第一条评论吧</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>
    </div>
  );
}
