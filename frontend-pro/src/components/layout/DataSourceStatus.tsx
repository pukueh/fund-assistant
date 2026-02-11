/**
 * Data Source Status Component
 * P2 Feature: Display data source health status in footer
 * Shows: Data source name + status (Operational/Degraded/Error)
 */

import { useEffect, useState } from 'react';
import { Database, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface DataSourceHealth {
    overall_status: string;
    active_checks: {
        [key: string]: {
            status: string;
            sample_data?: boolean;
            message?: string;
        };
    };
    preferred_source?: string;
    fallback_source?: string;
}

export function DataSourceStatus() {
    const [health, setHealth] = useState<DataSourceHealth | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const response = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/health/datasource`
                );
                if (response.ok) {
                    const data = await response.json();
                    setHealth(data);
                }
            } catch (err) {
                console.error('Failed to fetch data source health:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHealth();
        // Refresh every 60 seconds
        const interval = setInterval(fetchHealth, 60000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ok':
                return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
            case 'degraded':
                return <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />;
            default:
                return <XCircle className="w-3.5 h-3.5 text-red-400" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'ok':
                return 'Operational';
            case 'degraded':
                return 'Degraded';
            default:
                return 'Error';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ok':
                return 'text-green-400';
            case 'degraded':
                return 'text-yellow-400';
            default:
                return 'text-red-400';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <Database className="w-3.5 h-3.5" />
                <span>检查数据源状态...</span>
            </div>
        );
    }

    const primarySource = health?.preferred_source || 'eastmoney';
    const primaryStatus = health?.active_checks?.[primarySource]?.status || 'unknown';

    return (
        <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-400">Data Source:</span>
                <span className="text-gray-300 capitalize">{primarySource} API</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-400">Status:</span>
                <span className={`flex items-center gap-1 ${getStatusColor(primaryStatus)}`}>
                    {getStatusIcon(primaryStatus)}
                    {getStatusText(primaryStatus)}
                </span>
            </div>

            {health?.fallback_source && health.active_checks?.[health.fallback_source]?.status === 'ok' && (
                <span className="text-gray-600">
                    (Fallback: {health.fallback_source} ready)
                </span>
            )}
        </div>
    );
}

export default DataSourceStatus;
