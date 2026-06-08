import { checkSessionOrRedirect, bindCommonNavbar, showToast } from './common.js';

const DATA = window.PromptGeneratorData.DATA;
const SINGLE_SELECT_KEYS = window.PromptGeneratorData.SINGLE_SELECT_KEYS;

const coreModule = window.PromptGeneratorCore;
const storageModule = window.PromptGeneratorStorage;
const historyModule = window.PromptHistoryFeature;

const NEGATIVE_PROMPT = [
  '(worst quality, low quality:1.4), mutated hands, malformed limbs, deformed fingers, extra fingers,',
  'missing fingers, fused fingers, too many fingers, long neck, bad anatomy, disfigured, poorly drawn face,',
  'mutated face, cloned face, extra limbs, missing limbs, gross proportions, malformed hands, distorted hands,',
  'broken legs, backward limbs, floating limbs, disconnected limbs, asymmetrical eyes, cross-eyed, deformed pupils,',
  'cataracts, blurry eyes, missing eyelashes, weird eyes, extra pupils, faded colors, low resolution, distorted iris, bloodshot eyes,',
  '(anime, cartoon), illustration, painting, 3d render, watermark, text, out of frame, blurry, grainy'
].join('\n');

const state = {
  currentUser: null,
  selections: createEmptySelections(),
  promptOutput: '',
  sentenceText: '',
  translatedText: '',
  englishSentenceText: '',
  activeHistoryId: '',
  isGuestMode: false,
  authEnabled: false,
};

const dom = {};

function createEmptySelections() {
  const selections = {};
  Object.keys(DATA).forEach((key) => {
    selections[key] = [];
  });
  return selections;
}

function sanitizeSelections(rawSelections) {
  const sanitized = createEmptySelections();
  if (!rawSelections || typeof rawSelections !== 'object') {
    return sanitized;
  }
  Object.keys(DATA).forEach((key) => {
    const nextValues = Array.isArray(rawSelections[key]) ? rawSelections[key] : [];
    sanitized[key] = nextValues.filter((value) => DATA[key].items.includes(value));
  });
  return sanitized;
}

function cacheDom() {
  dom.promptOutput = document.getElementById('promptOutput');
  dom.saveHistoryBtn = document.getElementById('saveHistoryBtn');
  dom.resetHistoryDraftBtn = document.getElementById('resetHistoryDraftBtn');
  dom.historySaveStatus = document.getElementById('historySaveStatus');
  dom.sentenceWrapper = document.getElementById('sentenceWrapper');
  dom.sentenceBox = document.getElementById('sentenceBox');
  dom.translatedWrapper = document.getElementById('translatedWrapper');
  dom.translatedBox = document.getElementById('translatedBox');
  dom.englishSentenceWrapper = document.getElementById('englishSentenceWrapper');
  dom.englishSentenceBox = document.getElementById('englishSentenceBox');
  dom.sentenceBtn = document.getElementById('sentenceBtn');
  dom.translateBtn = document.getElementById('translateBtn');
  dom.englishSentenceBtn = document.getElementById('englishSentenceBtn');
  dom.clearBtn = document.getElementById('clearBtn');
  dom.copyKoreanBtn = document.getElementById('copyKoreanBtn');
  dom.copySentenceBtn = document.getElementById('copySentenceBtn');
  dom.copyEnglishBtn = document.getElementById('copyEnglishBtn');
  dom.copyEnglishSentenceBtn = document.getElementById('copyEnglishSentenceBtn');
  dom.copyNegativeBtn = document.getElementById('copyNegativeBtn');
  dom.negativePromptBox = document.getElementById('negativePromptBox');
}

function restorePromptState() {
  const savedState = storageModule.loadState();
  if (!savedState) return;

  state.selections = sanitizeSelections(savedState.selections);
  state.promptOutput = typeof savedState.promptOutput === 'string' ? savedState.promptOutput : '';
  state.sentenceText = typeof savedState.sentenceText === 'string' ? savedState.sentenceText : '';
  state.translatedText = typeof savedState.translatedText === 'string' ? savedState.translatedText : '';
  state.englishSentenceText = typeof savedState.englishSentenceText === 'string' ? savedState.englishSentenceText : '';
  state.activeHistoryId = typeof savedState.activeHistoryId === 'string' ? savedState.activeHistoryId : '';
}

