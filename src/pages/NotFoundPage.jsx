import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import '../styles/home.css';

const NotFoundPage = () => {
  return (
    <main className="hero-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column' }}>
      <Helmet>
        <title>Page Not Found | SolarPredict AI</title>
        <meta name="description" content="Page not found. Return to SolarPredict AI. Predict how many solar panels are required for your house, estimate installation and maintenance costs, get a detailed report, and forecast output with 99% accuracy." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      
      <div className="hero-content" style={{ textAlign: 'center', zIndex: 1 }}>
        <h1 className="hero-headline" style={{ fontSize: '4rem', marginBottom: '1rem' }}>404 - Not Found</h1>
        <p className="hero-subtitle" style={{ marginBottom: '2rem' }}>
          The coordinates for this page could not be resolved. 
          Please return to the main hub.
        </p>
        <div className="hero-actions" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn-primary-clean" title="Return to Home Page">
            Return Home
          </Link>
          <Link to="/login" className="btn-secondary-clean" title="Go to Login">
            <Search size={16} fill="currentColor" />
            Sign In
          </Link>
        </div>
      </div>
      
      {/* Background styling for 404 to match theme */}
      <div className="hero-overlay" style={{ background: 'radial-gradient(circle at center, #0a1916 0%, #000000 100%)', opacity: 0.9 }}></div>
    </main>
  );
};

export default NotFoundPage;
