(function registerPromptGeneratorStorage(global) {
  const STORAGE_KEY = 'prompt-generator-state-v1';

  function loadState() {
    try {
      const rawValue = global.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return null;
      }
      return JSON.parse(rawValue);
    } catch (error) {
      return null;
    }
  }

  function saveState(state) {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      return false;
    }
    return true;
  }

  function clearState() {
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      return false;
    }
    return true;
  }

  global.PromptGeneratorStorage = {
    loadState,
    saveState,
    clearState,
  };
})(window);
