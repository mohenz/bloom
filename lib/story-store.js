import { encodeFilterValue, requestSupabase } from './supabase-rest.js';

// --- Story Groups Store ---
export async function listStoryGroupsByUserId(userId) {
  const result = await requestSupabase(
    `/story_groups?select=id,user_id,name,description,created_at,updated_at&user_id=eq.${encodeFilterValue(userId)}&order=name.asc`,
    {
      method: 'GET',
    }
  );
  return Array.isArray(result) ? result : [];
}

export async function createStoryGroup(record) {
  const result = await requestSupabase('/story_groups', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: record,
  });
  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function updateStoryGroup(userId, groupId, record) {
  const result = await requestSupabase(
    `/story_groups?id=eq.${encodeFilterValue(groupId)}&user_id=eq.${encodeFilterValue(userId)}`,
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

export async function deleteStoryGroup(userId, groupId) {
  const result = await requestSupabase(
    `/story_groups?id=eq.${encodeFilterValue(groupId)}&user_id=eq.${encodeFilterValue(userId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );
  return Array.isArray(result) && result.length ? result[0] : null;
}

// --- Story Documents Store ---
const STORY_DOCUMENT_FIELDS = [
  'id',
  'user_id',
  'group_id',
  'parent_id',
  'name',
  'content',
  'path',
  'sort_order',
  'created_at',
  'updated_at',
].join(',');

export async function listStoryDocumentsByUserId(userId) {
  const result = await requestSupabase(
    `/story_documents?select=${STORY_DOCUMENT_FIELDS}&user_id=eq.${encodeFilterValue(userId)}&order=sort_order.asc`,
    {
      method: 'GET',
    }
  );
  return Array.isArray(result) ? result : [];
}

export async function createStoryDocument(record) {
  const result = await requestSupabase('/story_documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: record,
  });
  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function updateStoryDocument(userId, docId, record) {
  const result = await requestSupabase(
    `/story_documents?id=eq.${encodeFilterValue(docId)}&user_id=eq.${encodeFilterValue(userId)}`,
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

export async function deleteStoryDocument(userId, docId) {
  const result = await requestSupabase(
    `/story_documents?id=eq.${encodeFilterValue(docId)}&user_id=eq.${encodeFilterValue(userId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );
  return Array.isArray(result) && result.length ? result[0] : null;
}

// --- Story References Store ---
export async function listStoryReferencesByUserId(userId) {
  const result = await requestSupabase(
    `/story_references?select=id,source_id,target_id,link_type&user_id=eq.${encodeFilterValue(userId)}`,
    {
      method: 'GET',
    }
  );
  return Array.isArray(result) ? result : [];
}

export async function createStoryReference(record) {
  const result = await requestSupabase('/story_references', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: record,
  });
  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function deleteStoryReference(userId, refId) {
  const result = await requestSupabase(
    `/story_references?id=eq.${encodeFilterValue(refId)}&user_id=eq.${encodeFilterValue(userId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=representation',
      },
    }
  );
  return Array.isArray(result) && result.length ? result[0] : null;
}

export async function deleteStoryReferencesByDocumentId(userId, docId) {
  // Delete references where document is source or target
  const filter = `or(source_id.eq.${encodeFilterValue(docId)},target_id.eq.${encodeFilterValue(docId)})&user_id=eq.${encodeFilterValue(userId)}`;
  const result = await requestSupabase(`/story_references?${filter}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=representation',
    },
  });
  return Array.isArray(result) ? result : [];
}
