import fs from 'node:fs';
import path from 'node:path';
import {
  createJsonResponse,
  readRequestBody,
  serializeExpiredSessionCookie,
} from '../lib/auth-utils.js';
import { getAuthenticatedSession } from '../lib/auth-session.js';
import {
  listStoryGroupsByUserId,
  createStoryGroup,
  updateStoryGroup,
  deleteStoryGroup,
  listStoryDocumentsByUserId,
  createStoryDocument,
  updateStoryDocument,
  deleteStoryDocument,
  listStoryReferencesByUserId,
  createStoryReference,
  deleteStoryReference,
  deleteStoryReferencesByDocumentId,
} from '../lib/story-store.js';

function scanStoryDirectory(dirPath, relativeRoot = '') {
  const results = [];
  if (!fs.existsSync(dirPath)) {
    return results;
  }
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    const relPath = relativeRoot ? `${relativeRoot}/${item.name}` : item.name;
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      results.push(...scanStoryDirectory(fullPath, relPath));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        results.push({
          relativePath: `story/${relPath}`,
          name: item.name,
          content,
        });
      } catch (err) {
        console.error(`Failed to read file ${fullPath}:`, err);
      }
    }
  }
  return results;
}

function getQueryParam(request, key) {
  try {
    const url = new URL(request.url, 'http://localhost');
    return url.searchParams.get(key) || '';
  } catch (error) {
    return '';
  }
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
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

  const userId = authState.user.id;
  const type = getQueryParam(request, 'type');

  try {
    // 1. GET Requests: Fetch full story system data or specific parts
    if (request.method === 'GET') {
      const groups = await listStoryGroupsByUserId(userId);
      const documents = await listStoryDocumentsByUserId(userId);
      const references = await listStoryReferencesByUserId(userId);
      
      createJsonResponse(response, 200, {
        groups,
        documents,
        references,
      });
      return;
    }

    const body = readRequestBody(request.body) || {};

    // 2. POST Requests: Create Group / Document / Reference / Sync
    if (request.method === 'POST') {
      if (type === 'sync') {
        const storyDir = path.join(process.cwd(), 'story');
        const files = scanStoryDirectory(storyDir);
        
        const existingGroups = await listStoryGroupsByUserId(userId);
        const existingDocs = await listStoryDocumentsByUserId(userId);
        
        const groupMap = new Map(existingGroups.map(g => [g.name.toLowerCase(), g]));
        const docMap = new Map(existingDocs.map(d => [d.path ? d.path.toLowerCase() : '', d]));
        
        let syncedGroupsCount = 0;
        let syncedDocsCount = 0;
        
        for (const file of files) {
          const cleanPath = file.relativePath.replace(/^story\//, '');
          const parts = cleanPath.split('/');
          
          let groupName = 'Story Archive';
          let folderParts = [];
          let fileName = parts[parts.length - 1];
          
          if (parts.length > 1) {
            groupName = parts[0];
            folderParts = parts.slice(1, parts.length - 1);
          }
          
          let groupKey = groupName.toLowerCase();
          let group = groupMap.get(groupKey);
          if (!group) {
            group = await createStoryGroup({
              user_id: userId,
              name: groupName,
              description: `로컬 ${groupName} 폴더에서 연동된 스토리 그룹입니다.`,
            });
            groupMap.set(groupKey, group);
            syncedGroupsCount++;
          }
          const groupId = group.id;
          
          let currentParentId = null;
          let currentPathAccumulator = `story/${groupName}`;
          
          for (const folderPart of folderParts) {
            currentPathAccumulator += `/${folderPart}`;
            const folderPathKey = currentPathAccumulator.toLowerCase();
            let parentDoc = docMap.get(folderPathKey);
            if (!parentDoc) {
              parentDoc = await createStoryDocument({
                user_id: userId,
                group_id: groupId,
                parent_id: currentParentId,
                name: folderPart,
                content: '',
                path: currentPathAccumulator,
                sort_order: 0,
              });
              docMap.set(folderPathKey, parentDoc);
              syncedDocsCount++;
            }
            currentParentId = parentDoc.id;
          }
          
          const fileDocPathKey = file.relativePath.toLowerCase();
          const existingDoc = docMap.get(fileDocPathKey);
          const docName = fileName.replace(/\.md$/, '');
          
          if (existingDoc) {
            if (existingDoc.content !== file.content || existingDoc.parent_id !== currentParentId || existingDoc.group_id !== groupId || existingDoc.name !== docName) {
              await updateStoryDocument(userId, existingDoc.id, {
                group_id: groupId,
                parent_id: currentParentId,
                name: docName,
                content: file.content,
              });
            }
          } else {
            const newDoc = await createStoryDocument({
              user_id: userId,
              group_id: groupId,
              parent_id: currentParentId,
              name: docName,
              content: file.content,
              path: file.relativePath,
              sort_order: (files.indexOf(file) + 1) * 10,
            });
            docMap.set(fileDocPathKey, newDoc);
            syncedDocsCount++;
          }
        }
        
        createJsonResponse(response, 200, {
          ok: true,
          syncedGroups: syncedGroupsCount,
          syncedDocuments: syncedDocsCount,
          totalFilesChecked: files.length,
        });
        return;
      }

      if (type === 'group') {
        const name = normalizeText(body.name);
        if (!name) {
          createJsonResponse(response, 400, { message: '그룹 이름이 필요합니다.' });
          return;
        }
        const created = await createStoryGroup({
          user_id: userId,
          name,
          description: normalizeText(body.description) || null,
        });
        createJsonResponse(response, 201, created);
        return;
      }
      
      if (type === 'document') {
        const name = normalizeText(body.name);
        if (!name) {
          createJsonResponse(response, 400, { message: '문서 제목이 필요합니다.' });
          return;
        }
        const created = await createStoryDocument({
          user_id: userId,
          group_id: body.group_id || null,
          parent_id: body.parent_id || null,
          name,
          content: normalizeText(body.content) || '',
          path: normalizeText(body.path) || null,
          sort_order: Number(body.sort_order || 0),
        });
        createJsonResponse(response, 201, created);
        return;
      }

      if (type === 'reference') {
        const source_id = normalizeText(body.source_id);
        const target_id = normalizeText(body.target_id);
        if (!source_id || !target_id) {
          createJsonResponse(response, 400, { message: '출발지 및 목적지 문서 ID가 필요합니다.' });
          return;
        }
        const created = await createStoryReference({
          user_id: userId,
          source_id,
          target_id,
          link_type: normalizeText(body.link_type) || 'reference',
        });
        createJsonResponse(response, 201, created);
        return;
      }

      createJsonResponse(response, 400, { message: '잘못된 생성 타입(type)입니다.' });
      return;
    }

    // 3. PUT / PATCH Requests: Update Group / Document
    if (request.method === 'PUT' || request.method === 'PATCH') {
      const id = getQueryParam(request, 'id') || body.id;
      if (!id) {
        createJsonResponse(response, 400, { message: '수정할 항목의 ID가 필요합니다.' });
        return;
      }

      if (type === 'group') {
        const updateData = {};
        if (body.name !== undefined) updateData.name = normalizeText(body.name);
        if (body.description !== undefined) updateData.description = normalizeText(body.description) || null;

        const updated = await updateStoryGroup(userId, id, updateData);
        if (!updated) {
          createJsonResponse(response, 404, { message: '수정할 그룹을 찾지 못했습니다.' });
          return;
        }
        createJsonResponse(response, 200, updated);
        return;
      }

      if (type === 'document') {
        const updateData = {};
        if (body.name !== undefined) updateData.name = normalizeText(body.name);
        if (body.content !== undefined) updateData.content = normalizeText(body.content);
        if (body.group_id !== undefined) updateData.group_id = body.group_id || null;
        if (body.parent_id !== undefined) updateData.parent_id = body.parent_id || null;
        if (body.sort_order !== undefined) updateData.sort_order = Number(body.sort_order || 0);
        if (body.path !== undefined) updateData.path = normalizeText(body.path) || null;

        const updated = await updateStoryDocument(userId, id, updateData);
        if (!updated) {
          createJsonResponse(response, 404, { message: '수정할 문서를 찾지 못했습니다.' });
          return;
        }
        createJsonResponse(response, 200, updated);
        return;
      }

      createJsonResponse(response, 400, { message: '잘못된 수정 타입(type)입니다.' });
      return;
    }

    // 4. DELETE Requests: Delete Group / Document / Reference
    if (request.method === 'DELETE') {
      const id = getQueryParam(request, 'id') || body.id;
      if (!id) {
        createJsonResponse(response, 400, { message: '삭제할 항목의 ID가 필요합니다.' });
        return;
      }

      if (type === 'group') {
        const deleted = await deleteStoryGroup(userId, id);
        if (!deleted) {
          createJsonResponse(response, 404, { message: '삭제할 그룹을 찾지 못했습니다.' });
          return;
        }
        createJsonResponse(response, 200, { ok: true, id: deleted.id });
        return;
      }

      if (type === 'document') {
        // First delete references involving this document
        await deleteStoryReferencesByDocumentId(userId, id);
        // Then delete document
        const deleted = await deleteStoryDocument(userId, id);
        if (!deleted) {
          createJsonResponse(response, 404, { message: '삭제할 문서를 찾지 못했습니다.' });
          return;
        }
        createJsonResponse(response, 200, { ok: true, id: deleted.id });
        return;
      }

      if (type === 'reference') {
        const deleted = await deleteStoryReference(userId, id);
        if (!deleted) {
          createJsonResponse(response, 404, { message: '삭제할 참조 관계를 찾지 못했습니다.' });
          return;
        }
        createJsonResponse(response, 200, { ok: true, id: deleted.id });
        return;
      }

      createJsonResponse(response, 400, { message: '잘못된 삭제 타입(type)입니다.' });
      return;
    }

    createJsonResponse(response, 405, { message: 'Method Not Allowed' });
  } catch (error) {
    createJsonResponse(response, 500, {
      message: error instanceof Error ? error.message : '요청 처리 중 서버 오류가 발생했습니다.',
    });
  }
}
