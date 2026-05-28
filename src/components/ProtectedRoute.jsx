import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, isRateLimited, rateLimitMessage, attemptSilentRefresh } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const location = useLocation();

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError('');
    try {
      await attemptSilentRefresh();
    } catch (err) {
      setRetryError(err.response?.data?.message || 'Still rate limited. Please wait a bit longer.');
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    // Elegant minimal loading state while the silent refresh check occurs
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (isRateLimited) {
    // Beautiful, user-friendly rate limit error page
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-md rounded-2xl p-8 border border-gray-700/50 shadow-2xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/20">
            <ShieldAlert size={36} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Slow Down a Bit</h2>
            <p className="text-gray-400 text-sm">
              {rateLimitMessage || "Too many authentication requests in a short period."}
            </p>
          </div>

          {retryError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
              {retryError}
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className={isRetrying ? "animate-spin" : ""} size={18} />
              {isRetrying ? "Retrying..." : "Try Again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Pass the current location in state so we can bounce them back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
