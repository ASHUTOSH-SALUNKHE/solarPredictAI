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

const PredictionWizard = ({ userId, onPredictionComplete, onResetParent, initialReportData, refreshCredits, credits }) => {
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

  // Inline confirm dialogs (replaces window.confirm)
  const [step1ConfirmPending, setStep1ConfirmPending] = useState(null); // { finalAnswers, editMode }
  const [step3ConfirmPending, setStep3ConfirmPending] = useState(false);

  // Save/submit error states
  const [step1SaveError, setStep1SaveError] = useState(null);
  const [step3GenerateError, setStep3GenerateError] = useState(null); // typed error object { type, message }

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');

  const chatEndRef = useRef(null);

  // Step 2: Fetch Weather Data states
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const [weatherFetchError, setWeatherFetchError] = useState(null); // { type, message }

  // Step 3: AI Prediction states
  const [isGeneratingPrediction, setIsGeneratingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState(null); // { type, message }
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
        if (savedProgress && savedProgress.step !== undefined) {
          const newProgress = { ...progress };

          let step1Data = (savedProgress.location && savedProgress.answers) ? savedProgress : null;
          if (savedProgress.step >= 1 && !step1Data) {
            try {
              step1Data = await getStep1Data(userId);
            } catch (err) {
              console.warn("Failed to fetch step 1 data on mount", err);
            }
          }

          if (savedProgress.step >= 1 && step1Data) {
            newProgress.step1 = {
              completed: true,
              location: step1Data.location,
              answers: step1Data.answers
            };
            setLatitude(step1Data.location?.lat || '');
            setLongitude(step1Data.location?.lon || '');
            setResolvedAddress(step1Data.location?.address || '');
            setAnswers(step1Data.answers || {});
            setStep1Stage('chat');
            setActiveStep(2);
          }

          let step2Data = savedProgress.weatherData ? savedProgress.weatherData : null;
          if (savedProgress.step >= 2 && !step2Data) {
            try {
              const fullWeather = await getStep2Data(userId);
              if (fullWeather) {
                if (fullWeather.temp !== undefined) {
                  // Already in summary format
                  step2Data = fullWeather;
                } else {
                  // Detailed weather data format
                  const m0 = fullWeather.monthlyData?.[0] || {};
                  step2Data = {
                    temp: m0.temperatureMean !== undefined ? m0.temperatureMean : (m0.temperature ?? 25.0),
                    humidity: m0.humidityMean !== undefined ? m0.humidityMean : (m0.humidity ?? 60),
                    cloudCover: m0.cloudcoverMean !== undefined ? m0.cloudcoverMean : (m0.cloud_cover ?? 10),
                    windSpeed: m0.windSpeedMean !== undefined ? m0.windSpeedMean : (m0.wind_speed ?? 12),
                    radiation: m0.ghiMean !== undefined ? m0.ghiMean : (m0.GHI ?? 500),
                    fetchedAt: fullWeather.createdAt || new Date().toISOString()
                  };
                }
              }
            } catch (err) {
              console.warn("Failed to fetch step 2 data on mount", err);
            }
          }

          if (savedProgress.step >= 2 && step2Data) {
            newProgress.step2 = {
              completed: true,
              weatherData: step2Data
            };
            setActiveStep(3);
          }

          let step3Report = null;
          if (savedProgress.step >= 3) {
            newProgress.step3 = {
              completed: true
            };
            // Instantly load completed prediction results into parent
            if (step1Data && step1Data.location) {
              try {
                step3Report = await getSolarReport(userId);
                if (step3Report) {
                  newProgress.step3.predictionResult = step3Report;
                  onPredictionComplete(step3Report, {
                    latitude: parseFloat(step1Data.location.lat),
                    longitude: parseFloat(step1Data.location.lon),
                    address: step1Data.location.address,
                    answers: step1Data.answers,
                    weatherData: step2Data
                  });
                }
              } catch (err) {
                console.warn("Failed to fetch report on mount", err);
              }
            }
          }

          // Centralize and save the fully resolved step data in the central localStorage progress key
          const fullProgressCached = {
            userId,
            step: savedProgress.step,
            status: 'completed',
            location: step1Data?.location || null,
            answers: step1Data?.answers || null,
            weatherData: step2Data || null,
            predictionResult: step3Report || null,
            completedAt: new Date().toISOString()
          };
          localStorage.setItem(`prediction_progress_${userId}`, JSON.stringify(fullProgressCached));

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
    // Show inline confirm dialog instead of window.confirm
    setStep1ConfirmPending({ finalAnswers, editMode });
  };

  const _doCompleteStep1 = async (finalAnswers, editMode) => {
    setStep1ConfirmPending(null);
    setStep1SaveError(null);
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
        await editAnswersStep1(userId, finalAnswers);
        localStorage.removeItem(`step1_edit_cache_${userId}`);
        setProgress(prev => ({
          ...prev,
          step1: { ...prev.step1, answers: finalAnswers }
        }));
        if (progress.step2.completed) {
          setActiveStep(3);
        } else {
          setActiveStep(2);
        }
        setStep1Stage('chat');
      } catch (error) {
        console.error("Failed to save edited answers:", error);
        let errType = 'generic';
        let errMsg = "Failed to save edited answers. Please try again.";
        if (error.response?.status === 429) {
          errType = 'rateLimit';
          errMsg = error.response.data?.message || "You are editing too frequently. Please wait 1 hour before editing again.";
        } else if (error.response?.status === 402 || error.response?.data?.error === 'INSUFFICIENT_CREDITS') {
          errType = 'credits';
          errMsg = error.response.data?.message || "Insufficient credits.";
        } else if (error.response?.data?.message) {
          errMsg = error.response.data.message;
        }
        setStep1SaveError({ type: errType, message: errMsg });
      }
    } else {
      try {
        await addAiMessageWithTyping("Fantastic! I've noted down all your details. Step 1 is complete! Click the button below to fetch weather data. 🌤️");
        await saveStep1Progress(userId, locationObj, finalAnswers);
        setProgress(prev => ({
          ...prev,
          step1: { completed: true, location: locationObj, answers: finalAnswers }
        }));
        setActiveStep(2);
        if (refreshCredits) refreshCredits();
      } catch (error) {
        console.error("Failed to save Step 1 progress:", error);
        let errType = 'generic';
        let errMsg = "Failed to complete Step 1. Please try again.";
        if (error.response?.status === 429) {
          errType = 'rateLimit';
          errMsg = error.response.data?.message || "You are performing this action too frequently. Please try again later.";
        } else if (error.response?.data?.message) {
          errMsg = error.response.data.message;
        }
        setStep1SaveError({ type: errType, message: errMsg });
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

      await saveStep2Progress(userId, weatherSummary);

      setProgress(prev => ({
        ...prev,
        step2: { completed: true, weatherData: weatherSummary }
      }));
      setActiveStep(3);
    } catch (err) {
      console.error("Failed to fetch weather data:", err);

      // Classify the error type
      const status = err.response?.status;
      const errData = err.response?.data;
      const isInsufficientCredits = status === 402 || errData?.error === 'INSUFFICIENT_CREDITS';
      const isRateLimit = status === 429;

      if (isInsufficientCredits) {
        setWeatherFetchError({
          type: 'credits',
          message: errData?.message || "Insufficient credits. Minimum 40 credits required for weather processing."
        });
        setIsFetchingWeather(false);
        return;
      }
      if (isRateLimit) {
        setWeatherFetchError({
          type: 'rateLimit',
          message: errData?.message || "You are making too many requests. Please wait a moment and try again."
        });
        setIsFetchingWeather(false);
        return;
      }

      // For network/API errors, attempt fallback weather
      const fallbackWeather = {
        temp: 24.5, humidity: 55, cloudCover: 15,
        windSpeed: 10.5, radiation: 480,
        fetchedAt: new Date().toISOString()
      };

      try {
        await saveStep2Progress(userId, fallbackWeather);
        setProgress(prev => ({
          ...prev,
          step2: { completed: true, weatherData: fallbackWeather }
        }));
        setActiveStep(3);
      } catch (fallbackErr) {
        console.error("Failed to save fallback weather data:", fallbackErr);
        const fbStatus = fallbackErr.response?.status;
        const fbData = fallbackErr.response?.data;
        if (fbStatus === 402 || fbData?.error === 'INSUFFICIENT_CREDITS') {
          setWeatherFetchError({
            type: 'credits',
            message: fbData?.message || "Insufficient credits. Minimum 40 credits required for weather processing."
          });
        } else if (fbStatus === 429) {
          setWeatherFetchError({
            type: 'rateLimit',
            message: fbData?.message || "Too many requests. Please wait and try again."
          });
        } else {
          setWeatherFetchError({
            type: 'generic',
            message: "Failed to process weather data. Please try again."
          });
        }
      }
    } finally {
      setIsFetchingWeather(false);
    }
  };


  // ----------------------------------------------------
  // STEP 3 HANDLERS
  // ----------------------------------------------------
  const handleGeneratePrediction = async () => {
    setStep3ConfirmPending(false);
    setIsGeneratingPrediction(true);
    setPredictionError(null);

    try {
      const reportData = await saveStep3Progress(userId);

      setProgress(prev => ({
        ...prev,
        step3: { completed: true, predictionResult: reportData }
      }));

      onPredictionComplete(reportData, {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: resolvedAddress || `${latitude}, ${longitude}`,
        answers: answers,
        weatherData: progress.step2.weatherData
      });

      if (refreshCredits) refreshCredits();

    } catch (error) {
      console.error("Failed to generate solar predictions:", error);
      const status = error.response?.status;
      const errData = error.response?.data;
      if (status === 402 || errData?.error === 'INSUFFICIENT_CREDITS') {
        setPredictionError({
          type: 'credits',
          message: errData?.message || "Insufficient credits. Minimum 50 credits required for AI Solar Report."
        });
      } else if (status === 429) {
        setPredictionError({
          type: 'rateLimit',
          message: errData?.message || "Too many requests. Please wait a moment and try again."
        });
      } else if (status === 401 && errData?.error === 'PROGRESS_MISMATCH') {
        setPredictionError({
          type: 'mismatch',
          message: errData?.message || "Your session state is out of sync. Please refresh and try again."
        });
      } else {
        setPredictionError({
          type: 'generic',
          message: "Unable to connect to the prediction pipeline. Please try again later."
        });
      }
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
      setResetConfirmInput('');
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
      {/* Credits Bar */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
        marginBottom: '16px', paddingBottom: '12px',
        borderBottom: '1px solid var(--db-border)'
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: credits !== null && credits < 50
            ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.07)',
          border: credits !== null && credits < 50
            ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.2)',
          borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: '600'
        }}>
          <Zap size={13} style={{ color: credits !== null && credits < 50 ? '#ef4444' : 'var(--db-accent)' }} />
          <span style={{ color: 'var(--db-text-secondary)', fontWeight: '400' }}>Credits:</span>
          <span style={{ color: credits !== null && credits < 50 ? '#ef4444' : 'var(--db-accent-warm)' }}>
            {credits !== null ? (typeof credits === 'object' ? credits.balance : credits) : '…'}
          </span>
          {credits !== null && credits < 50 && (
            <span style={{ color: '#ef4444', fontSize: '0.72rem', fontWeight: '500' }}>— Low balance</span>
          )}
        </div>
      </div>

      {/* Inline Step 1 Submit Confirm Dialog */}
      {step1ConfirmPending && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            padding: '28px', maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--db-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: step1ConfirmPending.editMode ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.4rem' }}>{step1ConfirmPending.editMode ? '✏️' : '📋'}</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--db-text-primary)' }}>
                  {step1ConfirmPending.editMode ? 'Save Edited Answers?' : 'Submit Questionnaire?'}
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--db-text-secondary)', lineHeight: '1.4' }}>
                  {step1ConfirmPending.editMode
                    ? 'This will update your answers. No credits will be deducted.'
                    : <>This will submit your siting questionnaire and deduct <strong style={{ color: 'var(--db-accent)' }}>10 credits</strong> from your balance.</>}
                </p>
              </div>
            </div>
            {credits !== null && !step1ConfirmPending.editMode && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: credits < 10 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                border: credits < 10 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.15)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem'
              }}>
                <span style={{ color: 'var(--db-text-secondary)' }}>Your balance:</span>
                <span style={{ fontWeight: '700', color: credits < 10 ? '#ef4444' : 'var(--db-accent-warm)' }}>
                  {credits} → {Math.max(0, credits - 10)} credits
                </span>
              </div>
            )}
            {credits !== null && !step1ConfirmPending.editMode && credits < 10 && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '0.82rem', color: '#991b1b', fontWeight: '500'
              }}>
                ⚠️ Insufficient credits. You need at least 10 credits to submit.
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--db-border)',
                  background: 'transparent', color: 'var(--db-text-secondary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem'
                }}
                onClick={() => setStep1ConfirmPending(null)}
              >Cancel</button>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: credits !== null && !step1ConfirmPending.editMode && credits < 10
                    ? 'rgba(156,163,175,0.4)' : 'var(--db-accent)',
                  color: '#fff', cursor: credits !== null && !step1ConfirmPending.editMode && credits < 10 ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '0.85rem'
                }}
                disabled={credits !== null && !step1ConfirmPending.editMode && credits < 10}
                onClick={() => _doCompleteStep1(step1ConfirmPending.finalAnswers, step1ConfirmPending.editMode)}
              >{step1ConfirmPending.editMode ? 'Save Changes' : 'Confirm & Submit'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Step 3 Generate Confirm Dialog */}
      {step3ConfirmPending && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            padding: '28px', maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--db-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(251,191,36,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.4rem' }}>☀️</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--db-text-primary)' }}>
                  Generate AI Solar Report?
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--db-text-secondary)', lineHeight: '1.4' }}>
                  This will run the full Gemini AI feasibility analysis and deduct{' '}
                  <strong style={{ color: 'var(--db-accent)' }}>50 credits</strong> from your balance.
                </p>
              </div>
            </div>
            {credits !== null && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: credits < 50 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                border: credits < 50 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(245,158,11,0.15)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem'
              }}>
                <span style={{ color: 'var(--db-text-secondary)' }}>Your balance:</span>
                <span style={{ fontWeight: '700', color: credits < 50 ? '#ef4444' : 'var(--db-accent-warm)' }}>
                  {credits} → {Math.max(0, credits - 50)} credits
                </span>
              </div>
            )}
            {credits !== null && credits < 50 && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '0.82rem', color: '#991b1b', fontWeight: '500'
              }}>
                ⚠️ Insufficient credits. You need at least 50 credits to generate the AI report.
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--db-border)',
                  background: 'transparent', color: 'var(--db-text-secondary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem'
                }}
                onClick={() => setStep3ConfirmPending(false)}
              >Cancel</button>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: credits !== null && credits < 50 ? 'rgba(156,163,175,0.4)' : 'linear-gradient(135deg, #f59e0b, #e58c00)',
                  color: '#fff',
                  cursor: credits !== null && credits < 50 ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '0.85rem'
                }}
                disabled={credits !== null && credits < 50}
                onClick={handleGeneratePrediction}
              >Generate Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Reset Confirm Dialog */}
      {showResetConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px',
            padding: '28px', maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)', border: '1px solid var(--db-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(239,68,68,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--db-text-primary)' }}>
                  Start New Generation?
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--db-text-secondary)', lineHeight: '1.4' }}>
                  This will permanently delete your current prediction progress, detailed weather data, and the AI solar report.
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--db-text-secondary)', marginBottom: '8px', fontWeight: '500' }}>
                Please type <strong style={{ color: 'var(--db-text-primary)' }}>new generation</strong> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="new generation"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid var(--db-border)', fontSize: '0.9rem',
                  outline: 'none', background: 'var(--db-surface)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--db-border)',
                  background: 'transparent', color: 'var(--db-text-secondary)', cursor: 'pointer', fontWeight: '500', fontSize: '0.85rem'
                }}
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmInput('');
                }}
              >Cancel</button>
              <button
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                  background: resetConfirmInput.trim().toLowerCase() !== 'new generation' ? 'rgba(239,68,68,0.4)' : '#ef4444',
                  color: '#fff', cursor: resetConfirmInput.trim().toLowerCase() !== 'new generation' ? 'not-allowed' : 'pointer',
                  fontWeight: '600', fontSize: '0.85rem'
                }}
                disabled={resetConfirmInput.trim().toLowerCase() !== 'new generation'}
                onClick={() => {
                  setShowResetConfirm(false);
                  handleStartNewPrediction();
                }}
              >Delete & Start</button>
            </div>
          </div>
        </div>
      )}

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

                    <div className="chat-footer-controls" style={{ padding: '12px', background: 'rgba(255,255,255,0.5)', borderTop: '1px solid var(--db-border)' }}>
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
                    <h4 style={{ color: 'var(--db-text-primary)', margin: 0, fontSize: '1rem', fontWeight: '600' }}>
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

                  <div style={{ padding: '12px', background: 'var(--db-surface)', border: '1px dashed var(--db-border-hover)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--db-text-secondary)', marginBottom: '16px' }}>
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
                              background: 'var(--db-surface)',
                              border: '1px solid var(--db-border)',
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
                                  background: 'rgba(255,255,255,0.6)',
                                  border: '1px solid var(--db-border)',
                                  color: 'var(--db-text-primary)',
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

                  {/* Step 1 Save Error */}
                  {step1SaveError && (
                    <div style={{
                      display: 'flex', gap: '10px', padding: '14px 16px',
                      background: step1SaveError.type === 'credits' ? 'rgba(239,68,68,0.07)'
                        : step1SaveError.type === 'rateLimit' ? 'rgba(245,158,11,0.07)'
                        : 'rgba(239,68,68,0.07)',
                      border: `1px solid ${step1SaveError.type === 'rateLimit' ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      borderRadius: '8px', marginTop: '12px', alignItems: 'flex-start'
                    }}>
                      <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
                        {step1SaveError.type === 'rateLimit' ? '⏳' : step1SaveError.type === 'credits' ? '💳' : '⚠️'}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: step1SaveError.type === 'rateLimit' ? '#92400e' : '#991b1b', marginBottom: '3px' }}>
                          {step1SaveError.type === 'rateLimit' ? 'Rate Limit Reached' : step1SaveError.type === 'credits' ? 'Insufficient Credits' : 'Submission Failed'}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: step1SaveError.type === 'rateLimit' ? '#78350f' : '#7f1d1d', lineHeight: '1.4' }}>
                          {step1SaveError.message}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="step-actions" style={{ marginTop: '20px', borderTop: '1px solid var(--db-border)', paddingTop: '16px' }}>
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
                      onClick={() => { setStep1SaveError(null); completeStep1(answers, progress.step1.completed); }}
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

              {progress.step3.completed ? (
                /* Step 3 is done — answers are locked because AI already used them */
                <span
                  title="Answers are locked after the AI prediction report has been generated."
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    color: '#ef4444',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'not-allowed',
                    opacity: 0.75
                  }}
                >
                  <Lock size={12} />
                  Answers Locked
                </span>
              ) : (
                /* Steps 1 or 2 completed — editing is still allowed */
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
              )}
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

              {weatherFetchError && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '16px',
                  background: weatherFetchError.type === 'rateLimit' ? 'rgba(245,158,11,0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: weatherFetchError.type === 'rateLimit' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  marginTop: '12px',
                  alignItems: 'flex-start'
                }}>
                  <div style={{
                    color: weatherFetchError.type === 'rateLimit' ? '#d97706' : '#ef4444',
                    flexShrink: 0, marginTop: '2px'
                  }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <h4 style={{
                      margin: 0, fontSize: '0.9rem', fontWeight: '700',
                      color: weatherFetchError.type === 'rateLimit' ? '#92400e' : '#991b1b'
                    }}>
                      {weatherFetchError.type === 'credits' ? '💳 Insufficient Credits'
                        : weatherFetchError.type === 'rateLimit' ? '⏳ Rate Limit Reached'
                        : '⚠️ Weather Siting Failed'}
                    </h4>
                    <p style={{
                      margin: 0, fontSize: '0.85rem', lineHeight: '1.4', fontWeight: '500',
                      color: weatherFetchError.type === 'rateLimit' ? '#78350f' : '#7f1d1d'
                    }}>
                      {weatherFetchError.message}
                    </p>
                    {weatherFetchError.type === 'credits' && credits !== null && (
                      <div style={{
                        marginTop: '6px', padding: '8px 12px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                        fontSize: '0.8rem', color: '#991b1b', fontWeight: '500',
                        display: 'flex', justifyContent: 'space-between'
                      }}>
                        <span>Current Balance:</span>
                        <span style={{ fontWeight: '700' }}>{credits} credits (need 40)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
                <strong style={{ color: 'var(--db-accent)' }}>Note: This operation consumes 50 credits from your balance.</strong>
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
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '16px',
                      background: predictionError.type === 'rateLimit' ? 'rgba(245,158,11,0.08)'
                        : predictionError.type === 'mismatch' ? 'rgba(139,92,246,0.08)'
                        : 'rgba(239, 68, 68, 0.08)',
                      border: predictionError.type === 'rateLimit' ? '1px solid rgba(245,158,11,0.3)'
                        : predictionError.type === 'mismatch' ? '1px solid rgba(139,92,246,0.3)'
                        : '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '8px',
                      marginBottom: '16px',
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        color: predictionError.type === 'rateLimit' ? '#d97706'
                          : predictionError.type === 'mismatch' ? '#7c3aed'
                          : '#ef4444',
                        flexShrink: 0, marginTop: '2px'
                      }}>
                        <AlertTriangle size={20} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h4 style={{
                          margin: 0, fontSize: '0.9rem', fontWeight: '700',
                          color: predictionError.type === 'rateLimit' ? '#92400e'
                            : predictionError.type === 'mismatch' ? '#4c1d95'
                            : '#991b1b'
                        }}>
                          {predictionError.type === 'credits' ? '💳 Insufficient Credits'
                            : predictionError.type === 'rateLimit' ? '⏳ Rate Limit Reached'
                            : predictionError.type === 'mismatch' ? '🔒 Session Out of Sync'
                            : '⚠️ Prediction Generation Failed'}
                        </h4>
                        <p style={{
                          margin: 0, fontSize: '0.85rem', lineHeight: '1.5', fontWeight: '500',
                          color: predictionError.type === 'rateLimit' ? '#78350f'
                            : predictionError.type === 'mismatch' ? '#3b0764'
                            : '#7f1d1d'
                        }}>
                          {predictionError.message}
                        </p>
                        {predictionError.type === 'credits' && credits !== null && (
                          <div style={{
                            marginTop: '6px', padding: '8px 12px', borderRadius: '6px',
                            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                            fontSize: '0.8rem', color: '#991b1b', fontWeight: '500',
                            display: 'flex', justifyContent: 'space-between'
                          }}>
                            <span>Current Balance:</span>
                            <span style={{ fontWeight: '700' }}>{credits} credits (need 50)</span>
                          </div>
                        )}
                        {predictionError.type === 'rateLimit' && (
                          <div style={{
                            marginTop: '6px', fontSize: '0.8rem',
                            color: '#78350f', fontStyle: 'italic'
                          }}>
                            The rate limit will reset automatically. Please try again shortly.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="step-actions">
                    <button className="action-btn-primary" onClick={() => { setPredictionError(null); setStep3ConfirmPending(true); }}>
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
                        answers: progress.step1.answers,
                        weatherData: progress.step2.weatherData
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
                  onClick={() => setShowResetConfirm(true)}
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
