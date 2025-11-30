import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, logout as apiLogout, isAuthenticated } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is authenticated on mount
        if (isAuthenticated()) {
            loadUser();
        } else {
            setLoading(false);
        }
    }, []);

    const loadUser = async () => {
        try {
            const profile = await getProfile();
            setUser(profile);
        } catch (error) {
            console.error('Failed to load user:', error);
            apiLogout();
        } finally {
            setLoading(false);
        }
    };

    const login = (userData) => {
        setUser(userData);
    };

    const logout = () => {
        apiLogout();
        setUser(null);
    };

    const isPremium = () => {
        return user && user.subscriptionTier !== 'free';
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isPremium,
        refreshUser: loadUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
