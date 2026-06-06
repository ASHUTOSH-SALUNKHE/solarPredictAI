import React, { useState, useEffect } from 'react';
import { MapPin, Info, Loader } from 'lucide-react';
import { getStep1Data } from '../../services/predictionService';
import '../../styles/dashboard.css';

const SitingDataView = ({ userId }) => {
  const [sitingData, setSitingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSiting = async () => {
      setIsLoading(true);
      const cacheKey = `step1_data_cache_${userId}`;
      try {
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
        // Cache null to prevent repeated API calls when database progress is reset
        localStorage.setItem(cacheKey, 'null');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchSiting();
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="empty-state-wrapper animate-enter" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Loader className="spin" size={32} style={{ color: 'var(--db-accent)' }} />
      </div>
    );
  }

  if (!sitingData) {
    return (
      <div className="empty-state-wrapper animate-enter" style={{ textAlign: 'center', padding: '40px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '16px' }}>
        <MapPin size={48} style={{ color: 'var(--db-text-secondary)', marginBottom: '16px' }} />
        <h3 style={{ color: 'var(--db-text-primary)', fontFamily: 'var(--font-heading)' }}>No Siting Data Found</h3>
        <p style={{ color: 'var(--db-text-secondary)' }}>Please complete the prediction wizard to fetch site specifications.</p>
      </div>
    );
  }

  const { location, answers } = sitingData;

  // Format answers for display
  const formattedAnswers = answers ? Object.entries(answers).map(([key, val], idx) => ({
    id: idx,
    label: key.replace(/_/g, ' '),
    value: val
  })) : [];

  return (
    <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(82, 183, 136, 0.1)', color: 'var(--db-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--db-text-primary)', fontSize: '1.5rem' }}>
            Location & Siting Data
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--db-text-secondary)', fontSize: '0.9rem' }}>
            Site coordinates and architectural parameters used for the predictive model.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Geographic Parameters */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--db-text-primary)', fontSize: '1.1rem' }}>Geographic Parameters</h3>
          <div style={{ background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)' }}>Detected Address</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--db-text-primary)', fontWeight: '500' }}>{location?.address || 'Unknown Address'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)' }}>Latitude</div>
                <div style={{ fontSize: '0.95rem', color: 'var(--db-text-primary)', fontWeight: '500', fontFamily: 'monospace' }}>{location?.lat ? parseFloat(location.lat).toFixed(4) + '° N' : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)' }}>Longitude</div>
                <div style={{ fontSize: '0.95rem', color: 'var(--db-text-primary)', fontWeight: '500', fontFamily: 'monospace' }}>{location?.lon ? parseFloat(location.lon).toFixed(4) + '° E' : 'N/A'}</div>
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '16px', width: '100%', height: '180px', background: 'var(--db-border-hover)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--db-text-secondary)' }}>
            Map Visualization Placeholder
          </div>
        </div>

        {/* QA Cards */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', color: 'var(--db-text-primary)', fontSize: '1.1rem' }}>Structural & Financial Inputs</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {formattedAnswers.length > 0 ? formattedAnswers.map((ans) => (
              <div key={ans.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#fff', border: '1px solid var(--db-border)', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                <div style={{ color: 'var(--db-accent)', marginTop: '2px' }}>
                  <Info size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--db-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ans.label}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--db-text-primary)', fontWeight: '500', marginTop: '2px' }}>{ans.value}</div>
                </div>
              </div>
            )) : (
              <div style={{ padding: '12px', color: 'var(--db-text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No questionnaire answers logged.
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default SitingDataView;
