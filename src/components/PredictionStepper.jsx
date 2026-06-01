import React from 'react';
import { Check, Lock } from 'lucide-react';

const PredictionStepper = ({ activeStep, progress }) => {
  const steps = [
    { number: 1, label: 'Your Details', icon: '📍' },
    { number: 2, label: 'Weather Data', icon: '🌤️' },
    { number: 3, label: 'Prediction', icon: '☀️' }
  ];

  // Helper to determine status
  const getStepStatus = (stepNumber) => {
    if (stepNumber === 1) {
      return progress.step1?.completed ? 'completed' : 'active';
    }
    if (stepNumber === 2) {
      if (progress.step2?.completed) return 'completed';
      if (progress.step1?.completed) return 'active';
      return 'locked';
    }
    if (stepNumber === 3) {
      if (progress.step3?.completed) return 'completed';
      if (progress.step2?.completed) return 'active';
      return 'locked';
    }
    return 'locked';
  };

  // Helper to calculate progress line width
  const getProgressLineWidth = () => {
    if (progress.step3?.completed) return '100%';
    if (progress.step2?.completed) return '100%';
    if (progress.step1?.completed) return '50%';
    return '0%';
  };

  return (
    <div className="stepper-nav">
      <div className="stepper-line">
        <div 
          className="stepper-line-progress" 
          style={{ width: getProgressLineWidth() }}
        ></div>
      </div>
      
      {steps.map((step) => {
        const status = getStepStatus(step.number);
        const isActive = activeStep === step.number;
        const isCompleted = status === 'completed';
        const isLocked = status === 'locked';

        return (
          <div 
            key={step.number}
            className={`step-node ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isLocked ? 'locked' : ''}`}
          >
            <div className="step-circle">
              {isCompleted ? (
                <div className="step-circle-icon">
                  <Check size={18} strokeWidth={3} />
                </div>
              ) : isLocked ? (
                <div className="step-circle-icon">
                  <Lock size={16} strokeWidth={2.5} />
                </div>
              ) : (
                <span style={{ fontSize: '1.15rem' }}>{step.icon}</span>
              )}
              {isCompleted && (
                <div className="step-badge-check">
                  <Check size={10} strokeWidth={4} />
                </div>
              )}
            </div>
            <span className="step-label">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PredictionStepper;
