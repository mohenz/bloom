(function registerPromptGeneratorStorage(global) {
  const STATE_STORAGE_KEY = 'prompt-generator-state-v1';
  const SESSION_STORAGE_KEY = 'bloom-service-session-v1';

  function loadJson(key) {
    try {
      const rawValue = global.localStorage.getItem(key);
      if (!rawValue) {
        return null;
      }
      return JSON.parse(rawValue);
    } catch (error) {
      return null;
    }
  }

  function saveJson(key, value) {
    try {
      global.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return false;
    }
    return true;
  }

  function removeValue(key) {
    try {
      global.localStorage.removeItem(key);
    } catch (error) {
      return false;
    }
    return true;
  }

  function loadState() {
    return loadJson(STATE_STORAGE_KEY);
  }

  function saveState(state) {
    return saveJson(STATE_STORAGE_KEY, state);
  }

  function clearState() {
    return removeValue(STATE_STORAGE_KEY);
  }

  function loadSession() {
    return loadJson(SESSION_STORAGE_KEY);
  }

  function saveSession(session) {
    return saveJson(SESSION_STORAGE_KEY, session);
  }

  function clearSession() {
    return removeValue(SESSION_STORAGE_KEY);
  }

  global.PromptGeneratorStorage = {
    loadState,
    saveState,
    clearState,
    loadSession,
    saveSession,
    clearSession,
  };
})(window);
