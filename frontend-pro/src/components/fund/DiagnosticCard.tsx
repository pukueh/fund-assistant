import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, Users } from 'lucide-react';
import type { FundDiagnostic } from '../../types';

interface DiagnosticCardProps {
    data: FundDiagnostic;
}

export const DiagnosticCard: React.FC<DiagnosticCardProps> = ({ data }) => {
    // Helper to get color based on score
    const getScoreColor = (score: number) => {
        if (score >= 80) return '#00d4aa'; // Green
        if (score >= 60) return '#fbbf24'; // Yellow
        return '#ef4444'; // Red
    };

    const scoreColor = getScoreColor(data.score);

    return (
        <div className="bg-[#12121a] rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
                <ShieldCheck className="text-[#00d4aa]" size={24} />
                <h2 className="font-medium text-white text-lg">基金诊断</h2>
                <span className="text-xs text-gray-400 ml-auto">Sources: {data.source}</span>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Score Circle */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="#1a1a2e"
                            strokeWidth="12"
                            fill="none"
                        />
                        <motion.circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke={scoreColor}
                            strokeWidth="12"
                            fill="none"
                            strokeDasharray={351} // 2 * PI * 56
                            strokeDashoffset={351}
                            initial={{ strokeDashoffset: 351 }}
                            animate={{ strokeDashoffset: 351 - (351 * data.score) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-3xl font-bold text-white">{data.score}</span>
                        <span className="text-xs text-gray-400">综合评分</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 w-full">
                    <p className="text-gray-300 mb-6 font-medium">{data.summary}</p>

                    <div className="space-y-4">
                        {/* Factor: Foundation */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400 flex items-center gap-1">
                                    <ShieldCheck size={14} /> 基金规模
                                </span>
                                <span className="text-white">{data.factors.foundation}</span>
                            </div>
                            <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${data.factors.foundation}%` }}
                                    transition={{ duration: 1, delay: 0.2 }}
                                />
                            </div>
                        </div>

                        {/* Factor: Manager */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400 flex items-center gap-1">
                                    <Users size={14} /> 基金经理
                                </span>
                                <span className="text-white">{data.factors.manager}</span>
                            </div>
                            <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-purple-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${data.factors.manager}%` }}
                                    transition={{ duration: 1, delay: 0.4 }}
                                />
                            </div>
                        </div>

                        {/* Factor: Performance */}
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400 flex items-center gap-1">
                                    <TrendingUp size={14} /> 业绩表现
                                </span>
                                <span className="text-white">{data.factors.performance}</span>
                            </div>
                            <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-orange-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${data.factors.performance}%` }}
                                    transition={{ duration: 1, delay: 0.6 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
