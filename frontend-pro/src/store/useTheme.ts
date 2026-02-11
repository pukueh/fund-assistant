/**
 * Fund Assistant Pro - Theme Store
 * 
 * 管理深浅模式切换和隐私模式
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
    theme: 'dark' | 'light';
    toggleTheme: () => void;
    setTheme: (theme: 'dark' | 'light') => void;

    // Privacy Mode
    isPrivacyMode: boolean;
    togglePrivacy: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            theme: 'dark',

            toggleTheme: () => set(() => {
                // Force dark mode
                document.documentElement.classList.add('dark');
                return { theme: 'dark' };
            }),

            setTheme: () => set(() => {
                // Force dark mode
                document.documentElement.classList.add('dark');
                return { theme: 'dark' };
            }),

            // Privacy Mode
            isPrivacyMode: false,
            togglePrivacy: () => set((state) => {
                const newMode = !state.isPrivacyMode;
                // Toggle CSS class on body for global blur effect
                if (newMode) {
                    document.body.classList.add('privacy-mode');
                } else {
                    document.body.classList.remove('privacy-mode');
                }
                return { isPrivacyMode: newMode };
            }),
        }),
        {
            name: 'theme-storage',
        }
    )
);
