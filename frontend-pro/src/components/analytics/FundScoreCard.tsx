import React from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

interface FundScoreCardProps {
    scoreData: {
        total: number;
        dimensions: {
            revenue: number; // 收益能力
            risk: number;    // 抗风险
            manager: number; // 经理运作
            company: number; // 公司实力
            cost: number;    // 性价比
        };
    };
}

export const FundScoreCard: React.FC<FundScoreCardProps> = ({ scoreData }) => {
    // Data safety guard
    if (!scoreData || !scoreData.dimensions) {
        return (
            <div className="card p-6 h-full flex flex-col items-center justify-center">
                <p className="text-sm text-[var(--color-text-muted)]">评分数据加载失败</p>
            </div>
        );
    }

    const data = [
        { subject: '收益能力', A: scoreData.dimensions.revenue || 0, fullMark: 100 },
        { subject: '抗风险', A: scoreData.dimensions.risk || 0, fullMark: 100 },
        { subject: '经理运作', A: scoreData.dimensions.manager || 0, fullMark: 100 },
        { subject: '公司实力', A: scoreData.dimensions.company || 0, fullMark: 100 },
        { subject: '性价比', A: scoreData.dimensions.cost || 0, fullMark: 100 },
    ];

    return (
        <div className="card p-6 h-full flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-medium text-[var(--color-text-primary)]">AI 基金综合评分</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Multi-dimensional Analysis</p>
                </div>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[var(--color-accent)] font-mono">{scoreData.total}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">/ 100</span>
                </div>
            </div>

            <div className="flex-1 w-full mt-2" style={{ minHeight: '280px', height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                        <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 100]}
                            tick={false}
                            axisLine={false}
                        />
                        <Radar
                            name="评分"
                            dataKey="A"
                            stroke="#00d4aa"
                            strokeWidth={2}
                            fill="#00d4aa"
                            fillOpacity={0.25}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f1f2e',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: '#f8fafc'
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--color-border)] text-[10px] text-[var(--color-text-muted)] text-center leading-relaxed">
                基于历史业绩、回撤控制及基金经理稳定性模型计算
            </div>
        </div>
    );
};
