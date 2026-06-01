import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Search, HelpCircle, CloudSun, Target } from 'lucide-react';
import '../styles/home.css';

// CountUp Helper Component for Stats Animation
const CountUp = ({ end, duration = 2000, prefix = '', suffix = '', format = true }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const startTime = performance.now();

    const updateCount = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      
      // Easing function (easeOutQuad)
      const easeProgress = progress * (2 - progress);
      const current = Math.floor(easeProgress * end);
      
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
      }
    };

    requestAnimationFrame(updateCount);
  }, [hasStarted, end, duration]);

  const formatNumber = (num) => {
    if (!format) return num.toString();
    return num.toLocaleString();
  };

  return (
    <span ref={elementRef}>
      {prefix}
      {formatNumber(count)}
      {suffix}
    </span>
  );
};

const HomePage = () => {
  const videoRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);

  // Steps data representing the AI Workflow
  const steps = [
    {
      number: '01',
      title: 'Enter Location',
      description: 'Enter your custom geographic coordinates or address to query local atmospheric data and solar potential.',
      icon: <Search size={16} />
    },
    {
      number: '02',
      title: 'Submit Facility Specs',
      description: 'Complete a brief 30+ question assessment outlining system requirements, load patterns, and energy consumption.',
      icon: <HelpCircle size={16} />
    },
    {
      number: '03',
      title: 'Fetch Real-time Weather',
      description: 'Our pipeline queries advanced weather forecast models and live solar irradiance feeds from local stations.',
      icon: <CloudSun size={16} />
    },
    {
      number: '04',
      title: 'Nitro Engine Inference',
      description: 'The neural engine processes the variables, predicting power outputs and load curves with nearly 99% accuracy.',
      icon: <Target size={16} />
    },
  ];

  // Automate step cycling (cycle every 6s)
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [steps.length]);

  // Restrict playback to the first 15 seconds of the video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // If the video plays past 15 seconds, loop it back to start
      if (video.currentTime >= 15) {
        video.currentTime = 0;
        video.play().catch(err => {
          // Ignore play promise rejection which occurs if user hasn't interacted yet
          console.warn("Video loop play interrupted:", err);
        });
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // Framer Motion Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  // Render reactive contents in the right column HUD deck
  const renderHUDWidget = () => {
    switch (activeStep) {
      case 0:
        return (
          <motion.div 
            key="location"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="location-input-hud"
          >
            <div className="hud-search-box">
              <span style={{ color: '#6366f1', animation: 'pulse-glow 1.5s infinite' }}>●</span>
              <span>Oakland, California, USA</span>
            </div>
            <div className="hud-coord-grid">
              <div className="hud-coord-item">
                <div className="hud-coord-label">Latitude</div>
                <div className="hud-coord-val">37.8044° N</div>
              </div>
              <div className="hud-coord-item">
                <div className="hud-coord-label">Longitude</div>
                <div className="hud-coord-val">122.2712° W</div>
              </div>
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            key="questionnaire"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="hud-questionnaire-list"
          >
            <div className="hud-question-row">
              <span className="hud-question-label">System Load Profile</span>
              <span className="hud-question-val">18.5 kW</span>
            </div>
            <div className="hud-question-row">
              <span className="hud-question-label">Avg Consumption</span>
              <span className="hud-question-val">520 kWh/mo</span>
            </div>
            <div className="hud-question-row">
              <span className="hud-question-label">Facility Specs Input</span>
              <span className="hud-question-val">32 / 32 Done</span>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            key="weather"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="hud-weather-telemetry"
          >
            <div className="hud-weather-grid">
              <div className="hud-weather-item">
                <div className="hud-weather-icon" style={{ fontSize: '14px', marginBottom: '4px' }}>☀</div>
                <div className="hud-weather-val">840 W/m²</div>
              </div>
              <div className="hud-weather-item">
                <div className="hud-weather-icon" style={{ fontSize: '14px', marginBottom: '4px' }}>☁</div>
                <div className="hud-weather-val">12% Cover</div>
              </div>
              <div className="hud-weather-item">
                <div className="hud-weather-icon" style={{ fontSize: '14px', marginBottom: '4px' }}>💨</div>
                <div className="hud-weather-val">12 km/h</div>
              </div>
            </div>
            <div className="hud-weather-api-status">
              <span style={{ color: '#4ade80' }}>●</span> API Stream: Connected (OK)
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            key="prediction"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="hud-prediction-report"
          >
            <span className="hud-nitro-badge">NITRO ENGINE MODEL V4</span>
            <div className="hud-accuracy-percent">99.2%</div>
            <div className="hud-accuracy-sub">Solar Generation Accuracy Rate</div>
            <div className="hud-progress-track">
              <motion.div 
                className="hud-progress-fill" 
                initial={{ width: '0%' }}
                animate={{ width: '99.2%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const progressHeight = (activeStep / (steps.length - 1)) * 100;

  return (
    <>
      <div className="hero-section">
        {/* Background Video */}
        <div className="hero-video-wrapper">
          <video
            ref={videoRef}
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            src="/NAI Home Page - Oakland California Skyline.mp4#t=0,15"
          />
          <div className="hero-overlay"></div>
        </div>

        {/* Main Hero Content - Minimal & Cinematic */}
        <motion.div 
          className="hero-content"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Clean, Massive Hero Title */}
          <motion.h1 className="hero-headline" variants={itemVariants}>
            Predict the Future of Solar.
          </motion.h1>

          {/* Minimal Subtitle */}
          <motion.p className="hero-subtitle" variants={itemVariants}>
            Harness advanced machine learning and real-time atmospheric data to optimize your grid operations with unmatched precision.
          </motion.p>

          {/* Elegant CTA Buttons */}
          <motion.div className="hero-actions" variants={itemVariants}>
            <Link to="/register" className="btn-primary-clean">
              Get Started
            </Link>
            <a href="#features" className="btn-secondary-clean">
              <Play size={16} fill="currentColor" />
              Watch Demo
            </a>
          </motion.div>
        </motion.div>

        {/* Elegant Scroll Indicator */}
        <motion.div 
          className="scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          onClick={() => {
            window.scrollTo({
              top: window.innerHeight,
              behavior: 'smooth'
            });
          }}
        >
          <div className="scroll-line-container">
            <div className="scroll-line"></div>
          </div>
        </motion.div>
      </div>

      {/* Stats Section with Counting Animations */}
      <section className="stats-section" id="features">
        <div className="stats-container">
          {/* Main Stat Card */}
          <div className="main-stat-wrapper">
            <h2 className="main-stat-value">
              <span className="stat-prefix">$</span>
              <CountUp end={491031426} />
            </h2>
            <div className="main-stat-label">in Energy Savings Enabled</div>
          </div>

          {/* Sub Stats Grid (3 columns) */}
          <div className="sub-stats-grid">
            {/* Stat 1: MW Monitored */}
            <div className="sub-stat-card">
              <h3 className="sub-stat-value">
                <CountUp end={70841} />
                <span className="stat-unit">MW+</span>
              </h3>
              <div className="sub-stat-label">Active Capacity Monitored</div>
            </div>

            {/* Stat 2: MWh Predicted */}
            <div className="sub-stat-card">
              <h3 className="sub-stat-value">
                <CountUp end={181914} />
                <span className="stat-unit">MWh+</span>
              </h3>
              <div className="sub-stat-label">Clean Energy Predicted</div>
            </div>

            {/* Stat 3: Tons CO2 Offset */}
            <div className="sub-stat-card">
              <h3 className="sub-stat-value">
                <CountUp end={301420} />
                <span className="stat-unit">Tons+</span>
              </h3>
              <div className="sub-stat-label">CO₂ Offset Enabled</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="how-it-works-container">
          {/* Left Side Timeline */}
          <div className="how-it-works-left">
            <span className="section-tag">AI Pipeline Workflow</span>
            <h2 className="section-title">How SolarPredict AI Works</h2>

            <div className="stepper-container">
              {/* Stepper Guide Line */}
              <div className="stepper-line">
                <div 
                  className="stepper-progress-fill" 
                  style={{ height: `${progressHeight}%` }}
                />
              </div>

              {/* Step Items */}
              {steps.map((step, idx) => (
                <div 
                  key={idx}
                  className={`step-item ${activeStep === idx ? 'active' : ''}`}
                  onClick={() => setActiveStep(idx)}
                >
                  <div className="step-indicator">
                    <div className="step-indicator-dot"></div>
                  </div>
                  <div className="step-header">
                    <span className="step-number">{step.number}</span>
                    <h3 className="step-title">{step.title}</h3>
                  </div>
                  <p className="step-description">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side HUD Panel with Fully Visible Image and Split Details Card */}
          <div className="how-it-works-right">
            <div className="hud-deck">
              {/* Top: Image, fully visible and unblurred */}
              <div className="hud-image-wrapper">
                <img src="/solar_house.webp" alt="Solar House" className="hud-solar-image" />
              </div>
              
              {/* Bottom: Dynamic telemetry widget */}
              <div className="hud-content-panel-split">
                <div className="hud-header-split">
                  <div className="hud-title-wrapper">
                    <div className="hud-status-dot"></div>
                    <span className="hud-system-title-split">Model Diagnostics</span>
                  </div>
                  <span className="hud-model-ver-split">SYS_V4.0.2</span>
                </div>

                <div className="hud-body-split">
                  <AnimatePresence mode="wait">
                    {renderHUDWidget()}
                  </AnimatePresence>
                </div>

                <div className="hud-footer">
                  <span className="hud-footer-status">SYSTEM STATE: ACTIVE</span>
                  <span className="hud-footer-badge">
                    Step {activeStep + 1} of 4
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="partners-section">
        <div className="partners-container">
          {/* Left Column */}
          <div className="partners-left">
            <h2 className="partners-title">Our global partner network</h2>
            <Link to="/register" className="partners-btn-wrapper">
              <div className="partners-btn-circle">→</div>
              <div className="partners-btn-pill">Get involved</div>
            </Link>
          </div>

          {/* Right Column (Staggered Grid) */}
          <div className="partners-right">
            <div className="partners-grid">
              {/* Column 1 */}
              <div className="partners-column partners-col-1">
                <div className="partner-card partner-card-mint"></div>
                <div className="partner-card partner-card-cream">
                  <div className="partner-logo-container">
                    <div className="partner-logo-graphic" style={{ border: '2px solid #123832', borderRadius: '8px', padding: '10px', marginBottom: '4px' }}>
                      <Search size={26} strokeWidth={2} />
                    </div>
                    <span className="partner-logo-name">Helios Grid</span>
                  </div>
                </div>
                <div className="partner-card partner-card-gradient-2"></div>
              </div>

              {/* Column 2 */}
              <div className="partners-column partners-col-2">
                <div className="partner-card partner-card-slate"></div>
                <div className="partner-card partner-card-cream">
                  <div className="partner-logo-container">
                    <div className="partner-logo-name" style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '0.05em' }}>
                      SG
                    </div>
                    <div style={{ width: '24px', height: '2px', backgroundColor: '#123832', margin: '6px 0' }} />
                    <span className="partner-logo-name" style={{ fontSize: '0.65rem', fontWeight: 600 }}>SolarGrid Labs</span>
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="partners-column partners-col-3">
                <div className="partner-card partner-card-gradient-1"></div>
                <div className="partner-card partner-card-cream">
                  <div className="partner-logo-container">
                    <div className="partner-logo-graphic" style={{ marginBottom: '4px' }}>
                      <Target size={36} strokeWidth={1.5} />
                    </div>
                    <span className="partner-logo-name">Apex Climate</span>
                  </div>
                </div>
                <div className="partner-card partner-card-mint"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HomePage;
