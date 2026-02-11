import { createChart, type IChartApi, LineStyle, ColorType, LineSeries } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { fundApi } from '../../api/fund';
import type { FundYieldData } from '../../types';

interface YieldChartProps {
    fundCode: string;
    height?: number;
}

const ranges = [
    { label: '1年', value: 'y' },
    { label: '3年', value: '3y' },
    { label: '6年', value: '6y' },
    { label: '今年', value: 'n' },
];

export function YieldChart({ fundCode, height = 300 }: YieldChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const [range, setRange] = useState('y');
    const [data, setData] = useState<FundYieldData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchYield = async () => {
            setLoading(true);
            try {
                const res = await fundApi.getYield(fundCode, range);
                setData(res);
            } catch (error) {
                console.error("Failed to fetch yield data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchYield();
    }, [fundCode, range]);

    useEffect(() => {
        if (!chartContainerRef.current || !data) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9ca3af',
            },
            grid: {
                vertLines: { color: '#ffffff10' },
                horzLines: { color: '#ffffff10' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            timeScale: {
                borderColor: '#ffffff10',
            },
            rightPriceScale: {
                borderColor: '#ffffff10',
            },
        });

        const fundSeries = chart.addSeries(LineSeries, {
            color: '#00d4aa',
            lineWidth: 2,
            title: `本基金 (${data.fund_code})`,
        });

        const indexSeries = chart.addSeries(LineSeries, {
            color: '#3b82f6', // Blue for index
            lineWidth: 2,
            lineStyle: LineStyle.Dashed,
            title: data.benchmark_name || '业绩基准',
        });

        const categorySeries = chart.addSeries(LineSeries, {
            color: '#a855f7', // Purple for category
            lineWidth: 2,
            lineStyle: LineStyle.Dotted,
            title: '同类平均',
        });

        // Parse data points
        if (!data.points) return;

        // Ensure points are sorted by date if necessary, API likely returns sorted
        const fundPoints = data.points.map(p => ({ time: p.date, value: p.fund }));
        const indexPoints = data.points.map(p => ({ time: p.date, value: p.index }));
        const categoryPoints = data.points.map(p => ({ time: p.date, value: p.category }));

        fundSeries.setData(fundPoints);
        indexSeries.setData(indexPoints);
        categorySeries.setData(categoryPoints);

        chart.timeScale().fitContent();
        chartRef.current = chart;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, height]);

    return (
        <div className="bg-[#12121a] rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">累计收益率对比</h3>
                <div className="flex gap-1">
                    {ranges.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${range === r.value
                                ? 'bg-[#00d4aa] text-[#0f172a]'
                                : 'text-gray-400 hover:bg-white/5'
                                }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#12121a]/50 z-10">
                        <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                <div ref={chartContainerRef} />
            </div>
            <div className="flex gap-4 mt-2 justify-center text-xs text-gray-400">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[#00d4aa]" />
                    <span>本基金</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[#3b82f6] border-b border-dashed" />
                    <span>业绩基准</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-[#a855f7] border-b border-dotted" />
                    <span>同类平均</span>
                </div>
            </div>
        </div>
    );
}
