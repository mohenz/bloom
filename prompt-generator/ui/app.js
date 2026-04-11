(function bootstrapPromptGenerator(global, documentRef) {
  const dataModule = global.PromptGeneratorData;
  const coreModule = global.PromptGeneratorCore;
  const serviceModule = global.PromptGeneratorServices;
  const storageModule = global.PromptGeneratorStorage;

  if (!dataModule || !coreModule || !serviceModule || !storageModule) {
    return;
  }

  const DATA = dataModule.DATA;
  const SINGLE_SELECT_KEYS = dataModule.SINGLE_SELECT_KEYS;
  const state = {
    selections: createEmptySelections(),
    promptOutput: '',
    translatedText: '',
  };

  const dom = {};

  function createEmptySelections() {
    const selections = {};
    Object.keys(DATA).forEach(function initializeSelection(key) {
      selections[key] = [];
    });
    return selections;
  }

  function sanitizeSelections(rawSelections) {
    const sanitized = createEmptySelections();

    if (!rawSelections || typeof rawSelections !== 'object') {
      return sanitized;
    }

    Object.keys(DATA).forEach(function sanitizeKey(key) {
      const nextValues = Array.isArray(rawSelections[key]) ? rawSelections[key] : [];
      sanitized[key] = nextValues.filter(function isKnownValue(value) {
        return DATA[key].items.includes(value);
      });
    });

    return sanitized;
  }

  function cacheDom() {
    dom.promptOutput = documentRef.getElementById('promptOutput');
    dom.translatedWrapper = documentRef.getElementById('translatedWrapper');
    dom.translatedBox = documentRef.getElementById('translatedBox');
    dom.translateBtn = documentRef.getElementById('translateBtn');
    dom.clearBtn = documentRef.getElementById('clearBtn');
    dom.copyKoreanBtn = documentRef.getElementById('copyKoreanBtn');
    dom.copyEnglishBtn = documentRef.getElementById('copyEnglishBtn');
    dom.copyToast = documentRef.getElementById('copyToast');
  }

  function restoreState() {
    const savedState = storageModule.loadState();
    if (!savedState) {
      return;
    }

    state.selections = sanitizeSelections(savedState.selections);
    state.promptOutput = typeof savedState.promptOutput === 'string' ? savedState.promptOutput : '';
    state.translatedText = typeof savedState.translatedText === 'string' ? savedState.translatedText : '';
  }

  function persistState() {
    storageModule.saveState({
      selections: state.selections,
      promptOutput: state.promptOutput,
      translatedText: state.translatedText,
    });
  }

  function isMultiSelect(key) {
    return !SINGLE_SELECT_KEYS.includes(key);
  }

  function setTagSelection(tag, color, isSelected) {
    tag.classList.toggle('selected', isSelected);
    tag.classList.toggle('pink', isSelected && color === 'pink');
    tag.classList.toggle('teal', isSelected && color === 'teal');
    tag.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  }

  function renderTagGroups() {
    Object.entries(DATA).forEach(function renderGroup(entry) {
      const key = entry[0];
      const definition = entry[1];
      const container = documentRef.getElementById(key);
      if (!container) {
        return;
      }

      container.innerHTML = '';
      definition.items.forEach(function renderTag(item) {
        const tag = documentRef.createElement('button');
        const selected = state.selections[key].includes(item);
        tag.className = 'tag';
        tag.type = 'button';
        tag.textContent = item;
        tag.dataset.key = key;
        tag.dataset.value = item;
        tag.dataset.color = definition.color || '';
        setTagSelection(tag, definition.color, selected);
        tag.addEventListener('click', function handleClick() {
          toggleTag(key, item, definition.color);
        });
        container.appendChild(tag);
      });
    });
  }

  function updateGroupSelectionUi(key) {
    const tags = documentRef.querySelectorAll('[data-key="' + key + '"]');
    tags.forEach(function updateTag(tag) {
      const color = tag.dataset.color || '';
      const selected = state.selections[key].includes(tag.dataset.value);
      setTagSelection(tag, color, selected);
    });
  }

  function renderTranslatedText(text) {
    if (!text) {
      dom.translatedWrapper.style.display = 'none';
      dom.translatedBox.textContent = '';
      return;
    }

    dom.translatedWrapper.style.display = 'block';
    dom.translatedBox.textContent = text;
  }

  function clearTranslatedText(shouldPersist) {
    state.translatedText = '';
    renderTranslatedText('');
    if (shouldPersist !== false) {
      persistState();
    }
  }

  function syncPromptFromSelections() {
    state.promptOutput = coreModule.buildPrompt(state.selections);
    dom.promptOutput.value = state.promptOutput;
    clearTranslatedText(false);
    persistState();
  }

  function toggleTag(key, value) {
    const selectedValues = state.selections[key];
    const existingIndex = selectedValues.indexOf(value);

    if (existingIndex >= 0) {
      selectedValues.splice(existingIndex, 1);
    } else if (isMultiSelect(key)) {
      selectedValues.push(value);
    } else {
      state.selections[key] = [value];
    }

    updateGroupSelectionUi(key);
    syncPromptFromSelections();
  }

  async function copyText(text, successMessage) {
    if (!text) {
      return;
    }

    try {
      await global.navigator.clipboard.writeText(text);
      showToast(successMessage);
    } catch (error) {
      fallbackCopy(text, successMessage);
    }
  }

  function fallbackCopy(text, successMessage) {
    const textarea = documentRef.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    documentRef.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = documentRef.execCommand('copy');
    documentRef.body.removeChild(textarea);
    showToast(copied ? successMessage : '복사 실패 - 텍스트를 직접 선택하세요');
  }

  function showToast(message) {
    dom.copyToast.textContent = '✓ ' + message;
    dom.copyToast.classList.add('show');
    global.setTimeout(function hideToast() {
      dom.copyToast.classList.remove('show');
    }, 2000);
  }

  function setTranslateLoading(isLoading) {
    dom.translateBtn.disabled = isLoading;
    dom.translateBtn.innerHTML = isLoading
      ? '<span class="loading-dots"><span></span><span></span><span></span></span>'
      : 'EN 번역';
  }

  async function handleTranslate() {
    const prompt = dom.promptOutput.value.trim();
    if (!prompt) {
      return;
    }

    setTranslateLoading(true);
    try {
      const translatedText = await serviceModule.translatePromptToEnglish(prompt);
      state.promptOutput = prompt;
      state.translatedText = translatedText;
      renderTranslatedText(translatedText);
      persistState();
    } catch (error) {
      state.translatedText = '';
      persistState();
      renderTranslatedText(error.message || '번역 중 오류가 발생했습니다.');
    } finally {
      setTranslateLoading(false);
    }
  }

  function handlePromptInput() {
    state.promptOutput = dom.promptOutput.value;
    clearTranslatedText(false);
    persistState();
  }

  function handleClearAll() {
    state.selections = createEmptySelections();
    state.promptOutput = '';
    state.translatedText = '';
    renderTagGroups();
    dom.promptOutput.value = '';
    renderTranslatedText('');
    storageModule.clearState();
  }

  function bindEvents() {
    dom.translateBtn.addEventListener('click', handleTranslate);
    dom.clearBtn.addEventListener('click', handleClearAll);
    dom.copyKoreanBtn.addEventListener('click', function copyKorean() {
      copyText(dom.promptOutput.value, '한글 프롬프트 복사됨');
    });
    dom.copyEnglishBtn.addEventListener('click', function copyEnglish() {
      copyText(dom.translatedBox.textContent.trim(), '영문 프롬프트 복사됨');
    });
    dom.promptOutput.addEventListener('input', handlePromptInput);
  }

  function initializePromptOutput() {
    const builtPrompt = coreModule.buildPrompt(state.selections);
    state.promptOutput = state.promptOutput || builtPrompt;
    dom.promptOutput.value = state.promptOutput;
    renderTranslatedText(state.translatedText);
    persistState();
  }

  function init() {
    cacheDom();
    restoreState();
    renderTagGroups();
    initializePromptOutput();
    bindEvents();
  }

  documentRef.addEventListener('DOMContentLoaded', init);
})(window, document);
