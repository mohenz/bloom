import { checkSessionOrRedirect, bindCommonNavbar, showToast } from './common.js';

const storageModule = window.PromptGeneratorStorage;
const historyModule = window.PromptHistoryFeature;

const state = {
  currentUser: null,
  isGuestMode: false,
  authEnabled: false,
  historyItems: [],
  activeHistoryId: '',
};

const dom = {};

function cacheDom() {
  dom.historyStatus = document.getElementById('historyStatus');
  dom.historyEmpty = document.getElementById('historyEmpty');
  dom.historyList = document.getElementById('historyList');
  dom.refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
}

function setHistoryStatus(message) {
  dom.historyStatus.textContent = message;
}

function sortHistoryItems() {
  state.historyItems.sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function findHistoryRecord(historyId) {
  return state.historyItems.find((item) => item.id === historyId) || null;
}

function removeHistoryRecord(historyId) {
  state.historyItems = state.historyItems.filter((item) => item.id !== historyId);
}

function countSelectedGroups(selections) {
  if (!selections) return 0;
  return Object.keys(selections).reduce((accumulator, key) => {
    return accumulator + (Array.isArray(selections[key]) && selections[key].length ? 1 : 0);
  }, 0);
}

function renderHistoryList() {
  dom.historyList.innerHTML = '';

  if (!state.historyItems.length) {
    dom.historyEmpty.classList.remove('is-hidden');
    return;
  }

  dom.historyEmpty.classList.add('is-hidden');

  state.historyItems.forEach((record) => {
    const card = document.createElement('article');
    const isActive = record.id === state.activeHistoryId;

    card.className = 'history-card' + (isActive ? ' is-active' : '');

    const head = document.createElement('div');
    head.className = 'history-card-head';

    const createdAt = document.createElement('span');
    createdAt.className = 'history-card-date';
    createdAt.textContent = historyModule.formatHistoryTimestamp(record.createdAt);
    head.appendChild(createdAt);

    if (record.updatedAt && record.updatedAt !== record.createdAt) {
      const updatedAt = document.createElement('span');
      updatedAt.className = 'history-card-updated';
      updatedAt.textContent = '마지막 수정 ' + historyModule.formatHistoryTimestamp(record.updatedAt);
      head.appendChild(updatedAt);
    }

    const preview = document.createElement('p');
    preview.className = 'history-card-preview';
    preview.textContent = historyModule.buildHistoryPreview(record);

    const meta = document.createElement('p');
    meta.className = 'history-card-meta';
    meta.textContent = '선택 그룹 ' + countSelectedGroups(record.selections) + '개';

    const actions = document.createElement('div');
    actions.className = 'history-card-actions';

    const loadButton = document.createElement('button');
    loadButton.className = 'btn btn-history-load';
    loadButton.type = 'button';
    loadButton.dataset.action = 'load';
    loadButton.dataset.id = record.id;
    loadButton.textContent = isActive ? '불러온 상태' : '불러오기';
    actions.appendChild(loadButton);

    const deleteButton = document.createElement('button');
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

function restoreActiveHistoryId() {
  const savedState = storageModule.loadState();
  if (savedState && typeof savedState.activeHistoryId === 'string') {
    state.activeHistoryId = savedState.activeHistoryId;
  }
}

async function refreshPromptHistory(options) {
  const nextOptions = {
    silent: false,
    ...options,
  };

  if (!state.authEnabled || state.isGuestMode) {
    dom.historyEmpty.classList.remove('is-hidden');
    setHistoryStatus(
      state.isGuestMode
        ? '게스트 미리보기에서는 Prompt History 저장과 불러오기를 사용할 수 없습니다.'
        : '저장된 프롬프트를 확인하려면 로그인 후 새로고침하세요.'
    );
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

function applyHistoryRecord(record) {
  state.activeHistoryId = record.id;
  storageModule.saveState({
    selections: record.selections,
    promptOutput: record.promptOutput || '',
    sentenceText: record.sentenceText || '',
    translatedText: record.translatedText || '',
    englishSentenceText: record.englishSentenceText || '',
    activeHistoryId: record.id,
  });

  renderHistoryList();
  showToast('프롬프트를 불러왔습니다');
  setTimeout(() => {
    window.location.href = './builder.html';
  }, 500);
}

async function handleDeleteHistory(historyId) {
  const targetRecord = findHistoryRecord(historyId);
  if (!targetRecord) return;

  const confirmed = confirm(
    '"' + historyModule.formatHistoryTimestamp(targetRecord.createdAt) + '" 프롬프트를 삭제하시겠습니까?'
  );
  if (!confirmed) return;

  try {
    const result = await historyModule.deleteHistory(historyId);
    const payload = result && result.payload ? result.payload : {};

    if (!result || !result.ok) {
      showToast(payload.message || 'Prompt History 삭제에 실패했습니다');
      return;
    }

    removeHistoryRecord(historyId);
    if (state.activeHistoryId === historyId) {
      state.activeHistoryId = '';
      const savedState = storageModule.loadState() || {};
      savedState.activeHistoryId = '';
      storageModule.saveState(savedState);
    }
    renderHistoryList();
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
  if (!button) return;

  const historyId = button.dataset.id || '';
  if (!historyId) return;

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

function bindEvents() {
  dom.refreshHistoryBtn.addEventListener('click', () => {
    refreshPromptHistory();
  });
  dom.historyList.addEventListener('click', handleHistoryListClick);
}

async function init() {
  const session = await checkSessionOrRedirect();
  if (!session) return; // Redirecting...

  state.currentUser = session.user;
  state.isGuestMode = session.isGuest;
  state.authEnabled = session.authEnabled;

  cacheDom();
  restoreActiveHistoryId();
  bindEvents();
  await refreshPromptHistory({ silent: true });
  bindCommonNavbar(session.user, session.isGuest);
}

document.addEventListener('DOMContentLoaded', init);
