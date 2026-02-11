import { useEffect, useState, useRef } from 'react';

/**
 * Hook to trigger a flash animation when a value changes.
 * Returns a CSS class string to apply to the element.
 * 
 * @param value The numeric value to monitor
 * @param format 'color' (text color) or 'bg' (background color)
 * @returns CSS class string with animation
 */
export function useFlashUpdate(value: number, format: 'text' | 'bg' = 'text') {
    const [flashClass, setFlashClass] = useState('');
    const prevValueRef = useRef(value);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (prevValueRef.current !== value) {
            const isUp = value > prevValueRef.current;

            // Clear previous timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Set flash class based on direction and format
            // China market: Red = Up, Green = Down
            if (format === 'bg') {
                setFlashClass(isUp ? 'animate-flash-red-bg' : 'animate-flash-green-bg');
            } else {
                setFlashClass(isUp ? 'animate-flash-red-text' : 'animate-flash-green-text');
            }

            // Update ref
            prevValueRef.current = value;

            // Remove class after animation
            timeoutRef.current = setTimeout(() => {
                setFlashClass('');
            }, 1000);
        }
    }, [value, format]);

    return flashClass;
}
