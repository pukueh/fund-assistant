
import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className,
    disabled,
    ...props
}) => {
    const variants = {
        primary: 'bg-[#00d4aa] text-black hover:bg-[#00d4aa]/90 border-transparent',
        secondary: 'bg-white/10 text-white hover:bg-white/20 border-transparent',
        outline: 'bg-transparent text-white border-white/20 hover:bg-white/5',
        ghost: 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5 border-transparent',
        danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border-transparent'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            className={`
                inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors border
                disabled:opacity-50 disabled:cursor-not-allowed
                ${variants[variant]}
                ${sizes[size]}
                ${className || ''}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 className="animate-spin" size={size === 'lg' ? 20 : 16} />}
            {!isLoading && leftIcon}
            {children}
            {!isLoading && rightIcon}
        </button>
    );
};
