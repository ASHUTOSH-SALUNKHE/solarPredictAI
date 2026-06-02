import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Turnstile } from '@marsidev/react-turnstile';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Loader2, ArrowLeft, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { verifyCaptcha, requestPasswordReset, verifyPasswordResetOtp, resendPasswordResetOtp } from '../services/api';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [isVerified, setIsVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const turnstileRef = useRef();

  // OTP Step States
  const [step, setStep] = useState('request'); // 'request' or 'otp'
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
        message: `Captcha Verified! You can now request a password reset.` 
      });
      console.log('Forgot Password Captcha Token:', result.registrationToken);
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

    if (formData.password !== formData.confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (formData.password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters long.' });
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

      const result = await requestPasswordReset({
        email: formData.email,
        password: formData.password,
        registrationToken: currentToken
      });

      setStatus({ 
        type: 'success', 
        message: result.message || 'Verification code has been sent to your email.'
      });

      setTimeout(() => {
        setStep('otp');
        setStatus({ type: '', message: '' });
        startTimer();
      }, 1500);

    } catch (error) {
      setStatus({ 
        type: 'error', 
        message: error.message || 'Request failed. Please try again.' 
      });
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
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1].focus();
        newOtp[index - 1] = '';
      } else {
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
      otpRefs.current[5].focus();
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
      const result = await verifyPasswordResetOtp(formData.email, otpCode);
      setStatus({ 
        type: 'success', 
        message: result.message || 'Password reset successful! Redirecting to login...' 
      });
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (error) {
      if (error.message && error.message.includes('expired')) {
        setStatus({
          type: 'error',
          message: 'Your reset session has expired. Please verify captcha and request again.'
        });
        setStep('request');
        setIsVerified(false);
        setRegistrationToken(null);
        setCaptchaToken(null);
        if (turnstileRef.current) {
          turnstileRef.current.reset();
        }
      } else {
        setStatus({ 
          type: 'error', 
          message: error.message || 'Verification failed. Please check the code and try again.' 
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
      const result = await resendPasswordResetOtp(formData.email);
      setStatus({
        type: 'success',
        message: result.message || 'A new verification code has been sent to your email.'
      });
      startTimer();
    } catch (error) {
      if (error.message && error.message.includes('expired')) {
        setStatus({
          type: 'error',
          message: 'Your reset session has expired. Please verify captcha and request again.'
        });
        setStep('request');
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
        <title>Forgot Password | SolarPredict AI</title>
        <meta name="description" content="Reset your password for SolarPredict AI." />
        <link rel="canonical" href="https://solarpredictai.xyz/forgot-password" />
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
                  "name": "Forgot Password",
                  "item": "https://solarpredictai.xyz/forgot-password"
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
          <h1>{step === 'request' ? 'Reset Password' : 'Verify Identity'}</h1>
          <p>
            {step === 'request' 
              ? 'Enter your email and a new password' 
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
          {step === 'request' ? (
            <motion.form 
              key="request-form"
              onSubmit={handleSubmit}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
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
                <label htmlFor="password">New Password</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    title="Enter your new password"
                    aria-label="New Password"
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <div className="input-wrapper" style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    title="Confirm your new password"
                    aria-label="Confirm New Password"
                  />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
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
                title="Send verification code"
                aria-label="Send Verification Code"
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="animate-spin" size={20} /> Requesting...
                  </span>
                ) : 'Send Verification Code'}
              </button>

              <div className="auth-footer">
                <p>
                  Remember your password? <Link to="/login">Sign In</Link>
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
                ) : 'Verify & Reset Password'}
              </button>

              <button 
                type="button" 
                className="submit-btn"
                style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', marginTop: '12px' }}
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  setStep('request');
                  setStatus({ type: '', message: '' });
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <ArrowLeft size={16} /> Back
                </span>
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
};

export default ForgotPasswordPage;
