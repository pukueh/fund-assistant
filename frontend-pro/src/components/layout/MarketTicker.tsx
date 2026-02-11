/**
 * Fund Assistant Pro - Market Ticker Component
 * 
 * Real-time market data with WebSocket + polling fallback
 */

import { useEffect, useState } from 'react';
import { useMarketStore } from '../../store';
import { useWebSocket } from '../../hooks';
import { useFlashUpdate } from '../../hooks/useFlashUpdate';
import { getMarketStatus, shouldPollMarketData } from '../../utils/tradingTime';

interface MarketIndex {
    code: string;
    name: string;
    value: number;
    change: number;
}

// Ticker Item Component to handle individual animations
function TickerItem({ index }: { index: MarketIndex }) {
    const flashClass = useFlashUpdate(index.value, 'text');
    const isPositive = index.change >= 0;

    return (
        <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-gray-400">{index.name}</span>
            <span className={`text-sm font-mono transition-colors duration-300 ${flashClass} ${flashClass ? '' : 'text-white'}`}>
                {index.value.toFixed(2)}
            </span>
            <span className={`text-sm font-mono ${isPositive ? 'text-gain' : 'text-loss'}`}>
                {isPositive ? '+' : ''}{index.change.toFixed(2)}%
            </span>
        </div>
    );
}

export function MarketTicker() {
    const { indices: storeIndices, fetchIndices } = useMarketStore();
    const [wsIndices, setWsIndices] = useState<MarketIndex[]>([]);
    const [isWsConnected, setIsWsConnected] = useState(false);

    // WebSocket connection
    const { isConnected } = useWebSocket('ws://localhost:8080/ws/market', {
        onMessage: (data) => {
            if (data.type === 'market_update' && data.indices) {
                setWsIndices(data.indices);
            }
        },
        reconnect: true,
        reconnectInterval: 5000,
    });

    useEffect(() => {
        setIsWsConnected(isConnected);
    }, [isConnected]);

    // Fallback to polling if WebSocket not connected
    useEffect(() => {
        if (!isWsConnected) {
            fetchIndices();
            const interval = setInterval(fetchIndices, 30000);
            return () => clearInterval(interval);
        }
    }, [isWsConnected, fetchIndices]);

    // Use WebSocket data if available, otherwise use store data
    const rawIndices = isWsConnected && wsIndices.length > 0 ? wsIndices : storeIndices;

    // Deduplicate indices by code
    const displayIndices = Array.from(new Map(rawIndices.map(item => [item.code, item])).values());

    // Connection status effect
    useEffect(() => {
        const checkConnection = () => {
            if (!isWsConnected && !shouldPollMarketData()) {
                // Determine disconnect reason
                // If market is closed, it's expected
            }
        };
        checkConnection();
    }, [isWsConnected]);

    const marketStatus = getMarketStatus();

    return (
        <div className="h-10 bg-[#12121a] border-b border-white/10 flex items-center overflow-x-auto no-scrollbar scroll-smooth select-none">
            {/* Market Status Badge - Sticky-like but in a flex container */}
            <div className="sticky left-0 px-4 border-r border-white/10 flex items-center gap-2 flex-shrink-0 bg-[#12121a] z-20 h-full">
                <div className={`w-2 h-2 rounded-full ${marketStatus.session === 'trading' || marketStatus.session === 'pre_market' ? 'bg-green-500 animate-pulse' :
                    marketStatus.session === 'noon_break' ? 'bg-yellow-500' :
                        'bg-gray-500'
                    }`} />
                <span className="text-xs font-medium text-gray-300 whitespace-nowrap">
                    {marketStatus.message}
                </span>
            </div>

            <div className="flex gap-8 px-6 animate-marquee flex-nowrap">
                {/* Connection indicator */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`w-2 h-2 rounded-full ${isWsConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                        {isWsConnected ? '实时' : '轮询'}
                    </span>
                </div>

                {/* First set of indices */}
                {displayIndices.map((index) => (
                    <TickerItem key={`${index.code}-1`} index={index} />
                ))}

                {/* Second set of indices for seamless marquee */}
                {displayIndices.length > 0 && displayIndices.map((index) => (
                    <TickerItem key={`${index.code}-2`} index={index} />
                ))}
            </div>
        </div>
    );
}
