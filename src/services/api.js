import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7070',
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

export default api;
