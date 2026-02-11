import { useEffect, useState } from 'react';
import { FundScoreCard } from './FundScoreCard';
import { CorrelationMatrix } from './CorrelationMatrix';
import { useAuthStore } from '../../store/useAuth';
import { usePortfolioStore } from '../../store';
import { Loader2, TrendingUp, Activity, ShieldCheck, Target } from 'lucide-react';
import { apiClient } from '../../api/client';

export const AnalyticsDashboard = () => {
    const { user } = useAuthStore();
    const { holdings } = usePortfolioStore();
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [correlationData, setCorrelationData] = useState<any>(null);

    // Using first fund in portfolio for the score card, or a default one
    const scoreFundCode = holdings.length > 0 ? holdings[0].fund_code : "110011";
    const [scoreData, setScoreData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || holdings.length === 0) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // 1. Fetch Portfolio Analytics
                const analyticsRes = await apiClient.get('/portfolio/analytics');
                setAnalyticsData(analyticsRes.data);

                // 2. Fetch Fund Score for the main holding
                const scoreRes = await apiClient.get(`/fund/${scoreFundCode}/score`);
                setScoreData(scoreRes.data);

                // 3. Fetch Correlation using ACTUAL holdings
                const fundCodes = holdings.map(h => h.fund_code);
                const corrRes = await apiClient.post('/portfolio/correlation', { holdings: fundCodes });
                setCorrelationData(corrRes.data);

            } catch (error) {
                console.error("Failed to fetch analytics", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, holdings, scoreFundCode]);

    if (isLoading) {
        return (
            <div className="flex flex-col h-64 items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--color-accent)]" />
                <span className="text-[var(--color-text-secondary)] font-medium animate-pulse">深度量化引擎计算中...</span>
            </div>
        );
    }

    if (holdings.length === 0) {
        return (
            <div className="card p-12 text-center">
                <Activity size={48} className="mx-auto text-[var(--color-text-muted)] mb-4" />
                <p className="text-[var(--color-text-secondary)]">
                    组合内暂无持仓，无法进行量化分析。
                </p>
            </div>
        );
    }

    const { indicators } = analyticsData || {};

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="夏普比率 (Sharpe)"
                    value={indicators?.sharpe_ratio?.toFixed(2) || "0.00"}
                    desc=">1.0 优秀收益比"
                    icon={<TrendingUp size={14} />}
                    color="text-purple-400"
                />
                <MetricCard
                    label="最大回撤 (MDD)"
                    value={`${indicators?.max_drawdown?.toFixed(2) || "0.00"}%`}
                    desc="历史最大跌幅"
                    icon={<ShieldCheck size={14} />}
                    color="text-loss"
                />
                <MetricCard
                    label="年化波动率"
                    value={`${indicators?.volatility?.toFixed(2) || "0.00"}%`}
                    desc="衡量资产风险水平"
                    icon={<Activity size={14} />}
                    color="text-orange-400"
                />
                <MetricCard
                    label="累计分析盈亏"
                    value={`¥${(analyticsData?.total_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    desc="基于持仓历史计算"
                    icon={<Target size={14} />}
                    color={(analyticsData?.total_profit || 0) >= 0 ? "text-gain" : "text-loss"}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Charts */}
                <div className="lg:col-span-1 space-y-6">
                    {scoreData && <FundScoreCard scoreData={scoreData} />}

                    <div className="card p-6 h-[200px] flex flex-col items-center justify-center text-center group">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Activity className="text-[var(--color-text-muted)]" size={24} />
                        </div>
                        <h3 className="text-[var(--color-text-secondary)] font-medium">定投回测</h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">AI 正在学习历史规律，模块即将上线</p>
                    </div>
                </div>

                {/* Right Column: Matrix */}
                <div className="lg:col-span-2">
                    {correlationData && <CorrelationMatrix funds={correlationData.funds} matrix={correlationData.matrix} />}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, desc, icon, color }: any) => (
    <div className="card p-4 hover:border-[var(--color-accent-light)] transition-all">
        <div className="flex items-center gap-2 mb-2">
            <span className="text-[var(--color-text-muted)]">{icon}</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">{label}</span>
        </div>
        <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
        <div className="text-[10px] text-[var(--color-text-muted)] mt-1.5 opacity-80">{desc}</div>
    </div>
);
