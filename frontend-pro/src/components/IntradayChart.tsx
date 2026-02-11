/**
 * IntradayChart - Fund Intraday Valuation Chart
 * 
 * Displays minute-by-minute estimated NAV changes during trading hours.
 * Uses a simple SVG line chart for maximum compatibility.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fundApi } from '../api/fund';
import { TrendingUp, TrendingDown, Clock, RefreshCw } from 'lucide-react';

interface IntradayChartProps {
  fundCode: string;
  fundName?: string;
  height?: number;
}

export function IntradayChart({ fundCode, fundName, height = 200 }: IntradayChartProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['intraday', fundCode],
    queryFn: () => fundApi.getIntraday(fundCode),
    refetchInterval: 60000, // 每分钟刷新
    staleTime: 30000,
  });

  const chartData = useMemo(() => {
    if (!data?.points || data.points.length === 0) return null;

    const points = data.points;
    const values = points.map(p => p.value);
    const minVal = Math.min(...values, 0);
    const maxVal = Math.max(...values, 0);
    const range = Math.max(maxVal - minVal, 0.1);

    // Chart dimensions
    const chartHeight = height - 40; // leave room for labels
    const padding = 10;

    // Generate path
    const pathPoints = points.map((point, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = ((maxVal - point.value) / range) * (chartHeight - 2 * padding) + padding;
      return `${x},${y}`;
    });

    const path = `M ${pathPoints.join(' L ')}`;

    // Zero line position
    const zeroY = ((maxVal - 0) / range) * (chartHeight - 2 * padding) + padding;

    // Latest point for indicator
    const lastPoint = points[points.length - 1];
    const isPositive = lastPoint.value >= 0;

    return {
      path,
      zeroY,
      minVal,
      maxVal,
      lastPoint,
      isPositive,
      chartHeight,
      updateTime: data.update_time,
      fundName: data.fund_name || fundName,
    };
  }, [data, height, fundName]);

  if (isLoading) {
    return (
      <div className="intraday-chart loading" style={{ height }}>
        <div className="loading-spinner">
          <RefreshCw className="spin" size={24} />
          <span>加载分时数据...</span>
        </div>
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className="intraday-chart empty" style={{ height }}>
        <Clock size={32} className="icon-muted" />
        <p>暂无分时数据</p>
        <span className="hint">交易时间 09:30 - 15:00</span>
      </div>
    );
  }

  return (
    <div className="intraday-chart" style={{ height }}>
      <div className="chart-header">
        <div className="chart-title">
          <span className="fund-name">{chartData.fundName}</span>
          <span className="fund-code">{fundCode}</span>
        </div>
        <div className="chart-stats">
          <span className={`current-value ${chartData.isPositive ? 'positive' : 'negative'}`}>
            {chartData.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {chartData.isPositive ? '+' : ''}{chartData.lastPoint.value.toFixed(2)}%
          </span>
          <button
            className="refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="chart-container">
        <svg
          viewBox={`0 0 100 ${chartData.chartHeight}`}
          preserveAspectRatio="none"
          className="chart-svg"
        >
          {/* Zero line */}
          <line
            x1="0"
            y1={chartData.zeroY}
            x2="100"
            y2={chartData.zeroY}
            className="zero-line"
          />

          {/* Value line */}
          <path
            d={chartData.path}
            className={`value-line ${chartData.isPositive ? 'positive' : 'negative'}`}
            fill="none"
          />

          {/* Fill area */}
          <path
            d={`${chartData.path} L 100,${chartData.zeroY} L 0,${chartData.zeroY} Z`}
            className={`value-area ${chartData.isPositive ? 'positive' : 'negative'}`}
          />
        </svg>

        {/* Y-axis labels */}
        <div className="y-axis">
          <span className="max">{chartData.maxVal.toFixed(2)}%</span>
          <span className="zero">0.00%</span>
          <span className="min">{chartData.minVal.toFixed(2)}%</span>
        </div>
      </div>

      <div className="chart-footer">
        <span className="time-label">09:30</span>
        <span className="update-time">更新: {chartData.updateTime}</span>
        <span className="time-label">15:00</span>
      </div>

      <style>{`
        .intraday-chart {
          background: var(--card-bg, #1a1a2e);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        
        .intraday-chart.loading,
        .intraday-chart.empty {
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #666);
        }
        
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .icon-muted {
          color: var(--text-muted, #666);
          margin-bottom: 8px;
        }
        
        .hint {
          font-size: 12px;
          opacity: 0.6;
        }
        
        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .chart-title {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        
        .fund-name {
          font-weight: 600;
          color: var(--text-primary, #fff);
        }
        
        .fund-code {
          font-size: 12px;
          color: var(--text-muted, #888);
        }
        
        .chart-stats {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .current-value {
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          font-size: 14px;
        }
        
        .current-value.positive {
          color: var(--color-gain);
        }
        
        .current-value.negative {
          color: var(--color-loss);
        }
        
        .refresh-btn {
          background: transparent;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: var(--text-muted, #888);
          border-radius: 4px;
          display: flex;
          align-items: center;
        }
        
        .refresh-btn:hover {
          background: var(--hover-bg, rgba(255,255,255,0.1));
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .chart-container {
          flex: 1;
          position: relative;
          min-height: 100px;
        }
        
        .chart-svg {
          width: 100%;
          height: 100%;
        }
        
        .zero-line {
          stroke: var(--border-color, #333);
          stroke-width: 0.5;
          stroke-dasharray: 2, 2;
        }
        
        .value-line {
          stroke-width: 1.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        
        .value-line.positive {
          stroke: var(--color-gain);
        }
        
        .value-line.negative {
          stroke: var(--color-loss);
        }
        
        .value-area {
          opacity: 0.15;
        }
        
        .value-area.positive {
          fill: var(--color-gain);
        }
        
        .value-area.negative {
          fill: var(--color-loss);
        }
        
        .y-axis {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 10px;
          color: var(--text-muted, #666);
          padding: 5px 0;
        }
        
        .chart-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
          font-size: 11px;
          color: var(--text-muted, #666);
        }
        
        .update-time {
          font-size: 10px;
        }
      `}</style>
    </div>
  );
}

export default IntradayChart;
