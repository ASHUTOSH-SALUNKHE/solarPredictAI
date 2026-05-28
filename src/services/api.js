import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7070',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Helper to extract descriptive error messages from backend responses.
 */
const extractErrorMessage = (error, defaultMsg) => {
  if (error.response?.data) {
    const data = error.response.data;
    if (typeof data === 'string') {
      return data;
    } else if (typeof data === 'object') {
      if (data.message && data.message !== 'Internal Server Error') {
        return data.message;
      }
      if (data.error && data.error !== 'Internal Server Error') {
        return data.error;
      }
      return data.message || data.error || defaultMsg;
    }
  }
  return error.message || defaultMsg;
};

/**
 * Sends the Turnstile captcha token to the backend for verification.
 * Backend expects: POST /api/auth/captcha/verify with JSON body { captchaToken: <token> }
 * @param {string} captchaToken - The token returned by Turnstile's onSuccess callback
 * @returns {Promise<{status: string, registrationToken: string}>}
 */
export const verifyCaptcha = async (captchaToken) => {
  try {
    const url = '/api/auth/captcha/verify';
    console.log(`[API Request] POST ${url}`, { captchaToken });
    const response = await api.post(url, { captchaToken });
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/captcha/verify failed:`, error);
    const msg = extractErrorMessage(error, 'Verification failed');
    throw new Error(msg, { cause: error });
  }
};

/**
 * Registers a new user.
 * Backend expects: POST /api/auth/register with RegisterUserDto
 * @param {Object} userData - User registration data
 * @param {string} userData.fullName - Full name of the user
 * @param {string} userData.email - Email address of the user
 * @param {string} userData.password - Password of the user
 * @param {string} userData.registrationToken - Registration token received from captcha verification
 * @returns {Promise<{status: string, message: string}>}
 */
export const registerUser = async (userData) => {
  try {
    const url = '/api/auth/register';
    console.log(`[API Request] POST ${url}`, { ...userData, password: userData.password ? '[REDACTED]' : undefined });
    const response = await api.post(url, userData);
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/register failed:`, error);
    const msg = extractErrorMessage(error, 'Registration failed');
    throw new Error(msg, { cause: error });
  }
};

/**
 * Verifies the OTP code for registration.
 * Backend expects: POST /api/auth/verify-otp with JSON body { email, otp }
 * @param {string} email - User email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{status: string, message: string}>}
 */
