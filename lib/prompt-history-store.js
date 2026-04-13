import { encodeFilterValue, requestSupabase } from './supabase-rest.js';

const PROMPT_HISTORY_FIELDS = [
  'id',
  'user_id',
  'selections',
  'prompt_output',
  'sentence_text',
  'translated_text',
  'english_sentence_text',
  'created_at',
  'updated_at',
].join(',');

export async function listPromptHistoriesByUserId(userId) {
  const result = await requestSupabase(
    `/prompt_histories?select=${PROMPT_HISTORY_FIELDS}&user_id=eq.${encodeFilterValue(userId)}&order=created_at.desc`,
    {
      method: 'GET',
    }
  );

  return Array.isArray(result) ? result : [];
}

export async function createPromptHistory(record) {
  const result = await requestSupabase('/prompt_histories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: record,
  });

  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function updatePromptHistory(userId, historyId, record) {
  const result = await requestSupabase(
    `/prompt_histories?id=eq.${encodeFilterValue(historyId)}&user_id=eq.${encodeFilterValue(userId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: record,
    }
  );

  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function deletePromptHistory(userId, historyId) {
  const result = await requestSupabase(
    `/prompt_histories?id=eq.${encodeFilterValue(historyId)}&user_id=eq.${encodeFilterValue(userId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );

  return Array.isArray(result) && result.length ? result[0] : null;
}
