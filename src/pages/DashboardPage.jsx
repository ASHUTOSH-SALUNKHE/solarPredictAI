import { useState, useEffect } from 'react';
import { Sun, LayoutDashboard, Compass, Settings, History, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PredictionWizard from '../components/PredictionWizard';
import FinalReportView from '../components/FinalReportView';
import { resetPredictionProgress, getStep1Data, getStep2Data } from '../services/predictionService';

import GreetingHeader from '../components/dashboard/GreetingHeader';
import StatCard from '../components/dashboard/StatCard';
import ForecastChart from '../components/dashboard/ForecastChart';
import QuickPredictPanel from '../components/dashboard/QuickPredictPanel';
import WeatherDataView from '../components/dashboard/WeatherDataView';
import SitingDataView from '../components/dashboard/SitingDataView';

import '../styles/dashboard.css';
import '../styles/predictionWizard.css';

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [historySubTab, setHistorySubTab] = useState('weather');
  const [settingsSubTab, setSettingsSubTab] = useState('health');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { logout, isAuthenticated, userId } = useAuth();

  // Data States
  const [credits, setCredits] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportMetadata, setReportMetadata] = useState(null);
  
  // Weather / Stats (mocked for visual effect until API hooks up completely)
  const [weatherData] = useState({ tempC: 24, condition: 'Sunny', uvIndex: 6 });
  const [stats] = useState({
    todayYield: '14.8',
    peakSun: '5.4',
    efficiency: '98.2',
    co2Offset: '124'
  });

  // Forecast Mock Data (based on the requirements)
  const forecastData = [
    { date: 'Mon', predictedKwh: 42, irradiance: 85, cloudCover: 10 },
    { date: 'Tue', predictedKwh: 38, irradiance: 60, cloudCover: 35 },
    { date: 'Wed', predictedKwh: 45, irradiance: 90, cloudCover: 5 },
    { date: 'Thu', predictedKwh: 20, irradiance: 30, cloudCover: 80 },
    { date: 'Fri', predictedKwh: 35, irradiance: 55, cloudCover: 40 },
    { date: 'Sat', predictedKwh: 48, irradiance: 95, cloudCover: 0 },
    { date: 'Sun', predictedKwh: 44, irradiance: 88, cloudCover: 15 },
  ];

  const fetchCredits = async () => {
    try {
      const response = await api.get('/api/user/credits');
      const newCredits = response.data.credits;
      setCredits(newCredits);
      localStorage.setItem('user_credits_cache', JSON.stringify({
        credits: newCredits,
        fetchedAt: Date.now()
      }));
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const initCredits = async () => {
      const cached = localStorage.getItem('user_credits_cache');
      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          if (parsedCache && parsedCache.credits !== undefined) {
            setCredits(parsedCache.credits);
            
            const isOlderThan5Mins = Date.now() - parsedCache.fetchedAt > 5 * 60 * 1000;
            if (isOlderThan5Mins) {
              fetchCredits();
            }
          } else {
            fetchCredits();
          }
        } catch (e) {
          fetchCredits();
        }
      } else {
        fetchCredits();
      }
    };
    initCredits();
  }, [isAuthenticated]);

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
    { id: 'predictions', label: 'Predictions', icon: <Compass size={14} /> },
    { id: 'history', label: 'History & Data', icon: <History size={14} /> },
    { id: 'settings', label: 'Settings & Systems', icon: <Settings size={14} /> },
  ];

  const renderOverviewTab = () => (
    <div className="animate-enter">
      <GreetingHeader 
        userName={userId ? "User" : "Guest"} 
        location="Nashik" 
        weatherData={weatherData} 
      />

      <div className="metrics-grid">
        <StatCard 
          label="Today's Yield (kWh)" 
          value={stats.todayYield} 
          subtext="↑ 5.4% from yesterday" 
          animationDelay="0ms" 
        />
        <StatCard 
          label="Peak Sun Hours" 
          value={stats.peakSun} 
          subtext="Optimal generation window" 
          isAccent={true} 
          animationDelay="80ms" 
        />
        <StatCard 
          label="Efficiency Score (%)" 
          value={stats.efficiency} 
          subtext="System performing nominally" 
          animationDelay="160ms" 
        />
        <StatCard 
          label="CO₂ Offset (kg)" 
          value={stats.co2Offset} 
          subtext="Equivalent to 5 trees planted" 
          animationDelay="240ms" 
        />
      </div>

      <div className="main-content-grid">
        <ForecastChart data={forecastData} />
        <QuickPredictPanel 
          location="Nashik, India"
          irradiance={82}
          cloudCover={12}
          onRunPrediction={() => setActiveTab('predictions')}
        />
      </div>
    </div>
  );

  const renderPredictionsTab = () => {
    if (reportData) {
      return (
        <FinalReportView 
          reportData={reportData} 
          reportMetadata={reportMetadata} 
          onNewReport={async () => {
            try {
              await resetPredictionProgress(userId);
              setReportData(null);
              setReportMetadata(null);
            } catch (e) {
              console.error(e);
            }
          }}
        />
      );
    }

    return (
      <div className="animate-enter">
        <PredictionWizard
          userId={userId}
          credits={credits !== null ? (typeof credits === 'object' ? credits.balance : credits) : null}
          onPredictionComplete={(data, meta) => {
            setReportData(data);
            setReportMetadata(meta);
          }}
          onResetParent={() => {
            setReportData(null);
            setReportMetadata(null);
          }}
          refreshCredits={fetchCredits}
        />
      </div>
    );
  };

  const renderPlaceholderTab = (title) => (
    <div className="empty-state-wrapper animate-enter">
      <div className="empty-state-card" style={{ padding: '48px', textAlign: 'center', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '16px', maxWidth: '500px', margin: '40px auto' }}>
        <div className="empty-state-icon-box" style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--db-amber-light)', color: 'var(--db-accent-warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Sun size={32} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--db-text-primary)' }}>{title}</h2>
        <p style={{ color: 'var(--db-text-secondary)' }}>This module is being updated for the Morning Garden theme.</p>
        <button className="btn-secondary" style={{ marginTop: '20px', padding: '10px 20px', background: '#fff', border: '1px solid var(--db-border)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="animate-enter">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--db-border)', paddingBottom: '16px' }}>
        <button 
          className={`nav-pill ${historySubTab === 'weather' ? 'active' : ''}`}
          onClick={() => setHistorySubTab('weather')}
          style={{ background: historySubTab === 'weather' ? '#fff' : 'transparent', border: historySubTab === 'weather' ? '1px solid var(--db-border)' : '1px solid transparent', boxShadow: historySubTab === 'weather' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none' }}
        >
          Weather Data
        </button>
        <button 
          className={`nav-pill ${historySubTab === 'siting' ? 'active' : ''}`}
          onClick={() => setHistorySubTab('siting')}
          style={{ background: historySubTab === 'siting' ? '#fff' : 'transparent', border: historySubTab === 'siting' ? '1px solid var(--db-border)' : '1px solid transparent', boxShadow: historySubTab === 'siting' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none' }}
        >
          Location & Siting
        </button>
        <button 
          className={`nav-pill ${historySubTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setHistorySubTab('analytics')}
          style={{ background: historySubTab === 'analytics' ? '#fff' : 'transparent', border: historySubTab === 'analytics' ? '1px solid var(--db-border)' : '1px solid transparent', boxShadow: historySubTab === 'analytics' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none' }}
        >
          Analytics Engine
        </button>
      </div>
      {historySubTab === 'weather' && <WeatherDataView userId={userId} />}
      {historySubTab === 'siting' && <SitingDataView userId={userId} />}
      {historySubTab === 'analytics' && renderPlaceholderTab('Solar Analytics Engine')}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="animate-enter">
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--db-border)', paddingBottom: '16px' }}>
        <button 
          className={`nav-pill ${settingsSubTab === 'health' ? 'active' : ''}`}
          onClick={() => setSettingsSubTab('health')}
          style={{ background: settingsSubTab === 'health' ? '#fff' : 'transparent', border: settingsSubTab === 'health' ? '1px solid var(--db-border)' : '1px solid transparent', boxShadow: settingsSubTab === 'health' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none' }}
        >
          System Health
        </button>
        <button 
          className={`nav-pill ${settingsSubTab === 'farm' ? 'active' : ''}`}
          onClick={() => setSettingsSubTab('farm')}
          style={{ background: settingsSubTab === 'farm' ? '#fff' : 'transparent', border: settingsSubTab === 'farm' ? '1px solid var(--db-border)' : '1px solid transparent', boxShadow: settingsSubTab === 'farm' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none' }}
        >
          Farm Management
        </button>
        <button 
          className={`nav-pill ${settingsSubTab === 'control' ? 'active' : ''}`}
          onClick={() => setSettingsSubTab('control')}
          style={{ background: settingsSubTab === 'control' ? '#fff' : 'transparent', border: settingsSubTab === 'control' ? '1px solid var(--db-border)' : '1px solid transparent', boxShadow: settingsSubTab === 'control' ? '0 2px 8px rgba(0,0,0,0.02)' : 'none' }}
        >
          Control Panel
        </button>
      </div>
      {settingsSubTab === 'health' && renderPlaceholderTab('System Health & Diagnostics')}
      {settingsSubTab === 'farm' && renderPlaceholderTab('Photovoltaic Array Manager')}
      {settingsSubTab === 'control' && renderPlaceholderTab('Control Panel Settings')}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'predictions': return renderPredictionsTab();
      case 'history': return renderHistoryTab();
      case 'settings': return renderSettingsTab();
      default: return renderOverviewTab();
    }
  };

  return (
    <div className="dashboard-container">
      {/* 1. TOP NAVIGATION BAR */}
      <nav className="top-nav-bar">
        <div className="nav-brand">
          <div className="nav-logo-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/logo.png" alt="SolarPredict AI Logo" style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
            solar<span className="nav-logo-accent">predict</span>ai
          </div>
        </div>

        <div className="nav-pills-container">
          <div className="nav-pills">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`nav-pill ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="nav-right-actions">
          <div className="nav-user" style={{ position: 'relative' }}>
            {/* Mock Avatar */}
            <div 
              className="user-avatar" 
              title="User Profile"
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsMobileMenuOpen(false);
              }}
              style={{ cursor: 'pointer' }}
            >
              US
            </div>
            
            {isProfileMenuOpen && (
              <div 
                className="glass-card animate-enter" 
                style={{ 
                  position: 'absolute', 
                  top: '48px', 
                  right: '0', 
                  width: '240px', 
                  padding: '16px', 
                  zIndex: 100, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  background: 'rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ borderBottom: '1px solid var(--db-border)', paddingBottom: '12px' }}>
                  <div style={{ fontWeight: '600', color: 'var(--db-text-primary)' }}>User Account</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)', wordBreak: 'break-all' }}>
                    ID: {userId || 'Guest'}
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--db-text-secondary)' }}>Credits Available:</span>
                  <span style={{ fontWeight: '600', color: 'var(--db-accent-warm)' }}>{credits !== null ? (typeof credits === 'object' ? credits.balance : credits) : '-'}</span>
                </div>
                
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  style={{ 
                    marginTop: '8px',
                    width: '100%', 
                    padding: '8px', 
                    background: 'rgba(239, 68, 68, 0.05)', 
                    color: '#ef4444', 
                    border: '1px solid rgba(239, 68, 68, 0.2)', 
                    borderRadius: '6px', 
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {showLogoutConfirm && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
            }}>
              <div style={{
                background: '#fff', borderRadius: '16px',
                padding: '28px', maxWidth: '420px', width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--db-border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                    background: 'rgba(239,68,68,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: '1.4rem' }}>🚪</span>
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--db-text-primary)' }}>
                      Confirm Sign Out
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--db-text-secondary)', lineHeight: '1.4' }}>
                      Are you sure you want to sign out of your account? You will need to log in again to access your dashboard.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                  <button
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--db-border)',
                      background: 'transparent', color: 'var(--db-text-secondary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem'
                    }}
                    onClick={() => setShowLogoutConfirm(false)}
                  >Cancel</button>
                  <button
                    style={{
                      flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                      background: '#ef4444', color: '#fff', cursor: 'pointer',
                      fontWeight: '600', fontSize: '0.85rem'
                    }}
                    onClick={() => {
                      setShowLogoutConfirm(false);
                      logout();
                    }}
                  >Sign Out</button>
                </div>
              </div>
            </div>
          )}

          <button 
            className="mobile-menu-toggle"
            onClick={() => {
              setIsMobileMenuOpen(!isMobileMenuOpen);
              setIsProfileMenuOpen(false);
            }}
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="mobile-menu-overlay animate-enter">
          <div className="mobile-menu-pills">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`mobile-nav-pill ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="dashboard-main">
        {renderTabContent()}
      </main>
    </div>
  );
};

export default DashboardPage;
