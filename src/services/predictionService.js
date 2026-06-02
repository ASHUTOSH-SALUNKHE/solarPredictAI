import api from './api';

const getLocalStorageProgress = (userId) => {
  const data = localStorage.getItem(`prediction_progress_${userId}`);
  return data ? JSON.parse(data) : null;
};

const setLocalStorageProgress = (userId, progressData) => {
  localStorage.setItem(`prediction_progress_${userId}`, JSON.stringify(progressData));
};

export const getPredictionProgress = async (userId) => {
  try {
    const response = await api.get('/api/prediction/progress');
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API GET /api/prediction/progress failed, falling back to localStorage.', error);
    return getLocalStorageProgress(userId);
  }
};

export const getStep1Data = async (userId) => {
  try {
    const response = await api.get('/api/prediction/step1/data');
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API GET /api/prediction/step1/data failed.', error);
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
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API POST /api/prediction/step1 failed, saving locally.', error);
    setLocalStorageProgress(userId, payload);
    return payload;
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
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API POST /api/prediction/step1/edit failed.', error);
    throw error;
  }
};

export const saveStep2Progress = async (userId, weatherData) => {
  const current = getLocalStorageProgress(userId) || {};
  const payload = {
    ...current,
    step: 2,
    status: 'completed',
    weatherData,
    completedAt: new Date().toISOString()
  };
  try {
    const response = await api.post('/api/prediction/step2', payload);
    return response.data;
  } catch (error) {
    console.warn('[PredictionService] API POST /api/prediction/step2 failed, saving locally.', error);
    setLocalStorageProgress(userId, payload);
    return payload;
  }
};

export const getSolarReport = async (userId) => {
  try {
    const response = await api.get('/api/prediction/report');
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
    // Step 3 requires no body in the new architecture, backend infers from session
    const response = await api.post('/api/prediction/step3');
    const predictionResult = response.data;
    
    // Save to local storage for quick cache
    const current = getLocalStorageProgress(userId) || {};
    const payload = {
      ...current,
      step: 3,
      status: 'completed',
      predictionResult,
      completedAt: new Date().toISOString()
    };
    setLocalStorageProgress(userId, payload);
    
    return predictionResult;
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
  }
};
