import api from './api';

const getLocalStorageProgress = (userId) => {
  const data = localStorage.getItem(`prediction_progress_${userId}`);
  return data ? JSON.parse(data) : null;
};

const setLocalStorageProgress = (userId, progressData) => {
  localStorage.setItem(`prediction_progress_${userId}`, JSON.stringify(progressData));
};

export const getPredictionProgress = async (userId) => {
  const cached = getLocalStorageProgress(userId);
  if (cached) {
    return cached;
  }

  try {
    const response = await api.get('/api/prediction/progress');
    if (response.data) {
      const progress = response.data;
      setLocalStorageProgress(userId, progress);

      // Proactively sync step1 cache if data is available
      if (progress.step >= 1 && progress.location && progress.answers) {
        localStorage.setItem(`step1_data_cache_${userId}`, JSON.stringify({
          location: progress.location,
          answers: progress.answers
        }));
        localStorage.setItem(`step1_edit_cache_${userId}`, JSON.stringify({
          location: progress.location,
          answers: progress.answers
        }));
      }
    }
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API GET /api/prediction/progress failed, falling back to localStorage.', error);
    return cached;
  }
};

export const getStep1Data = async (userId) => {
  const cachedStr = localStorage.getItem(`step1_data_cache_${userId}`);
  if (cachedStr && cachedStr !== 'null') {
    try {
      const parsed = JSON.parse(cachedStr);
      if (parsed) return parsed;
    } catch (e) {}
  }

  // Fallback to central progress cache
  const progress = getLocalStorageProgress(userId);
  if (progress && progress.step >= 1 && progress.location && progress.answers) {
    const step1Data = {
      location: progress.location,
      answers: progress.answers
    };
    localStorage.setItem(`step1_data_cache_${userId}`, JSON.stringify(step1Data));
    return step1Data;
  }

  try {
    const response = await api.get('/api/prediction/step1/data');
    if (response.data) {
      localStorage.setItem(`step1_data_cache_${userId}`, JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API GET /api/prediction/step1/data failed.', error);
    throw error;
  }
};

export const getStep2Data = async (userId) => {
  const cachedStr = localStorage.getItem(`step2_data_cache_${userId}`);
  if (cachedStr && cachedStr !== 'null') {
    try {
      const parsed = JSON.parse(cachedStr);
      if (parsed) return parsed;
    } catch (e) {}
  }

  try {
    const response = await api.get('/api/prediction/step2/data');
    if (response.data) {
      localStorage.setItem(`step2_data_cache_${userId}`, JSON.stringify(response.data));
    }
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API GET /api/prediction/step2/data failed.', error);
    throw error;
  }
};

export const saveStep1Progress = async (userId, location, answers) => {
  const payload = {
    userId,
    step: 1,
    status: 'completed',
    location,
    answers,
    completedAt: new Date().toISOString()
  };
  try {
    const response = await api.post('/api/prediction/step1', payload);
    const responseData = response.data;
    const stepsCompleted = responseData.stepsCompleted || 1;
    const stepData = responseData.stepData || payload;

    const currentProgress = getLocalStorageProgress(userId) || {};
    const updatedProgress = {
      ...currentProgress,
      userId,
      step: stepsCompleted,
      status: 'completed',
      location: stepData.location || location,
      answers: stepData.answers || answers,
      updatedAt: stepData.updatedAt || new Date().toISOString()
    };
    setLocalStorageProgress(userId, updatedProgress);

    // Sync individual step1 caches
    const cacheData = {
      location: stepData.location || location,
      answers: stepData.answers || answers
    };
    localStorage.setItem(`step1_data_cache_${userId}`, JSON.stringify(cacheData));
    localStorage.setItem(`step1_edit_cache_${userId}`, JSON.stringify(cacheData));

    return responseData;
  } catch (error) {
    console.warn('[PredictionService] API POST /api/prediction/step1 failed, saving locally.', error);
    setLocalStorageProgress(userId, payload);
    const cacheData = { location, answers };
    localStorage.setItem(`step1_data_cache_${userId}`, JSON.stringify(cacheData));
    localStorage.setItem(`step1_edit_cache_${userId}`, JSON.stringify(cacheData));
    return { stepsCompleted: 1, stepData: payload };
  }
};

/**
 * Checks if the Step 1 questionnaire edit rate limit is exceeded.
 * Returns { allowed: boolean, retryAfterSeconds: number }
 */
export const checkEditRateLimit = async () => {
  try {
    const response = await api.get('/api/prediction/step1/edit/check');
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API GET /api/prediction/step1/edit/check failed.', error);
    // Fail-open to avoid locking user out due to check endpoint issue
    return { allowed: true, retryAfterSeconds: 0 };
  }
};

/**
 * Sends only the edited questionnaire answers to the backend.
 * Location (lat/lon) is NOT changed and NO credits are deducted.
 */
export const editAnswersStep1 = async (userId, answers) => {
  const payload = { answers };
  try {
    const response = await api.post('/api/prediction/step1/edit', payload);
    const responseData = response.data;
    const stepData = responseData.stepData;

    // Update central progress cache keeping completed steps count unchanged
    const currentProgress = getLocalStorageProgress(userId) || {};
    const updatedProgress = {
      ...currentProgress,
      answers: stepData.answers || answers,
      updatedAt: stepData.updatedAt || new Date().toISOString()
    };
    setLocalStorageProgress(userId, updatedProgress);

    // Sync Step 1 caches
    const cacheData = {
      location: stepData.location || currentProgress.location,
      answers: stepData.answers || answers
    };
    localStorage.setItem(`step1_data_cache_${userId}`, JSON.stringify(cacheData));
    localStorage.setItem(`step1_edit_cache_${userId}`, JSON.stringify(cacheData));

    return responseData;
  } catch (error) {
    console.warn('[PredictionService] API POST /api/prediction/step1/edit failed.', error);
    throw error;
  }
};

export const saveStep2Progress = async (userId, weatherData) => {
  try {
    const response = await api.post('/api/prediction/step2');
    const responseData = response.data;
    const stepsCompleted = responseData.stepsCompleted || 2;
    const stepData = responseData.stepData; // DetailedWeatherData

    const currentProgress = getLocalStorageProgress(userId) || {};
    const updatedProgress = {
      ...currentProgress,
      step: stepsCompleted,
      status: 'completed',
      weatherData: weatherData || {
        temp: stepData.monthlyData?.[0]?.temperature ?? 25.0,
        humidity: stepData.monthlyData?.[0]?.humidity ?? 60,
        cloudCover: stepData.monthlyData?.[0]?.cloud_cover ?? 10,
        windSpeed: stepData.monthlyData?.[0]?.wind_speed ?? 12,
        radiation: stepData.monthlyData?.[0]?.GHI ?? 500,
        fetchedAt: stepData.createdAt || new Date().toISOString()
      },
      completedAt: new Date().toISOString()
    };
    setLocalStorageProgress(userId, updatedProgress);

    // Sync detailed weather cache
    localStorage.setItem(`step2_data_cache_${userId}`, JSON.stringify(stepData));

    return responseData;
  } catch (error) {
    if (error.response && (error.response.status === 402 || error.response.data?.error === 'INSUFFICIENT_CREDITS')) {
      console.warn('[PredictionService] API POST /api/prediction/step2 failed due to insufficient credits.', error);
      throw error;
    }
    console.warn('[PredictionService] API POST /api/prediction/step2 failed, saving locally.', error);
    const current = getLocalStorageProgress(userId) || {};
    const payload = {
      ...current,
      step: 2,
      status: 'completed',
      weatherData,
      completedAt: new Date().toISOString()
    };
    setLocalStorageProgress(userId, payload);
    localStorage.setItem(`step2_data_cache_${userId}`, JSON.stringify(weatherData));
    return { stepsCompleted: 2, stepData: payload };
  }
};

export const getSolarReport = async (userId) => {
  const progress = getLocalStorageProgress(userId);
  if (progress && progress.predictionResult) {
    return progress.predictionResult;
  }

  try {
    const response = await api.get('/api/prediction/report');
    if (response.data && progress) {
      progress.predictionResult = response.data;
      setLocalStorageProgress(userId, progress);
    }
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null; // No report generated yet
    }
    console.warn('[PredictionService] API GET /api/prediction/report failed.', error);
    return null;
  }
};

export const saveStep3Progress = async (userId) => {
  try {
    const response = await api.post('/api/prediction/step3');
    const responseData = response.data;
    const stepsCompleted = responseData.stepsCompleted || 3;
    const stepData = responseData.stepData; // SolarReportDto
    
    // Save to local storage for quick cache
    const current = getLocalStorageProgress(userId) || {};
    const payload = {
      ...current,
      step: stepsCompleted,
      status: 'completed',
      predictionResult: stepData,
      completedAt: new Date().toISOString()
    };
    setLocalStorageProgress(userId, payload);
    
    return stepData;
  } catch (error) {
    console.warn('[PredictionService] API POST /api/prediction/step3 failed.', error);
    throw error;
  }
};

export const resetPredictionProgress = async (userId) => {
  try {
    await api.delete('/api/prediction/progress');
  } catch (error) {
    console.warn('[PredictionService] API DELETE /api/prediction/progress failed, clearing locally.', error);
  } finally {
    localStorage.removeItem(`prediction_progress_${userId}`);
    localStorage.removeItem(`step1_data_cache_${userId}`);
    localStorage.removeItem(`step2_data_cache_${userId}`);
    localStorage.removeItem(`step1_edit_cache_${userId}`);
  }
};
