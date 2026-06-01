import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useAuth();

  // Monitor scroll height to apply sticky/shrink styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Close mobile drawer when changing route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <nav className={`navbar glass-effect ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Brand/Logo */}
        <Link to="/" className="nav-brand">
          <div className="brand-icon-wrapper">
            <Sun size={20} className="brand-icon" />
          </div>
          <span className="brand-text">SolarPredict AI</span>
        </Link>

        {/* Desktop Navigation Links */}
        <ul className="nav-menu">
          <li>
            <Link to="/#features" className="nav-link">Features</Link>
          </li>
          <li>
            <Link to="/#live-map" className="nav-link">Live Map</Link>
          </li>
          <li>
            <Link to="/#predictions" className="nav-link">Predictions</Link>
          </li>
          <li>
            <Link to="/#pricing" className="nav-link">Pricing</Link>
          </li>
          <li>
            <Link to="/#about" className="nav-link">About Us</Link>
          </li>
        </ul>

        {/* Desktop CTA Action Buttons */}
        <div className="nav-actions">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="btn-signin">
                Dashboard
              </Link>
              <button 
                onClick={() => { logout(); navigate('/'); }} 
                className="btn-signup" 
                style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-signin">
                Sign In
              </Link>
              <Link to="/register" className="btn-signup">
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button 
          className="hamburger" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      <div className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`}>
        <ul className="mobile-menu-links">
          <li>
            <Link to="/#features" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              Features
            </Link>
          </li>
          <li>
            <Link to="/#live-map" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              Live Map
            </Link>
          </li>
          <li>
            <Link to="/#predictions" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              Predictions
            </Link>
          </li>
          <li>
            <Link to="/#pricing" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              Pricing
            </Link>
          </li>
          <li>
            <Link to="/#about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>
              About Us
            </Link>
          </li>
        </ul>
        <div className="mobile-nav-actions">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="mobile-btn-signin" onClick={() => setIsMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <button 
                onClick={() => { logout(); navigate('/'); setIsMobileMenuOpen(false); }} 
                className="mobile-btn-signup"
                style={{ border: 'none', cursor: 'pointer', width: '100%', fontFamily: 'inherit', fontSize: 'inherit' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="mobile-btn-signin" onClick={() => setIsMobileMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="mobile-btn-signup" onClick={() => setIsMobileMenuOpen(false)}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
