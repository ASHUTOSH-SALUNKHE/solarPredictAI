import { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');

  const attemptSilentRefresh = async () => {
    try {
      console.log('[AuthContext] Attempting silent refresh...');
      const refreshUrl = '/api/auth/refresh';
      
      const response = await api.post(refreshUrl, {}, { withCredentials: true });
      
      const { accessToken, userId: newUserId } = response.data;
      if (accessToken) {
        setAccessToken(accessToken);
        setUserId(newUserId);
        setIsAuthenticated(true);
        setIsRateLimited(false);
        setRateLimitMessage('');
        console.log('[AuthContext] Silent refresh succeeded. Session restored.');
        return true;
      }
      setIsAuthenticated(false);
      return false;
    } catch (error) {
      if (error?.response?.status === 429) {
        setIsRateLimited(true);
        const msg = error.response.data?.message || 'Too many requests. Please wait a moment.';
        setRateLimitMessage(msg);
        console.warn('[AuthContext] Silent refresh rate limited (429). Preserved auth state.');
        throw error;
      } else {
        setIsAuthenticated(false);
        setIsRateLimited(false);
        setRateLimitMessage('');
        console.warn('[AuthContext] Silent refresh failed or no session found. Marking as logged out.', error?.response?.data || error.message);
        throw error;
      }
    }
  };

  // Silent refresh on app load
  useEffect(() => {
    const initAuth = async () => {
      try {
        await attemptSilentRefresh();
      } catch (error) {
        // Error is logged and handled inside attemptSilentRefresh
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for the custom logout event triggered by the Axios interceptor
    const handleForceLogout = () => {
      console.warn('[AuthContext] Force logout event received.');
      setUserId(null);
      setIsAuthenticated(false);
      setIsRateLimited(false);
      setRateLimitMessage('');
    };

    window.addEventListener('auth:logout', handleForceLogout);
    return () => {
      window.removeEventListener('auth:logout', handleForceLogout);
    };
  }, []);

  const login = async (email, password, registrationToken) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
        registrationToken
      });
      
      const { accessToken, userId: newUserId } = response.data;
      
      if (accessToken) {
        setAccessToken(accessToken);
        setUserId(newUserId);
        setIsAuthenticated(true);
        setIsRateLimited(false);
        setRateLimitMessage('');
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.error('Backend logout failed', e);
    } finally {
      // Always clear local state
      setAccessToken(null);
      setUserId(null);
      setIsAuthenticated(false);
      setIsRateLimited(false);
      setRateLimitMessage('');
    }
  };

  const value = {
    isAuthenticated,
    userId,
    isLoading,
    isRateLimited,
    rateLimitMessage,
    login,
    logout,
    attemptSilentRefresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
