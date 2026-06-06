import { useState, useEffect } from 'react';
import { MapPin, Zap, Leaf } from 'lucide-react';

const QuickPredictPanel = ({ location = "Nashik, India", irradiance = 82, cloudCover = 12, onRunPrediction }) => {
  const [irradianceWidth, setIrradianceWidth] = useState(0);
  const [cloudCoverWidth, setCloudCoverWidth] = useState(0);

  useEffect(() => {
    // Animate progress bars on mount
    const timer = setTimeout(() => {
      setIrradianceWidth(irradiance);
      setCloudCoverWidth(cloudCover);
    }, 100);
    return () => clearTimeout(timer);
  }, [irradiance, cloudCover]);

  return (
    <div className="glass-card sidebar-card animate-enter" style={{ animationDelay: '400ms' }}>
      <h3 className="chart-title">Quick Predict</h3>
      
      <div className="location-pill">
        <MapPin size={14} />
        {location}
      </div>

      <div className="progress-group">
        <div className="progress-labels">
          <span className="progress-label">Solar Irradiance</span>
          <span className="progress-value">{irradiance}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill amber" style={{ width: `${irradianceWidth}%` }}></div>
        </div>
      </div>

      <div className="progress-group">
        <div className="progress-labels">
          <span className="progress-label">Cloud Cover</span>
          <span className="progress-value">{cloudCover}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill green" style={{ width: `${cloudCoverWidth}%` }}></div>
        </div>
      </div>

      <div className="insight-tip">
        <Leaf size={16} color="#9a6010" style={{ flexShrink: 0, marginTop: '2px' }} />
        <p className="insight-text">
          Peak generation is expected between 11 AM and 2 PM today. Optimal time for heavy energy loads.
        </p>
      </div>

      <button className="btn-primary" onClick={onRunPrediction}>
        <Zap size={14} />
        Run New Prediction
      </button>
    </div>
  );
};

export default QuickPredictPanel;
