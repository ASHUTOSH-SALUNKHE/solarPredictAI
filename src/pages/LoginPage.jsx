import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { verifyCaptcha } from '../services/api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const turnstileRef = useRef();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImmediateVerify = async (token) => {
    setIsLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const result = await verifyCaptcha(token);
      setIsVerified(true);
      setRegistrationToken(result.registrationToken);
      setStatus({
        type: 'success',
        message: 'Captcha Verified! You can now proceed to login.'
      });
      console.log('Login Captcha Verification Result:', result);
    } catch (error) {
      setIsVerified(false);
      setRegistrationToken(null);
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

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      let currentToken = registrationToken;

      if (!isVerified || !currentToken) {
        const result = await verifyCaptcha(captchaToken);
        setIsVerified(true);
        setRegistrationToken(result.registrationToken);
        currentToken = result.registrationToken;
      }

      const result = await login(formData.email, formData.password, currentToken);

      setStatus({
        type: 'success',
        message: result.message || 'Logged in successfully! Redirecting...'
      });

      const origin = location.state?.from?.pathname || '/dashboard';
      
      setTimeout(() => {
        navigate(origin, { replace: true });
      }, 1500);

    } catch (error) {
      setStatus({
        type: 'error',
        message: error.message || 'Login failed. Please try again.'
      });
      setIsVerified(false);
      setRegistrationToken(null);
      setCaptchaToken(null);
      if (turnstileRef.current) {
        turnstileRef.current.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-container" id="main-content">
      <Helmet>
        <title>Sign In | SolarPredict AI</title>
        <meta name="description" content="Sign in to your SolarPredict AI account. Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy." />
        <link rel="canonical" href="https://solarpredictai.xyz/login" />
        {/* JSON-LD Structured Data for Breadcrumbs */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              "itemListElement": [
                {
                  "@type": "ListItem",
                  "position": 1,
                  "name": "Home",
                  "item": "https://solarpredictai.xyz/"
                },
                {
                  "@type": "ListItem",
                  "position": 2,
                  "name": "Login",
                  "item": "https://solarpredictai.xyz/login"
                }
              ]
            }
          `}
        </script>
      </Helmet>
      
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
                title="Enter your registered email address"
                aria-label="Email Address"
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
                title="Enter your password"
                aria-label="Password"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textDecoration: 'none', transition: 'color 0.2s' }} onMouseEnter={(e) => e.target.style.color = '#fff'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                Forgot Password?
              </Link>
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
            title="Sign in to your account"
            aria-label="Sign In"
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
    </main>
  );
};

export default LoginPage;
