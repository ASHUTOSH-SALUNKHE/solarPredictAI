const StatCard = ({ label, value, subtext, isAccent = false, animationDelay = "0ms" }) => {
  return (
    <div 
      className={`stat-card animate-enter ${isAccent ? 'accent' : ''}`}
      style={{ animationDelay }}
    >
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-subtext">{subtext}</div>
    </div>
  );
};

export default StatCard;
