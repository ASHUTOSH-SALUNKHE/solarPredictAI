import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { verifyCaptcha, registerUser, verifyOtp, resendOtp } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const turnstileRef = useRef();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // OTP Step States
  const [step, setStep] = useState('register'); // 'register' or 'otp'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [expiryTimer, setExpiryTimer] = useState(300); // 5 minutes
  const [resendTimer, setResendTimer] = useState(60); // 1 minute
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setExpiryTimer(300);
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setExpiryTimer((prevExpiry) => {
        if (prevExpiry <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prevExpiry - 1;
      });
      setResendTimer((prevResend) => {
        if (prevResend <= 1) {
          return 0;
        }
        return prevResend - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (step === 'otp' && otpRefs.current[0]) {
      setTimeout(() => {
        otpRefs.current[0].focus();
      }, 200);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'otp' && expiryTimer === 0) {
      setStatus({
        type: 'error',
        message: 'Your verification code has expired. Please click "Resend Code" to request a new one.'
      });
    }
  }, [expiryTimer, step]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
        message: `Captcha Verified! You can now complete registration.` 
      });
      console.log('Registration Token:', result.registrationToken);
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

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      let currentToken = registrationToken;
      
      // If not verified or token missing, verify it first
      if (!isVerified || !currentToken) {
        const result = await verifyCaptcha(captchaToken);
        setIsVerified(true);
        setRegistrationToken(result.registrationToken);
        currentToken = result.registrationToken;
        console.log('Registration Token (from submit verify):', result.registrationToken);
      }

      // Submit user details along with the registration token to backend register endpoint
      const result = await registerUser({
        fullName: formData.name,
        email: formData.email,
        password: formData.password,
        registrationToken: currentToken
      });

      setStatus({ 
        type: 'success', 
        message: result.message || 'Registration successful! An OTP verification code has been sent to your email.'
      });

      // Transition to OTP step and start countdown
      setTimeout(() => {
        setStep('otp');
        setStatus({ type: '', message: '' });
        startTimer();
      }, 1500);

    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.message || 'Registration failed. Please try again.' 
      });
      // Reset captcha if verification was the step that failed
      if (!isVerified && turnstileRef.current) {
        turnstileRef.current.reset();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Handling Functions
  const handleOtpChange = (element, index) => {
    const value = element.value;
    if (isNaN(value)) return; // Allow numbers only

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1); // Keep only the last character entered
    setOtp(newOtp);

    // Focus next input if value is entered
    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (!otp[index] && index > 0) {
        // Focus previous input and clear it
        otpRefs.current[index - 1].focus();
        newOtp[index - 1] = '';
      } else {
        // Clear current input
        newOtp[index] = '';
      }
      setOtp(newOtp);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const pasteOtp = pasteData.split('');
      setOtp(pasteOtp);
      otpRefs.current[5].focus(); // Focus last field after pasting
    }
  };

  const handleOtpVerifySubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setStatus({ type: 'error', message: 'Please enter a 6-digit OTP.' });
      return;
    }

    if (expiryTimer === 0) {
      setStatus({ type: 'error', message: 'OTP has expired. Please resend the code.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const result = await verifyOtp(formData.email, otpCode);
      setStatus({ 
        type: 'success', 
        message: result.message || 'Verification successful! Your account is verified.' 
      });
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
      if (error.message && error.message.includes('Registration session expired')) {
        setStatus({
          type: 'error',
          message: 'Your registration session has expired. Please fill out the form and verify again.'
        });
        setStep('register');
        setIsVerified(false);
        setRegistrationToken(null);
        setCaptchaToken(null);
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
      } else {
        setStatus({ 
          type: 'error', 
          message: error.message || 'OTP verification failed. Please try again.' 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setStatus({ type: '', message: '' });
    setOtp(['', '', '', '', '', '']);
    
    try {
      const result = await resendOtp(formData.email);
      setStatus({
        type: 'success',
        message: result.message || 'A new OTP verification code has been sent to your email.'
      });
      startTimer();
    } catch (error) {
      if (error.message && (error.message.includes('Registration session expired') || error.message.includes('C1-Please reload'))) {
        setStatus({
          type: 'error',
          message: 'Your registration session has expired. Please complete the captcha verification again.'
        });
        setStep('register');
        setIsVerified(false);
        setRegistrationToken(null);
        setCaptchaToken(null);
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
      } else {
        setStatus({
          type: 'error',
          message: error.message || 'Failed to resend verification code. Please try again.'
        });
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="auth-container" id="main-content">
      <Helmet>
        <title>Create Account | SolarPredict AI</title>
        <meta name="description" content="Register for SolarPredict AI. Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy." />
        <link rel="canonical" href="https://solarpredictai.xyz/register" />
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
                  "name": "Register",
                  "item": "https://solarpredictai.xyz/register"
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
          <h1>{step === 'register' ? 'Create Account' : 'Verify Email'}</h1>
          <p>
            {step === 'register' 
              ? 'Join us today and start your journey' 
              : `Enter the 6-digit verification code sent to ${formData.email}`}
          </p>
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

        <AnimatePresence mode="wait">
          {step === 'register' ? (
            <motion.form 
              key="register-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    title="Enter your full name"
                    aria-label="Full Name"
                  />
                </div>
              </div>

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
                    title="Enter a valid email address"
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
                    title="Choose a secure password"
                    aria-label="Password"
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
                    setRegistrationToken(null);
                  }}
                  onError={() => {
                    setCaptchaToken(null);
                    setIsVerified(false);
                    setRegistrationToken(null);
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
                title="Create your account"
                aria-label="Sign Up"
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={20} /> Verifying...
                  </span>
                ) : 'Sign Up'}
              </button>

              <div className="auth-footer">
                <p>
                  Already have an account? <Link to="/login">Sign In</Link>
                </p>
              </div>
            </motion.form>
          ) : (
            <motion.form 
              key="otp-form"
              onSubmit={handleOtpVerifySubmit}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="otp-container" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    className="otp-input"
                    value={digit}
                    ref={(el) => (otpRefs.current[index] = el)}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    required
                  />
                ))}
              </div>

              <div className="timer-container">
                <div className="timer-text">
                  <ShieldCheck size={16} />
                  <span>Expires in: {formatTime(expiryTimer)}</span>
                </div>
                <button
                  type="button"
                  className={`resend-btn ${expiryTimer === 0 ? 'highlight-pulse' : ''}`}
                  onClick={handleResend}
                  disabled={resendTimer > 0 || resendLoading}
                >
                  {resendLoading ? 'Sending...' : resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading || expiryTimer === 0}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={20} /> Verifying...
                  </span>
                ) : 'Verify & Create Account'}
              </button>

              <button 
                type="button" 
                className="submit-btn"
                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', marginTop: '12px' }}
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setStep('register');
                  setStatus({ type: '', message: '' });
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ArrowLeft size={16} /> Back to Register
                </span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
};

export default RegisterPage;
