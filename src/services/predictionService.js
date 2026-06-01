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
