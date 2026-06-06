import { useState, useEffect } from 'react';
import WeatherPill from './WeatherPill';

const GreetingHeader = ({ userName = 'Guest', location = 'Nashik', weatherData = {} }) => {
  const [greeting, setGreeting] = useState('Good morning');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour < 17) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    };
    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  // Determine a contextual subtitle based on weather condition
  const condition = weatherData.condition || 'Sunny';
  const isSunny = condition.toLowerCase().includes('sun') || condition.toLowerCase().includes('clear');
  const contextSubtitle = isSunny
    ? `${location} is looking sunny today — great conditions for solar generation.`
    : `Current conditions in ${location} are ${condition.toLowerCase()} — monitoring solar efficiency.`;

  return (
    <div className="greeting-header">
      <div>
        <h1 className="greeting-title">{greeting}, {userName} ✦</h1>
        <p className="greeting-subtitle">{contextSubtitle}</p>
      </div>
      <div>
        <WeatherPill 
          tempC={weatherData.tempC} 
          condition={weatherData.condition} 
          uvIndex={weatherData.uvIndex} 
        />
      </div>
    </div>
  );
};

export default GreetingHeader;
