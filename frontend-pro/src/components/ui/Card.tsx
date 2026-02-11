
import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    title?: string;
    action?: React.ReactNode;
    noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, title, action, className, noPadding, ...props }) => {
    return (
        <div
            className={`bg-[#12121a]/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-lg ${className || ''}`}
            {...props}
        >
            {(title || action) && (
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    {title && <h3 className="font-bold text-white">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className={noPadding ? '' : 'p-6'}>
                {children}
            </div>
        </div>
    );
};
