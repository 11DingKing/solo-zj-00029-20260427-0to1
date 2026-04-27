import axios, { AxiosRequestConfig } from 'axios';
import type { User, Diary, Tag, Comment, Destination, PaginationResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  refreshToken: (refreshToken: string) =>
    api.post('/api/auth/refresh', {}, {
      headers: { Authorization: `Bearer ${refreshToken}` }
    }),
  
  getCurrentUser: () =>
    api.get('/api/auth/me'),
  
  updateProfile: (data: Partial<User>) =>
    api.put('/api/auth/me', data),
};

export const userApi = {
  getUser: (userId: number) =>
    api.get(`/api/users/${userId}`),
  
  getUserDiaries: (userId: number, page = 1, perPage = 20) =>
    api.get<PaginationResponse<Diary>>(`/api/users/${userId}/diaries`, {
      params: { page, per_page: perPage }
    }),
};

export const diaryApi = {
  getDiaries: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    destination?: string;
    tags?: string[];
    sort_by?: string;
  }) =>
    api.get<PaginationResponse<Diary>>('/api/diaries', { params }),
  
  getDiary: (diaryId: number) =>
    api.get<Diary>(`/api/diaries/${diaryId}`),
  
  createDiary: (data: {
    title: string;
    destination_city: string;
    start_date: string;
    end_date: string;
    description?: string;
    tags?: string[];
    is_public?: boolean;
    nodes?: Array<{
      node_date: string;
      node_order?: number;
      location_name: string;
      latitude?: number;
      longitude?: number;
      description?: string;
    }>;
  }) =>
    api.post('/api/diaries', data),
  
  updateDiary: (diaryId: number, data: Partial<{
    title: string;
    destination_city: string;
    start_date: string;
    end_date: string;
    description: string;
    tags: string[];
    is_public: boolean;
    cover_image: string;
  }>) =>
    api.put(`/api/diaries/${diaryId}`, data),
  
  deleteDiary: (diaryId: number) =>
    api.delete(`/api/diaries/${diaryId}`),
  
  toggleLike: (diaryId: number) =>
    api.post(`/api/diaries/${diaryId}/like`),
  
  getComments: (diaryId: number, page = 1, perPage = 20) =>
    api.get<PaginationResponse<Comment>>(`/api/diaries/${diaryId}/comments`, {
      params: { page, per_page: perPage }
    }),
  
  addComment: (diaryId: number, data: {
    content: string;
    parent_id?: number;
    reply_to_user_id?: number;
  }) =>
    api.post(`/api/diaries/${diaryId}/comments`, data),
  
  deleteComment: (commentId: number) =>
    api.delete(`/api/comments/${commentId}`),
};

export const nodeApi = {
  createNode: (diaryId: number, data: {
    node_date: string;
    node_order?: number;
    location_name: string;
    latitude?: number;
    longitude?: number;
    description?: string;
  }) =>
    api.post(`/api/diaries/${diaryId}/nodes`, data),
  
  updateNode: (nodeId: number, data: Partial<{
    node_date: string;
    node_order: number;
    location_name: string;
    latitude: number;
    longitude: number;
    description: string;
  }>) =>
    api.put(`/api/nodes/${nodeId}`, data),
  
  deleteNode: (nodeId: number) =>
    api.delete(`/api/nodes/${nodeId}`),
};

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

export const tagsApi = {
  getAll: () => api.get<Tag[]>('/api/tags'),
};

export const destinationsApi = {
  getAll: () => api.get<Destination[]>('/api/destinations'),
  getRanking: (limit = 20) =>
    api.get<{ ranking: Array<Destination & { rank: number }> }>('/api/destinations/ranking', {
      params: { limit }
    }),
};

export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '/placeholder-image.jpg';
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
};

export default api;
