import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin, Sparkles, RefreshCw, Sun, Zap, CloudSun, Wind,
  Thermometer, Droplets, Lock, Compass, Activity, CheckCircle2,
  AlertTriangle, ArrowRight, Eye, RefreshCcw
} from 'lucide-react';
import PredictionStepper from './PredictionStepper';
import questionsData from '../corequestions.json';
import api from '../services/api';
import {
  getPredictionProgress,
  getStep1Data,
  saveStep1Progress,
  editAnswersStep1,
  checkEditRateLimit,
  saveStep2Progress,
  saveStep3Progress,
  resetPredictionProgress,
  getSolarReport
} from '../services/predictionService';
import '../styles/predictionWizard.css';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const PredictionWizard = ({ userId, onPredictionComplete, onResetParent, initialReportData, refreshCredits }) => {
  // Stepper state
  const [activeStep, setActiveStep] = useState(1);
  const [progress, setProgress] = useState({
    step1: { completed: false, location: null, answers: null },
    step2: { completed: false, weatherData: null },
    step3: { completed: false, predictionResult: null }
  });
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  // Step 1: Location & Chat Questionnaire states
  const [step1Stage, setStep1Stage] = useState('input'); // 'input', 'resolving', 'confirm', 'chat'
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');

  const [messages, setMessages] = useState([]);
  const [currentNodeId, setCurrentNodeId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [userInputValue, setUserInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [optionsDisabled, setOptionsDisabled] = useState(false);
  const [optionsList, setOptionsList] = useState([]);
  const [allowFreeText, setAllowFreeText] = useState(false);
  const [locationError, setLocationError] = useState('');

  const chatEndRef = useRef(null);

  // Step 2: Fetch Weather Data states
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherFetchError, setWeatherFetchError] = useState(null);

  // Step 3: AI Prediction states
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const loadingMessages = [
    "Analysing your location data...",
    "Processing weather patterns...",
    "Calculating solar potential...",
    "Generating your report..."
  ];

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      setIsLoadingProgress(true);
      try {
        const savedProgress = await getPredictionProgress(userId);
        if (savedProgress) {
          const newProgress = { ...progress };

          if (savedProgress.step >= 1) {
            newProgress.step1 = {
              completed: true,
              location: savedProgress.location,
              answers: savedProgress.answers
            };
            setLatitude(savedProgress.location?.lat || '');
            setLongitude(savedProgress.location?.lon || '');
            setResolvedAddress(savedProgress.location?.address || '');
            setAnswers(savedProgress.answers || {});
            setStep1Stage('chat');
            setActiveStep(2);
          }
          if (savedProgress.step >= 2) {
            newProgress.step2 = {
              completed: true,
              weatherData: savedProgress.weatherData
            };
            setActiveStep(3);
          }
          if (savedProgress.step >= 3) {
            newProgress.step3 = {
              completed: true
            };
            // Instantly load completed prediction results into parent
            if (savedProgress.location) {
              getSolarReport(userId).then(report => {
                if (report) {
                  newProgress.step3.predictionResult = report;
                  onPredictionComplete(report, {
                    latitude: parseFloat(savedProgress.location.lat),
                    longitude: parseFloat(savedProgress.location.lon),
                    address: savedProgress.location.address,
                    answers: savedProgress.answers
                  });
                }
              });
            }
          }
          setProgress(newProgress);
        }
      } catch (err) {
        console.error('Failed to load stepper progress', err);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    if (userId) {
      loadProgress();
    }
  }, [userId]);

  // Step 3 Message Cycler
  useEffect(() => {
    let interval;
    if (isGeneratingPrediction) {
      interval = setInterval(() => {
        setLoadingMessageIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 2000);
    } else {
      setLoadingMessageIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGeneratingPrediction]);

  // ----------------------------------------------------
  // STEP 1 HANDLERS
  // ----------------------------------------------------
  const handleGeocodingLookup = async () => {
    if (!latitude || !longitude) return;

    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);
    if (isNaN(latNum) || latNum < -90.0 || latNum > 90.0) {
      setLocationError("Latitude must be between -90 and 90 degrees.");
      return;
    }
    if (isNaN(lonNum) || lonNum < -180.0 || lonNum > 180.0) {
      setLocationError("Longitude must be between -180 and 180 degrees.");
      return;
    }

    setLocationError('');
    setStep1Stage('resolving');
    setResolvedAddress('');

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error("Nominatim reverse geocoding lookup failed");
      const data = await res.json();
      if (data && data.display_name) {
        setResolvedAddress(data.display_name);
        setStep1Stage('confirm');
      } else {
        setResolvedAddress(`${latitude}, ${longitude}`);
        setStep1Stage('confirm');
      }
    } catch (error) {
      console.warn("Reverse geocoding lookup failed (silent fail). Proceeding to basic confirmation.", error);
      setResolvedAddress(`${latitude}, ${longitude}`);
      setStep1Stage('confirm');
    }
  };

  const handleConfirmLocation = () => {
    setStep1Stage('chat');
    setMessages([]);

    let sanitizedAddress = resolvedAddress || '';
    if (sanitizedAddress.length > 500) {
      sanitizedAddress = sanitizedAddress.substring(0, 500);
    }

    setAnswers({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      resolvedAddress: sanitizedAddress
    });
    setCurrentNodeId('q_welcome');
  };

  const findKeywordMatch = (items, answer) => {
    if (!items || items.length === 0) return null;
    if (!answer) return items[0];
    const lowerAnswer = answer.toLowerCase();

    for (const item of items) {
      if (item.keywords && item.keywords.length > 0) {
        const hasKeyword = item.keywords.some(kw => lowerAnswer.includes(kw.toLowerCase()));
        if (hasKeyword) return item;
      }
    }
    return items.find(item => !item.keywords || item.keywords.length === 0);
  };

  const addAiMessageWithTyping = async (text) => {
    setIsTyping(true);
    const typingDelay = 600 + Math.random() * 300;
    await delay(typingDelay);
    setIsTyping(false);
    setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'ai', text }]);
  };

  const handleUserAnswer = async (answerText) => {
    if (optionsDisabled || isTyping) return;
    setOptionsDisabled(true);

    // Enforce value limit of 1000 characters per answer
    let processedAnswer = answerText || '';
    if (processedAnswer.length > 1000) {
      processedAnswer = processedAnswer.substring(0, 1000);
    }

    setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'user', text: processedAnswer }]);

    const currentNode = questionsData[currentNodeId];

    // Enforce key limit of 100 characters per answer entry key
    let key = currentNode.id || '';
    if (key.length > 100) {
      key = key.substring(0, 100);
    }

    // Enforce maximum of 50 answer entries limit (including initial location fields)
    const answersKeys = Object.keys(answers);
    if (answersKeys.length >= 50 && !answers[key]) {
      await addAiMessageWithTyping("Maximum answer entries limit reached (50). Transitioning to review...");
      setStep1Stage('preview');
      return;
    }

    const newAnswers = {
      ...answers,
      [key]: processedAnswer
    };
    setAnswers(newAnswers);

    const matchedReaction = findKeywordMatch(currentNode.reactions, processedAnswer);
    if (matchedReaction && matchedReaction.message) {
      const messageText = matchedReaction.message.replace('{answer}', processedAnswer);
      await addAiMessageWithTyping(messageText);
    }

    const matchedNext = findKeywordMatch(currentNode.next, processedAnswer);
    const nextNodeId = matchedNext ? matchedNext.node : null;

    if (nextNodeId && questionsData[nextNodeId]) {
      setCurrentNodeId(nextNodeId);
    } else {
      // Completed all questions in chatbot - transition to preview screen
      await delay(1200);
      setStep1Stage('preview');
    }
  };

  const handleSendFreeText = () => {
    if (!userInputValue.trim()) return;
    const val = userInputValue.trim();
    setUserInputValue('');
    handleUserAnswer(val);
  };

  const completeStep1 = async (finalAnswers, editMode = false) => {
    const tokenMsg = editMode
      ? "Saving your edited answers will NOT consume any tokens. Do you want to proceed?"
      : "Submitting your siting questionnaire answers will consume 10 tokens. Do you want to proceed?";

    const confirmed = window.confirm(tokenMsg);
    if (!confirmed) return;

    setIsTyping(true);

    let sanitizedAddress = resolvedAddress || '';
    if (sanitizedAddress.length > 500) {
      sanitizedAddress = sanitizedAddress.substring(0, 500);
    }

    const locationObj = {
      lat: parseFloat(latitude),
      lon: parseFloat(longitude),
      address: sanitizedAddress
    };

    if (editMode) {
      try {
        // Edit mode: only update answers in MongoDB, no credit deduction
        await editAnswersStep1(userId, finalAnswers);

        // Clear cached Step 1 data so the next "Edit Answers" click fetches fresh data
        localStorage.removeItem(`step1_edit_cache_${userId}`);

        setProgress(prev => ({
          ...prev,
          step1: {
            ...prev.step1,
            answers: finalAnswers
          }
        }));
        // Reset active step back to where the user was (Step 3 if weather fetch is done, otherwise Step 2)
        if (progress.step2.completed) {
          setActiveStep(3);
        } else {
          setActiveStep(2);
        }
        setStep1Stage('chat'); // Return to default chat stage for future edits
      } catch (error) {
        console.error("Failed to save edited answers:", error);
        let errorMsg = "Failed to save edited answers. Please try again.";
        if (error.response && error.response.status === 429) {
          errorMsg = "You are editing answers too frequently. Please wait an hour before trying again.";
        } else if (error.response && error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        }
        alert(errorMsg);
      }
    } else {
      try {
        await addAiMessageWithTyping("Fantastic! I've noted down all your details. Step 1 is complete! Click the button below to fetch weather data. 🌤️");

        // Save to backend immediately
        await saveStep1Progress(userId, locationObj, finalAnswers);

        setProgress(prev => ({
          ...prev,
          step1: {
            completed: true,
            location: locationObj,
            answers: finalAnswers
          }
        }));
        setActiveStep(2);
        if (refreshCredits) {
          refreshCredits();
        }
      } catch (error) {
        console.error("Failed to save Step 1 progress:", error);
        let errorMsg = "Failed to complete Step 1. Please try again.";
        if (error.response && error.response.status === 429) {
          errorMsg = "You are performing this action too frequently. Please try again later.";
        } else if (error.response && error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        }
        alert(errorMsg);
      }
    }

    setIsTyping(false);
  };

  useEffect(() => {
    if (step1Stage !== 'chat' || !currentNodeId || !questionsData[currentNodeId]) return;

    const askQuestion = async () => {
      const node = questionsData[currentNodeId];
      await addAiMessageWithTyping(node.questionText);

      setOptionsList(node.options || []);
      setAllowFreeText(node.allowFreeText || false);
      setOptionsDisabled(false);

      if (node.id === 'q_location') {
        const locationVal = resolvedAddress || `${latitude}, ${longitude}`;
        await delay(500);
        await handleUserAnswer(locationVal);
      }
    };

    askQuestion();
  }, [currentNodeId, step1Stage]);


  // ----------------------------------------------------
  // STEP 2 HANDLERS
  // ----------------------------------------------------
  const handleFetchWeatherData = async () => {
    setIsFetchingWeather(true);
    setWeatherFetchError(null);
    try {
      // Fetch actual real-time weather summary data from Open-Meteo (completely free, no API key required)
      const latVal = parseFloat(latitude);
      const lonVal = parseFloat(longitude);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latVal}&longitude=${lonVal}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,shortwave_radiation`
      );

      if (!response.ok) throw new Error("Weather service request failed");
      const data = await response.json();

      const weatherSummary = {
        temp: data.current?.temperature_2m ?? 25.0,
        humidity: data.current?.relative_humidity_2m ?? 60,
        cloudCover: data.current?.cloud_cover ?? 10,
        windSpeed: data.current?.wind_speed_10m ?? 12,
        radiation: data.current?.shortwave_radiation ?? 500,
        fetchedAt: new Date().toISOString()
      };

      // Save to backend immediately
      await saveStep2Progress(userId, weatherSummary);

      setProgress(prev => ({
        ...prev,
        step2: {
          completed: true,
          weatherData: weatherSummary
        }
      }));

      setActiveStep(3);
    } catch (err) {
      console.error("Failed to fetch weather data:", err);
      // Fallback in case of rate limit or network failure
      const fallbackWeather = {
        temp: 24.5,
        humidity: 55,
        cloudCover: 15,
        windSpeed: 10.5,
        radiation: 480,
        fetchedAt: new Date().toISOString()
      };
      await saveStep2Progress(userId, fallbackWeather);
      setProgress(prev => ({
        ...prev,
        step2: {
          completed: true,
          weatherData: fallbackWeather
        }
      }));
      setActiveStep(3);
    } finally {
      setIsFetchingWeather(false);
    }
  };


  // ----------------------------------------------------
  // STEP 3 HANDLERS
  // ----------------------------------------------------
  const handleGeneratePrediction = async () => {
    setIsGeneratingPrediction(true);
    setPredictionError(false);

    try {
      // Call the backend Step 3 endpoint (no body needed, data is loaded from DB)
      const reportData = await saveStep3Progress(userId);

      setProgress(prev => ({
        ...prev,
        step3: {
          completed: true,
          predictionResult: reportData
        }
      }));

      // Notify parent to render the completed predictions page dashboard
      onPredictionComplete(reportData, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: resolvedAddress || `${latitude}, ${longitude}`,
        answers: answers
      });

      if (refreshCredits) {
        refreshCredits();
      }

    } catch (error) {
      console.error("Failed to generate solar predictions:", error);
      setPredictionError(true);
    } finally {
      setIsGeneratingPrediction(false);
    }
  };

  const handleStartNewPrediction = async () => {
    setIsLoadingProgress(true);
    try {
      await resetPredictionProgress(userId);
      setProgress({
        step1: { completed: false, location: null, answers: null },
        step2: { completed: false, weatherData: null },
        step3: { completed: false, predictionResult: null }
      });
      setStep1Stage('input');
      setLatitude('');
      setLongitude('');
      setResolvedAddress('');
      setMessages([]);
      setAnswers({});
      setActiveStep(1);
      if (onResetParent) {
        onResetParent();
      }
    } catch (err) {
      console.error("Reset progress failed", err);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  if (isLoadingProgress) {
    return (
      <div className="empty-state-wrapper">
        <div className="geocoding-box">
          <div className="geocoding-spinner"></div>
          <p style={{ color: 'var(--db-text-secondary)', fontSize: '0.95rem' }}>Restoring your prediction progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-container">
      {/* Visual Stepper */}
      <PredictionStepper activeStep={activeStep} progress={progress} />

      {/* Step Cards Grid / Stack */}
      <div className="step-card-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* ==================================================== */}
        {/* STEP 1: LOCATION & QUESTIONNAIRE CARD */}
        {/* ==================================================== */}
        <div className={`step-card ${activeStep === 1 ? 'active' : ''}`}>
          <div className="step-card-header">
            <div className="step-title-group">
              <span className="step-card-icon">📍</span>
              <div>
                <h3 className="step-card-title">Step 1: Location &amp; Siting Questionnaire</h3>
                <p className="step-card-desc">Enter your installation site coordinates and run the AI chatbot advisor.</p>
              </div>
            </div>
            <span className={`status-badge ${progress.step1.completed ? 'completed' : activeStep === 1 ? 'in-progress' : 'not-started'}`}>
              {progress.step1.completed ? 'Completed' : activeStep === 1 ? 'In Progress' : 'Not Started'}
            </span>
          </div>

          {activeStep === 1 && (
            <div className="step-content">
              {step1Stage === 'input' && (
                <div className="step-form-wrapper">
                  <div className="step-form-grid">
                    <div className="input-field-group">
                      <label htmlFor="w-latitude">Latitude</label>
                      <input
                        id="w-latitude"
                        type="number"
                        step="any"
                        className="input-box"
                        placeholder="e.g. 19.0760"
                        value={latitude}
                        onChange={(e) => {
                          setLatitude(e.target.value);
                          if (locationError) setLocationError('');
                        }}
                      />
                    </div>
                    <div className="input-field-group">
                      <label htmlFor="w-longitude">Longitude</label>
                      <input
                        id="w-longitude"
                        type="number"
                        step="any"
                        className="input-box"
                        placeholder="e.g. 72.8777"
                        value={longitude}
                        onChange={(e) => {
                          setLongitude(e.target.value);
                          if (locationError) setLocationError('');
                        }}
                      />
                    </div>
                  </div>
                  <div className="helper-link-group">
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="maps-link"
                    >
                      I don't know my latitude &amp; longitude
                    </a>
                    <span className="maps-helper-text">
                      Open Google Maps → Right-click your roof/site → Click coordinates to copy
                    </span>
                  </div>
                  {locationError && (
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '12px', fontWeight: '500' }}>
                      ⚠️ {locationError}
                    </div>
                  )}
                  <div className="step-actions">
                    <button
                      className="action-btn-primary"
                      disabled={!latitude || !longitude}
                      onClick={handleGeocodingLookup}
                    >
                      Next
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {step1Stage === 'resolving' && (
                <div className="geocoding-box">
                  <div className="geocoding-spinner"></div>
                  <p style={{ color: 'var(--db-text-secondary)', fontSize: '0.9rem' }}>Querying Nominatim OpenStreetMap API...</p>
                </div>
              )}

              {step1Stage === 'confirm' && (
                <div className="step-form-wrapper">
                  <div className="address-confirm-box">
                    <strong>Detected Address:</strong><br />
                    {resolvedAddress || `${latitude}, ${longitude}`}
                  </div>
                  <div className="step-actions">
                    <button className="action-btn-secondary" onClick={() => setStep1Stage('input')}>
                      Back
                    </button>
                    <button className="action-btn-primary" onClick={handleConfirmLocation}>
                      Confirm &amp; Start Chat
                      <Sparkles size={14} />
                    </button>
                  </div>
                </div>
              )}

              {step1Stage === 'chat' && (
                <div className="inline-chat-wrapper">
                  <div className="chat-container" style={{ maxHeight: '420px', height: '420px' }}>
                    <div className="chat-history">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`chat-message ${msg.sender === 'ai' ? 'chat-message-ai' : 'chat-message-user'}`}
                        >
                          {msg.sender === 'ai' && <div className="chat-avatar">S</div>}
                          <div className={`chat-bubble ${msg.sender === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="chat-message chat-message-ai">
                          <div className="chat-avatar">S</div>
                          <div className="chat-bubble chat-bubble-ai">
                            <div className="typing-indicator-dots">
                              <div className="typing-dot"></div>
                              <div className="typing-dot"></div>
                              <div className="typing-dot"></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <div className="chat-footer-controls" style={{ padding: '12px', background: 'rgba(0,0,0,0.1)' }}>
                      {optionsList.length > 0 && (
                        <div className="chat-options-wrapper">
                          {optionsList.map((opt, idx) => (
                            <button
                              key={idx}
                              className="chat-option-btn"
                              disabled={optionsDisabled || isTyping}
                              onClick={() => handleUserAnswer(opt)}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      )}

                      {allowFreeText && (
                        <div className="chat-input-area">
                          <div className="chat-input-wrapper" style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="chat-input"
                              placeholder="Type your answer here..."
                              value={userInputValue}
                              disabled={optionsDisabled || isTyping}
                              maxLength={1000}
                              onChange={(e) => {
                                if (e.target.value.length <= 1000) {
                                  setUserInputValue(e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendFreeText();
                              }}
                              style={{ paddingRight: '80px' }}
                            />
                            <span
                              className="chat-char-counter"
                              style={{
                                position: 'absolute',
                                right: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                fontFamily: 'monospace',
                                pointerEvents: 'none',
                                color: userInputValue.length >= 1000
                                  ? '#ef4444'
                                  : userInputValue.length >= 800
                                    ? '#f59e0b'
                                    : 'var(--db-text-muted, #8b8b8f)',
                                transition: 'color 0.2s ease',
                                background: 'rgba(20, 20, 25, 0.75)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: userInputValue.length >= 800
                                  ? (userInputValue.length >= 1000 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)')
                                  : '1px solid rgba(255, 255, 255, 0.05)'
                              }}
                            >
                              {userInputValue.length}/1000
                            </span>
                          </div>
                          <button
                            className="chat-send-btn"
                            disabled={optionsDisabled || isTyping || !userInputValue.trim()}
                            onClick={handleSendFreeText}
                          >
                            Send
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step1Stage === 'preview' && (
                <div className="preview-answers-wrapper" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                      📋 Review &amp; Edit Questionnaire Answers
                    </h4>
                    <button
                      className="action-btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', height: 'auto' }}
                      onClick={() => setStep1Stage('chat')}
                    >
                      Back to Chat
                    </button>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--db-text-secondary)', marginBottom: '16px' }}>
                    <strong>📍 Installation Site Location</strong>
                    <span>Address: {resolvedAddress || `${latitude}, ${longitude}`}</span>
                    <span>Coords: {latitude}, {longitude}</span>
                  </div>

                  <div className="preview-list" style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '380px', paddingRight: '4px', marginBottom: '20px' }}>
                    {Object.keys(answers)
                      .filter(key => questionsData[key] && !questionsData[key].isIntro)
                      .map((key) => {
                        const question = questionsData[key];
                        return (
                          <div
                            key={key}
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: '8px',
                              padding: '12px 16px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            <div style={{ fontSize: '0.8rem', color: 'var(--db-text-secondary)', fontWeight: '500' }}>
                              {question.questionText}
                            </div>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                              <textarea
                                className="chat-input"
                                value={answers[key] || ''}
                                maxLength={1000}
                                onChange={(e) => {
                                  if (e.target.value.length <= 1000) {
                                    setAnswers(prev => ({
                                      ...prev,
                                      [key]: e.target.value
                                    }));
                                  }
                                }}
                                rows={2}
                                style={{
                                  width: '100%',
                                  background: 'rgba(0,0,0,0.2)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  color: '#fff',
                                  borderRadius: '6px',
                                  padding: '8px 10px',
                                  fontSize: '0.85rem',
                                  resize: 'vertical',
                                  outline: 'none',
                                  paddingRight: '60px',
                                  minHeight: '60px',
                                  lineHeight: '1.4'
                                }}
                              />
                              <span
                                style={{
                                  position: 'absolute',
                                  right: '10px',
                                  bottom: '8px',
                                  fontSize: '0.7rem',
                                  fontFamily: 'monospace',
                                  color: (answers[key] || '').length >= 1000
                                    ? '#ef4444'
                                    : (answers[key] || '').length >= 800
                                      ? '#f59e0b'
                                      : 'var(--db-text-muted)',
                                  background: 'rgba(20,20,25,0.85)',
                                  padding: '2px 4px',
                                  borderRadius: '3px',
                                  pointerEvents: 'none'
                                }}
                              >
                                {(answers[key] || '').length}/1000
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="step-actions" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    <button
                      className="action-btn-secondary"
                      onClick={() => {
                        // Restart chat
                        let sanitizedAddress = resolvedAddress || '';
                        if (sanitizedAddress.length > 500) {
                          sanitizedAddress = sanitizedAddress.substring(0, 500);
                        }
                        setAnswers({
                          latitude: parseFloat(latitude),
                          longitude: parseFloat(longitude),
                          resolvedAddress: sanitizedAddress
                        });
                        setMessages([]);
                        setCurrentNodeId('q_welcome');
                        setStep1Stage('chat');
                      }}
                    >
                      Restart Chat
                    </button>
                    <button
                      className="action-btn-primary"
                      onClick={() => completeStep1(answers, progress.step1.completed)}
                    >
                      {progress.step1.completed ? 'Save Edited Answers' : 'Confirm & Submit'}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {progress.step1.completed && (
            <div className="step-summary-view" style={{ fontSize: '0.85rem', color: 'var(--db-text-secondary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span className="summary-pill" style={{ color: 'var(--db-success)' }}>✓ Location Confirmed ({progress.step1.location?.lat.toFixed(4)}, {progress.step1.location?.lon.toFixed(4)})</span>
              <span className="summary-pill">✓ Siting Chat Questionnaire Complete</span>
              <button
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: 'var(--db-accent)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={async () => {
                  try {
                    setIsTyping(true);

                    // 1. Check rate limit
                    const limitCheck = await checkEditRateLimit();
                    if (!limitCheck.allowed) {
                      const mins = Math.ceil(limitCheck.retryAfterSeconds / 60);
                      alert(`You are editing answers too frequently. Please wait ${mins} minute(s) before trying again.`);
                      setIsTyping(false);
                      return;
                    }

                    // 2. Fetch fresh progress data from MongoDB (using new getStep1Data with frontend memory caching)
                    let freshProgress = null;
                    const cacheKey = `step1_edit_cache_${userId}`;
                    const cachedStr = localStorage.getItem(cacheKey);

                    try {
                      if (cachedStr) {
                        freshProgress = JSON.parse(cachedStr);
                      } else {
                        freshProgress = await getStep1Data(userId);
                        localStorage.setItem(cacheKey, JSON.stringify(freshProgress));
                      }
                    } catch (err) {
                      if (err.response && err.response.status === 429) {
                        alert("You have reached the maximum fetch limit for Step 1 data (2 requests per 30 mins). Using previously loaded data.");
                      } else {
                        console.error("Error fetching step1 data", err);
                      }
                    }

                    if (freshProgress && freshProgress.location && freshProgress.answers) {
                      // Update progress state with the fresh MongoDB values
                      setProgress(prev => ({
                        ...prev,
                        step1: {
                          completed: true,
                          location: freshProgress.location,
                          answers: freshProgress.answers
                        }
                      }));

                      // Populate local inputs from MongoDB response
                      setLatitude(String(freshProgress.location.lat || ''));
                      setLongitude(String(freshProgress.location.lon || ''));
                      setResolvedAddress(freshProgress.location.address || '');
                      setAnswers(freshProgress.answers);
                    } else {
                      // Fallback to local state if no fresh progress is returned
                      if (progress.step1.location) {
                        setLatitude(String(progress.step1.location.lat || ''));
                        setLongitude(String(progress.step1.location.lon || ''));
                        setResolvedAddress(progress.step1.location.address || '');
                      }
                      if (progress.step1.answers) {
                        setAnswers(progress.step1.answers);
                      }
                    }

                    // 3. Switch view to edit preview
                    setActiveStep(1);
                    setStep1Stage('preview');
                  } catch (error) {
                    console.error("Failed to check rate limit or fetch fresh data:", error);
                    alert("Unable to fetch the questionnaire data. Please check your connection and try again.");
                  } finally {
                    setIsTyping(false);
                  }
                }}
              >
                ✏️ Edit Answers
              </button>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* STEP 2: FETCH WEATHER DATA CARD */}
        {/* ==================================================== */}
        <div className={`step-card ${activeStep === 2 ? 'active' : ''}`}>
          <div className="step-card-header">
            <div className="step-title-group">
              <span className="step-card-icon">🌤️</span>
              <div>
                <h3 className="step-card-title">Step 2: Micro-climate Meteorological Siting</h3>
                <p className="step-card-desc">Query live high-resolution weather models for the coordinates.</p>
              </div>
            </div>
            <span className={`status-badge ${progress.step2.completed ? 'completed' : activeStep === 2 ? 'in-progress' : 'not-started'}`}>
              {progress.step2.completed ? 'Completed' : activeStep === 2 ? 'In Progress' : 'Not Started'}
            </span>
          </div>

          {activeStep === 2 && (
            <div className="step-content">
              <p style={{ fontSize: '0.85rem', color: 'var(--db-text-secondary)', lineHeight: '1.5' }}>
                We will query satellite records and micro-climate models to retrieve atmospheric parameters:
                irradiance, cloud cover index, ambient temperature coefficients, and humidity records.
              </p>

              {isFetchingWeather ? (
                <div className="geocoding-box" style={{ margin: '16px 0' }}>
                  <div className="geocoding-spinner"></div>
                  <p style={{ color: 'var(--db-text-secondary)', fontSize: '0.9rem' }}>Querying weather data model API...</p>
                </div>
              ) : (
                <div className="step-actions">
                  <button className="action-btn-primary" onClick={handleFetchWeatherData}>
                    <RefreshCw size={14} />
                    Fetch Weather Data
                  </button>
                </div>
              )}
            </div>
          )}

          {progress.step2.completed && progress.step2.weatherData && (
            <div className="weather-summary-card">
              <div className="weather-summary-header">
                <CheckCircle2 size={16} style={{ color: 'var(--db-success)' }} />
                <span>Fetched Weather Siting Summary</span>
              </div>
              <div className="weather-grid">
                <div className="weather-kpi-item">
                  <span className="weather-kpi-label"><Thermometer size={12} style={{ marginRight: '4px' }} /> Temp</span>
                  <span className="weather-kpi-val">{progress.step2.weatherData.temp.toFixed(1)} °C</span>
                </div>
                <div className="weather-kpi-item">
                  <span className="weather-kpi-label"><Sun size={12} style={{ marginRight: '4px' }} /> Irradiance</span>
                  <span className="weather-kpi-val">{progress.step2.weatherData.radiation.toFixed(0)} W/m²</span>
                </div>
                <div className="weather-kpi-item">
                  <span className="weather-kpi-label"><CloudSun size={12} style={{ marginRight: '4px' }} /> Cloud Cover</span>
                  <span className="weather-kpi-val">{progress.step2.weatherData.cloudCover}%</span>
                </div>
                <div className="weather-kpi-item">
                  <span className="weather-kpi-label"><Wind size={12} style={{ marginRight: '4px' }} /> Wind Speed</span>
                  <span className="weather-kpi-val">{progress.step2.weatherData.windSpeed.toFixed(1)} km/h</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* STEP 3: AI SOLAR PREDICTION CARD */}
        {/* ==================================================== */}
        <div className={`step-card ${activeStep === 3 ? 'active' : ''}`}>
          <div className="step-card-header">
            <div className="step-title-group">
              <span className="step-card-icon">☀️</span>
              <div>
                <h3 className="step-card-title">Step 3: AI Feasibility &amp; Siting Diagnostics</h3>
                <p className="step-card-desc">Execute AI solver models to generate the final performance report.</p>
              </div>
            </div>
            <span className={`status-badge ${progress.step3.completed ? 'completed' : activeStep === 3 ? 'in-progress' : 'not-started'}`}>
              {progress.step3.completed ? 'Completed' : activeStep === 3 ? 'In Progress' : 'Not Started'}
            </span>
          </div>

          {activeStep === 3 && (
            <div className="step-content">
              <p style={{ fontSize: '0.85rem', color: 'var(--db-text-secondary)', lineHeight: '1.5' }}>
                Generate your customized solar report. This aggregates your location details, chatbot questionnaire answers,
                and climate profiles into a 12-month aggregated feasibility model.
                <br />
                <strong style={{ color: 'var(--db-accent)' }}>Note: This operation consumes 1 report credit.</strong>
              </p>

              {isGeneratingPrediction ? (
                <div className="prediction-loader-box">
                  <div className="pulse-solar-orb">
                    <div className="pulse-solar-ring"></div>
                  </div>
                  <div className="rotating-message">
                    {loadingMessages[loadingMessageIndex]}
                  </div>
                </div>
              ) : (
                <>
                  {predictionError && (
                    <div className="alert-log-row highlighted-warn" style={{ marginBottom: '16px' }}>
                      <div className="row-icon-wrapper alert-warn">
                        <AlertTriangle size={20} />
                      </div>
                      <div className="alert-body">
                        <h3 className="warning">Prediction Generation Failed</h3>
                        <p>Unable to connect to the prediction pipeline. Ensure you have report credits remaining and try again.</p>
                      </div>
                    </div>
                  )}

                  <div className="step-actions">
                    <button className="action-btn-primary" onClick={handleGeneratePrediction}>
                      <Sparkles size={14} />
                      Generate Prediction
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {progress.step3.completed && (
            <div className="success-banner" style={{ marginTop: '20px' }}>
              <div className="success-icon-box">
                <CheckCircle2 size={24} />
              </div>
              <h2>Prediction Ready!</h2>
              <p>Your solar feasibility report has been successfully generated using the AI climatology solver.</p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  className="action-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 16px' }}
                  onClick={() => {
                    if (progress.step3.predictionResult && progress.step1.location) {
                      onPredictionComplete(progress.step3.predictionResult, {
                        latitude: parseFloat(progress.step1.location.lat),
                        longitude: parseFloat(progress.step1.location.lon),
                        address: progress.step1.location.address,
                        answers: progress.step1.answers
                      });
                    }
                  }}
                >
                  <Eye size={14} />
                  View Report
                </button>
                <button
                  className="action-btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '8px 16px', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                  onClick={handleStartNewPrediction}
                >
                  <RefreshCcw size={14} />
                  Start New Prediction
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default PredictionWizard;
