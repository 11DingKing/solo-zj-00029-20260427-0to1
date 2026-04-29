"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Minus,
  Upload,
  MapPin,
  Calendar,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { Tag } from "@/types";
import { diaryApi, nodeApi, tagsApi, uploadApi, getImageUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import dynamic from "next/dynamic";

interface NodeForm {
  id?: number;
  node_date: string;
  node_order: number;
  location_name: string;
  latitude: string;
  longitude: string;
  description: string;
  images: string[];
  imageFiles: File[];
}

export default function CreateDiaryPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  const [nodes, setNodes] = useState<NodeForm[]>([]);
  const [expandedNode, setExpandedNode] = useState<number | null>(null);

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await tagsApi.getAll();
      setTags(response.data);
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    } finally {
      setLoading(false);
    }
  };

  const addNode = () => {
    const newNode: NodeForm = {
      node_date: startDate || new Date().toISOString().split("T")[0],
      node_order: nodes.length,
      location_name: "",
      latitude: "",
      longitude: "",
      description: "",
      images: [],
      imageFiles: [],
    };
    setNodes([...nodes, newNode]);
    setExpandedNode(nodes.length);
  };

  const removeNode = (index: number) => {
    if (nodes.length <= 1) return;
    setNodes(nodes.filter((_, i) => i !== index));
    if (expandedNode === index) {
      setExpandedNode(null);
    } else if (expandedNode !== null && expandedNode > index) {
      setExpandedNode(expandedNode - 1);
    }
  };

  const updateNode = (index: number, updates: Partial<NodeForm>) => {
    const newNodes = [...nodes];
    newNodes[index] = { ...newNodes[index], ...updates };
    setNodes(newNodes);
  };

  const handleNodeImageSelect = async (
    index: number,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const response = await uploadApi.uploadImage(files[i]);
        newImages.push(response.data.url);
      }

      const node = nodes[index];
      updateNode(index, {
        images: [...node.images, ...newImages],
      });
    } catch (err) {
      console.error("Failed to upload image:", err);
      setError("图片上传失败");
    }
  };

  const removeNodeImage = (nodeIndex: number, imageIndex: number) => {
    const node = nodes[nodeIndex];
    updateNode(nodeIndex, {
      images: node.images.filter((_, i) => i !== imageIndex),
    });
  };

  const handleCoverImageSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const response = await uploadApi.uploadImage(files[0]);
      setCoverImage(response.data.url);
    } catch (err) {
      console.error("Failed to upload cover image:", err);
      setError("封面图上传失败");
    }
  };

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("请输入日记标题");
      return;
    }
    if (!destinationCity.trim()) {
      setError("请输入目的地城市");
      return;
    }
    if (!startDate || !endDate) {
      setError("请选择出发和结束日期");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError("结束日期不能早于出发日期");
      return;
    }

    try {
      setSubmitting(true);

      const response = await diaryApi.createDiary({
        title: title.trim(),
        destination_city: destinationCity.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        is_public: isPublic,
      });

      const diaryId = response.data.diary.id;

      if (coverImage) {
        await diaryApi.updateDiary(diaryId, { cover_image: coverImage });
      }

      for (const node of nodes) {
        if (!node.location_name.trim()) continue;

        const nodeResponse = await nodeApi.createNode(diaryId, {
          node_date: node.node_date,
          node_order: node.node_order,
          location_name: node.location_name.trim(),
          latitude: node.latitude ? parseFloat(node.latitude) : undefined,
          longitude: node.longitude ? parseFloat(node.longitude) : undefined,
          description: node.description.trim() || undefined,
        });
      }

      router.push(`/diary/${diaryId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || "创建日记失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            创建新旅行日记
          </h1>
          <p className="text-gray-500">记录你的精彩旅程</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              基本信息
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  日记标题 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给你的旅行起个名字"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  目的地城市 *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    placeholder="如：北京、上海"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  旅行标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedTags.includes(tag.name)
                          ? "bg-primary-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tag.name_cn}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出发日期 *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  结束日期 *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  封面图
                </label>
                <div className="flex items-start space-x-4">
                  {coverImage ? (
                    <div className="relative">
                      <img
                        src={getImageUrl(coverImage)}
                        alt="封面"
                        className="w-32 h-20 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setCoverImage(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <span className="text-xs text-gray-500">上传封面</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  旅行简介
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="简单介绍一下这次旅行（支持 Markdown 格式）"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    公开这篇日记（其他用户可以看到）
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">日程节点</h2>
              <button
                type="button"
                onClick={addNode}
                className="flex items-center space-x-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>添加节点</span>
              </button>
            </div>

            {nodes.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">还没有添加日程节点</p>
                <p className="text-gray-400 text-sm mt-1">
                  点击上方"添加节点"按钮开始记录你的旅程
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {nodes.map((node, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedNode(expandedNode === index ? null : index)
                      }
                      className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div className="text-left">
                          <p className="font-medium text-gray-900">
                            {node.location_name || "未命名地点"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {node.node_date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {nodes.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNode(index);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {expandedNode === index ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {expandedNode === index && (
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              地点名称
                            </label>
                            <input
                              type="text"
                              value={node.location_name}
                              onChange={(e) =>
                                updateNode(index, {
                                  location_name: e.target.value,
                                })
                              }
                              placeholder="如：故宫博物院"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              日期
                            </label>
                            <input
                              type="date"
                              value={node.node_date}
                              onChange={(e) =>
                                updateNode(index, { node_date: e.target.value })
                              }
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              纬度
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={node.latitude}
                              onChange={(e) =>
                                updateNode(index, { latitude: e.target.value })
                              }
                              placeholder="如：39.9167"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              经度
                            </label>
                            <input
                              type="number"
                              step="any"
                              value={node.longitude}
                              onChange={(e) =>
                                updateNode(index, { longitude: e.target.value })
                              }
                              placeholder="如：116.4167"
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              节点描述（支持 Markdown）
                            </label>
                            <textarea
                              value={node.description}
                              onChange={(e) =>
                                updateNode(index, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="描述这个地点发生了什么..."
                              rows={3}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            />
                          </div>

                          <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              配图
                            </label>
                            <div className="flex flex-wrap gap-3">
                              {node.images.map((img, imgIndex) => (
                                <div key={imgIndex} className="relative">
                                  <img
                                    src={getImageUrl(img)}
                                    alt={`配图 ${imgIndex + 1}`}
                                    className="w-24 h-16 object-cover rounded-lg"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeNodeImage(index, imgIndex)
                                    }
                                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <label className="w-24 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                                <div className="text-center">
                                  <ImageIcon className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                                  <span className="text-xs text-gray-500">
                                    添加图片
                                  </span>
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) =>
                                    handleNodeImageSelect(index, e)
                                  }
                                  className="hidden"
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>保存日记</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
