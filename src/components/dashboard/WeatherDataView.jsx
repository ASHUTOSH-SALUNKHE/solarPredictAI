import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, Legend } from 'recharts';
import { CloudSun, Loader } from 'lucide-react';
import { getStep2Data } from '../../services/predictionService';
import '../../styles/dashboard.css';

const WeatherDataView = ({ userId }) => {
  const [selectedChartGroup, setSelectedChartGroup] = useState('solar');
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      setIsLoading(true);
      const cacheKey = `step2_data_cache_${userId}`;
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          setWeatherData(JSON.parse(cachedStr));
        } else {
          const data = await getStep2Data(userId);
          setWeatherData(data);
          localStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (error) {
        console.error("Failed to fetch weather data:", error);
        // Cache null to prevent repeated API calls when database progress is reset
        localStorage.setItem(cacheKey, 'null');
      } finally {
        setIsLoading(false);
      }
    };
    if (userId) {
      fetchWeather();
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

  if (!weatherData || !weatherData.monthlyData) {
    return (
      <div className="empty-state-wrapper animate-enter" style={{ textAlign: 'center', padding: '40px', background: 'var(--db-surface)', border: '1px solid var(--db-border)', borderRadius: '16px' }}>
        <CloudSun size={48} style={{ color: 'var(--db-text-secondary)', marginBottom: '16px' }} />
        <h3 style={{ color: 'var(--db-text-primary)', fontFamily: 'var(--font-heading)' }}>No Weather Data Found</h3>
        <p style={{ color: 'var(--db-text-secondary)' }}>Please complete the prediction wizard to fetch climatic data for your location.</p>
      </div>
    );
  }

  // Format chart data from database format
  const chartData = weatherData.monthlyData.map(m => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      name: monthNames[m.month - 1] || m.month,
      month: m.month,
      GHI: m.ghiMean !== undefined ? m.ghiMean : (m.GHI !== undefined ? m.GHI : 0),
      DNI: m.dniMean !== undefined ? m.dniMean : (m.DNI !== undefined ? m.DNI : 0),
      DHI: m.dhiMean !== undefined ? m.dhiMean : (m.DHI !== undefined ? m.DHI : 0),
      Temperature: m.temperatureMean !== undefined ? m.temperatureMean : (m.temperature !== undefined ? m.temperature : 0.0),
      Dewpoint: m.dewpointMean !== undefined ? m.dewpointMean : (m.dewpoint !== undefined ? m.dewpoint : 0.0),
      Humidity: m.humidityMean !== undefined ? m.humidityMean : (m.humidity !== undefined ? m.humidity : 0),
      WindSpeed: m.windSpeedMean !== undefined ? m.windSpeedMean : (m.wind_speed !== undefined ? m.wind_speed : 0.0),
      Precipitation: m.precipitationMean !== undefined ? m.precipitationMean : (m.precipitation !== undefined ? m.precipitation : 0.0),
      Snowfall: m.snowfallMean !== undefined ? m.snowfallMean : (m.snowfall !== undefined ? m.snowfall : 0.0),
      CloudCover: m.cloudcoverMean !== undefined ? m.cloudcoverMean : (m.cloud_cover !== undefined ? m.cloud_cover : 0.0),
      AQI: m.aqiMean !== undefined ? m.aqiMean : (m.aqi !== undefined ? m.aqi : 0)
    };
  });

  const buttonStyle = (isActive) => ({
    background: isActive ? '#fff' : 'transparent',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 16px',
    fontSize: '0.85rem',
    fontWeight: isActive ? '600' : '400',
    color: isActive ? 'var(--db-text-primary)' : 'var(--db-text-secondary)',
    boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  });

  return (
    <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--db-amber-light)', color: '#c47a10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CloudSun size={24} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)', color: 'var(--db-text-primary)', fontSize: '1.5rem' }}>
            Meteorological Database
          </h2>
          <p style={{ margin: '4px 0 0', color: 'var(--db-text-secondary)', fontSize: '0.9rem' }}>
            Historical climatology and detailed solar irradiance data fetched from models.
          </p>
        </div>
      </div>

      {/* Main Chart Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <h3 style={{ margin: 0, color: 'var(--db-text-primary)', fontSize: '1.1rem' }}>Climatology Trends</h3>
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.03)', padding: '4px', borderRadius: '8px', overflowX: 'auto' }}>
            <button onClick={() => setSelectedChartGroup('solar')} style={buttonStyle(selectedChartGroup === 'solar')}>
              Solar Irradiance
            </button>
            <button onClick={() => setSelectedChartGroup('temp')} style={buttonStyle(selectedChartGroup === 'temp')}>
              Temp & Humidity
            </button>
            <button onClick={() => setSelectedChartGroup('wind')} style={buttonStyle(selectedChartGroup === 'wind')}>
              Wind & Precipitation
            </button>
            <button onClick={() => setSelectedChartGroup('atmosphere')} style={buttonStyle(selectedChartGroup === 'atmosphere')}>
              Atmosphere & AQI
            </button>
          </div>
        </div>

        <div style={{ width: '100%', height: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="name" stroke="var(--db-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="var(--db-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--db-text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--db-border)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
              <Legend wrapperStyle={{ paddingTop: '16px' }} />
              
              {selectedChartGroup === 'solar' && [
                <Area key="ghi" yAxisId="left" type="monotone" dataKey="GHI" name="Global Horiz Irradiance (GHI, W/m²)" stroke="var(--db-accent-warm)" fill="var(--db-amber-light)" strokeWidth={2} />,
                <Line key="dni" yAxisId="left" type="monotone" dataKey="DNI" name="Direct Normal Irradiance (DNI, W/m²)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />,
                <Line key="dhi" yAxisId="left" type="monotone" dataKey="DHI" name="Diffuse Horiz Irradiance (DHI, W/m²)" stroke="#38bdf8" strokeWidth={1.5} dot={{ r: 2 }} />
              ]}
              
              {selectedChartGroup === 'temp' && [
                <Area key="temp" yAxisId="left" type="monotone" dataKey="Temperature" name="Avg Temperature (°C)" stroke="#e07a5f" fill="rgba(224, 122, 95, 0.1)" strokeWidth={2} />,
                <Line key="dew" yAxisId="left" type="monotone" dataKey="Dewpoint" name="Avg Dewpoint (°C)" stroke="#6366f1" strokeWidth={1.5} dot={{ r: 3 }} />,
                <Line key="hum" yAxisId="right" type="monotone" dataKey="Humidity" name="Avg Humidity (%)" stroke="var(--db-accent)" strokeWidth={2} dot={{ r: 2 }} />
              ]}

              {selectedChartGroup === 'wind' && [
                <Line key="wind" yAxisId="left" type="monotone" dataKey="WindSpeed" name="Avg Wind Speed (km/h)" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />,
                <Bar key="prec" yAxisId="right" dataKey="Precipitation" name="Precipitation (mm)" fill="#3b82f6" opacity={0.6} barSize={12} radius={[4, 4, 0, 0]} />,
                <Bar key="snow" yAxisId="right" dataKey="Snowfall" name="Snowfall (cm)" fill="#a5f3fc" opacity={0.6} barSize={12} radius={[4, 4, 0, 0]} />
              ]}

              {selectedChartGroup === 'atmosphere' && [
                <Area key="cloud" yAxisId="right" type="monotone" dataKey="CloudCover" name="Cloud Cover (%)" stroke="#94a3b8" fill="rgba(148, 163, 184, 0.1)" strokeWidth={1.5} />,
                <Line key="aqi" yAxisId="left" type="monotone" dataKey="AQI" name="Air Quality Index (AQI)" stroke="var(--db-success)" strokeWidth={2} dot={{ r: 3 }} />
              ]}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Data Table */}
      <div className="glass-card" style={{ padding: '24px', overflowX: 'auto' }}>
        <h3 style={{ margin: '0 0 20px', color: 'var(--db-text-primary)', fontSize: '1.1rem' }}>Meteorological Database</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--db-border)', color: 'var(--db-text-secondary)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Month</th>
              <th style={{ padding: '12px' }}>Avg Temp (°C)</th>
              <th style={{ padding: '12px' }}>Dewpoint (°C)</th>
              <th style={{ padding: '12px' }}>GHI (W/m²)</th>
              <th style={{ padding: '12px' }}>Rain (mm)</th>
              <th style={{ padding: '12px' }}>Cloud (%)</th>
              <th style={{ padding: '12px' }}>Wind (km/h)</th>
              <th style={{ padding: '12px' }}>AQI</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.month} style={{ borderBottom: '1px solid var(--db-border-hover)', color: 'var(--db-text-primary)', fontSize: '0.9rem', transition: 'background 0.2s ease' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px', fontWeight: '500' }}>{row.name}</td>
                <td style={{ padding: '12px' }}>{row.Temperature?.toFixed(1) || '0.0'}</td>
                <td style={{ padding: '12px' }}>{row.Dewpoint?.toFixed(1) || '0.0'}</td>
                <td style={{ padding: '12px', color: 'var(--db-accent-warm)', fontWeight: '600' }}>{row.GHI?.toFixed(0) || '0'}</td>
                <td style={{ padding: '12px' }}>{row.Precipitation?.toFixed(1) || '0.0'}</td>
                <td style={{ padding: '12px' }}>{row.CloudCover?.toFixed(1) || '0.0'}</td>
                <td style={{ padding: '12px' }}>{row.WindSpeed?.toFixed(1) || '0.0'}</td>
                <td style={{ padding: '12px', color: 'var(--db-success)' }}>{row.AQI?.toFixed(0) || '0'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default WeatherDataView;
