(function registerPromptHistoryFeature(global) {
  const HISTORY_ENDPOINT = '/api/prompt-history';

  function readJsonResponse(responseText) {
    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(responseText);
    } catch (error) {
      return {};
    }
  }

  function normalizeString(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeSelections(rawSelections) {
    if (!rawSelections || typeof rawSelections !== 'object' || Array.isArray(rawSelections)) {
      return {};
    }

    return Object.keys(rawSelections).reduce(function reduceSelections(accumulator, key) {
      const values = Array.isArray(rawSelections[key]) ? rawSelections[key] : [];
      accumulator[key] = values
        .filter(function onlyStrings(value) {
          return typeof value === 'string';
        })
        .map(function trimString(value) {
          return value.trim();
        })
        .filter(Boolean);
      return accumulator;
    }, {});
  }

  function buildHistoryPayload(input) {
    return {
      selections: normalizeSelections(input.selections),
      promptOutput: normalizeString(input.promptOutput),
      sentenceText: normalizeString(input.sentenceText),
      translatedText: normalizeString(input.translatedText),
      englishSentenceText: normalizeString(input.englishSentenceText),
    };
  }

  function hasHistoryContent(input) {
    const payload = buildHistoryPayload(input);
    const hasSelections = Object.keys(payload.selections).some(function hasValues(key) {
      return Array.isArray(payload.selections[key]) && payload.selections[key].length > 0;
    });

    return Boolean(
      hasSelections ||
        payload.promptOutput ||
        payload.sentenceText ||
        payload.translatedText ||
        payload.englishSentenceText
    );
  }

  function normalizeHistoryRecord(record) {
    return {
      id: normalizeString(record.id),
      selections: normalizeSelections(record.selections),
      promptOutput: normalizeString(record.promptOutput),
      sentenceText: normalizeString(record.sentenceText),
      translatedText: normalizeString(record.translatedText),
      englishSentenceText: normalizeString(record.englishSentenceText),
      createdAt: normalizeString(record.createdAt),
      updatedAt: normalizeString(record.updatedAt),
    };
  }

  function formatHistoryTimestamp(isoText) {
    if (!isoText) {
      return '날짜 없음';
    }

    const date = new Date(isoText);
    if (Number.isNaN(date.getTime())) {
      return isoText;
    }

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  function buildHistoryPreview(record) {
    const promptText = normalizeString(record.promptOutput);
    if (promptText) {
      return promptText;
    }

    const sentenceText = normalizeString(record.sentenceText);
    if (sentenceText) {
      return sentenceText;
    }

    return '저장된 프롬프트 텍스트가 없습니다.';
  }

  async function requestHistory(url, options) {
    const response = await global.fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options && options.headers ? options.headers : {}),
      },
    });
    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      payload: readJsonResponse(text),
    };
  }

  async function listHistory() {
    return requestHistory(HISTORY_ENDPOINT, {
      method: 'GET',
    });
  }

  async function createHistory(payload) {
    return requestHistory(HISTORY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildHistoryPayload(payload)),
    });
  }

  async function updateHistory(id, payload) {
    return requestHistory(HISTORY_ENDPOINT + '?id=' + encodeURIComponent(id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildHistoryPayload(payload)),
    });
  }

  async function deleteHistory(id) {
    return requestHistory(HISTORY_ENDPOINT + '?id=' + encodeURIComponent(id), {
      method: 'DELETE',
    });
  }

  global.PromptHistoryFeature = {
    buildHistoryPayload,
    buildHistoryPreview,
    createHistory,
    deleteHistory,
    formatHistoryTimestamp,
    hasHistoryContent,
    listHistory,
    normalizeHistoryRecord,
    updateHistory,
  };
})(window);
