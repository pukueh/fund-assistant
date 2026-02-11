/**
 * Fund Assistant Pro - Trading Time Utility
 * 
 * Helper functions to determine current market status.
 * Used for smart refresh strategies to reduce API calls during non-trading hours.
 */

export type TradingSession = 'pre_market' | 'trading' | 'noon_break' | 'after_hours' | 'closed' | 'weekend';

export interface MarketStatus {
    session: TradingSession;
    isOpen: boolean;
    nextOpenTime?: Date;
    message: string;
}

/**
 * Get current market session status (China A-Share logic)
 */
export function getMarketStatus(): MarketStatus {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const time = hour * 100 + minute;

    // Weekend check
    if (day === 0 || day === 6) {
        // Calculate next Monday 9:30
        const daysUntilMonday = day === 0 ? 1 : 2;
        const nextOpen = new Date(now);
        nextOpen.setDate(now.getDate() + daysUntilMonday);
        nextOpen.setHours(9, 30, 0, 0);

        return {
            session: 'weekend',
            isOpen: false,
            nextOpenTime: nextOpen,
            message: '周末休市'
        };
    }

    // Trading Hours: 9:30 - 11:30, 13:00 - 15:00

    // Before 9:15 (Pre-market start)
    if (time < 915) {
        const nextOpen = new Date(now);
        nextOpen.setHours(9, 30, 0, 0);
        return {
            session: 'closed',
            isOpen: false,
            nextOpenTime: nextOpen,
            message: '未开盘'
        };
    }

    // Pre-market Call Auction: 9:15 - 9:30
    if (time >= 915 && time < 930) {
        return {
            session: 'pre_market',
            isOpen: true, // Data updates start coming in
            message: '盘前集合竞价'
        };
    }

    // Morning Session: 9:30 - 11:30
    if (time >= 930 && time <= 1130) {
        return {
            session: 'trading',
            isOpen: true,
            message: '交易中'
        };
    }

    // Noon Break: 11:30 - 13:00
    if (time > 1130 && time < 1300) {
        const nextOpen = new Date(now);
        nextOpen.setHours(13, 0, 0, 0);
        return {
            session: 'noon_break',
            isOpen: false,
            nextOpenTime: nextOpen,
            message: '午间休市'
        };
    }

    // Afternoon Session: 13:00 - 15:00
    if (time >= 1300 && time < 1500) {
        return {
            session: 'trading',
            isOpen: true,
            message: '交易中'
        };
    }

    // After Hours
    const nextOpen = new Date(now);
    nextOpen.setDate(now.getDate() + 1);
    // If next day is Saturday, add 2 more days
    if (nextOpen.getDay() === 6) {
        nextOpen.setDate(nextOpen.getDate() + 2);
    }
    nextOpen.setHours(9, 30, 0, 0);

    return {
        session: 'after_hours',
        isOpen: false,
        nextOpenTime: nextOpen,
        message: '已收盘'
    };
}

/**
 * Check if current time is within active trading hours or close to them
 * Used to determine if we should poll for high-frequency updates
 */
export function shouldPollMarketData(): boolean {
    const status = getMarketStatus();
    // Poll during trading, pre-market, and shortly after close (to get closing price)
    // Also poll during noon break but maybe less frequently (handled by caller)
    return status.session === 'trading' || status.session === 'pre_market' || status.session === 'noon_break';
}

/**
 * Get recommended polling interval in milliseconds
 */
export function getRecommendedPollingInterval(): number {
    const status = getMarketStatus();

    switch (status.session) {
        case 'trading':
        case 'pre_market':
            return 3000; // 3 seconds - Active trading
        case 'noon_break':
            return 60000; // 1 minute - Just check for market open
        case 'weekend':
        case 'closed':
        case 'after_hours':
            return 0; // Stop polling
        default:
            return 10000;
    }
}
