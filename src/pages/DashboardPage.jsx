import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart, Bar, Line, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import questionsData from '../corequestions.json';
import PredictionWizard from '../components/PredictionWizard';
import { resetPredictionProgress, getStep1Data, getStep2Data } from '../services/predictionService';
import '../styles/predictionWizard.css';
import { 
  Menu, 
  X, 
  TrendingUp, 
  Sun, 
  CloudSun, 
  Sunset, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Settings, 
  HeartPulse, 
  LayoutDashboard, 
  LineChart, 
  FileDown, 
  Compass,
  Zap,
  Grid,
  ArrowLeft,
  Download,
  Sparkles,
  MapPin,
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  Activity,
  ShieldAlert,
  RefreshCw,
  FileText,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import '../styles/dashboard.css';

const formatVal = (val, decimals = 1, fallback = 'N/A') => {
  return val !== null && val !== undefined && !isNaN(val) ? Number(val).toFixed(decimals) : fallback;
};

const DashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [timeString, setTimeString] = useState('');
  
  const [credits, setCredits] = useState(null);
  const navigate = useNavigate();
  const { logout, isAuthenticated, userId } = useAuth();

  // AI Solar Report States
  const [reportData, setReportData] = useState(null);
  const [reportMetadata, setReportMetadata] = useState(null);

  // Siting Data States
  const [sitingData, setSitingData] = useState(null);
  const [isLoadingSiting, setIsLoadingSiting] = useState(false);

  // Weather Data States
  const [weatherCacheData, setWeatherCacheData] = useState(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  useEffect(() => {
    if (activeTab === 'siting' && !sitingData && !isLoadingSiting) {
      const fetchSiting = async () => {
        setIsLoadingSiting(true);
        try {
          const cacheKey = `step1_edit_cache_${userId}`;
          const cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            setSitingData(JSON.parse(cachedStr));
          } else {
            const data = await getStep1Data(userId);
            setSitingData(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        } catch (error) {
          console.error("Failed to fetch siting data:", error);
        } finally {
          setIsLoadingSiting(false);
        }
      };
      fetchSiting();
    }
  }, [activeTab, sitingData, isLoadingSiting, userId]);

  useEffect(() => {
    if (activeTab === 'weather' && !weatherCacheData && !isLoadingWeather) {
      const fetchWeather = async () => {
        setIsLoadingWeather(true);
        try {
          const cacheKey = `step2_data_cache_${userId}`;
          const cachedStr = localStorage.getItem(cacheKey);
          if (cachedStr) {
            setWeatherCacheData(JSON.parse(cachedStr));
          } else {
            const data = await getStep2Data(userId);
            setWeatherCacheData(data);
            localStorage.setItem(cacheKey, JSON.stringify(data));
          }
        } catch (error) {
          console.error("Failed to fetch weather data:", error);
        } finally {
          setIsLoadingWeather(false);
        }
      };
      fetchWeather();
    }
  }, [activeTab, weatherCacheData, isLoadingWeather, userId]);

  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  
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
          if (parsedCache && typeof parsedCache.credits === 'object') {
            localStorage.removeItem('user_credits_cache');
            fetchCredits();
          } else {
            setCredits(parsedCache.credits);
            
            const isOlderThan5Mins = Date.now() - parsedCache.fetchedAt > 5 * 60 * 1000;
            if (isOlderThan5Mins) {
              fetchCredits();
            }
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



  // Real-time fluctuating states to make the dashboard feel alive
  const [totalOutput, setTotalOutput] = useState(14.8);
  const [accuracy, setAccuracy] = useState(98.2);
  const [panelsActive, setPanelsActive] = useState(1420);
  const [showGlow, setShowGlow] = useState(false);

  // Time effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      setTimeString(`${dateStr} | ${timeStr} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Telemetry fluctuation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalOutput(prev => +(prev + (Math.random() * 0.1 - 0.05)).toFixed(2));
      setAccuracy(prev => +(prev + (Math.random() * 0.2 - 0.1)).toFixed(1));
      setPanelsActive(() => Math.random() > 0.85 ? 1419 : 1420);
      
      setShowGlow(true);
      setTimeout(() => setShowGlow(false), 800);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18} /> },
    { id: 'analytics', label: 'Analytics', icon: <LineChart size={18} /> },
    { id: 'predictions', label: 'Predictions', icon: <Compass size={18} /> },
    { id: 'management', label: 'Farm Management', icon: <Grid size={18} /> },
    { id: 'health', label: 'System Health', icon: <HeartPulse size={18} /> },
    { id: 'siting', label: 'Location & Siting Questionnaire', icon: <MapPin size={18} /> },
    { id: 'weather', label: 'Weather Data', icon: <CloudSun size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];



  // ── Tab 1: Overview ────────────────────────────────────────────────────────
  const renderOverviewTab = () => {
    return (
      <>
        {/* Key Metrics Grid */}
        <div className="metrics-grid">
          {/* Card 1: Total Output */}
          <motion.div 
            className="metric-card"
            animate={{ borderColor: showGlow ? 'var(--db-accent)' : 'var(--db-border)' }}
            transition={{ duration: 0.5 }}
          >
            <div className="metric-card-header">
              <span className="metric-title">Total Output</span>
              <div className="trend-badge">
                <TrendingUp size={10} style={{ marginRight: '2px' }} />
                +5.4%
              </div>
            </div>
            <div className="metric-value-container">
              <div className="metric-value highlighted">{totalOutput}</div>
              <span className="metric-unit">GW</span>
            </div>
            <div className="metric-card-icon-back">
              <Zap size={60} />
            </div>
          </motion.div>

          {/* Card 2: Forecast Accuracy */}
          <motion.div 
            className="metric-card"
            animate={{ borderColor: showGlow ? 'var(--db-accent)' : 'var(--db-border)' }}
            transition={{ duration: 0.5 }}
          >
            <div className="metric-card-header">
              <span className="metric-title">Forecast Accuracy</span>
            </div>
            <div className="metric-value-container">
              <div className="metric-value">{accuracy}%</div>
            </div>
            <div className="metric-card-icon-back">
              <Compass size={60} />
            </div>
          </motion.div>

          {/* Card 3: Est. Peak Generation */}
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-title">Est. Peak Generation</span>
            </div>
            <div className="metric-value-container">
              <div className="metric-value">12:45</div>
              <span className="metric-unit">PM</span>
            </div>
            <div className="metric-card-icon-back">
              <Sun size={60} />
            </div>
          </div>

          {/* Card 4: Active Panels */}
          <motion.div 
            className="metric-card"
            animate={{ borderColor: panelsActive < 1420 ? '#ef4444' : 'var(--db-border)' }}
            transition={{ duration: 0.3 }}
          >
            <div className="metric-card-header">
              <span className="metric-title">Active Panel Clusters</span>
            </div>
            <div className="metric-value-container" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="metric-value">{panelsActive}</div>
              <span className="metric-subtitle" style={{ color: panelsActive < 1420 ? '#ef4444' : 'var(--db-success)' }}>
                {panelsActive < 1420 ? '1 Cluster Offline' : 'All Systems Nominal'}
              </span>
            </div>
            <div className="metric-card-icon-back">
              <Grid size={60} />
            </div>
          </motion.div>
        </div>

        {/* Central SVG Line Graph Card */}
        <section className="graph-section">
          <div className="graph-section-header">
            <h2 className="graph-title">Predicted vs Actual Power Generation (24h)</h2>
            <div className="graph-legend">
              <div className="legend-item">
                <div className="legend-color predicted"></div>
                <span className="legend-label">Predicted Model</span>
              </div>
              <div className="legend-item">
                <div className="legend-color actual"></div>
                <span className="legend-label">Actual Telemetry</span>
              </div>
            </div>
          </div>
          
          <div className="chart-wrapper">
            <svg className="svg-chart" viewBox="0 0 1000 300" preserveAspectRatio="none">
              <defs>
                <linearGradient id="solarGradientFill" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="var(--db-accent)" stopOpacity="0.2"></stop>
                  <stop offset="100%" stopColor="var(--db-accent)" stopOpacity="0"></stop>
                </linearGradient>
              </defs>
              
              {/* Horizontal Grid Lines */}
              <line className="chart-grid-line" x1="0" x2="1000" y1="50" y2="50" />
              <line className="chart-grid-line" x1="0" x2="1000" y1="100" y2="100" />
              <line className="chart-grid-line" x1="0" x2="1000" y1="150" y2="150" />
              <line className="chart-grid-line" x1="0" x2="1000" y1="200" y2="200" />
              <line className="chart-grid-line" x1="0" x2="1000" y1="250" y2="250" />

              {/* Area Fill for Predicted */}
              <path 
                className="chart-gradient-fill" 
                d="M 0 250 L 0 200 Q 150 180 250 100 T 500 20 T 750 150 T 1000 220 L 1000 250 Z" 
              />

              {/* Predicted Curve (Yellow Glow) */}
              <path 
                className="chart-path-predicted" 
                d="M 0 200 Q 150 180 250 100 T 500 20 T 750 150 T 1000 220" 
              />

              {/* Actual Curve (White Line - Partial for current time) */}
              <path 
                className="chart-path-actual" 
                d="M 0 195 Q 140 185 240 95 T 480 25" 
              />

              {/* Current Time Indicator Line & Pulse */}
              <line className="chart-indicator-line" x1="480" x2="480" y1="0" y2="250" />
              <circle cx="480" cy="25" r="4" fill="#ffffff" />
              <circle cx="480" cy="25" r="8" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.6">
                <animate attributeName="r" values="4;12;4" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite" />
              </circle>

              {/* Chart labels inside SVG */}
              <text className="chart-axis-text" x="0" y="275">00:00</text>
              <text className="chart-axis-text" x="250" y="275">06:00</text>
              <text className="chart-axis-text" x="500" y="275">12:00 (Current)</text>
              <text className="chart-axis-text" x="750" y="275">18:00</text>
              <text className="chart-axis-text" x="960" y="275">24:00</text>
            </svg>
          </div>
        </section>

        {/* Bottom Information Row */}
        <div className="bottom-grid">
          {/* Weather & Irradiance Module */}
          <div className="data-section-card">
            <div className="card-header-simple">
              <h2>Upcoming Weather &amp; Irradiance</h2>
              <span className="card-header-meta">GRID PREDICTION</span>
            </div>
            <ul className="section-list">
              <li className="list-item-row">
                <div className="row-left-content">
                  <div className="row-icon-wrapper weather-high">
                    <Sun size={20} />
                  </div>
                  <div className="row-details">
                    <h3>13:00 - Sunny Conditions</h3>
                    <p>Expected Irradiance: High (850 W/m²)</p>
                  </div>
                </div>
                <span className="row-status-badge status-optimal">Optimal Output</span>
              </li>

              <li className="list-item-row">
                <div className="row-left-content">
                  <div className="row-icon-wrapper weather-med">
                    <CloudSun size={20} />
                  </div>
                  <div className="row-details">
                    <h3>15:00 - Partial Clouds</h3>
                    <p>Expected Irradiance: Medium (420 W/m²)</p>
                  </div>
                </div>
                <span className="row-status-badge status-nominal">Nominal Output</span>
              </li>

              <li className="list-item-row">
                <div className="row-left-content">
                  <div className="row-icon-wrapper weather-low">
                    <Sunset size={20} />
                  </div>
                  <div className="row-details">
                    <h3>17:00 - Sunset Operations</h3>
                    <p>Expected Irradiance: Low (&lt;50 W/m²)</p>
                  </div>
                </div>
                <span className="row-status-badge status-sunset">Sunset Ramp-down</span>
              </li>
            </ul>
          </div>

          {/* Alerts & Anomalies Module */}
          <div className="data-section-card">
            <div className="card-header-simple">
              <h2>Alerts &amp; Anomalies Log</h2>
              <span className="card-header-meta">LAST 24 HOURS</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
              <div className="alert-log-row highlighted-warn">
                <div className="row-icon-wrapper alert-warn">
                  <AlertTriangle size={20} />
                </div>
                <div className="alert-body">
                  <h3 className="warning">Inverter Cluster B-4 thermal warning</h3>
                  <p>11:42 AM • Core temperature exceeded 65°C threshold. Automated auxiliary cooling systems engaged.</p>
                </div>
              </div>

              <div className="alert-log-row">
                <div className="row-icon-wrapper alert-info">
                  <Info size={20} />
                </div>
                <div className="alert-body">
                  <h3 className="info">Localized cloud cover drop at Grid-East</h3>
                  <p>09:15 AM • Power output registered 12% lower than forecast models for a duration of 15 minutes.</p>
                </div>
              </div>

              <div className="alert-log-row">
                <div className="row-icon-wrapper alert-ok">
                  <CheckCircle2 size={20} />
                </div>
                <div className="alert-body">
                  <h3 className="ok">Daily system diagnostic complete</h3>
                  <p>04:00 AM • Fully automated scan finished. All main photovoltaic arrays synchronized and reporting nominal status.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ── Tab 2: Predictions (Solar Weather Report) ──────────────────────────────
  const renderSection = (title, data, icon) => {
    if (!data) return null;
    
    return (
      <div className="data-section-card" style={{ padding: '24px', marginBottom: '16px' }}>
        <div className="card-header-simple" style={{ marginBottom: '16px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon}
            {title}
          </h2>
        </div>
        {typeof data === 'string' ? (
          <p style={{ color: 'var(--db-text-secondary)', lineHeight: '1.6' }}>{data}</p>
        ) : (
          <div className="insights-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {Object.entries(data).map(([k, v], idx) => (
              <div key={idx} className="insight-card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
                <h4 style={{ color: 'var(--db-accent)', marginBottom: '8px', fontSize: '0.9rem' }}>{k}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--db-text-secondary)' }}>{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPredictionsTab = () => {
    if (!reportData) {
      return (
        <PredictionWizard
          userId={userId}
          onPredictionComplete={(data, meta) => {
            setReportData(data);
            setReportMetadata(meta);
          }}
          onResetParent={() => {
            setReportData(null);
            setReportMetadata(null);
          }}
        />
      );
    }

    const { charts } = reportData;
    const hasCharts = !!charts;
    
    // KPI calculation
    let avgGen = 0;
    let totalSavings = 0;
    let sysCost = charts?.cumulativeROI?.systemCost || 0;
    
    if (charts?.monthlyGeneration?.data) {
      avgGen = charts.monthlyGeneration.data.reduce((a, b) => a + Number(b), 0) / charts.monthlyGeneration.data.length;
    }
    if (charts?.monthlySavings?.data) {
      totalSavings = charts.monthlySavings.data.reduce((a, b) => a + Number(b), 0);
    }

    // Chart helpers for Generation SVG
    const genMax = hasCharts && charts.monthlyGeneration ? Math.max(...charts.monthlyGeneration.data.map(n=>Number(n)), 1) : 100;
    
    return (
      <div className="predictions-tab-wrapper">
        <div className="report-header-banner" style={{ marginBottom: '24px' }}>
          <div className="report-location-info">
            <div className="location-icon-box">
              <MapPin size={24} />
            </div>
            <div className="location-details-meta">
              <h2>{reportMetadata?.address || 'AI Solar Performance Report'}</h2>
              <div className="location-coords-badge">
                <span className="coords-pill">LAT: {reportMetadata?.latitude?.toFixed(5) || 'N/A'}</span>
                <span className="coords-pill">LNG: {reportMetadata?.longitude?.toFixed(5) || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="report-actions">
            <button 
              className="btn-action-outline" 
              style={{ borderColor: 'var(--db-accent)', color: 'var(--db-accent)' }} 
              onClick={async () => {
                try {
                  await resetPredictionProgress(userId);
                  setReportData(null);
                  setReportMetadata(null);
                } catch (e) {
                  console.error(e);
                }
              }}
            >
              <RefreshCw size={14} />
              New Report
            </button>
          </div>
        </div>

        {hasCharts && (
          <div className="report-kpis-grid" style={{ marginBottom: '24px' }}>
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-title">Avg Monthly Gen</span>
              </div>
              <div className="metric-value-container">
                <div className="metric-value highlighted">{avgGen.toFixed(0)}</div>
                <span className="metric-unit">kWh</span>
              </div>
              <div className="metric-card-icon-back"><Zap size={60} /></div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-title">Est. Annual Savings</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-unit" style={{ marginRight: '4px' }}>{charts.monthlySavings?.currency || '$'}</span>
                <div className="metric-value" style={{ color: 'var(--db-success)' }}>{totalSavings.toFixed(0)}</div>
              </div>
              <div className="metric-card-icon-back"><TrendingUp size={60} /></div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-title">Est. System Cost</span>
              </div>
              <div className="metric-value-container">
                <span className="metric-unit" style={{ marginRight: '4px' }}>{charts.monthlySavings?.currency || '$'}</span>
                <div className="metric-value">{sysCost.toFixed(0)}</div>
              </div>
              <div className="metric-card-icon-back"><Settings size={60} /></div>
            </div>
            
            <div className="metric-card">
              <div className="metric-card-header">
                <span className="metric-title">Payback Period</span>
              </div>
              <div className="metric-value-container">
                <div className="metric-value">
                  {charts.cumulativeROI?.data ? charts.cumulativeROI.data.findIndex(v => Number(v) > 0) + 1 : 'N/A'}
                </div>
                <span className="metric-unit" style={{ marginLeft: '4px' }}>Years</span>
              </div>
              <div className="metric-card-icon-back"><Calendar size={60} /></div>
            </div>
          </div>
        )}

        {hasCharts && charts.monthlyGeneration && (
          <div className="data-section-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <div className="card-header-simple" style={{ marginBottom: '24px' }}>
              <h2>{charts.monthlyGeneration?.label || 'Monthly Generation Potential'}</h2>
            </div>
            <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--db-border)' }}>
              {charts.monthlyGeneration.data.map((val, i) => {
                const num = Number(val);
                const heightPct = Math.max((num / genMax) * 100, 5);
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <div style={{ 
                      width: '100%', 
                      height: `${heightPct}%`, 
                      background: 'var(--db-accent)', 
                      borderRadius: '4px 4px 0 0',
                      opacity: 0.8,
                      transition: 'height 0.3s' 
                    }}></div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)' }}>{charts.monthlyGeneration.months[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {renderSection("Executive Summary", reportData["1_Executive_Summary"], <Sparkles size={18} />)}
        {renderSection("System Design Overview", reportData["2_System_Design_Overview"], <Grid size={18} />)}
        {renderSection("Battery Storage Strategy", reportData["3_Battery_Storage_Strategy"], <Zap size={18} />)}
        {renderSection("Financial Economics & ROI", reportData["4_Financial_Economics_ROI"], <TrendingUp size={18} />)}
        {renderSection("Environmental Impact", reportData["5_Environmental_Impact"], <Sun size={18} />)}
        {renderSection("Maintenance Guide", reportData["6_Maintenance_Optimization_Guide"], <Settings size={18} />)}
        {renderSection("Constraints & Pro Tips", reportData["7_Constraints_Pro_Tips"], <ShieldAlert size={18} />)}

      </div>
    );
  };

  // ── Tab 3: Analytics ───────────────────────────────────────────────────────
  const renderAnalyticsTab = () => {
    return (
      <div className="empty-state-wrapper">
        <div className="empty-state-card">
          <div className="empty-state-icon-box">
            <LineChart size={32} />
          </div>
          <h2>Analytics Engine</h2>
          <p>
            Perform advanced time-series modeling, degradation tracking, and yield variance analytics.
            Generate report forecasts in the Predictions tab to enable detailed analytics metrics.
          </p>
          {!reportData && (
            <button className="empty-state-cta-btn" onClick={() => setActiveTab('predictions')}>
              <Sparkles size={16} />
              Generate Solar Report
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Tab 4: Farm Management ─────────────────────────────────────────────────
  const renderManagementTab = () => {
    return (
      <div className="empty-state-wrapper">
        <div className="empty-state-card">
          <div className="empty-state-icon-box">
            <Grid size={32} />
          </div>
          <h2>Photovoltaic Array Manager</h2>
          <p>
            Map physical panel strings, configure inverter groups, and monitor localized string status.
            Integrate panel specs via the report wizard to initialize farm assets.
          </p>
          {!reportData && (
            <button className="empty-state-cta-btn" onClick={() => setActiveTab('predictions')}>
              <Sparkles size={16} />
              Generate Solar Report
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Tab 5: System Health ───────────────────────────────────────────────────
  const renderHealthTab = () => {
    return (
      <div className="empty-state-wrapper">
        <div className="empty-state-card">
          <div className="empty-state-icon-box">
            <HeartPulse size={32} />
          </div>
          <h2>Hardware Diagnostics &amp; Health</h2>
          <p>
            Monitor live string voltage warnings, grid frequency sync parameters, and ambient temperature alarms.
            Diagnostic system status nominal.
          </p>
        </div>
      </div>
    );
  };

  // ── Tab: Location & Siting ─────────────────────────────────────────────────
  const renderSitingTab = () => {
    if (isLoadingSiting) {
      return (
        <div className="empty-state-wrapper">
          <div style={{ width: 40, height: 40, border: '3px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--db-text-secondary)' }}>Loading Location &amp; Siting Data...</p>
        </div>
      );
    }

    if (!sitingData || (!sitingData.location && !sitingData.answers)) {
      return (
        <div className="empty-state-wrapper">
          <div className="empty-state-card">
             <div className="empty-state-icon-box">
                <MapPin size={32} />
             </div>
             <h2>No Siting Data Found</h2>
             <p>You have not completed the Location &amp; Siting Questionnaire yet.</p>
             <button className="empty-state-cta-btn" onClick={() => setActiveTab('predictions')}>
               <Sparkles size={16} />
               Go to Predictions
             </button>
          </div>
        </div>
      );
    }

    return (
      <div className="siting-view-wrapper" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="data-section-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="card-header-simple" style={{ marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} />
              Installation Site Location
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--db-text-secondary)' }}>
            <p><strong style={{ color: '#fff' }}>Address:</strong> {sitingData.location?.address || 'N/A'}</p>
            <p><strong style={{ color: '#fff' }}>Coordinates:</strong> {sitingData.location?.lat}, {sitingData.location?.lon}</p>
          </div>
        </div>

        <div className="data-section-card" style={{ padding: '24px' }}>
          <div className="card-header-simple" style={{ marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} />
              Questionnaire Answers
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sitingData.answers && Object.keys(sitingData.answers)
              .filter(key => questionsData[key] && !questionsData[key].isIntro)
              .map((key) => {
                 const question = questionsData[key];
                 return (
                   <div key={key} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--db-text-secondary)', fontWeight: '500', marginBottom: '8px' }}>
                       {question.text}
                     </div>
                     <div style={{ color: '#fff', fontSize: '0.95rem', lineHeight: '1.5' }}>
                       {sitingData.answers[key]}
                     </div>
                   </div>
                 );
              })}
          </div>
        </div>
      </div>
    );
  };

  // ── Tab: Weather Data ──────────────────────────────────────────────────────
  const renderWeatherTab = () => {
    if (isLoadingWeather) {
      return (
        <div className="empty-state-wrapper">
          <div style={{ width: 40, height: 40, border: '3px solid var(--db-border)', borderTopColor: 'var(--db-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ marginTop: '16px', color: 'var(--db-text-secondary)' }}>Loading Weather Data...</p>
        </div>
      );
    }

    if (!weatherCacheData || !weatherCacheData.monthlyData) {
      return (
        <div className="empty-state-wrapper">
          <div className="empty-state-card">
             <div className="empty-state-icon-box">
                <CloudSun size={32} />
             </div>
             <h2>No Weather Data Found</h2>
             <p>Generate a solar report in the Predictions tab to compute localized climatology data.</p>
             <button className="empty-state-cta-btn" onClick={() => setActiveTab('predictions')}>
               <Sparkles size={16} />
               Go to Predictions
             </button>
          </div>
        </div>
      );
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const chartData = weatherCacheData.monthlyData.map(m => ({
      name: monthNames[m.month - 1] || `M${m.month}`,
      Temperature: m.temperatureMean || 0,
      DNI: m.dniMean || 0,
      CloudCover: m.cloudcoverMean || 0,
      Dust: m.dustMean || 0
    }));

    return (
      <div className="siting-view-wrapper" style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Dynamic Composed Chart Section */}
        <div className="data-section-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="card-header-simple" style={{ marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} />
              Annual Climate & Irradiance Trends
            </h2>
          </div>
          
          <div style={{ width: '100%', height: '350px', marginTop: '20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(20,20,25,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar yAxisId="right" dataKey="DNI" name="Direct Normal Irradiance (W/m²)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                <Area yAxisId="left" type="monotone" dataKey="Temperature" name="Avg Temperature (°C)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorTemp)" />
                <Line yAxisId="left" type="monotone" dataKey="CloudCover" name="Cloud Cover (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Grid Breakdown */}
        <div className="data-section-card" style={{ padding: '24px' }}>
          <div className="card-header-simple" style={{ marginBottom: '16px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} />
              Monthly Data Breakdown
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
            {weatherCacheData.monthlyData.map((month, idx) => (
               <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '16px' }}>
                 <div style={{ fontSize: '1rem', color: 'var(--db-accent)', fontWeight: '600', marginBottom: '12px' }}>
                   {monthNames[month.month - 1]}
                 </div>
                 <div style={{ color: 'var(--db-text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
                   <p><strong style={{ color: '#fff' }}>Temp (Avg):</strong> {formatVal(month.temperatureMean, 1)} °C</p>
                   <p><strong style={{ color: '#fff' }}>DNI (Avg):</strong> {formatVal(month.dniMean, 1)} W/m²</p>
                   <p><strong style={{ color: '#fff' }}>Cloud Cover:</strong> {formatVal(month.cloudcoverMean, 1)} %</p>
                   <p><strong style={{ color: '#fff' }}>Dust (Avg):</strong> {formatVal(month.dustMean, 1)} μg/m³</p>
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Tab 6: Settings ────────────────────────────────────────────────────────
  const renderSettingsTab = () => {
    return (
      <div className="empty-state-wrapper">
        <div className="empty-state-card" style={{ maxWidth: '600px', textAlign: 'left', alignItems: 'stretch' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={24} />
            System Settings
          </h2>
          <p style={{ color: 'var(--db-text-secondary)' }}>
            Configure telemetry interfaces, notification hooks, and API tokens.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--db-border)' }}>
              <div>
                <h4 style={{ fontWeight: 600 }}>Irradiance API Integration</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>Retrieve live forecast via Open-Meteo REST service.</p>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--db-success)', fontWeight: 'bold' }}>CONNECTED</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--db-border)' }}>
              <div>
                <h4 style={{ fontWeight: 600 }}>Operations Control Grid</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>EMEA North default telemetry sync interval.</p>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)', fontFamily: 'monospace' }}>4000ms</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <h4 style={{ fontWeight: 600 }}>Active JWT Security</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--db-text-muted)', marginTop: '4px' }}>Token expiration lifecycle and encryption level.</p>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)', fontFamily: 'monospace' }}>HMAC-SHA256</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'predictions':
        return renderPredictionsTab();
      case 'analytics':
        return renderAnalyticsTab();
      case 'management':
        return renderManagementTab();
      case 'health':
        return renderHealthTab();
      case 'siting':
        return renderSitingTab();
      case 'weather':
        return renderWeatherTab();
      case 'settings':
        return renderSettingsTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Top Nav Bar */}
      <div className="mobile-nav-bar">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Zap size={18} fill="currentColor" />
          </div>
          <span className="brand-name">SolarPredict AI</span>
        </div>
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`dashboard-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="brand-wrapper">
            <div className="brand-icon">
              <Zap size={18} fill="currentColor" />
            </div>
            <span className="brand-name">SolarPredict AI</span>
          </div>
          <div className="system-status">
            <span className="status-label">Operations Control</span>
            <div className="status-badge">
              <div className="pulse-dot"></div>
              <span className="status-text">EMEA North Grid</span>
            </div>
            <div className="status-badge" style={{ marginTop: '6px' }}>
              <span className="status-label" style={{ fontSize: '9px', letterSpacing: '0.05em' }}>Available Credits:</span>
              <span className="status-text" style={{ color: 'var(--db-accent)', fontWeight: 'bold', fontSize: '11px' }}>
                {credits !== null ? (typeof credits === 'object' ? credits.balance : credits) : '...'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  className={`nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false); // Close sidebar on mobile
                  }}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button 
            className="report-btn" 
            onClick={() => {
              setActiveTab('predictions');
              setMobileMenuOpen(false);
            }}
          >
            <FileDown size={16} />
            Generate Report
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dashboard-main">
        {/* Dashboard Header */}
        <header className="dashboard-header">
          <div className="header-title-area">
            <h1>
              {activeTab === 'overview' && 'Control Operations Overview'}
              {activeTab === 'predictions' && 'Solar Performance & Forecast'}
              {activeTab === 'analytics' && 'Solar Analytics Engine'}
              {activeTab === 'management' && 'Photovoltaic Array Manager'}
              {activeTab === 'health' && 'System Health & Diagnostics'}
              {activeTab === 'siting' && 'Location & Siting Data'}
              {activeTab === 'weather' && 'Climatology & Irradiance Data'}
              {activeTab === 'settings' && 'Control Panel Settings'}
            </h1>
            <p>
              {activeTab === 'overview' && 'Real-time solar telemetry, predictions, and irradiance metrics.'}
              {activeTab === 'predictions' && 'High-resolution solar irradiance modeling and historical weather analysis.'}
              {activeTab === 'siting' && 'View your saved installation site coordinates and questionnaire answers.'}
              {activeTab === 'weather' && 'Historical climate parameters, monthly solar irradiance trends, and localized meteorology.'}
              {activeTab === 'analytics' && 'Historical data curves, trend analysis, and variance models.'}
              {activeTab === 'management' && 'Map physical panel strings, configure inverter groups, and monitor localized status.'}
              {activeTab === 'health' && 'Hardware sensor status, grid synchronization, and anomaly analytics.'}
              {activeTab === 'settings' && 'Configure grid endpoints, threshold alarms, and API integrations.'}
            </p>
          </div>
          <div className="header-time-area">
            <div className="real-time-clock">{timeString || 'Syncing clock...'}</div>
            <div className="grid-region">EMEA North Operational Region</div>
            <div className="grid-region" style={{ marginTop: '4px', fontWeight: 'bold', color: 'var(--db-accent)' }}>
              Credits: {credits !== null ? (typeof credits === 'object' ? credits.balance : credits) : '...'}
            </div>
          </div>
        </header>

        {renderTabContent()}
      </main>

    </div>
  );
};

export default DashboardPage;
