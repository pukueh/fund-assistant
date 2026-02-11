import { forwardRef } from 'react';
import { Target, Activity } from 'lucide-react';
import type { FundDetail, FundChartData } from '../../types';
import type { FundScore, FundMetrics } from '../../types/statistics';
import { KLineChart } from '../KLineChart';

interface ShareCardProps {
    fundDetails: FundDetail | null;
    chartData: FundChartData | null;
    score: FundScore | null;
    metrics?: FundMetrics;
    fundCode: string;
}

export const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(({
    fundDetails,
    chartData,
    score,
    metrics,
    fundCode
}, ref) => {
    const today = new Date().toLocaleDateString('zh-CN');

    // Calculate display values
    const nav = fundDetails?.nav || (chartData?.nav_data && chartData.nav_data.length > 0 ? chartData.nav_data[chartData.nav_data.length - 1].value : 0);
    const navTime = (chartData?.nav_data && chartData.nav_data.length > 0 ? new Date(chartData.nav_data[chartData.nav_data.length - 1].time).toLocaleDateString('zh-CN') : today);
    const navDate = fundDetails?.nav_date || navTime;
    const change = fundDetails?.day_change || 0;
    const isPositive = change >= 0;

    return (
        <div
            ref={ref}
            className="w-[375px] bg-[#0f172a] text-white p-6 rounded-xl shadow-2xl relative overflow-hidden"
            style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                backgroundImage: "radial-gradient(circle at top right, rgba(0, 212, 170, 0.1), transparent 40%)"
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        {fundDetails?.fund_name || chartData?.fund_name || fundCode}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-[#00d4aa] font-mono">{fundCode}</span>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">{fundDetails?.fund_type || '混合型'}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-bold ${isPositive ? 'text-gain' : 'text-loss'}`}>{typeof nav === 'number' ? nav.toFixed(4) : nav}</p>
                    <p className="text-xs text-gray-400">最新净值 ({navDate})</p>
                </div>
            </div>

            {/* Score & LianBan Badge */}
            <div className="flex gap-4 mb-6">
                {/* Score */}
                <div className="flex-1 bg-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-400 mb-0.5">AI 评分</p>
                        <p className="text-2xl font-bold">{score?.total || '--'}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full border-2 border-[#00d4aa] flex items-center justify-center">
                        <Target size={20} className="text-[#00d4aa]" />
                    </div>
                </div>

                {/* LianBan Badge (if valid) */}
                {metrics && (metrics.consecutive_up > 0 || metrics.consecutive_down > 0) && (
                    <div className={`flex-1 rounded-lg p-3 flex items-center justify-between ${metrics.consecutive_up > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'
                        }`}>
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">
                                {metrics.consecutive_up > 0 ? '连涨' : '连跌'}
                            </p>
                            <p className={`text-2xl font-bold ${metrics.consecutive_up > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {metrics.consecutive_up > 0 ? metrics.consecutive_up : metrics.consecutive_down}
                                <span className="text-xs ml-1 font-normal opacity-70">天</span>
                            </p>
                        </div>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${metrics.consecutive_up > 0 ? 'bg-red-500/20' : 'bg-green-500/20'
                            }`}>
                            <Activity size={16} className={metrics.consecutive_up > 0 ? 'text-red-500' : 'text-green-500'} />
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Snapshot */}
            <div className="bg-[#12121a] rounded-lg p-3 mb-6 border border-white/5 h-[180px]">
                <KLineChart fundCode={fundCode} period="1M" height={150} />
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">区间收益</p>
                    <p className={`font-mono font-medium ${(metrics?.total_return || 0) >= 0 ? 'text-gain' : 'text-loss'
                        }`}>
                        {metrics?.total_return ? `${metrics.total_return.toFixed(2)}%` : '--'}
                    </p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">最大回撤</p>
                    <p className="text-white font-mono font-medium">{metrics?.max_drawdown ? `${metrics.max_drawdown.toFixed(2)}%` : '--'}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-500">夏普比率</p>
                    <p className="text-white font-mono font-medium">{metrics?.sharpe_ratio ? metrics.sharpe_ratio.toFixed(2) : '--'}</p>
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#00d4aa] to-blue-600 rounded-lg flex items-center justify-center border border-white/10">
                        <span className="text-xs font-bold font-mono">FA</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold">基金助手 Pro</p>
                        <p className="text-[10px] text-gray-500">AI 驱动的投资顾问</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500">更多数据请访问</p>
                    <p className="text-[10px] text-[#00d4aa]">fund.helloagents.ai</p>
                </div>
            </div>
        </div>
    );
});

ShareCard.displayName = 'ShareCard';
