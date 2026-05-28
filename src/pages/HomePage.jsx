import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, BarChart3, ShieldCheck, Cpu } from 'lucide-react';
import '../styles/home.css';

const HomePage = () => {
  const videoRef = useRef(null);

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

  const badgeVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  return (
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
  );
};

export default HomePage;
