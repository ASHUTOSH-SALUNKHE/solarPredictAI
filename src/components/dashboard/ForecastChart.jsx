import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Calendar } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <div className="custom-tooltip-label">{label}</div>
        <div className="custom-tooltip-value">
          {payload[0].value} kWh
        </div>
      </div>
    );
  }
  return null;
};

const ForecastChart = ({ data }) => {
  // Determine color based on irradiance
  const getBarColor = (irradiance) => {
    if (irradiance > 70) return 'url(#colorGreen)'; // green gradient
    if (irradiance >= 50) return 'url(#colorAmber)'; // amber gradient
    return 'rgba(180, 220, 195, 0.35)'; // muted
  };

  return (
    <div className="glass-card animate-enter" style={{ animationDelay: '320ms' }}>
      <div className="chart-header">
        <Calendar size={16} color="var(--db-accent)" />
        <h3 className="chart-title">7-day generation forecast</h3>
      </div>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barGap={6}>
            <defs>
              <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#52b788" />
                <stop offset="100%" stopColor="#74c69d" />
              </linearGradient>
              <linearGradient id="colorAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8a020" />
                <stop offset="100%" stopColor="#f4c156" />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="4 4" 
              vertical={false} 
              stroke="rgba(180, 220, 195, 0.30)" 
            />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#95c4a8' }} 
              dy={10}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="predictedKwh" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.irradiance)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ForecastChart;
