import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { chartApi } from '../../api';

interface SparklineProps {
    fundCode: string;
    height?: number;
    width?: number;
    data?: any[]; // Allow passing data directly if available
}

export const Sparkline: React.FC<SparklineProps> = ({
    fundCode,
    height = 40,
    width = 120,
    data: initialData
}) => {
    const [data, setData] = useState<any[]>(initialData || []);
    const [loading, setLoading] = useState(!initialData);

    useEffect(() => {
        if (initialData) {
            setData(initialData);
            setLoading(false);
            return;
        }

        let mounted = true;

        const fetchData = async () => {
            try {
                // Fetch 1 Month data for sparkline
                // Use a smaller period if 1M is too slow, but 1M is standard for "30-day sparkline"
                const response = await chartApi.getChartData(fundCode, '1M');
                if (mounted && response.nav_data) {
                    setData(response.nav_data);
                }
            } catch (err) {
                console.error(`Failed to fetch sparkline for ${fundCode}`, err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            mounted = false;
        };
    }, [fundCode, initialData]);

    if (loading) {
        return (
            <div style={{ height, width }} className="animate-pulse bg-white/5 rounded mx-auto" />
        );
    }

    if (!data.length) {
        // Render a placeholder line
        return (
            <div style={{ height, width }} className="flex items-center justify-center">
                <div className="w-full h-[1px] bg-gray-700" />
            </div>
        );
    }

    // Determine color based on trend
    const firstVal = data[0]?.value || 0;
    const lastVal = data[data.length - 1]?.value || 0;
    const isPositive = lastVal >= firstVal;
    const trendColor = isPositive ? '#ef4444' : '#22c55e';

    return (
        <div style={{ width, height }} className="mx-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={width} minHeight={height}>
                <LineChart data={data}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={trendColor}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false} // Disable animation for performance in table
                    />
                    {/* Use a domain that's slightly padded */}
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
