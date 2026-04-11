(function bootstrapPromptGenerator(global, documentRef) {
  const dataModule = global.PromptGeneratorData;
  const coreModule = global.PromptGeneratorCore;
  const storageModule = global.PromptGeneratorStorage;

  if (!dataModule || !coreModule || !storageModule) {
    return;
  }

  const DATA = dataModule.DATA;
  const SINGLE_SELECT_KEYS = dataModule.SINGLE_SELECT_KEYS;
  const DEMO_USER = {
    email: 'admin@bloom.local',
    password: 'bloom1234',
    name: 'Bloom Admin',
  };
  const NEGATIVE_PROMPT = [
    '(worst quality, low quality:1.4), mutated hands, malformed limbs, deformed fingers, extra fingers,',
    'missing fingers, fused fingers, too many fingers, long neck, bad anatomy, disfigured, poorly drawn face,',
    'mutated face, cloned face, extra limbs, missing limbs, gross proportions, malformed hands, distorted hands,',
    'broken legs, backward limbs, floating limbs, disconnected limbs, asymmetrical eyes, cross-eyed, deformed pupils,',
    'cataracts, blurry eyes, missing eyelashes, weird eyes, extra pupils, faded colors, low resolution, distorted iris, bloodshot eyes,',
    '(anime, cartoon), illustration, painting, 3d render, watermark, text, out of frame, blurry, grainy',
  ].join('\n');

  const state = {
    currentScreen: 'login',
    currentUser: null,
    selections: createEmptySelections(),
    promptOutput: '',
    sentenceText: '',
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
    dom.loginScreen = documentRef.getElementById('loginScreen');
    dom.dashboardScreen = documentRef.getElementById('dashboardScreen');
    dom.promptBuilderScreen = documentRef.getElementById('promptBuilderScreen');
    dom.loginForm = documentRef.getElementById('loginForm');
    dom.emailInput = documentRef.getElementById('emailInput');
    dom.passwordInput = documentRef.getElementById('passwordInput');
    dom.loginError = documentRef.getElementById('loginError');
    dom.dashboardUserBadge = documentRef.getElementById('dashboardUserBadge');
    dom.builderUserBadge = documentRef.getElementById('builderUserBadge');
    dom.dashboardLogoutBtn = documentRef.getElementById('dashboardLogoutBtn');
    dom.builderLogoutBtn = documentRef.getElementById('builderLogoutBtn');
    dom.openPromptBuilderBtn = documentRef.getElementById('openPromptBuilderBtn');
    dom.backToDashboardBtn = documentRef.getElementById('backToDashboardBtn');
    dom.promptOutput = documentRef.getElementById('promptOutput');
    dom.sentenceWrapper = documentRef.getElementById('sentenceWrapper');
    dom.sentenceBox = documentRef.getElementById('sentenceBox');
    dom.translatedWrapper = documentRef.getElementById('translatedWrapper');
    dom.translatedBox = documentRef.getElementById('translatedBox');
    dom.sentenceBtn = documentRef.getElementById('sentenceBtn');
    dom.translateBtn = documentRef.getElementById('translateBtn');
    dom.clearBtn = documentRef.getElementById('clearBtn');
    dom.copyKoreanBtn = documentRef.getElementById('copyKoreanBtn');
    dom.copySentenceBtn = documentRef.getElementById('copySentenceBtn');
    dom.copyEnglishBtn = documentRef.getElementById('copyEnglishBtn');
    dom.copyNegativeBtn = documentRef.getElementById('copyNegativeBtn');
    dom.negativePromptBox = documentRef.getElementById('negativePromptBox');
    dom.copyToast = documentRef.getElementById('copyToast');
  }

  function restorePromptState() {
    const savedState = storageModule.loadState();
    if (!savedState) {
      return;
    }

    state.selections = sanitizeSelections(savedState.selections);
    state.promptOutput = typeof savedState.promptOutput === 'string' ? savedState.promptOutput : '';
    state.sentenceText = typeof savedState.sentenceText === 'string' ? savedState.sentenceText : '';
    state.translatedText = typeof savedState.translatedText === 'string' ? savedState.translatedText : '';
  }

  function restoreSession() {
    const savedSession = storageModule.loadSession();
    if (!savedSession || savedSession.email !== DEMO_USER.email) {
      return;
    }

    state.currentUser = {
      email: savedSession.email,
      name: savedSession.name || DEMO_USER.name,
    };
    state.currentScreen = 'dashboard';
  }

  function persistPromptState() {
    storageModule.saveState({
      selections: state.selections,
      promptOutput: state.promptOutput,
      sentenceText: state.sentenceText,
      translatedText: state.translatedText,
    });
  }

  function persistSession() {
    if (!state.currentUser) {
      storageModule.clearSession();
      return;
    }

    storageModule.saveSession({
      email: state.currentUser.email,
      name: state.currentUser.name,
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
          toggleTag(key, item);
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

  function renderSentenceText(text) {
    if (!text) {
      dom.sentenceWrapper.style.display = 'none';
      dom.sentenceBox.textContent = '';
      return;
    }

    dom.sentenceWrapper.style.display = 'block';
    dom.sentenceBox.textContent = text;
  }

  function clearTranslatedText(shouldPersist) {
    state.translatedText = '';
    renderTranslatedText('');
    if (shouldPersist !== false) {
      persistPromptState();
    }
  }

  function clearSentenceText(shouldPersist) {
    state.sentenceText = '';
    renderSentenceText('');
    if (shouldPersist !== false) {
      persistPromptState();
    }
  }

  function syncPromptFromSelections() {
    state.promptOutput = coreModule.buildPrompt(state.selections);
    dom.promptOutput.value = state.promptOutput;
    clearSentenceText(false);
    clearTranslatedText(false);
    persistPromptState();
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

  function handleTranslate() {
    const englishPrompt = coreModule.buildEnglishPrompt(state.selections);
    if (!englishPrompt) {
      state.translatedText = '';
      renderTranslatedText('선택한 태그를 기준으로만 영문 프롬프트를 생성할 수 있습니다.');
      persistPromptState();
      return;
    }

    state.translatedText = englishPrompt;
    renderTranslatedText(englishPrompt);
    persistPromptState();
  }

  function handleSentenceCompose() {
    const prompt = dom.promptOutput.value.trim();
    if (!prompt) {
      return;
    }

    state.promptOutput = prompt;
    state.sentenceText = coreModule.buildSentencePrompt(state.selections, prompt);
    renderSentenceText(state.sentenceText);
    persistPromptState();
  }

  function handlePromptInput() {
    state.promptOutput = dom.promptOutput.value;
    clearSentenceText(false);
    clearTranslatedText(false);
    persistPromptState();
  }

  function handleClearAll() {
    state.selections = createEmptySelections();
    state.promptOutput = '';
    state.sentenceText = '';
    state.translatedText = '';
    renderTagGroups();
    dom.promptOutput.value = '';
    renderSentenceText('');
    renderTranslatedText('');
    storageModule.clearState();
  }

  function hideLoginError() {
    dom.loginError.classList.add('is-hidden');
  }

  function showLoginError() {
    dom.loginError.classList.remove('is-hidden');
  }

  function renderUserBadges() {
    const label = state.currentUser ? state.currentUser.name : '';
    dom.dashboardUserBadge.textContent = label;
    dom.builderUserBadge.textContent = label;
  }

  function setScreen(screenName) {
    state.currentScreen = screenName;
    dom.loginScreen.classList.toggle('is-hidden', screenName !== 'login');
    dom.dashboardScreen.classList.toggle('is-hidden', screenName !== 'dashboard');
    dom.promptBuilderScreen.classList.toggle('is-hidden', screenName !== 'prompt-builder');
  }

  function showDashboard() {
    setScreen('dashboard');
  }

  function showPromptBuilder() {
    setScreen('prompt-builder');
  }

  function showLogin() {
    setScreen('login');
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    const email = dom.emailInput.value.trim().toLowerCase();
    const password = dom.passwordInput.value;

    if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
      showLoginError();
      return;
    }

    hideLoginError();
    state.currentUser = {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
    };
    persistSession();
    renderUserBadges();
    showDashboard();
  }

  function handleLogout() {
    state.currentUser = null;
    persistSession();
    renderUserBadges();
    dom.loginForm.reset();
    hideLoginError();
    showLogin();
  }

  function bindEvents() {
    dom.loginForm.addEventListener('submit', handleLoginSubmit);
    dom.dashboardLogoutBtn.addEventListener('click', handleLogout);
    dom.builderLogoutBtn.addEventListener('click', handleLogout);
    dom.openPromptBuilderBtn.addEventListener('click', showPromptBuilder);
    dom.backToDashboardBtn.addEventListener('click', showDashboard);
    dom.sentenceBtn.addEventListener('click', handleSentenceCompose);
    dom.translateBtn.addEventListener('click', handleTranslate);
    dom.clearBtn.addEventListener('click', handleClearAll);
    dom.copyKoreanBtn.addEventListener('click', function copyKorean() {
      copyText(dom.promptOutput.value, '한글 프롬프트 복사됨');
    });
    dom.copySentenceBtn.addEventListener('click', function copySentence() {
      copyText(dom.sentenceBox.textContent.trim(), '문장형 프롬프트 복사됨');
    });
    dom.copyEnglishBtn.addEventListener('click', function copyEnglish() {
      copyText(dom.translatedBox.textContent.trim(), '영문 프롬프트 복사됨');
    });
    dom.copyNegativeBtn.addEventListener('click', function copyNegative() {
      copyText(NEGATIVE_PROMPT, '네거티브 프롬프트 복사됨');
    });
    dom.promptOutput.addEventListener('input', handlePromptInput);
    dom.emailInput.addEventListener('input', hideLoginError);
    dom.passwordInput.addEventListener('input', hideLoginError);
  }

  function initializePromptOutput() {
    const builtPrompt = coreModule.buildPrompt(state.selections);
    state.promptOutput = state.promptOutput || builtPrompt;
    dom.promptOutput.value = state.promptOutput;
    renderSentenceText(state.sentenceText);
    renderTranslatedText(state.translatedText);
    dom.negativePromptBox.textContent = NEGATIVE_PROMPT;
    persistPromptState();
  }

  function initializeScreen() {
    renderUserBadges();
    if (state.currentUser) {
      showDashboard();
      return;
    }

    showLogin();
  }

  function init() {
    cacheDom();
    restorePromptState();
    restoreSession();
    renderTagGroups();
    initializePromptOutput();
    bindEvents();
    initializeScreen();
  }

  documentRef.addEventListener('DOMContentLoaded', init);
})(window, document);
