import React, { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Brain, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api';

interface MemoryManagerProps {
    isOpen: boolean;
    onClose: () => void;
}

interface MemoryItem {
    id: string;
    content: string;
    importance: number;
    created_at?: string;
}

interface MemoryStats {
    short_term_count: number;
    long_term_count: number;
    preference_count: number;
}

export const MemoryManager: React.FC<MemoryManagerProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();

    // Fetch memory stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['memory', 'stats'],
        queryFn: async () => {
            const { data } = await apiClient.get('/memory/stats');
            return data as MemoryStats;
        },
        enabled: isOpen,
    });

    // Fetch preferences (user memories)
    const { data: preferences, isLoading: prefsLoading, refetch } = useQuery({
        queryKey: ['memory', 'preferences'],
        queryFn: async () => {
            const { data } = await apiClient.get('/memory/preferences');
            return (data.preferences || []) as MemoryItem[];
        },
        enabled: isOpen,
    });

    // Clear memory mutation
    const clearMutation = useMutation({
        mutationFn: async () => {
            await apiClient.delete('/memory/clear');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['memory'] });
        },
    });

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isLoading = statsLoading || prefsLoading;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="w-full max-w-xl bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                    <div className="flex items-center gap-3">
                        <Brain className="text-purple-400" size={24} />
                        <h2 className="text-xl font-bold text-white">记忆管理</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Description */}
                <div className="px-6 pt-4 pb-2">
                    <p className="text-white/50 text-sm">
                        管理AI助手对您的记忆和偏好设置，让对话更加个性化。
                    </p>
                </div>

                {/* Stats */}
                {stats && (
                    <div className="grid grid-cols-3 gap-3 px-6 py-4">
                        <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold text-white">{stats.short_term_count}</div>
                            <div className="text-xs text-white/40">短期记忆</div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold text-white">{stats.long_term_count}</div>
                            <div className="text-xs text-white/40">长期记忆</div>
                        </div>
                        <div className="p-3 bg-white/5 rounded-lg text-center">
                            <div className="text-2xl font-bold text-white">{stats.preference_count}</div>
                            <div className="text-xs text-white/40">偏好设置</div>
                        </div>
                    </div>
                )}

                {/* Memory List */}
                <div className="px-6 pb-4 max-h-[40vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <h4 className="text-sm font-medium text-white/60 mb-3">📋 已记忆的偏好</h4>

                    {isLoading ? (
                        <div className="text-center py-8 text-white/30">
                            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                            <p>加载中...</p>
                        </div>
                    ) : preferences && preferences.length > 0 ? (
                        <div className="space-y-2">
                            {preferences.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm">{item.content}</p>
                                        {item.created_at && (
                                            <p className="text-white/30 text-xs mt-1">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex-shrink-0 px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-300">
                                        权重: {item.importance}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-white/30">
                            <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
                            <p>暂无记忆数据</p>
                            <p className="text-xs mt-1">与AI对话后将自动学习您的偏好</p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center gap-3">
                    <button
                        onClick={() => refetch()}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                    >
                        <RefreshCw size={16} />
                        刷新
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('确定要清空所有记忆吗？此操作不可撤销。')) {
                                clearMutation.mutate();
                            }
                        }}
                        disabled={clearMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors disabled:opacity-50"
                    >
                        <Trash2 size={16} />
                        {clearMutation.isPending ? '清空中...' : '清空记忆'}
                    </button>
                </div>
            </div>
        </div>
    );
};
