import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { MapPin, RefreshCw, Zap, TrendingUp, Settings, Calendar, Sparkles, Grid, Sun, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import '../styles/finalReport.css';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-label">{label}</div>
        <div className="tooltip-value-row">
          <Zap size={16} />
          {Number(payload[0].value).toFixed(1)} kWh
        </div>
      </div>
    );
  }
  return null;
};

const FinalReportView = ({ reportData, reportMetadata, onNewReport }) => {
  if (!reportData) return null;

  const { charts } = reportData;
  const hasCharts = !!charts;

  // KPI calculations
  let avgGen = 0;
  let totalSavings = 0;
  let sysCost = charts?.cumulativeROI?.systemCost || 0;

  if (charts?.monthlyGeneration?.data) {
    avgGen = charts.monthlyGeneration.data.reduce((a, b) => a + Number(b), 0) / charts.monthlyGeneration.data.length;
  }
  if (charts?.monthlySavings?.data) {
    totalSavings = charts.monthlySavings.data.reduce((a, b) => a + Number(b), 0);
  }

  // Chart Data Formatting
  const generationData = charts?.monthlyGeneration?.months?.map((month, index) => ({
    name: month,
    value: Number(charts.monthlyGeneration.data[index])
  })) || [];

  const formatContentToMarkdown = (content) => {
    if (!content) return '';
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => `- ${typeof item === 'object' ? JSON.stringify(item) : item}`)
        .join('\n');
    }
    if (typeof content === 'object') {
      return Object.entries(content)
        .map(([key, val]) => `**${key}**: ${typeof val === 'object' ? JSON.stringify(val) : val}`)
        .join('\n\n');
    }
    return String(content);
  };

  const renderDetailCard = (title, content, icon) => {
    if (!content) return null;
    const formattedContent = formatContentToMarkdown(content);
    return (
      <div className="detail-card">
        <div className="detail-card-header">
          <div className="detail-card-icon">
            {icon}
          </div>
          <h3>{title}</h3>
        </div>
        <div className="detail-card-content">
          <ReactMarkdown>{formattedContent}</ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <div className="final-report-wrapper">
      
      {/* Header Area */}
      <div className="report-header">
        <div className="report-header-content">
          <div className="report-header-icon">
            <Sparkles size={28} />
          </div>
          <div className="report-title">
            <h1>Solar Performance Diagnostics</h1>
            <div className="report-title-meta">
              <span className="meta-pill"><MapPin size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }}/>{reportMetadata?.address || 'Location Verified'}</span>
              {reportMetadata?.latitude && (
                <span className="meta-pill">LAT: {reportMetadata.latitude.toFixed(4)}</span>
              )}
              {reportMetadata?.longitude && (
                <span className="meta-pill">LNG: {reportMetadata.longitude.toFixed(4)}</span>
              )}
            </div>
          </div>
        </div>
        <button className="report-actions-btn" onClick={onNewReport}>
          <RefreshCw size={16} />
          New Generation
        </button>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <div className="kpi-glass-card">
          <div className="kpi-icon-bg"><Zap size={100} /></div>
          <div className="kpi-title"><Zap size={14} /> Avg Monthly Gen</div>
          <div className="kpi-value-wrapper">
            <div className="kpi-value glowing">{avgGen.toFixed(0)}</div>
            <div className="kpi-unit">kWh</div>
          </div>
        </div>
        
        <div className="kpi-glass-card">
          <div className="kpi-icon-bg"><TrendingUp size={100} /></div>
          <div className="kpi-title"><TrendingUp size={14} /> Est. Annual Savings</div>
          <div className="kpi-value-wrapper">
            <div className="kpi-unit" style={{ color: '#4ade80' }}>{charts?.monthlySavings?.currency || '$'}</div>
            <div className="kpi-value success">{totalSavings.toFixed(0)}</div>
          </div>
        </div>

        <div className="kpi-glass-card">
          <div className="kpi-icon-bg"><Settings size={100} /></div>
          <div className="kpi-title"><Settings size={14} /> System Cost</div>
          <div className="kpi-value-wrapper">
            <div className="kpi-unit">{charts?.monthlySavings?.currency || '$'}</div>
            <div className="kpi-value">{sysCost.toFixed(0)}</div>
          </div>
        </div>

        <div className="kpi-glass-card">
          <div className="kpi-icon-bg"><Calendar size={100} /></div>
          <div className="kpi-title"><Calendar size={14} /> Payback Period</div>
          <div className="kpi-value-wrapper">
            <div className="kpi-value">
              {charts?.cumulativeROI?.data ? charts.cumulativeROI.data.findIndex(v => Number(v) > 0) + 1 : 'N/A'}
            </div>
            <div className="kpi-unit">Years</div>
          </div>
        </div>
      </div>

      {/* Interactive Chart */}
      {hasCharts && generationData.length > 0 && (
        <div className="chart-glass-container">
          <div className="chart-header">
            <h2>{charts?.monthlyGeneration?.label || 'Monthly Generation Potential'}</h2>
          </div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={generationData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffd700" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ffd700" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#a1a1a6" tick={{ fill: '#a1a1a6', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#a1a1a6" tick={{ fill: '#a1a1a6', fontSize: 12 }} axisLine={false} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#ffd700" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="details-grid">
        {renderDetailCard("Executive Summary", reportData["1_Executive_Summary"], <Sparkles size={20} />)}
        {renderDetailCard("System Design Overview", reportData["2_System_Design_Overview"], <Grid size={20} />)}
        {renderDetailCard("Battery Storage Strategy", reportData["3_Battery_Storage_Strategy"], <Zap size={20} />)}
        {renderDetailCard("Financial Economics & ROI", reportData["4_Financial_Economics_ROI"], <TrendingUp size={20} />)}
        {renderDetailCard("Environmental Impact", reportData["5_Environmental_Impact"], <Sun size={20} />)}
        {renderDetailCard("Maintenance Guide", reportData["6_Maintenance_Optimization_Guide"], <Settings size={20} />)}
        {renderDetailCard("Constraints & Pro Tips", reportData["7_Constraints_Pro_Tips"], <ShieldAlert size={20} />)}
      </div>

    </div>
  );
};

export default FinalReportView;
