/**
 * Fund Assistant Pro - WebSocket Hook
 * 
 * 实时数据推送 (估值、行情)
 */

import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
    onMessage?: (data: any) => void;
    onError?: (error: Event) => void;
    onClose?: () => void;
    reconnect?: boolean;
    reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
    const {
        onMessage,
        onError,
        onClose,
        reconnect = true,
        reconnectInterval = 3000,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<any>(undefined);

    useEffect(() => {
        // Use a flag to prevent reconnects on unmount
        let isMounted = true;

        const connect = () => {
            if (!isMounted) return;

            try {
                const ws = new WebSocket(url);

                ws.onopen = () => {
                    if (!isMounted) {
                        ws.close();
                        return;
                    }
                    console.log('[WebSocket] Connected:', url);
                    setIsConnected(true);
                };

                ws.onmessage = (event) => {
                    if (!isMounted) return;
                    try {
                        const data = JSON.parse(event.data);
                        setLastMessage(data);
                        onMessage?.(data);
                    } catch (err) {
                        console.error('[WebSocket] Parse error:', err);
                    }
                };

                ws.onerror = (error) => {
                    if (!isMounted) return;
                    console.error('[WebSocket] Error:', error);
                    onError?.(error);
                };

                ws.onclose = () => {
                    if (!isMounted) return;
                    console.log('[WebSocket] Disconnected');
                    setIsConnected(false);
                    onClose?.();

                    if (reconnect) {
                        // clear old timeout
                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current);
                        }
                        reconnectTimeoutRef.current = setTimeout(() => {
                            connect();
                        }, reconnectInterval);
                    }
                };

                wsRef.current = ws;
            } catch (err) {
                console.error('[WebSocket] Connection failed:', err);
                if (reconnect && isMounted) {
                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                }
            }
        };

        connect();

        return () => {
            isMounted = false;
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                if (wsRef.current.readyState === WebSocket.OPEN) {
                    wsRef.current.close();
                }
            }
        };
    }, [url, reconnect, reconnectInterval]);

    const sendMessage = (data: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        } else {
            console.warn('[WebSocket] Not connected, cannot send message');
        }
    };

    return {
        isConnected,
        lastMessage,
        sendMessage,
    };
}
