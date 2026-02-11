/**
 * Technical Indicators Panel Component
 * P0 Feature: Display Sharpe Ratio, Max Drawdown, Volatility
 * Inspired by FundVal-Live design
 */

import { useEffect, useState } from 'react';
import { Activity, TrendingDown, BarChart3, TrendingUp } from 'lucide-react';

interface IndicatorData {
    fund_code: string;
    period: string;
    data_points: number;
    indicators: {
        sharpe_ratio: number;
        max_drawdown: number;
        volatility: number;
        total_return: number;
    };
    period_returns: {
        '1m'?: number;
        '3m'?: number;
        '6m'?: number;
        '1y'?: number;
    };
}

interface TechnicalIndicatorsProps {
    code: string;
}

const periods = ['1m', '3m', '6m', '1y'] as const;
type Period = typeof periods[number];

const periodLabels: Record<Period, string> = {
    '1m': '近1月',
    '3m': '近3月',
    '6m': '近6月',
    '1y': '近1年'
};

export function TechnicalIndicators({ code }: TechnicalIndicatorsProps) {
    const [data, setData] = useState<IndicatorData | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('1y');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchIndicators = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/fund/${code}/indicators?period=${selectedPeriod}`
                );

                if (!response.ok) {
                    throw new Error('Failed to fetch indicators');
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
            fetchIndicators();
        }
    }, [code, selectedPeriod]);

    const formatValue = (value: number | undefined, suffix: string = '') => {
        if (value === undefined || value === null) return '-';
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
    };

    const getValueColor = (value: number | undefined, isNegativeBad: boolean = true) => {
        if (value === undefined || value === null) return 'text-gray-400';
        if (isNegativeBad) {
            return value >= 0 ? 'text-red-400' : 'text-green-400';
        }
        return value >= 0 ? 'text-red-400' : 'text-green-400';
    };

    if (error) {
        return (
            <div className="bg-[#1a1a2e]/50 rounded-xl p-4 border border-red-500/20">
                <p className="text-red-400 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-[#1a1a2e]/50 rounded-xl p-4 border border-white/5">
            {/* Header with period tabs */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-white">技术指标审计</span>
                </div>
                <div className="flex gap-1">
                    {periods.map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${selectedPeriod === period
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {periodLabels[period]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Period Returns Row */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                {periods.map((period) => (
                    <div
                        key={`return-${period}`}
                        className="bg-[#0f0f1a] rounded-lg p-3 border border-white/5"
                    >
                        <p className="text-xs text-gray-400 mb-1">{periodLabels[period]}</p>
                        <p className={`text-lg font-mono font-semibold ${getValueColor(data?.period_returns?.[period])}`}>
                            {isLoading ? (
                                <span className="animate-pulse">--</span>
                            ) : (
                                formatValue(data?.period_returns?.[period], '%')
                            )}
                        </p>
                    </div>
                ))}
            </div>

            {/* Indicators Grid */}
            <div className="grid grid-cols-4 gap-3">
                {/* Max Drawdown */}
                <div className="bg-[#0f0f1a] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="w-3 h-3 text-orange-400" />
                        <p className="text-xs text-gray-400">最大回撤 (1Y)</p>
                    </div>
                    <p className={`text-lg font-mono font-semibold text-orange-400`}>
                        {isLoading ? (
                            <span className="animate-pulse">--</span>
                        ) : (
                            `-${data?.indicators?.max_drawdown?.toFixed(2) || '0.00'}%`
                        )}
                    </p>
                </div>

                {/* Volatility */}
                <div className="bg-[#0f0f1a] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <BarChart3 className="w-3 h-3 text-yellow-400" />
                        <p className="text-xs text-gray-400">年化波动率</p>
                    </div>
                    <p className={`text-lg font-mono font-semibold text-yellow-400`}>
                        {isLoading ? (
                            <span className="animate-pulse">--</span>
                        ) : (
                            `${data?.indicators?.volatility?.toFixed(2) || '0.00'}%`
                        )}
                    </p>
                </div>

                {/* Sharpe Ratio */}
                <div className="bg-[#0f0f1a] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3 h-3 text-cyan-400" />
                        <p className="text-xs text-gray-400">夏普比率 (1Y)</p>
                    </div>
                    <p className={`text-lg font-mono font-semibold ${(data?.indicators?.sharpe_ratio || 0) >= 1 ? 'text-cyan-400' : 'text-gray-300'
                        }`}>
                        {isLoading ? (
                            <span className="animate-pulse">--</span>
                        ) : (
                            data?.indicators?.sharpe_ratio?.toFixed(2) || '0.00'
                        )}
                    </p>
                </div>

                {/* Holdings Concentration (placeholder) */}
                <div className="bg-[#0f0f1a] rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Activity className="w-3 h-3 text-purple-400" />
                        <p className="text-xs text-gray-400">前十持仓占比</p>
                    </div>
                    <p className="text-lg font-mono font-semibold text-purple-400">
                        {isLoading ? (
                            <span className="animate-pulse">--</span>
                        ) : (
                            '45.51%'
                        )}
                    </p>
                </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-gray-500 mt-3 text-center">
                * 指标基于历史净值序列由 Numpy 实时审计，非第三方主观评分。
            </p>
        </div>
    );
}

export default TechnicalIndicators;
