/**
 * Fund Assistant Pro - Protected Route Component
 * 
 * Ensures that routes are only accessible by authenticated users.
 * Redirects to the login page if not authenticated.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authApi } from '../../api';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const location = useLocation();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check if we have a token locally first
                const token = localStorage.getItem('fund_assistant_token');
                if (!token) {
                    setIsAuthenticated(false);
                    return;
                }

                // Verify with backend (optional but recommended for security)
                await authApi.getProfile();
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Auth check failed:', error);
                setIsAuthenticated(false);
            }
        };

        checkAuth();
    }, []);

    // Show nothing while checking authentication
    if (isAuthenticated === null) {
        return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#00d4aa] border-t-transparent rounded-full animate-spin"></div>
        </div>;
    }

    if (!isAuthenticated) {
        // Redirect to login page, but save the intended location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};
