
import React from 'react';

interface PieChartProps {
    data: { name: string; value: number; color: string }[];
    size?: number;
}

export const PieChart: React.FC<PieChartProps> = ({ data, size = 200 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;

    const paths = data.map((item, index) => {
        const angle = (item.value / total) * 360;
        const x1 = 50 + 50 * Math.cos((Math.PI * currentAngle) / 180);
        const y1 = 50 + 50 * Math.sin((Math.PI * currentAngle) / 180);
        const x2 = 50 + 50 * Math.cos((Math.PI * (currentAngle + angle)) / 180);
        const y2 = 50 + 50 * Math.sin((Math.PI * (currentAngle + angle)) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

        currentAngle += angle;

        return (
            <path
                key={index}
                d={pathData}
                fill={item.color}
                stroke="#12121a"
                strokeWidth="1"
            />
        );
    });

    return (
        <div className="relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" width={size} height={size} className="transform -rotate-90">
                {paths}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {/* Center content if needed, e.g. total value */}
            </div>
            {/* Legend */}
            <div className="hidden">
                {data.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-400">{item.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};