function persistPromptState() {
  storageModule.saveState({
    selections: state.selections,
    promptOutput: state.promptOutput,
    sentenceText: state.sentenceText,
    translatedText: state.translatedText,
    englishSentenceText: state.englishSentenceText,
    activeHistoryId: state.activeHistoryId,
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
  Object.entries(DATA).forEach(([key, definition]) => {
    const container = document.getElementById(key);
    if (!container) return;

    container.innerHTML = '';
    definition.items.forEach((item) => {
      const tag = document.createElement('button');
      const selected = state.selections[key].includes(item);
      tag.className = 'tag';
      tag.type = 'button';
      tag.textContent = item;
      tag.dataset.key = key;
      tag.dataset.value = item;
      tag.dataset.color = definition.color || '';
      setTagSelection(tag, definition.color, selected);
      tag.addEventListener('click', () => {
        toggleTag(key, item);
      });
      container.appendChild(tag);
    });
  });
}

function updateGroupSelectionUi(key) {
  const tags = document.querySelectorAll('[data-key="' + key + '"]');
  tags.forEach((tag) => {
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

  if (state.promptOutput) {
    state.sentenceText = coreModule.buildSentencePrompt(state.selections, state.promptOutput);
    renderSentenceText(state.sentenceText);
  } else {
    clearSentenceText(false);
  }

  const englishPrompt = coreModule.buildEnglishPrompt(state.selections);
  if (englishPrompt) {
    state.translatedText = englishPrompt;
    renderTranslatedText(englishPrompt);
  } else {
    clearTranslatedText(false);
  }

  const englishSentence = coreModule.buildEnglishSentencePrompt(state.selections);
  if (englishSentence) {
    state.englishSentenceText = englishSentence;
    renderEnglishSentenceText(englishSentence);
  } else {
    clearEnglishSentenceText(false);
  }

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
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  showToast(copied ? successMessage : '복사 실패 - 텍스트를 직접 선택하세요');
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
  if (!prompt) return;

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

function renderHistorySaveState() {
  if (state.activeHistoryId) {
    // We cannot format timestamp easily without querying it from server, but we can display editing mode
    dom.historySaveStatus.textContent = '편집 중 (기존 히스토리)';
    dom.saveHistoryBtn.textContent = '저장본 업데이트';
    dom.resetHistoryDraftBtn.disabled = false;
    return;
  }
  dom.historySaveStatus.textContent = '새 저장 모드';
  dom.saveHistoryBtn.textContent = '히스토리 저장';
  dom.resetHistoryDraftBtn.disabled = true;
}

function clearHistoryDraft(announce) {
  state.activeHistoryId = '';
  renderHistorySaveState();
  if (announce) {
    showToast('새 저장 모드로 전환되었습니다');
  }
  persistPromptState();
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
  if (!state.authEnabled || state.isGuestMode) {
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

    state.activeHistoryId = responsePayload.item.id;
    renderHistorySaveState();
    showToast(savedMessage);
    persistPromptState();
  } catch (error) {
    showToast('Prompt History 서버와 연결하지 못했습니다');
  } finally {
    dom.saveHistoryBtn.disabled = false;
  }
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
  persistPromptState();
}

function bindEvents() {
  dom.sentenceBtn.addEventListener('click', handleSentenceCompose);
  dom.translateBtn.addEventListener('click', handleTranslate);
  dom.englishSentenceBtn.addEventListener('click', handleEnglishSentenceCompose);
  dom.clearBtn.addEventListener('click', handleClearAll);
  dom.copyKoreanBtn.addEventListener('click', () => {
    copyText(dom.promptOutput.value, '한글 프롬프트 복사됨');
  });
  dom.copySentenceBtn.addEventListener('click', () => {
    copyText(dom.sentenceBox.textContent.trim(), '문장형 프롬프트 복사됨');
  });
  dom.copyEnglishBtn.addEventListener('click', () => {
    copyText(dom.translatedBox.textContent.trim(), '영문 프롬프트 복사됨');
  });
  dom.copyEnglishSentenceBtn.addEventListener('click', () => {
    copyText(dom.englishSentenceBox.textContent.trim(), '영문 문장 프롬프트 복사됨');
  });
  dom.copyNegativeBtn.addEventListener('click', () => {
    copyText(NEGATIVE_PROMPT, '네거티브 프롬프트 복사됨');
  });
  dom.promptOutput.addEventListener('input', handlePromptInput);

  dom.saveHistoryBtn.addEventListener('click', handleSaveHistory);
  dom.resetHistoryDraftBtn.addEventListener('click', () => {
    clearHistoryDraft(true);
  });
}

async function init() {
  const session = await checkSessionOrRedirect();
  if (!session) return; // Redirecting...

  state.currentUser = session.user;
  state.isGuestMode = session.isGuest;
  state.authEnabled = session.authEnabled;

  cacheDom();
  restorePromptState();
  renderTagGroups();
  initializePromptOutput();
  bindEvents();
  bindCommonNavbar(session.user, session.isGuest);
}

document.addEventListener('DOMContentLoaded', init);
