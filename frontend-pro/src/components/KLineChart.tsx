/**
 * KLineChart - Fund Historical NAV Chart
 * 
 * Displays historical NAV trend using lightweight-charts.
 * Replaces the mock chart in FundDetail.
 */
import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, LineSeries, type IChartApi } from 'lightweight-charts';
import { useQuery } from '@tanstack/react-query';
import { fundApi } from '../api/fund';

interface KLineChartProps {
    fundCode: string;
    period: string; // '1Y', '3Y' etc. mapped to API range
    height?: number;
}

const mapPeriodToRange = (period: string): string => {
    switch (period) {
        case '1W': return 'y'; // API min is 1y
        case '1M': return 'y';
        case '3M': return 'y';
        case '6M': return 'y';
        case '1Y': return 'y';
        case '3Y': return '3y';
        default: return 'y';
    }
};

export function KLineChart({ fundCode, period, height = 400 }: KLineChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    const apiRange = useMemo(() => mapPeriodToRange(period), [period]);

    const { data: historyData, isLoading } = useQuery({
        queryKey: ['fundHistory', fundCode, apiRange],
        queryFn: () => fundApi.getHistory(fundCode, apiRange),
    });

    // Filter data based on selected period (since API minimal range is 1Yr)
    const chartData = useMemo(() => {
        if (!historyData?.points) return [];

        let points = [...historyData.points];

        // Client-side filtering for shorter periods
        if (period === '1W') {
            const date = new Date();
            date.setDate(date.getDate() - 7);
            const str = date.toISOString().split('T')[0];
            points = points.filter(p => p.date >= str);
        } else if (period === '1M') {
            const date = new Date();
            date.setMonth(date.getMonth() - 1);
            const str = date.toISOString().split('T')[0];
            points = points.filter(p => p.date >= str);
        } else if (period === '3M') {
            const date = new Date();
            date.setMonth(date.getMonth() - 3);
            const str = date.toISOString().split('T')[0];
            points = points.filter(p => p.date >= str);
        } else if (period === '6M') {
            const date = new Date();
            date.setMonth(date.getMonth() - 6);
            const str = date.toISOString().split('T')[0];
            points = points.filter(p => p.date >= str);
        }

        return points.map(p => ({
            time: p.date,
            value: p.nav,
        }));
    }, [historyData, period]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Create chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: height,
            timeScale: {
                timeVisible: true,
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
        });

        chartRef.current = chart;

        const firstVal = chartData[0]?.value || 0;
        const lastVal = chartData[chartData.length - 1]?.value || 0;
        const isPositive = lastVal >= firstVal;
        const lineColor = isPositive ? '#ef4444' : '#22c55e';

        const lineSeries = chart.addSeries(LineSeries, {
            color: lineColor,
            lineWidth: 2,
            crosshairMarkerVisible: true,
            crosshairMarkerRadius: 4,
        });

        // Populate data
        if (chartData.length > 0) {
            lineSeries.setData(chartData);
            chart.timeScale().fitContent();
        }

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [chartData]);

    if (isLoading) {
        return (
            <div className="h-[400px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">加载历史数据...</div>
            </div>
        );
    }

    return <div ref={chartContainerRef} className="w-full" />;
}
