import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Users, Check, Loader2, ExternalLink } from 'lucide-react';
import { shadowApi } from '../api/shadow';

interface ShadowWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'input' | 'confirm' | 'result';

const PLATFORMS = [
    { id: 'xueqiu', name: '雪球', icon: '❄️', placeholder: '输入用户ID或主页URL' },
    { id: 'wechat', name: '微信公众号', icon: '💬', placeholder: '输入公众号ID' },
    { id: 'twitter', name: 'Twitter/X', icon: '🐦', placeholder: '输入用户名 (@handle)' },
];

export function ShadowWizard({ isOpen, onClose }: ShadowWizardProps) {
    const [step, setStep] = useState<Step>('input');
    const [platform, setPlatform] = useState('xueqiu');
    const [platformId, setPlatformId] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [resultData, setResultData] = useState<{
        bloggerId: number;
        holdingsCount: number;
    } | null>(null);

    const queryClient = useQueryClient();

    // Add blogger mutation
    const addBloggerMutation = useMutation({
        mutationFn: shadowApi.bloggers.add,
        onSuccess: async (data) => {
            // Automatically fetch holdings after adding
            try {
                const fetchResult = await shadowApi.portfolio.fetch(data.blogger_id);
                setResultData({
                    bloggerId: data.blogger_id,
                    holdingsCount: fetchResult.holdings_count,
                });
            } catch {
                // Even if fetch fails, we still added the blogger
                setResultData({
                    bloggerId: data.blogger_id,
                    holdingsCount: 0,
                });
            }
            setStep('result');
            queryClient.invalidateQueries({ queryKey: ['shadow-following'] });
        },
    });

    const handleSubmit = () => {
        addBloggerMutation.mutate({
            platform,
            platform_id: platformId,
            name,
            description,
        });
    };

    const handleClose = () => {
        onClose();
        // Reset state after close animation
        setTimeout(() => {
            setStep('input');
            setPlatform('xueqiu');
            setPlatformId('');
            setName('');
            setDescription('');
            setResultData(null);
        }, 300);
    };

    if (!isOpen) return null;

    const selectedPlatform = PLATFORMS.find(p => p.id === platform);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a24] w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">添加追踪对象</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 min-h-[400px]">
                    {step === 'input' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-white mb-2">选择信息来源</h3>
                                <p className="text-gray-400 text-sm">输入博主信息开始追踪其持仓</p>
                            </div>

                            {/* Platform Selection */}
                            <div className="grid grid-cols-3 gap-3">
                                {PLATFORMS.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPlatform(p.id)}
                                        className={`py-3 rounded-xl text-sm font-medium transition-colors flex flex-col items-center gap-1 ${platform === p.id
                                                ? 'bg-[#00d4aa] text-black'
                                                : 'bg-[#12121a] text-gray-400 hover:text-white border border-white/10'
                                            }`}
                                    >
                                        <span className="text-xl">{p.icon}</span>
                                        <span>{p.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Platform ID */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">用户ID或链接</label>
                                <input
                                    type="text"
                                    value={platformId}
                                    onChange={(e) => setPlatformId(e.target.value)}
                                    placeholder={selectedPlatform?.placeholder}
                                    className="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4aa]"
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">显示名称</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="例如：基金大V张三"
                                    className="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4aa]"
                                />
                            </div>

                            {/* Description (optional) */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-2">备注（可选）</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="例如：专注科技赛道，长期持有型"
                                    rows={2}
                                    className="w-full bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#00d4aa] resize-none"
                                />
                            </div>

                            <button
                                onClick={() => setStep('confirm')}
                                disabled={!platformId || !name}
                                className="w-full py-3 bg-[#00d4aa] text-black font-bold rounded-xl hover:bg-[#00d4aa]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                下一步
                            </button>
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                                    {name[0]}
                                </div>
                                <h3 className="text-lg font-bold text-white">{name}</h3>
                                <p className="text-gray-400 text-sm capitalize">{selectedPlatform?.icon} {selectedPlatform?.name}</p>
                            </div>

                            <div className="bg-[#12121a] rounded-xl border border-white/5 p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">平台</span>
                                    <span className="text-white">{selectedPlatform?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">ID</span>
                                    <span className="text-white font-mono">{platformId}</span>
                                </div>
                                {description && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">备注</span>
                                        <span className="text-white text-right max-w-[200px] truncate">{description}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-500/5 p-3 rounded-lg">
                                <ExternalLink size={14} className="mt-0.5 text-blue-500 flex-shrink-0" />
                                <p>添加后系统将自动尝试获取该用户的最新持仓信息。</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('input')}
                                    className="flex-1 py-3 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-colors"
                                >
                                    返回
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={addBloggerMutation.isPending}
                                    className="flex-1 py-3 bg-[#00d4aa] text-black font-bold rounded-xl hover:bg-[#00d4aa]/90 transition-colors flex items-center justify-center gap-2"
                                >
                                    {addBloggerMutation.isPending ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            添加中...
                                        </>
                                    ) : (
                                        '确认添加'
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'result' && resultData && (
                        <div className="space-y-6 text-center">
                            <div className="w-20 h-20 bg-[#00d4aa]/10 rounded-full flex items-center justify-center mx-auto text-[#00d4aa]">
                                <Check size={40} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">追踪成功!</h3>
                                <p className="text-gray-400">已开始追踪 <span className="text-white font-medium">{name}</span></p>
                            </div>

                            <div className="bg-[#12121a] rounded-xl border border-white/5 p-6">
                                <div className="flex items-center justify-center gap-4">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-[#00d4aa]">{resultData.holdingsCount}</div>
                                        <div className="text-sm text-gray-400">发现持仓</div>
                                    </div>
                                </div>
                                {resultData.holdingsCount === 0 && (
                                    <p className="text-xs text-gray-500 mt-4">暂未获取到持仓信息，稍后系统会自动尝试更新。</p>
                                )}
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full py-3 bg-[#00d4aa] text-black font-bold rounded-xl hover:bg-[#00d4aa]/90 transition-colors flex items-center justify-center gap-2"
                            >
                                <Users size={18} />
                                查看我的关注
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