export const verifyOtp = async (email, otp) => {
  try {
    const url = '/api/auth/verify-otp';
    console.log(`[API Request] POST ${url}`, { email, otp });
    const response = await api.post(url, { email, otp });
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/verify-otp failed:`, error);
    const msg = extractErrorMessage(error, 'OTP verification failed');
    throw new Error(msg, { cause: error });
  }
};

// ==========================================
// IN-MEMORY TOKEN MANAGEMENT & INTERCEPTORS
// ==========================================

// This holds the token entirely in memory. It resets on page reload.
let currentAccessToken = null;

export const setAccessToken = (token) => {
  currentAccessToken = token;
};

export const getAccessToken = () => currentAccessToken;

// Request interceptor to add Authorization header
api.interceptors.request.use(
  (config) => {
    if (currentAccessToken) {
      config.headers['Authorization'] = `Bearer ${currentAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh Lock State
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token expiration and automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if the error is 401 (Unauthorized) and not from the refresh request itself
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url?.includes('/api/auth/refresh')
    ) {
      
      if (isRefreshing) {
        // If a refresh is already in progress, suspend this request
        // and push it to the queue.
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
        .then((token) => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('[Auth] 401 received. Locking and attempting silent refresh...');
        const refreshUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:7070') + '/api/auth/refresh';
        
        // Use a generic axios instance (not 'api') to avoid getting caught in the interceptor loop
        const response = await axios.post(refreshUrl, {}, { withCredentials: true });
        
        const { accessToken } = response.data;
        setAccessToken(accessToken);
        
        console.log('[Auth] Token refresh successful. Unlocking and processing queue.');
        
        // Update header for current request
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        
        // Resolve all queued requests with the new token
        processQueue(null, accessToken);
        
        // Retry the original request
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('[Auth] Token refresh failed. Flushing queue.', refreshError);
        processQueue(refreshError, null);
        
        // If the error is 429 (Too Many Requests), do not force a logout.
        // The user session is still valid, they just need to wait.
        if (refreshError.response?.status !== 429) {
          setAccessToken(null);
          // Dispatch a custom event to tell the AuthContext to log out
          window.dispatchEvent(new Event('auth:logout'));
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Pass through any other errors (e.g. 403, 500)
    return Promise.reject(error);
  }
);

/**
 * Resends the OTP verification code.
 * Backend expects: POST /api/auth/resend-otp with JSON body { email }
 * @param {string} email - User email address
 * @returns {Promise<{status: string, message: string}>}
 */
export const resendOtp = async (email) => {
  try {
    const url = '/api/auth/resend-otp';
    console.log(`[API Request] POST ${url}`, { email });
    const response = await api.post(url, { email });
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/resend-otp failed:`, error);
    const msg = extractErrorMessage(error, 'Failed to resend verification code');
    throw new Error(msg, { cause: error });
  }
};

/**
 * Log in a user.
 * Backend expects: POST /api/auth/login with LoginUserDto
 * @param {Object} credentials - User credentials
 * @param {string} credentials.email - Email address
 * @param {string} credentials.password - Password
 * @param {string} credentials.registrationToken - The captcha verification token
 * @returns {Promise<{status: string, message: string}>}
 */
export const loginUser = async (credentials) => {
  try {
    const url = '/api/auth/login';
    console.log(`[API Request] POST ${url}`, { ...credentials, password: credentials.password ? '[REDACTED]' : undefined });
    const response = await api.post(url, credentials);
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/login failed:`, error);
    const msg = extractErrorMessage(error, 'Login failed');
    throw new Error(msg, { cause: error });
  }
};

/**
 * Request password reset.
 * Backend expects: POST /api/auth/forgot-password with ForgetPasswordDto
 * @param {Object} resetData - Reset request data
 * @param {string} resetData.email - Email address
 * @param {string} resetData.password - New password
 * @param {string} resetData.registrationToken - Turnstile verification token
 * @returns {Promise<{status: string, message: string}>}
 */
export const requestPasswordReset = async (resetData) => {
  try {
    const url = '/api/auth/forgot-password';
    console.log(`[API Request] POST ${url}`, { ...resetData, password: resetData.password ? '[REDACTED]' : undefined });
    const response = await api.post(url, resetData);
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/forgot-password failed:`, error);
    const msg = extractErrorMessage(error, 'Password reset request failed');
    throw new Error(msg, { cause: error });
  }
};

/**
 * Verify OTP for password reset.
 * Backend expects: POST /api/auth/forgot-password/verify-otp with OtpVerifyRequestDto
 * @param {string} email - Email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{status: string, message: string}>}
 */
export const verifyPasswordResetOtp = async (email, otp) => {
  try {
    const url = '/api/auth/forgot-password/verify-otp';
    console.log(`[API Request] POST ${url}`, { email, otp });
    const response = await api.post(url, { email, otp });
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/forgot-password/verify-otp failed:`, error);
    const msg = extractErrorMessage(error, 'OTP verification failed');
    throw new Error(msg, { cause: error });
  }
};

/**
 * Resend OTP for password reset.
 * Backend expects: POST /api/auth/forgot-password/resend-otp with { email }
 * @param {string} email - Email address
 * @returns {Promise<{status: string, message: string}>}
 */
export const resendPasswordResetOtp = async (email) => {
  try {
    const url = '/api/auth/forgot-password/resend-otp';
    console.log(`[API Request] POST ${url}`, { email });
    const response = await api.post(url, { email });
    console.log(`[API Response] POST ${url} success:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`[API Error] POST /api/auth/forgot-password/resend-otp failed:`, error);
    const msg = extractErrorMessage(error, 'Failed to resend reset code');
    throw new Error(msg, { cause: error });
  }
};

export default api;
