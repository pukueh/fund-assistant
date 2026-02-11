import React, { useEffect } from 'react';
import { usePortfolioStore } from '../../store';
import { Trophy, Lock, X } from 'lucide-react';

export const AchievementModal: React.FC = () => {
    const { isAchievementOpen, toggleAchievement, achievements } = usePortfolioStore();

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isAchievementOpen) toggleAchievement();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isAchievementOpen, toggleAchievement]);

    if (!isAchievementOpen) return null;

    // Mock total achievements count for now (or drive from config)
    const totalAchievements = 12;
    const unlockedCount = achievements.length;
    const points = unlockedCount * 10; // 10 points per achievement

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget) toggleAchievement();
            }}
        >
            <div className="w-full max-w-2xl bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
                    <div className="flex items-center gap-3">
                        <Trophy className="text-yellow-400" size={24} />
                        <h2 className="text-xl font-bold text-white">我的成就</h2>
                    </div>
                    <button
                        onClick={toggleAchievement}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 p-6 text-center">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-4xl font-bold text-white mb-1">{points}</div>
                        <div className="text-sm text-white/40">成就点数</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="text-4xl font-bold text-white mb-1">
                            <span className="text-yellow-400">{unlockedCount}</span>
                            <span className="text-white/20 text-2xl">/{totalAchievements}</span>
                        </div>
                        <div className="text-sm text-white/40">已解锁</div>
                    </div>
                </div>

                {/* List */}
                <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {achievements.length > 0 ? (
                        <div className="grid gap-3">
                            {achievements.map((achievement) => (
                                <div
                                    key={achievement.id}
                                    className="flex items-center p-4 bg-gradient-to-r from-white/5 to-transparent border border-white/10 rounded-xl group hover:border-white/20 transition-colors"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mr-4 border border-yellow-500/30">
                                        <span className="text-xl">{achievement.icon || '🏆'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white font-bold text-lg mb-1">{achievement.name}</h3>
                                        <p className="text-white/50 text-sm">{achievement.description}</p>
                                    </div>
                                    <div className="text-xs text-white/30 font-mono">
                                        {new Date(achievement.earned_at || '').toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-white/30">
                            <Lock size={48} className="mx-auto mb-4 opacity-50" />
                            <p>暂无解锁成就</p>
                            <p className="text-sm mt-2">继续探索功能以解锁更多成就</p>
                        </div>
                    )}

                    {/* Placeholder for locked achievements if needed */}
                    {/* 
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center p-4 bg-white/5 rounded-xl opacity-50 grayscale">
                             ...Locked Item...
                        </div>
                    </div> 
                    */}
                </div>
            </div>
        </div>
    );
};
