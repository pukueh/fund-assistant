
import React from 'react';

export interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'gain' | 'loss';
    size?: 'sm' | 'md';
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'sm',
    className = ''
}) => {
    const variants = {
        default: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
        success: 'bg-green-500/10 text-green-500 border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        error: 'bg-red-500/10 text-red-500 border-red-500/20',
        info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        gain: 'bg-gain/10 text-gain border-red-500/20',
        loss: 'bg-loss/10 text-loss border-green-500/20',
        outline: 'bg-transparent text-gray-400 border-gray-500/20'
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-sm'
    };

    return (
        <span className={`inline-flex items-center rounded-full border font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
            {children}
        </span>
    );
};
