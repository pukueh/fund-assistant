/**
 * Fund Assistant Pro - Fund Detail Page
 * 
 * Professional fund analysis with NAV chart, metrics, and events.
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeft,
    Activity,
    Calendar,
    Target,
    X,
    Share2,
    Download,
    Info,
    Loader2,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { chartApi } from '../api';
import { fundApi } from '../api/fund';
import { statisticsApi } from '../api/statistics';
import { YieldChart } from '../components/charts/YieldChart';
import { IntradayChart } from '../components/IntradayChart';
import { KLineChart } from '../components/KLineChart';
import { StockHoldings } from '../components/fund/StockHoldings';
import { DiagnosticCard } from '../components/fund/DiagnosticCard';
import { FundScoreCard } from '../components/analytics/FundScoreCard';
import type { FundAnalyticsResponse } from '../types/statistics';
import type { FundChartData, FundDetail, FundDiagnostic, StockHolding } from '../types';
import { TagManager } from '../components/fund/TagManager';
import { ShareCard } from '../components/fund/ShareCard';
import { TechnicalIndicators } from '../components/fund/TechnicalIndicators';
import { LinusReport } from '../components/fund/LinusReport';
import { Card, Badge } from '../components/ui';

const periods = ['1W', '1M', '3M', '6M', '1Y', '3Y'] as const;
type Period = (typeof periods)[number];

// Metrics Card Component
const MetricCard: React.FC<{
    label: string;
    value: string | number;
    suffix?: string;
}> = ({ label, value, suffix }) => (
    <div className="bg-[#1a1a2e] rounded-lg p-3">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="font-mono text-sm text-white mt-1">
            {value}
            {suffix && <span className="text-gray-400">{suffix}</span>}
        </p>
    </div>
);

export function FundDetailPage() {
    const { code } = useParams<{ code: string }>();
    const shareCardRef = React.useRef<HTMLDivElement>(null);

    const [chartData, setChartData] = useState<FundChartData | null>(null);
    const [fundDetails, setFundDetails] = useState<FundDetail | null>(null);
    // ... (rest of the file remains same, will use replace block)

    const [diagnostic, setDiagnostic] = useState<FundDiagnostic | null>(null);
    const [stockHoldings, setStockHoldings] = useState<StockHolding[]>([]);
    const [isLoadingHoldings, setIsLoadingHoldings] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<Period>('1Y');

    // Analytics State
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics'>('overview');
    const [analyticsData, setAnalyticsData] = useState<FundAnalyticsResponse | null>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

    // Share State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const handleDownloadImage = async () => {
        if (!shareCardRef.current) return;

        try {
            setIsGeneratingImage(true);
            const canvas = await html2canvas(shareCardRef.current, {
                backgroundColor: '#0f172a',
                scale: 2, // High resolution
                useCORS: true, // Allow loading cross-origin images (e.g. manager avatars)
                logging: false
            });

            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = image;
            link.download = `fund-share-${code}-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Optional: close modal
            // setIsShareModalOpen(false);
        } catch (error) {
            console.error('Failed to generate image:', error);
            alert('生成图片失败，请重试');
        } finally {
            setIsGeneratingImage(false);
        }
    };


    // Fetch chart data
    useEffect(() => {
        if (!code) return;

        const fetchData = async () => {
            try {
                // Fetch holdings separately to not block main interactions if it's slow
                fundApi.getHoldings(code).then(res => {
                    setStockHoldings(res);
                    setIsLoadingHoldings(false);
                }).catch(err => {
                    console.error('Failed to fetch holdings:', err);
                    setIsLoadingHoldings(false);
                });

                const [chart, details, diag] = await Promise.all([
                    chartApi.getChartData(code, selectedPeriod),
                    fundApi.getDetails(code),
                    fundApi.getDiagnostic(code)
                ]);
                setChartData(chart);
                setFundDetails(details);
                setDiagnostic(diag);
            } catch (err) {
                console.error('Failed to fetch data:', err);
            }
        };

        fetchData();
    }, [code, selectedPeriod]);

    // Fetch analytics when tab changes
    useEffect(() => {
        if (code && activeTab === 'analytics' && !analyticsData) {
            setIsLoadingAnalytics(true);
            statisticsApi.getFundAnalytics(code)
                .then(setAnalyticsData)
                .catch(err => console.error('Failed to fetch analytics:', err))
                .finally(() => setIsLoadingAnalytics(false));
        }
    }, [code, activeTab, analyticsData]);

    if (!code) {
        return (
            <div className="p-6">
                <p className="text-gray-400">请选择一个基金查看详情</p>
            </div>
        );
    }

    return (
        <motion.div
            className="p-6 lg:p-10 space-y-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                    <Link
                        to="/discovery"
                        className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-lg group"
                    >
                        <ArrowLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 mb-1.5">
                            <h1 className="text-3xl font-black text-white tracking-tight">
                                {fundDetails?.name || chartData?.fund_name || `基金 ${code}`}
                            </h1>
                            <Badge variant="default" className="bg-blue-600/20 text-blue-400 border-blue-500/20">
                                {code}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-4">
                            {code && (
                                <TagManager
                                    fundCode={code}
                                    initialTags={fundDetails?.tags || []}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="h-11 px-5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2 font-bold text-sm shadow-md"
                    >
                        <Share2 size={18} />
                        <span>生成分享卡片</span>
                    </button>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex items-center p-1 bg-white/5 w-fit rounded-2xl border border-white/5 backdrop-blur-sm">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'overview'
                        ? 'bg-white/10 text-white shadow-lg'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    市场概览
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex items-center gap-2 px-8 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'analytics'
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    量化深度分析
                    <span className="text-[9px] uppercase tracking-tighter bg-white/20 px-1.5 rounded-sm">Pro</span>
                </button>
            </div>

            {/* Main Content Area */}
            {activeTab === 'overview' ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Performance Summary Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Diagnostic & Real-time Section */}
                            {diagnostic && <DiagnosticCard data={diagnostic} />}

                            <Card className="p-0 overflow-hidden border-white/5 shadow-2xl">
                                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                            <Activity size={18} className="text-emerald-400" />
                                        </div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">实时估值动态</h2>
                                    </div>
                                    <Badge variant="gain" className="animate-pulse">实时推送中</Badge>
                                </div>
                                <div className="p-4">
                                    <IntradayChart fundCode={code} fundName={fundDetails?.name || chartData?.fund_name} height={200} />
                                </div>
                            </Card>

                            {/* Main K-Line Chart Card */}
                            <Card className="p-0 overflow-hidden border-white/5 shadow-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-white/5 bg-white/[0.01] gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                            <Target size={18} className="text-blue-400" />
                                        </div>
                                        <h2 className="text-lg font-bold text-white tracking-tight">历史表现回测</h2>
                                    </div>
                                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/5">
                                        {periods.map((period) => (
                                            <button
                                                key={period}
                                                onClick={() => setSelectedPeriod(period)}
                                                className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${selectedPeriod === period
                                                    ? 'bg-blue-600 text-white shadow-lg'
                                                    : 'text-gray-500 hover:text-gray-300'
                                                    }`}
                                            >
                                                {period}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <KLineChart fundCode={code} period={selectedPeriod} />
                                </div>
                            </Card>
                        </div>

                        <div className="space-y-8">
                            {/* Stats Sidebar */}
                            {chartData?.metrics && (
                                <Card className="p-6 border-white/5 shadow-2xl">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">关键量化因子</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <MetricCard
                                            label="夏普比率"
                                            value={chartData.metrics.sharpe_ratio?.toFixed(2) || '--'}
                                        />
                                        <MetricCard
                                            label="最大回撤"
                                            value={chartData.metrics.max_drawdown?.toFixed(2) || '--'}
                                            suffix="%"
                                        />
                                        <MetricCard
                                            label="波动率"
                                            value={chartData.metrics.volatility?.toFixed(2) || '--'}
                                            suffix="%"
                                        />
                                        <MetricCard
                                            label="Alpha"
                                            value={chartData.metrics.alpha?.toFixed(2) || '--'}
                                            suffix="%"
                                        />
                                        <MetricCard
                                            label="Beta"
                                            value={chartData.metrics.beta?.toFixed(2) || '--'}
                                        />
                                        <MetricCard
                                            label="信息比率"
                                            value={chartData.metrics.information_ratio?.toFixed(2) || '--'}
                                        />
                                    </div>
                                </Card>
                            )}

                            {/* Yield Performance Area */}
                            <YieldChart fundCode={code} />
                        </div>
                    </div>

                    {/* AI Risk & Technical Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        <TechnicalIndicators code={code} />
                        <LinusReport code={code} />
                    </div>

                    {/* Asset Allocation & Holdings */}
                    <StockHoldings
                        holdings={stockHoldings}
                        isLoading={isLoadingHoldings}
                    />

                    {/* Manager Profile & Company Info */}
                    {fundDetails?.managers && fundDetails.managers.length > 0 && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <h2 className="text-2xl font-black text-white tracking-tight">基金经理分析</h2>
                                <Badge variant="default" className="text-blue-400 border-blue-500/10">共 {fundDetails.managers.length} 位</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {fundDetails.managers.map((mgr: any) => (
                                    <Card key={mgr.id} className="p-6 border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[40px] -z-10" />
                                        <div className="flex gap-5">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
                                                <img
                                                    src={mgr.image_url || "https://fundmobapi.eastmoney.com/images/default_manager.png"}
                                                    alt={mgr.name}
                                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white/10 group-hover:border-blue-500/20 transition-all relative z-10"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = "https://fundmobapi.eastmoney.com/images/default_manager.png";
                                                    }}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{mgr.name}</h3>
                                                <div className="space-y-2 mt-3">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">从业年限</span>
                                                        <span className="text-gray-300 font-bold">{mgr.work_time}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">管理回报</span>
                                                        <span className={`font-black ${String(mgr.return_rate).startsWith('-') ? 'text-loss' : 'text-gain'}`}>
                                                            {mgr.return_rate}%
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="text-gray-500">在管规模</span>
                                                        <span className="text-gray-300 font-bold">{mgr.fund_size}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timeline & Events Card */}
                    {chartData?.events && chartData.events.length > 0 && (
                        <Card className="p-8 border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] -z-10" />
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                    <Calendar className="text-amber-500" size={20} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white tracking-tight">基金大事件</h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Timeline & Milestones</p>
                                </div>
                            </div>
                            <div className="space-y-6 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-px before:bg-white/5">
                                {chartData.events.slice(0, 5).map((event) => (
                                    <div
                                        key={event.id}
                                        className="flex items-start gap-8 group"
                                    >
                                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 z-10 transition-transform group-hover:scale-110 ${event.type === 'dividend'
                                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            : 'bg-blue-600/10 border-blue-500/20 text-blue-400'
                                            }`}>
                                            <Info size={18} />
                                        </div>
                                        <div className="flex-1 pb-6 border-b border-white/[0.03] last:border-0">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <p className="font-bold text-white group-hover:text-amber-400 transition-colors">
                                                    {event.title}
                                                </p>
                                                <span className="text-[10px] font-black text-gray-500 font-mono tracking-tighter uppercase">
                                                    {event.date}
                                                </span>
                                            </div>
                                            {event.description && (
                                                <p className="text-sm text-gray-500 leading-relaxed font-medium">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <FundScoreCard
                        scoreData={analyticsData?.score || { total: 0, dimensions: { revenue: 0, risk: 0, manager: 0, company: 0, cost: 0 } }}
                    />

                    {analyticsData?.metrics && (
                        <div className="space-y-8">
                            <Card className="p-10 border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] -z-10 group-hover:bg-blue-500/10 transition-colors" />
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                                        <Activity className="text-blue-500" size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white tracking-tight">量化绩效归因分析</h3>
                                        <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Quantitative Performance Attribution</p>
                                    </div>
                                </div>

                                {/* Text Analysis */}
                                <div className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5 leading-relaxed text-gray-300 font-medium">
                                    {analyticsData.analysis}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10">
                                    <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">区间收益率</p>
                                        <p className={`text-2xl font-black font-mono tracking-tighter ${analyticsData.metrics.total_return >= 0 ? 'text-gain' : 'text-loss'}`}>
                                            {analyticsData.metrics.total_return.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">最大回撤</p>
                                        <p className="text-2xl font-black font-mono tracking-tighter text-loss">
                                            {analyticsData.metrics.max_drawdown.toFixed(2)}%
                                        </p>
                                    </div>
                                    <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">夏普比率</p>
                                        <p className="text-2xl font-black font-mono tracking-tighter text-white">
                                            {analyticsData.metrics.sharpe_ratio.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest pl-1">累计波动率</p>
                                        <p className="text-2xl font-black font-mono tracking-tighter text-white">
                                            {analyticsData.metrics.volatility.toFixed(2)}%
                                        </p>
                                    </div>
                                </div>

                                {/* LianBan / Consecutive Stats */}
                                <div className="mt-10 pt-10 border-t border-white/5">
                                    <h4 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-6 px-1">连涨连跌序列统计</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                        <div className="p-4 rounded-2xl border border-rose-500/10 bg-rose-500/[0.02]">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">当前连涨</p>
                                            <div className="flex items-end gap-1 text-gain">
                                                <span className="text-3xl font-black font-mono tracking-tighter">{analyticsData.metrics.consecutive_up}</span>
                                                <span className="text-[10px] font-bold mb-1.5">Trade Days</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.02]">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">当前连跌</p>
                                            <div className="flex items-end gap-1 text-loss">
                                                <span className="text-3xl font-black font-mono tracking-tighter">{analyticsData.metrics.consecutive_down}</span>
                                                <span className="text-[10px] font-bold mb-1.5">Trade Days</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">历史最大连涨</p>
                                            <div className="flex items-end gap-1 text-white opacity-80">
                                                <span className="text-2xl font-black font-mono tracking-tighter">{analyticsData.metrics.max_consecutive_up}</span>
                                                <span className="text-[10px] font-bold mb-1">MAX</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl border border-white/5 bg-white/[0.01]">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">历史最大连跌</p>
                                            <div className="flex items-end gap-1 text-white opacity-80">
                                                <span className="text-2xl font-black font-mono tracking-tighter">{analyticsData.metrics.max_consecutive_down}</span>
                                                <span className="text-[10px] font-bold mb-1">MAX</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {!isLoadingAnalytics && !analyticsData && (
                        <Card className="py-20 text-center border-dashed border-white/10">
                            <Activity size={32} className="mx-auto text-gray-600 mb-4" />
                            <p className="text-gray-500 font-medium">暂无高级量化分析数据，系统生成中...</p>
                        </Card>
                    )}
                </div>
            )}

            {/* Premium Share Modal */}
            {isShareModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        onClick={() => setIsShareModalOpen(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="relative w-full max-w-xl bg-[#0a0a0f] rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">分享投资灵感</h3>
                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-0.5">Generate Smart Insight Card</p>
                            </div>
                            <button onClick={() => setIsShareModalOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-10 flex justify-center bg-gradient-to-b from-transparent to-black/40">
                            <div className="rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/5">
                                <ShareCard
                                    ref={shareCardRef}
                                    fundDetails={fundDetails}
                                    chartData={chartData}
                                    score={analyticsData?.score || null}
                                    metrics={analyticsData?.metrics}
                                    fundCode={code}
                                />
                            </div>
                        </div>

                        <div className="p-8 flex gap-4 bg-white/[0.02]">
                            <button
                                onClick={handleDownloadImage}
                                disabled={isGeneratingImage}
                                className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50"
                            >
                                {isGeneratingImage ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
                                <span>{isGeneratingImage ? '正在雕刻视觉卡片...' : '立即保存高清原图'}</span>
                            </button>
                            <button
                                onClick={() => setIsShareModalOpen(false)}
                                className="px-8 h-14 bg-white/5 text-white font-bold rounded-2xl border border-white/10 hover:bg-white/10 transition-all active:scale-[0.98]"
                            >
                                取消
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}

export default FundDetailPage;
