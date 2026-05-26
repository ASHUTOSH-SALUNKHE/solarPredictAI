import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { verifyCaptcha } from '../services/api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const turnstileRef = useRef();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImmediateVerify = async (token) => {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const result = await verifyCaptcha(token);
      setIsVerified(true);
      setStatus({ 
        type: 'success', 
        message: 'Captcha Verified! You can now proceed to login.' 
      });
      console.log('Login Captcha Verification Result:', result);
    } catch (error) {
      setIsVerified(false);
      setStatus({ 
        type: 'error', 
        message: error.message || 'Captcha verification failed. Please try again.' 
      });
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!captchaToken) {
      setStatus({ type: 'error', message: 'Please complete the captcha verification.' });
      return;
    }

    if (isVerified) {
      setStatus({ 
        type: 'success', 
        message: 'Logged in successfully! (Captcha already verified on backend)' 
      });
      return;
    }

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Reusing the same captcha verify endpoint as specified in requirements
      const result = await verifyCaptcha(captchaToken);
      setIsVerified(true);
      setStatus({ 
        type: 'success', 
        message: 'Captcha Verified! You can now proceed to login.' 
      });
      console.log('Login Captcha Verification Result:', result);
    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.message || 'Captcha verification failed. Please try again.' 
      });
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Please enter your details to sign in</p>
        </div>

        <AnimatePresence mode="wait">
          {status.message && (
            <motion.div 
              className={status.type === 'error' ? 'error-message' : 'success-message'}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {status.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
              {status.message}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                placeholder="name@company.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="captcha-container">
            <Turnstile
              ref={turnstileRef}
              siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              onSuccess={async (token) => {
                setCaptchaToken(token);
                setStatus({ type: '', message: '' });
                await handleImmediateVerify(token);
              }}
              onExpire={() => {
                setCaptchaToken(null);
                setIsVerified(false);
              }}
              onError={() => {
                setCaptchaToken(null);
                setIsVerified(false);
                setStatus({ type: 'error', message: 'Turnstile verification failed. Please try again.' });
              }}
              options={{ 
                theme: 'dark',
                appearance: 'always'
              }}
            />
          </div>

          <button 
            type="submit" 
            className="submit-btn"
            disabled={isLoading || !captchaToken}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <Loader2 className="animate-spin" size={20} /> Verifying...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Sign Up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
