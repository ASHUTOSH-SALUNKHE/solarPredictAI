import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Search, HelpCircle, CloudSun, Target, ChevronLeft, ChevronRight, Zap, Activity, Compass, Database } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../context/AuthContext';
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
  const { isAuthenticated } = useAuth();
  const videoRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeFeedbackIndex, setActiveFeedbackIndex] = useState(0);

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

  const faqData = [
    {
      question: "What is a solar panel prediction AI, and how does it work?",
      answer: "A solar panel prediction AI uses machine learning algorithms (like our Nitro Engine) to analyze historical weather patterns, real-time solar irradiance, and panel specifications to forecast solar energy generation for any location."
    },
    {
      question: "How accurate is SolarPredict AI's forecasting engine?",
      answer: "Our Nitro Engine achieves a 99.2% accuracy rate in solar energy output prediction by pulling real-time weather telemetries and simulating local irradiance curves."
    },
    {
      question: "Why is a solar panel prediction model essential for grid operations?",
      answer: "A solar panel prediction model helps utility operators and homeowners balance energy grids, optimize battery storage, and reduce operational waste by anticipating peak generation times."
    },
    {
      question: "Can I use SolarPredict AI for residential solar setups?",
      answer: "Yes. SolarPredict AI scales from large utility farms to residential solar systems. By entering your panel specs and geographical coordinates, you get a custom solar generation forecast."
    }
  ];

  return (
    <main id="main-content">
      <Helmet>
        <title>Solar Panel Prediction AI & Output Forecasting | SolarPredict AI</title>
        <meta name="description" content="Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy using SolarPredict AI." />
        <meta name="keywords" content="solar panel prediction ai, solar panel required for house, solar cost calculator, solar maintenance estimate, solar output prediction, solar forecasting, smart grid optimization, photovoltaic prediction software" />
        <link rel="canonical" href="https://solarpredictai.xyz/" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://solarpredictai.xyz/" />
        <meta property="og:title" content="Solar Panel Prediction AI & Output Forecasting | SolarPredict AI" />
        <meta property="og:description" content="Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy using SolarPredict AI." />
        <meta property="og:image" content="https://solarpredictai.xyz/solar_house.webp" />
        <meta property="og:site_name" content="SolarPredict AI" />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://solarpredictai.xyz/" />
        <meta property="twitter:title" content="Solar Panel Prediction AI & Output Forecasting | SolarPredict AI" />
        <meta property="twitter:description" content="Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy using SolarPredict AI." />
        <meta property="twitter:image" content="https://solarpredictai.xyz/solar_house.webp" />
        <meta property="twitter:image:alt" content="Solar prediction AI forecasting software interface" />
        
        <link rel="alternate" hreflang="en" href="https://solarpredictai.xyz/" />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://solarpredictai.xyz/#website",
                  "url": "https://solarpredictai.xyz/",
                  "name": "SolarPredict AI",
                  "description": "Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy.",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://solarpredictai.xyz/search?q={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": "https://solarpredictai.xyz/#organization",
                  "name": "SolarPredict AI",
                  "url": "https://solarpredictai.xyz/",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://solarpredictai.xyz/logo.png"
                  }
                },
                {
                  "@type": "FAQPage",
                  "@id": "https://solarpredictai.xyz/#faq",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "What is a solar panel prediction AI, and how does it work?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "A solar panel prediction AI uses advanced machine learning algorithms (like our Nitro Engine) to analyze weather forecasts, local atmospheric conditions, and panel specifications to forecast solar energy generation for any location."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How accurate is SolarPredict AI's forecasting engine?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Our Nitro Engine achieves a 99.2% accuracy rate in solar energy output prediction by pulling real-time weather telemetries and simulating local irradiance curves."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Why is a solar panel prediction model essential for grid operations?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "A solar panel prediction model helps utility operators and homeowners balance energy grids, optimize battery storage, and reduce operational waste by anticipating peak generation times."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "Can I use SolarPredict AI for residential solar setups?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes. SolarPredict AI scales from large utility farms to residential solar systems. By entering your panel specs and geographical coordinates, you get a custom solar generation forecast."
                      }
                    }
                  ]
                }
              ]
            }
          `}
        </script>
      </Helmet>

      <section className="hero-section" aria-label="Hero">
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
            Solar Panel Prediction AI.
          </motion.h1>

          {/* Minimal Subtitle */}
          <motion.p className="hero-subtitle" variants={itemVariants}>
            Harness the power of our advanced neural model to predict solar panel energy generation, forecast irradiance, and optimize grid performance with 99% accuracy.
          </motion.p>

          {/* Elegant CTA Buttons */}
          <motion.div className="hero-actions" variants={itemVariants}>
            <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn-primary-clean">
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
      </section>

      {/* Stats Section with Counting Animations */}
      <section className="stats-section" id="features" aria-label="Key Statistics">
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
                <img src="/solar_house.webp" alt="Solar powered home with AI prediction interface overlay" className="hud-solar-image" loading="lazy" width="800" height="450" />
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

      {/* Provided Services Section */}
      <section className="services-section" aria-label="Our Provided Services">
        <div className="services-container">
          <span className="section-tag">Platform Offerings</span>
          <h2 className="section-title" style={{ marginBottom: '24px' }}>Provided Services</h2>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '600px', marginBottom: '40px', lineHeight: '1.6' }}>
            We provide state-of-the-art predictive algorithms and live telemetry streams to orchestrate solar array operations with unmatched precision.
          </p>
          
          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon-box">
                <CloudSun size={24} />
              </div>
              <h3 className="service-title">Solar Yield Forecasting</h3>
              <p className="service-desc">
                High-resolution forecasting models projecting solar outputs hours and days in advance, integrating localized historical climate profiles.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon-box">
                <Zap size={24} />
              </div>
              <h3 className="service-title">Grid Balance Telemetry</h3>
              <p className="service-desc">
                Seamless APIs to stream and balance load patterns, mitigating solar intermittency and optimizing grid efficiency.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon-box">
                <Database size={24} />
              </div>
              <h3 className="service-title">Historical Climatology</h3>
              <p className="service-desc">
                Access over 5 years of historical Direct Normal Irradiance (DNI) and Global Horizontal Irradiance (GHI) databases.
              </p>
            </div>
            
            <div className="service-card">
              <div className="service-icon-box">
                <Activity size={24} />
              </div>
              <h3 className="service-title">Battery Storage Timing</h3>
              <p className="service-desc">
                Intelligent charge and discharge dispatch scheduling aligned with solar peak times, avoiding expensive utility surcharges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Client Feedback Section (Styled after user's reference photo) */}
      <section className="feedback-section" aria-label="Client Feedback">
        <div className="feedback-container">
          <div className="feedback-header-row">
            <div>
              <span className="section-tag">Operational Impact</span>
              <h2 className="feedback-section-title">Client Success &amp; Feedback</h2>
            </div>
            <Link to="/register" className="feedback-btn">
              Explore Case Studies →
            </Link>
          </div>
          
          <div className="feedback-cards-grid">
            {/* Custom Carousel Navigation Overlays */}
            <button 
              className="feedback-arrow-btn left" 
              onClick={() => setActiveFeedbackIndex(prev => (prev === 0 ? 2 : prev - 1))}
              aria-label="Previous slide"
            >
              <ChevronLeft size={36} />
            </button>
            
            <button 
              className="feedback-arrow-btn right" 
              onClick={() => setActiveFeedbackIndex(prev => (prev === 2 ? 0 : prev + 1))}
              aria-label="Next slide"
            >
              <ChevronRight size={36} />
            </button>

            {/* Testimonial Cards */}
            {[
              {
                image: "/solar_client_res.png",
                title: "1001 Solaris Way, Dubai",
                location: "Dubai Marina, UAE",
                quote: "“Optimized our home battery storage efficiency by 24% using the Nitro Engine's solar forecasting. The setup was seamless.”",
                client: "Aisha Al-Mansoori, Residential Owner"
              },
              {
                image: "/solar_client_com.png",
                title: "Helios Commercial Tower, Pune",
                location: "Magarpatta City, Pune",
                quote: "“Integrating the SolarPredict API reduced our building's grid dependency, saving over $18,000 in Year 1 utility expenses.”",
                client: "Rajesh Sharma, Facility Manager"
              },
              {
                image: "/solar_client_agri.png",
                title: "Apex Agri-Grid Farm, Sydney",
                location: "Hunter Valley, Australia",
                quote: "“Accurate solar elevation mapping helped us coordinate heavy irrigation pumps with peak generation periods.”",
                client: "Marcus Vance, Agricultural Director"
              }
            ].map((item, idx) => {
              const isVisible = idx === activeFeedbackIndex;
              return (
                <div 
                  key={idx} 
                  className={`feedback-item-card ${isVisible ? 'active-slide' : 'inactive-slide'}`}
                >
                  <div className="feedback-image-wrapper">
                    <img src={item.image} alt={item.title} className="feedback-img" loading="lazy" />
                  </div>
                  <div className="feedback-info">
                    <h3 className="feedback-asset-title">{item.title}</h3>
                    <p className="feedback-location">{item.location}</p>
                    <blockquote className="feedback-quote">{item.quote}</blockquote>
                    <span className="feedback-client-name">{item.client}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Pagination Indicators */}
          <div className="feedback-dots">
            {[0, 1, 2].map((i) => (
              <button 
                key={i} 
                className={`feedback-dot ${activeFeedbackIndex === i ? 'active' : ''}`}
                onClick={() => setActiveFeedbackIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="partners-section" aria-label="Partner Network">
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
                    <div className="partner-logo-graphic partner-helios-icon">
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
                    <div className="partner-sg-text">
                      SG
                    </div>
                    <div className="partner-sg-line" />
                    <span className="partner-logo-name partner-sg-label">SolarGrid Labs</span>
                  </div>
                </div>
              </div>

              {/* Column 3 */}
              <div className="partners-column partners-col-3">
                <div className="partner-card partner-card-gradient-1"></div>
                <div className="partner-card partner-card-cream">
                  <div className="partner-logo-container">
                    <div className="partner-logo-graphic partner-apex-icon">
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

      {/* Interactive FAQ Section */}
      <section className="faq-section" aria-label="Frequently Asked Questions">
        <div className="faq-container">
          <span className="section-tag">Answering Your Questions</span>
          <h2 className="section-title">Solar Panel Prediction AI FAQ</h2>
          
          <div className="faq-list">
            {faqData.map((faq, index) => {
              const isOpen = activeFaq === index;
              return (
                <article 
                  key={index} 
                  className={`faq-item glass-card ${isOpen ? 'active' : ''}`}
                >
                  <button 
                    className="faq-question-btn"
                    onClick={() => setActiveFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                    title={faq.question}
                  >
                    <span className="faq-question-text">{faq.question}</span>
                    <span className={`faq-icon-indicator ${isOpen ? 'open' : ''}`}>+</span>
                  </button>
                  <div 
                    id={`faq-answer-${index}`} 
                    className="faq-answer-wrapper"
                    aria-hidden={!isOpen}
                    style={{ 
                      maxHeight: isOpen ? '200px' : '0',
                      opacity: isOpen ? 1 : 0,
                      visibility: isOpen ? 'visible' : 'hidden'
                    }}
                  >
                    <p className="faq-answer-text">{faq.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Premium Footer Section */}
      <footer className="global-footer" aria-label="Site Footer">
        <div className="footer-container">
          <div className="footer-grid">
            {/* Branding Column */}
            <div className="footer-brand-col">
              <Link to="/" className="nav-brand" title="SolarPredict AI Home">
                <div className="brand-icon-wrapper">
                  <CloudSun size={20} />
                </div>
                <div className="brand-text-container">
                  <span className="brand-text">SolarPredict AI</span>
                  <span className="brand-subtext">Powered By NitroX</span>
                </div>
              </Link>
              <p className="footer-brand-desc">
                Leading the transition to smart, highly-predictive renewable energy grids through neural network analytics.
              </p>
            </div>

            {/* Quick Links Column */}
            <div className="footer-links-col">
              <h3 className="footer-col-title">Platform</h3>
              <ul className="footer-links-list">
                <li><Link to="/login" title="Sign In to Platform">Sign In</Link></li>
                <li><Link to={isAuthenticated ? "/dashboard" : "/register"} title="Sign Up for Platform">Get Started</Link></li>
                <li><a href="#features" title="Learn Platform Features">Features</a></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="footer-links-col">
              <h3 className="footer-col-title">Resources</h3>
              <ul className="footer-links-list">
                <li><a href="https://solarpredictai.xyz/sitemap.xml" target="_blank" rel="noopener noreferrer" title="View XML Sitemap">Sitemap</a></li>
                <li><a href="/robots.txt" target="_blank" rel="noopener noreferrer" title="View Crawler Directives">Robots.txt</a></li>
                <li><a href="#" title="Privacy Policy">Privacy Policy</a></li>
              </ul>
            </div>

            {/* Contact Column */}
            <div className="footer-links-col">
              <h3 className="footer-col-title">Contact</h3>
              <ul className="footer-links-list">
                <li><span className="footer-contact-item">support@solarpredictai.xyz</span></li>
                <li><span className="footer-contact-item">Oakland, California, USA</span></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copyright">
              © {new Date().getFullYear()} SolarPredict AI. All rights reserved.
            </span>
            <span className="footer-tagline">
              Empowering solar efficiency globally.
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default HomePage;
