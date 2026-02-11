import React from 'react';

interface CorrelationMatrixProps {
    funds: string[];
    matrix: number[][]; // N x N matrix
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({ funds, matrix }) => {
    // Color scale function: -1 (system loss color) -> 0 (neutral) -> 1 (system gain red)
    const getColor = (val: number) => {
        if (Math.abs(val - 1.0) < 0.01) return 'rgba(255, 255, 255, 0.05)'; // Diagonal / Identity

        if (val > 0) {
            // Positive correlation -> Red (Gain style)
            const opacity = val * 0.7 + 0.1;
            return `rgba(239, 68, 68, ${opacity})`;
        } else {
            // Negative correlation -> Blue (Accent style for hedging)
            const opacity = Math.abs(val) * 0.7 + 0.1;
            return `rgba(0, 212, 170, ${opacity})`;
        }
    };

    return (
        <div className="card p-6 overflow-x-auto h-full">
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-6">持仓相关性矩阵</h3>

            <div className="min-w-[400px]">
                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${funds.length}, minmax(40px, 1fr))` }}>
                    {/* Header Row */}
                    <div className="h-8"></div>
                    {funds.map((f, i) => (
                        <div key={i} className="h-8 flex items-center justify-center text-[10px] font-mono font-medium text-[var(--color-text-muted)] truncate px-1" title={f}>
                            {f.slice(0, 6)}
                        </div>
                    ))}

                    {/* Matrix Rows */}
                    {matrix.map((row, i) => (
                        <React.Fragment key={i}>
                            {/* Row Label */}
                            <div className="h-10 flex items-center justify-end pr-3 text-[10px] font-mono font-medium text-[var(--color-text-muted)] truncate" title={funds[i]}>
                                {funds[i].slice(0, 6)}
                            </div>
                            {/* Cells */}
                            {row.map((val, j) => {
                                const isSelf = i === j;
                                return (
                                    <div
                                        key={`${i}-${j}`}
                                        className={`h-10 border border-[var(--color-border)] flex items-center justify-center text-[11px] font-mono transition-all hover:scale-105 cursor-default relative group`}
                                        style={{ backgroundColor: getColor(val) }}
                                    >
                                        <span className={isSelf ? 'text-[var(--color-text-muted)] opacity-50' : 'text-white font-medium drop-shadow-sm'}>
                                            {isSelf ? "1.00" : val.toFixed(2)}
                                        </span>
                                        {/* Tooltip */}
                                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full mb-2 z-10 bg-[var(--color-bg-elevated)] text-white text-[10px] p-2 rounded-lg border border-[var(--color-border)] shadow-xl whitespace-nowrap pointer-events-none">
                                            <span className="text-[var(--color-text-muted)]">{funds[i]}</span>
                                            <span className="mx-2 text-[var(--color-accent)]">×</span>
                                            <span className="text-[var(--color-text-muted)]">{funds[j]}</span>
                                            <div className="mt-1 font-bold">相关系数: <span className={val > 0 ? 'text-gain' : 'text-[var(--color-accent)]'}>{val.toFixed(4)}</span></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-[10px] text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[var(--color-accent)] rounded shadow-[0_0_8px_rgba(0,212,170,0.3)]"></div> 负相关 (对冲风险)
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-gain rounded shadow-[0_0_8px_rgba(239,68,68,0.3)]"></div> 正相关 (同涨同跌)
                </div>
            </div>
        </div>
    );
};
