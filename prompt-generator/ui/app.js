(function bootstrapPromptGenerator(global, documentRef) {
  const dataModule = global.PromptGeneratorData;
  const coreModule = global.PromptGeneratorCore;
  const storageModule = global.PromptGeneratorStorage;
  const historyModule = global.PromptHistoryFeature;

  if (!dataModule || !coreModule || !storageModule || !historyModule) {
    return;
  }

  const DATA = dataModule.DATA;
  const SINGLE_SELECT_KEYS = dataModule.SINGLE_SELECT_KEYS;
  const AUTH_ENDPOINTS = {
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
  };
  const DEFAULT_LOGIN_ERROR_MESSAGE = '이메일 또는 비밀번호가 올바르지 않습니다.';
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
    englishSentenceText: '',
    historyItems: [],
    activeHistoryId: '',
  };

  const dom = {};
  let authEnabled = false;

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
    dom.promptHistoryScreen = documentRef.getElementById('promptHistoryScreen');
    dom.promptBuilderScreen = documentRef.getElementById('promptBuilderScreen');
    dom.loginForm = documentRef.getElementById('loginForm');
    dom.emailInput = documentRef.getElementById('emailInput');
    dom.passwordInput = documentRef.getElementById('passwordInput');
    dom.loginHelp = documentRef.getElementById('loginHelp');
    dom.loginError = documentRef.getElementById('loginError');
    dom.loginSubmitBtn = documentRef.getElementById('loginSubmitBtn');
    dom.dashboardUserBadge = documentRef.getElementById('dashboardUserBadge');
    dom.builderUserBadge = documentRef.getElementById('builderUserBadge');
    dom.historyUserBadge = documentRef.getElementById('historyUserBadge');
    dom.dashboardLogoutBtn = documentRef.getElementById('dashboardLogoutBtn');
    dom.builderLogoutBtn = documentRef.getElementById('builderLogoutBtn');
    dom.historyLogoutBtn = documentRef.getElementById('historyLogoutBtn');
    dom.openPromptBuilderBtn = documentRef.getElementById('openPromptBuilderBtn');
    dom.openPromptHistoryBtn = documentRef.getElementById('openPromptHistoryBtn');
    dom.openPromptHistoryFromBuilderBtn = documentRef.getElementById('openPromptHistoryFromBuilderBtn');
    dom.backToDashboardBtn = documentRef.getElementById('backToDashboardBtn');
    dom.historyBackToDashboardBtn = documentRef.getElementById('historyBackToDashboardBtn');
    dom.historyOpenBuilderBtn = documentRef.getElementById('historyOpenBuilderBtn');
    dom.refreshHistoryBtn = documentRef.getElementById('refreshHistoryBtn');
    dom.historyStatus = documentRef.getElementById('historyStatus');
    dom.historyEmpty = documentRef.getElementById('historyEmpty');
    dom.historyList = documentRef.getElementById('historyList');
    dom.promptOutput = documentRef.getElementById('promptOutput');
    dom.saveHistoryBtn = documentRef.getElementById('saveHistoryBtn');
    dom.resetHistoryDraftBtn = documentRef.getElementById('resetHistoryDraftBtn');
    dom.historySaveStatus = documentRef.getElementById('historySaveStatus');
    dom.sentenceWrapper = documentRef.getElementById('sentenceWrapper');
    dom.sentenceBox = documentRef.getElementById('sentenceBox');
    dom.translatedWrapper = documentRef.getElementById('translatedWrapper');
    dom.translatedBox = documentRef.getElementById('translatedBox');
    dom.englishSentenceWrapper = documentRef.getElementById('englishSentenceWrapper');
    dom.englishSentenceBox = documentRef.getElementById('englishSentenceBox');
    dom.sentenceBtn = documentRef.getElementById('sentenceBtn');
    dom.translateBtn = documentRef.getElementById('translateBtn');
    dom.englishSentenceBtn = documentRef.getElementById('englishSentenceBtn');
    dom.clearBtn = documentRef.getElementById('clearBtn');
    dom.copyKoreanBtn = documentRef.getElementById('copyKoreanBtn');
    dom.copySentenceBtn = documentRef.getElementById('copySentenceBtn');
    dom.copyEnglishBtn = documentRef.getElementById('copyEnglishBtn');
    dom.copyEnglishSentenceBtn = documentRef.getElementById('copyEnglishSentenceBtn');
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
    state.englishSentenceText = typeof savedState.englishSentenceText === 'string' ? savedState.englishSentenceText : '';
  }

  function persistPromptState() {
    storageModule.saveState({
      selections: state.selections,
      promptOutput: state.promptOutput,
      sentenceText: state.sentenceText,
      translatedText: state.translatedText,
      englishSentenceText: state.englishSentenceText,
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

  function renderEnglishSentenceText(text) {
    if (!text) {
      dom.englishSentenceWrapper.style.display = 'none';
      dom.englishSentenceBox.textContent = '';
      return;
    }

    dom.englishSentenceWrapper.style.display = 'block';
    dom.englishSentenceBox.textContent = text;
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

  function clearEnglishSentenceText(shouldPersist) {
    state.englishSentenceText = '';
    renderEnglishSentenceText('');
    if (shouldPersist !== false) {
      persistPromptState();
    }
  }

  function syncPromptFromSelections() {
    state.promptOutput = coreModule.buildPrompt(state.selections);
    dom.promptOutput.value = state.promptOutput;
    clearSentenceText(false);
    clearTranslatedText(false);
    clearEnglishSentenceText(false);
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

  function handleEnglishSentenceCompose() {
    const englishSentence = coreModule.buildEnglishSentencePrompt(state.selections);
    if (!englishSentence) {
      state.englishSentenceText = '';
      renderEnglishSentenceText('선택한 태그를 기준으로만 영문 문장을 생성할 수 있습니다.');
      persistPromptState();
      return;
    }

    state.englishSentenceText = englishSentence;
    renderEnglishSentenceText(englishSentence);
    persistPromptState();
  }

  function handlePromptInput() {
    state.promptOutput = dom.promptOutput.value;
    clearSentenceText(false);
    clearTranslatedText(false);
    clearEnglishSentenceText(false);
    persistPromptState();
  }

  function setHistoryStatus(message) {
    dom.historyStatus.textContent = message;
  }

  function sortHistoryItems() {
    state.historyItems.sort(function sortDescending(left, right) {
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });
  }

  function findHistoryRecord(historyId) {
    return state.historyItems.find(function matchRecord(item) {
      return item.id === historyId;
    }) || null;
  }

  function upsertHistoryRecord(record) {
    const normalizedRecord = historyModule.normalizeHistoryRecord(record);
    const existingIndex = state.historyItems.findIndex(function findIndex(item) {
      return item.id === normalizedRecord.id;
    });

    if (existingIndex >= 0) {
      state.historyItems.splice(existingIndex, 1, normalizedRecord);
    } else {
      state.historyItems.push(normalizedRecord);
    }

    sortHistoryItems();
    return normalizedRecord;
  }

  function removeHistoryRecord(historyId) {
    state.historyItems = state.historyItems.filter(function filterRecord(item) {
      return item.id !== historyId;
    });
  }

  function countSelectedGroups(selections) {
    return Object.keys(selections).reduce(function count(accumulator, key) {
      return accumulator + (Array.isArray(selections[key]) && selections[key].length ? 1 : 0);
    }, 0);
  }

  function renderHistorySaveState() {
    const activeRecord = findHistoryRecord(state.activeHistoryId);

    if (activeRecord) {
      dom.historySaveStatus.textContent =
        '편집 중: ' + historyModule.formatHistoryTimestamp(activeRecord.createdAt);
      dom.saveHistoryBtn.textContent = '저장본 업데이트';
      dom.resetHistoryDraftBtn.disabled = false;
      return;
    }

    dom.historySaveStatus.textContent = '새 저장 모드';
    dom.saveHistoryBtn.textContent = '히스토리 저장';
    dom.resetHistoryDraftBtn.disabled = true;
  }

  function renderHistoryList() {
    dom.historyList.innerHTML = '';

    if (!state.historyItems.length) {
      dom.historyEmpty.classList.remove('is-hidden');
      return;
    }

    dom.historyEmpty.classList.add('is-hidden');

    state.historyItems.forEach(function renderHistoryCard(record) {
      const card = documentRef.createElement('article');
      const isActive = record.id === state.activeHistoryId;

      card.className = 'history-card' + (isActive ? ' is-active' : '');

      const head = documentRef.createElement('div');
      head.className = 'history-card-head';

      const createdAt = documentRef.createElement('span');
      createdAt.className = 'history-card-date';
      createdAt.textContent = historyModule.formatHistoryTimestamp(record.createdAt);
      head.appendChild(createdAt);

      if (record.updatedAt && record.updatedAt !== record.createdAt) {
        const updatedAt = documentRef.createElement('span');
        updatedAt.className = 'history-card-updated';
        updatedAt.textContent = '마지막 수정 ' + historyModule.formatHistoryTimestamp(record.updatedAt);
        head.appendChild(updatedAt);
      }

      const preview = documentRef.createElement('p');
      preview.className = 'history-card-preview';
      preview.textContent = historyModule.buildHistoryPreview(record);

      const meta = documentRef.createElement('p');
      meta.className = 'history-card-meta';
      meta.textContent = '선택 그룹 ' + countSelectedGroups(record.selections) + '개';

      const actions = documentRef.createElement('div');
      actions.className = 'history-card-actions';

      const loadButton = documentRef.createElement('button');
      loadButton.className = 'btn btn-history-load';
      loadButton.type = 'button';
      loadButton.dataset.action = 'load';
      loadButton.dataset.id = record.id;
      loadButton.textContent = isActive ? '불러온 상태' : '불러오기';
      actions.appendChild(loadButton);

      const deleteButton = documentRef.createElement('button');
      deleteButton.className = 'btn btn-history-delete';
      deleteButton.type = 'button';
      deleteButton.dataset.action = 'delete';
      deleteButton.dataset.id = record.id;
      deleteButton.textContent = '삭제';
      actions.appendChild(deleteButton);

      card.appendChild(head);
      card.appendChild(preview);
      card.appendChild(meta);
      card.appendChild(actions);
      dom.historyList.appendChild(card);
    });
  }

  function resetHistoryState() {
    state.historyItems = [];
    state.activeHistoryId = '';
    renderHistorySaveState();
    renderHistoryList();
    setHistoryStatus('저장된 프롬프트를 확인하려면 로그인 후 새로고침하세요.');
  }

  function clearHistoryDraft(announce) {
    state.activeHistoryId = '';
    renderHistorySaveState();
    renderHistoryList();
    if (announce) {
      showToast('새 저장 모드로 전환되었습니다');
    }
  }

  function handleClearAll() {
    state.selections = createEmptySelections();
    state.promptOutput = '';
    state.sentenceText = '';
    state.translatedText = '';
    state.englishSentenceText = '';
    clearHistoryDraft(false);
    renderTagGroups();
    dom.promptOutput.value = '';
    renderSentenceText('');
    renderTranslatedText('');
    renderEnglishSentenceText('');
    storageModule.clearState();
  }

  function setLoginHelp(message) {
    dom.loginHelp.textContent = message;
  }

  function showLoginError(message) {
    dom.loginError.textContent = message || DEFAULT_LOGIN_ERROR_MESSAGE;
    dom.loginError.classList.remove('is-hidden');
  }

  function hideLoginError() {
    dom.loginError.textContent = DEFAULT_LOGIN_ERROR_MESSAGE;
    dom.loginError.classList.add('is-hidden');
  }

  function setLoginFormDisabled(disabled) {
    dom.emailInput.disabled = disabled;
    dom.passwordInput.disabled = disabled;
    dom.loginSubmitBtn.disabled = disabled;
  }

  function setLoginSubmitState(isLoading, label) {
    dom.loginSubmitBtn.disabled = isLoading || !authEnabled;
    dom.loginSubmitBtn.textContent = isLoading ? (label || '처리 중...') : '로그인';
  }

  function renderUserBadges() {
    const label = state.currentUser ? state.currentUser.name : '';
    dom.dashboardUserBadge.textContent = label;
    dom.builderUserBadge.textContent = label;
    dom.historyUserBadge.textContent = label;
  }

  function setScreen(screenName) {
    state.currentScreen = screenName;
    dom.loginScreen.classList.toggle('is-hidden', screenName !== 'login');
    dom.dashboardScreen.classList.toggle('is-hidden', screenName !== 'dashboard');
    dom.promptHistoryScreen.classList.toggle('is-hidden', screenName !== 'prompt-history');
    dom.promptBuilderScreen.classList.toggle('is-hidden', screenName !== 'prompt-builder');
  }

  function showDashboard() {
    setScreen('dashboard');
  }

  function showPromptBuilder() {
    setScreen('prompt-builder');
  }

  function showPromptHistory() {
    setScreen('prompt-history');
  }

  function showLogin() {
    setScreen('login');
  }

  function buildFallbackName(email) {
    if (!email) {
      return 'Bloom User';
    }

    return email.split('@')[0] || 'Bloom User';
  }

  function setCurrentUser(user) {
    if (!user) {
      state.currentUser = null;
      renderUserBadges();
      resetHistoryState();
      return;
    }

    state.currentUser = {
      id: user.id || '',
      email: user.email || '',
      name: user.displayName || buildFallbackName(user.email || ''),
    };

    renderUserBadges();
  }

  function canUseAuthApi() {
    return Boolean(global.location && /^https?:$/i.test(global.location.protocol));
  }

  async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return {};
    }
  }

  async function requestAuth(url, options) {
    const response = await global.fetch(url, options);
    const payload = await readJsonResponse(response);
    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  }

  async function refreshPromptHistory(options) {
    const nextOptions = {
      silent: false,
      ...options,
    };

    if (!authEnabled || !state.currentUser) {
      resetHistoryState();
      return;
    }

    if (!nextOptions.silent) {
      setHistoryStatus('저장된 프롬프트를 불러오는 중입니다.');
    }

    dom.refreshHistoryBtn.disabled = true;

    try {
      const result = await historyModule.listHistory();
      const payload = result.payload || {};

      if (!result.ok) {
        setHistoryStatus(payload.message || 'Prompt History를 불러오지 못했습니다.');
        return;
      }

      state.historyItems = Array.isArray(payload.items)
        ? payload.items.map(historyModule.normalizeHistoryRecord)
        : [];
      sortHistoryItems();

      if (state.activeHistoryId && !findHistoryRecord(state.activeHistoryId)) {
        state.activeHistoryId = '';
      }

      renderHistoryList();
      renderHistorySaveState();
      setHistoryStatus(
        state.historyItems.length
          ? '저장된 프롬프트 ' + state.historyItems.length + '건'
          : '저장된 프롬프트가 없습니다.'
      );
    } catch (error) {
      setHistoryStatus('Prompt History 서버와 연결하지 못했습니다.');
    } finally {
      dom.refreshHistoryBtn.disabled = false;
    }
  }

  function buildCurrentHistoryPayload() {
    return historyModule.buildHistoryPayload({
      selections: state.selections,
      promptOutput: dom.promptOutput.value,
      sentenceText: state.sentenceText,
      translatedText: state.translatedText,
      englishSentenceText: state.englishSentenceText,
    });
  }

  async function handleSaveHistory() {
    if (!authEnabled || !state.currentUser) {
      showToast('로그인 후 Prompt History를 사용할 수 있습니다');
      return;
    }

    const payload = buildCurrentHistoryPayload();
    if (!historyModule.hasHistoryContent(payload)) {
      showToast('저장할 프롬프트가 없습니다');
      return;
    }

    dom.saveHistoryBtn.disabled = true;

    try {
      let result;
      let savedMessage = '프롬프트를 새로 저장했습니다';

      if (state.activeHistoryId) {
        result = await historyModule.updateHistory(state.activeHistoryId, payload);
        savedMessage = '불러온 프롬프트를 업데이트했습니다';
      } else {
        result = await historyModule.createHistory(payload);
      }

      const responsePayload = result && result.payload ? result.payload : {};
      if (!result || !result.ok || !responsePayload.item) {
        showToast(responsePayload.message || 'Prompt History 저장에 실패했습니다');
        return;
      }

      const savedRecord = upsertHistoryRecord(responsePayload.item);
      state.activeHistoryId = savedRecord.id;
      renderHistoryList();
      renderHistorySaveState();
      setHistoryStatus('저장된 프롬프트 ' + state.historyItems.length + '건');
      showToast(savedMessage);
    } catch (error) {
      showToast('Prompt History 서버와 연결하지 못했습니다');
    } finally {
      dom.saveHistoryBtn.disabled = false;
    }
  }

  function applyHistoryRecord(record) {
    state.selections = sanitizeSelections(record.selections);
    state.promptOutput = record.promptOutput || '';
    state.sentenceText = record.sentenceText || '';
    state.translatedText = record.translatedText || '';
    state.englishSentenceText = record.englishSentenceText || '';
    state.activeHistoryId = record.id;

    renderTagGroups();
    dom.promptOutput.value = state.promptOutput;
    renderSentenceText(state.sentenceText);
    renderTranslatedText(state.translatedText);
    renderEnglishSentenceText(state.englishSentenceText);
    renderHistorySaveState();
    renderHistoryList();
    persistPromptState();
    showPromptBuilder();
    showToast('프롬프트를 불러왔습니다');
  }

  async function handleDeleteHistory(historyId) {
    const targetRecord = findHistoryRecord(historyId);
    if (!targetRecord) {
      return;
    }

    const confirmed = global.confirm(
      '"' + historyModule.formatHistoryTimestamp(targetRecord.createdAt) + '" 프롬프트를 삭제하시겠습니까?'
    );
    if (!confirmed) {
      return;
    }

    try {
      const result = await historyModule.deleteHistory(historyId);
      const payload = result && result.payload ? result.payload : {};

      if (!result || !result.ok) {
        showToast(payload.message || 'Prompt History 삭제에 실패했습니다');
        return;
      }

      removeHistoryRecord(historyId);
      if (state.activeHistoryId === historyId) {
        clearHistoryDraft(false);
      } else {
        renderHistoryList();
      }
      setHistoryStatus(
        state.historyItems.length
          ? '저장된 프롬프트 ' + state.historyItems.length + '건'
          : '저장된 프롬프트가 없습니다.'
      );
      showToast('프롬프트를 삭제했습니다');
    } catch (error) {
      showToast('Prompt History 서버와 연결하지 못했습니다');
    }
  }

  async function handleHistoryListClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const historyId = button.dataset.id || '';
    if (!historyId) {
      return;
    }

    if (button.dataset.action === 'load') {
      const targetRecord = findHistoryRecord(historyId);
      if (targetRecord) {
        applyHistoryRecord(targetRecord);
      }
      return;
    }

    if (button.dataset.action === 'delete') {
      await handleDeleteHistory(historyId);
    }
  }

  async function openPromptHistoryScreen() {
    showPromptHistory();
    await refreshPromptHistory();
  }

  async function initializeAuth() {
    setLoginHelp('로그인 상태를 확인하는 중입니다.');
    setLoginFormDisabled(true);
    setLoginSubmitState(true, '준비 중...');

    if (!canUseAuthApi()) {
      authEnabled = false;
      setLoginHelp('로그인은 배포 서버 또는 로컬 API 환경에서만 동작합니다.');
      setLoginSubmitState(false);
      return;
    }

    try {
      const result = await requestAuth(AUTH_ENDPOINTS.me, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        credentials: 'same-origin',
      });

      if (!result.ok) {
        authEnabled = false;
        setLoginHelp('로그인 API를 찾지 못했습니다. Vercel 배포 환경에서 접속 중인지 확인하세요.');
        setLoginSubmitState(false);
        return;
      }

      const payload = result.payload || {};
      authEnabled = payload.configured !== false;

      if (!authEnabled) {
        setLoginHelp(payload.message || '로그인 서버 설정이 아직 완료되지 않았습니다.');
        setLoginSubmitState(false);
        return;
      }

      setLoginHelp('이메일과 비밀번호로 로그인합니다.');
      setLoginFormDisabled(false);
      setLoginSubmitState(false);

      if (payload.authenticated && payload.user) {
        setCurrentUser(payload.user);
        await refreshPromptHistory({
          silent: true,
        });
      }
    } catch (error) {
      authEnabled = false;
      setLoginHelp('로그인 서버와 연결하지 못했습니다. 배포 환경과 인증 설정을 확인하세요.');
      setLoginSubmitState(false);
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    hideLoginError();

    if (!authEnabled) {
      showLoginError('로그인 설정이 아직 완료되지 않았습니다.');
      return;
    }

    const email = dom.emailInput.value.trim().toLowerCase();
    const password = dom.passwordInput.value;

    if (!email || !password) {
      showLoginError('이메일과 비밀번호를 모두 입력하세요.');
      return;
    }

    setLoginSubmitState(true, '로그인 중...');

    try {
      const result = await requestAuth(AUTH_ENDPOINTS.login, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = result.payload || {};
      if (!result.ok || !payload.user) {
        showLoginError(payload.message || DEFAULT_LOGIN_ERROR_MESSAGE);
        return;
      }

      setCurrentUser(payload.user);
      await refreshPromptHistory({
        silent: true,
      });
      dom.loginForm.reset();
      showDashboard();
    } catch (error) {
      showLoginError('로그인 서버에 연결하지 못했습니다.');
    } finally {
      setLoginSubmitState(false);
    }
  }

  async function handleLogout() {
    try {
      if (canUseAuthApi()) {
        await requestAuth(AUTH_ENDPOINTS.logout, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
          },
          credentials: 'same-origin',
        });
      }
    } catch (error) {
      // Clear local UI state even when the API call fails.
    }

    setCurrentUser(null);
    dom.loginForm.reset();
    hideLoginError();
    showLogin();
  }

  function bindEvents() {
    dom.loginForm.addEventListener('submit', function onSubmit(event) {
      handleLoginSubmit(event);
    });
    dom.dashboardLogoutBtn.addEventListener('click', handleLogout);
    dom.builderLogoutBtn.addEventListener('click', handleLogout);
    dom.historyLogoutBtn.addEventListener('click', handleLogout);
    dom.openPromptBuilderBtn.addEventListener('click', showPromptBuilder);
    dom.openPromptHistoryBtn.addEventListener('click', function onOpenHistory() {
      openPromptHistoryScreen();
    });
    dom.openPromptHistoryFromBuilderBtn.addEventListener('click', function onOpenHistoryFromBuilder() {
      openPromptHistoryScreen();
    });
    dom.backToDashboardBtn.addEventListener('click', showDashboard);
    dom.historyBackToDashboardBtn.addEventListener('click', showDashboard);
    dom.historyOpenBuilderBtn.addEventListener('click', showPromptBuilder);
    dom.refreshHistoryBtn.addEventListener('click', function onRefreshHistory() {
      refreshPromptHistory();
    });
    dom.saveHistoryBtn.addEventListener('click', function onSaveHistory() {
      handleSaveHistory();
    });
    dom.resetHistoryDraftBtn.addEventListener('click', function onResetHistoryDraft() {
      clearHistoryDraft(true);
    });
    dom.historyList.addEventListener('click', function onHistoryClick(event) {
      handleHistoryListClick(event);
    });
    dom.sentenceBtn.addEventListener('click', handleSentenceCompose);
    dom.translateBtn.addEventListener('click', handleTranslate);
    dom.englishSentenceBtn.addEventListener('click', handleEnglishSentenceCompose);
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
    dom.copyEnglishSentenceBtn.addEventListener('click', function copyEnglishSentence() {
      copyText(dom.englishSentenceBox.textContent.trim(), '영문 문장 프롬프트 복사됨');
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
    renderEnglishSentenceText(state.englishSentenceText);
    dom.negativePromptBox.textContent = NEGATIVE_PROMPT;
    renderHistorySaveState();
    renderHistoryList();
    setHistoryStatus('저장된 프롬프트를 확인하려면 로그인 후 새로고침하세요.');
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

  async function init() {
    cacheDom();
    restorePromptState();
    renderTagGroups();
    initializePromptOutput();
    bindEvents();
    await initializeAuth();
    initializeScreen();
  }

  documentRef.addEventListener('DOMContentLoaded', function onReady() {
    init();
  });
})(window, document);
