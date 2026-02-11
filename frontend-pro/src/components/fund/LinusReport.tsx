/**
 * Linus Report Component
 * P1 Feature: AI Deep Logic Report (Linus Mode)
 * 拒绝情绪化叙事，只讲数学事实
 */

import { useEffect, useState } from 'react';
import { Brain, AlertTriangle, TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface LinusReportData {
    fund_code: string;
    fund_name: string;
    generated_at: string;
    mode: string;
    risk_level: string;
    position_status: string;
    price_range_30d: {
        high: number;
        low: number;
        current: number;
        position_pct: number;
    };
    indicators: {
        sharpe_ratio: number;
        max_drawdown: number;
        volatility: number;
        total_return: number;
    };
    valuation_deviation: number;
    report_text: string;
    core_conclusion: string;
}

interface LinusReportProps {
    code: string;
}

export function LinusReport({ code }: LinusReportProps) {
    const [data, setData] = useState<LinusReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/fund/${code}/linus-report`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch report');
                }

                const result = await response.json();

                if (result.error) {
                    setError(result.error);
                } else {
                    setData(result);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };

        if (code) {
            fetchReport();
        }
    }, [code]);

    const getRiskColor = (level: string) => {
        if (level.includes('高')) return 'text-red-400 bg-red-500/10 border-red-500/30';
        if (level.includes('中')) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
        return 'text-green-400 bg-green-500/10 border-green-500/30';
    };

    const getPositionIcon = (pct: number) => {
        if (pct <= 30) return <TrendingDown className="w-3 h-3" />;
        if (pct >= 70) return <TrendingUp className="w-3 h-3" />;
        return <Activity className="w-3 h-3" />;
    };

    if (error) {
        return (
            <div className="bg-[#1a1a2e]/50 rounded-xl p-4 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-[#1a1a2e]/50 rounded-xl p-6 border border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    <span className="text-gray-400">正在生成 Linus 风格审计报告...</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="bg-[#1a1a2e]/50 rounded-xl border border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-white">AI 深度逻辑报告</h3>
                            <p className="text-xs text-gray-500">
                                生成时间: {new Date(data.generated_at).toLocaleString('zh-CN')} · {data.mode}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded border ${getRiskColor(data.risk_level)}`}>
                            风险: {data.risk_level}
                        </span>
                        <span className="px-2 py-1 text-xs rounded border border-blue-500/30 text-blue-400 bg-blue-500/10">
                            位置: {data.position_status}
                        </span>
                    </div>
                </div>
            </div>

            {/* 30-day Range */}
            <div className="p-4 border-b border-white/5 bg-[#0f0f1a]/50">
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    {getPositionIcon(data.price_range_30d.position_pct)}
                    <span>近30日最高{data.price_range_30d.high.toFixed(4)}, 最低{data.price_range_30d.low.toFixed(4)}, 现价处于{data.position_status} ({data.price_range_30d.position_pct}%)</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
                        style={{ width: '100%' }}
                    />
                </div>
                <div
                    className="relative -mt-4 ml-1"
                    style={{ left: `${Math.min(Math.max(data.price_range_30d.position_pct, 5), 95)}%` }}
                >
                    <div className="w-3 h-3 bg-white rounded-full border-2 border-purple-400 shadow-lg" />
                </div>
            </div>

            {/* Report Text */}
            <div className="p-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                    {data.report_text}
                </p>
            </div>

            {/* Core Conclusion */}
            <div className="mx-4 mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-xs font-medium text-yellow-400 mb-1">核心结论</p>
                        <p className="text-sm text-yellow-200/80">
                            {data.core_conclusion}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LinusReport;
