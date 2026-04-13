import {
  createJsonResponse,
  readRequestBody,
  serializeExpiredSessionCookie,
} from '../lib/auth-utils.js';
import { getAuthenticatedSession } from '../lib/auth-session.js';
import {
  createPromptHistory,
  deletePromptHistory,
  listPromptHistoriesByUserId,
  updatePromptHistory,
} from '../lib/prompt-history-store.js';

function getQueryParam(request, key) {
  try {
    const url = new URL(request.url, 'http://localhost');
    return url.searchParams.get(key) || '';
  } catch (error) {
    return '';
  }
}

function normalizeHistorySelections(rawSelections) {
  if (!rawSelections || typeof rawSelections !== 'object' || Array.isArray(rawSelections)) {
    return {};
  }

  return Object.keys(rawSelections).reduce(function reduceSelections(accumulator, key) {
    const values = Array.isArray(rawSelections[key]) ? rawSelections[key] : [];
    const normalizedValues = values
      .filter(function onlyStrings(value) {
        return typeof value === 'string';
      })
      .map(function trimValue(value) {
        return value.trim();
      })
      .filter(Boolean);

    accumulator[key] = normalizedValues;
    return accumulator;
  }, {});
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeHistoryInput(body) {
  return {
    selections: normalizeHistorySelections(body.selections),
    promptOutput: normalizeText(body.promptOutput),
    sentenceText: normalizeText(body.sentenceText),
    translatedText: normalizeText(body.translatedText),
    englishSentenceText: normalizeText(body.englishSentenceText),
  };
}

function hasHistoryContent(historyInput) {
  const hasSelection = Object.values(historyInput.selections).some(function hasValues(values) {
    return Array.isArray(values) && values.length > 0;
  });

  return Boolean(
    hasSelection ||
      historyInput.promptOutput ||
      historyInput.sentenceText ||
      historyInput.translatedText ||
      historyInput.englishSentenceText
  );
}

function buildHistoryResponse(record) {
  return {
    id: record.id,
    selections: record.selections && typeof record.selections === 'object' ? record.selections : {},
    promptOutput: record.prompt_output || '',
    sentenceText: record.sentence_text || '',
    translatedText: record.translated_text || '',
    englishSentenceText: record.english_sentence_text || '',
    createdAt: record.created_at || '',
    updatedAt: record.updated_at || '',
  };
}

function buildAuthFailureResponse(request, response, authState) {
  const extraHeaders = authState.shouldClearCookie
    ? {
        'Set-Cookie': serializeExpiredSessionCookie(request),
      }
    : undefined;

  createJsonResponse(
    response,
    authState.configured ? 401 : 503,
    {
      configured: authState.configured,
      authenticated: false,
      message: authState.message || '로그인이 필요합니다.',
    },
    extraHeaders
  );
}

export default async function handler(request, response) {
  let authState;

  try {
    authState = await getAuthenticatedSession(request);
  } catch (error) {
    createJsonResponse(response, 500, {
      configured: true,
      authenticated: false,
      message: error instanceof Error ? error.message : '인증 상태 확인 중 오류가 발생했습니다.',
    });
    return;
  }

  if (!authState.authenticated) {
    buildAuthFailureResponse(request, response, authState);
    return;
  }

  try {
    if (request.method === 'GET') {
      const records = await listPromptHistoriesByUserId(authState.user.id);
      createJsonResponse(response, 200, {
        items: records.map(buildHistoryResponse),
      });
      return;
    }

    const body = readRequestBody(request.body);

    if (request.method === 'POST') {
      const historyInput = normalizeHistoryInput(body);
      if (!hasHistoryContent(historyInput)) {
        createJsonResponse(response, 400, {
          message: '저장할 프롬프트 내용이 없습니다.',
        });
        return;
      }

      const createdRecord = await createPromptHistory({
        user_id: authState.user.id,
        selections: historyInput.selections,
        prompt_output: historyInput.promptOutput,
        sentence_text: historyInput.sentenceText || null,
        translated_text: historyInput.translatedText || null,
        english_sentence_text: historyInput.englishSentenceText || null,
      });

      createJsonResponse(response, 201, {
        item: buildHistoryResponse(createdRecord),
      });
      return;
    }

    if (request.method === 'PUT') {
      const historyId = getQueryParam(request, 'id') || normalizeText(body.id);
      if (!historyId) {
        createJsonResponse(response, 400, {
          message: '수정할 Prompt History 항목 ID가 필요합니다.',
        });
        return;
      }

      const historyInput = normalizeHistoryInput(body);
      if (!hasHistoryContent(historyInput)) {
        createJsonResponse(response, 400, {
          message: '저장할 프롬프트 내용이 없습니다.',
        });
        return;
      }

      const updatedRecord = await updatePromptHistory(authState.user.id, historyId, {
        selections: historyInput.selections,
        prompt_output: historyInput.promptOutput,
        sentence_text: historyInput.sentenceText || null,
        translated_text: historyInput.translatedText || null,
        english_sentence_text: historyInput.englishSentenceText || null,
      });

      if (!updatedRecord) {
        createJsonResponse(response, 404, {
          message: '수정할 Prompt History 항목을 찾지 못했습니다.',
        });
        return;
      }

      createJsonResponse(response, 200, {
        item: buildHistoryResponse(updatedRecord),
      });
      return;
    }

    if (request.method === 'DELETE') {
      const historyId = getQueryParam(request, 'id') || normalizeText(body.id);
      if (!historyId) {
        createJsonResponse(response, 400, {
          message: '삭제할 Prompt History 항목 ID가 필요합니다.',
        });
        return;
      }

      const deletedRecord = await deletePromptHistory(authState.user.id, historyId);
      if (!deletedRecord) {
        createJsonResponse(response, 404, {
          message: '삭제할 Prompt History 항목을 찾지 못했습니다.',
        });
        return;
      }

      createJsonResponse(response, 200, {
        ok: true,
        id: deletedRecord.id,
      });
      return;
    }

    createJsonResponse(response, 405, {
      message: 'Method Not Allowed',
    });
  } catch (error) {
    createJsonResponse(response, 500, {
      message: error instanceof Error ? error.message : 'Prompt History 처리 중 오류가 발생했습니다.',
    });
  }
}
