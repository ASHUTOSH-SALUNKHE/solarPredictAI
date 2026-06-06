import { Sun, Cloud, CloudRain, Wind } from 'lucide-react';

const WeatherPill = ({ tempC = 22, condition = "Sunny", uvIndex = 6 }) => {
  const getIcon = () => {
    if (condition.toLowerCase().includes('rain')) return <CloudRain size={16} />;
    if (condition.toLowerCase().includes('cloud')) return <Cloud size={16} />;
    if (condition.toLowerCase().includes('wind')) return <Wind size={16} />;
    return <Sun size={16} />;
  };

  return (
    <div className="weather-pill">
      {getIcon()}
      <span>{tempC}°C</span>
      <span style={{ color: 'var(--db-text-secondary)' }}>•</span>
      <span>{condition}</span>
      <span style={{ color: 'var(--db-text-secondary)' }}>•</span>
      <span>UV {uvIndex}</span>
    </div>
  );
};

export default WeatherPill;
