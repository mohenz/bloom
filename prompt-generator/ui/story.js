import { checkSessionOrRedirect, bindCommonNavbar, showToast } from './common.js';

const state = {
  currentUser: null,
  isGuestMode: false,
  authEnabled: false,
  activeStory: null,
  activeStoryOriginal: '',
  storyQuery: '',
  storyGroups: [],
  storyDocuments: [],
  storyReferences: [],
  expandedNodes: new Set(),
  sidebarCollapsed: false,
};

const dom = {};

function cacheDom() {
  dom.storyStatus = document.getElementById('storyStatus');
  dom.storySearchInput = document.getElementById('storySearchInput');
  dom.storySyncBtn = document.getElementById('storySyncBtn');
  dom.storyAddGroupBtn = document.getElementById('storyAddGroupBtn');
  dom.storyAddDocBtn = document.getElementById('storyAddDocBtn');
  dom.storyTreeContainer = document.getElementById('storyTreeContainer');

  dom.storyModal = document.getElementById('storyModal');
  dom.storyModalBackdrop = document.getElementById('storyModalBackdrop');
  dom.storyModalCloseBtn = document.getElementById('storyModalCloseBtn');
  dom.storyModalTitle = document.getElementById('storyModalTitle');
  dom.storyModalPath = document.getElementById('storyModalPath');
  dom.storyEditor = document.getElementById('storyEditor');
  dom.storyEditStatus = document.getElementById('storyEditStatus');
  dom.storySaveBtn = document.getElementById('storySaveBtn');
  dom.storyCopyBtn = document.getElementById('storyCopyBtn');
  dom.storyResetBtn = document.getElementById('storyResetBtn');

  dom.storyModalGroupSelect = document.getElementById('storyModalGroupSelect');
  dom.storyModalParentSelect = document.getElementById('storyModalParentSelect');
  dom.storyModalSortOrder = document.getElementById('storyModalSortOrder');
  dom.storyModalLinkDocSelect = document.getElementById('storyModalLinkDocSelect');
  dom.storyModalAddLinkBtn = document.getElementById('storyModalAddLinkBtn');
  dom.storyModalReferencesList = document.getElementById('storyModalReferencesList');

  dom.storyModalToggleSidebarBtn = document.getElementById('storyModalToggleSidebarBtn');
  dom.storyModalToggleSidebarIcon = document.getElementById('storyModalToggleSidebarIcon');
  dom.storyModalToggleSidebarText = document.getElementById('storyModalToggleSidebarText');
  dom.storyModalSidebar = document.getElementById('storyModalSidebar');
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (error) {
    return {};
  }
}

async function fetchStories() {
  if (state.isGuestMode || !state.authEnabled) {
    state.storyGroups = [{ id: 'archive', name: 'Story Archive', description: '기본 아카이브 그룹입니다.' }];
    const manifest = window.STORY_MANIFEST || [];
    state.storyDocuments = manifest.map((item, idx) => {
      return {
        id: item.path,
        group_id: 'archive',
        parent_id: null,
        name: item.name.replace(/\.md$/, ''),
        content: '',
        path: item.path,
        sort_order: (idx + 1) * 10
      };
    });
    state.storyReferences = [];
    dom.storyStatus.textContent = '게스트 모드: 로컬 파일 목록을 표시합니다.';
    renderStoryTreeView();
    return;
  }

  dom.storyStatus.textContent = '스토리 데이터를 불러오는 중...';
  try {
    const response = await fetch('/api/story', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await readJsonResponse(response);
    state.storyGroups = Array.isArray(payload.groups) ? payload.groups : [];
    state.storyDocuments = Array.isArray(payload.documents) ? payload.documents : [];
    state.storyReferences = Array.isArray(payload.references) ? payload.references : [];
    
    if (state.expandedNodes.size === 0) {
      state.storyGroups.forEach(g => state.expandedNodes.add(g.id));
    }

    state.storyDocuments.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    dom.storyStatus.textContent = `로드 완료: 그룹 ${state.storyGroups.length}개, 문서 ${state.storyDocuments.length}개`;
    renderStoryTreeView();
  } catch (error) {
    dom.storyStatus.textContent = `오류 발생: ${error.message}`;
  }
}

function renderStoryTreeView() {
  if (!dom.storyTreeContainer) return;
  dom.storyTreeContainer.innerHTML = '';

  const query = state.storyQuery.trim().toLowerCase();
  
  let filteredDocs = state.storyDocuments;
  if (query) {
    filteredDocs = state.storyDocuments.filter(d => 
      (d.name || '').toLowerCase().includes(query) || 
      (d.content || '').toLowerCase().includes(query) || 
      (d.path || '').toLowerCase().includes(query)
    );
  }

  const groupsToRender = state.storyGroups;
  if (groupsToRender.length === 0 && filteredDocs.length === 0) {
    dom.storyTreeContainer.innerHTML = '<p class="history-empty text-center py-lg">스토리 문서가 없습니다. 로컬 파일 동기화를 진행하거나 문서를 새로 작성해주세요.</p>';
    return;
  }

  groupsToRender.forEach(group => {
    const groupDocs = filteredDocs.filter(d => d.group_id === group.id);
    if (query && groupDocs.length === 0) return;

    const groupNode = document.createElement('div');
    groupNode.className = 'tree-node group-node';
    groupNode.dataset.id = group.id;

    const isExpanded = state.expandedNodes.has(group.id);

    const header = document.createElement('div');
    header.className = 'tree-node-content';
    header.innerHTML = `
      <div class="tree-node-info">
        <span class="material-symbols-outlined tree-node-toggle ${isExpanded ? 'is-expanded' : ''}" data-action="toggle-group" data-id="${group.id}">chevron_right</span>
        <span class="material-symbols-outlined text-primary" data-icon="folder">folder</span>
        <span class="tree-node-title">${group.name}</span>
        <span class="tree-node-path opacity-50">(${groupDocs.length}개 문서)</span>
      </div>
      <div class="tree-node-actions">
        <button class="tree-node-btn" title="문서 추가" data-action="add-doc" data-group-id="${group.id}">
          <span class="material-symbols-outlined" data-icon="add">add</span>
        </button>
        <button class="tree-node-btn" title="그룹 이름 수정" data-action="edit-group" data-id="${group.id}" data-name="${group.name}">
          <span class="material-symbols-outlined" data-icon="edit">edit</span>
        </button>
        <button class="tree-node-btn hover:text-error" title="그룹 삭제" data-action="delete-group" data-id="${group.id}">
          <span class="material-symbols-outlined" data-icon="delete">delete</span>
        </button>
      </div>
    `;

    groupNode.appendChild(header);

    if (isExpanded) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      
      const rootDocs = groupDocs.filter(d => !d.parent_id || !state.storyDocuments.find(p => p.id === d.parent_id));
      
      if (rootDocs.length === 0) {
        childrenContainer.innerHTML = '<span class="text-xs text-on-surface-variant font-mono opacity-50 p-sm">빈 그룹</span>';
      } else {
        rootDocs.forEach((doc, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === rootDocs.length - 1;
          childrenContainer.appendChild(renderDocumentTreeNode(doc, groupDocs, isFirst, isLast));
        });
      }
      groupNode.appendChild(childrenContainer);
    }

    dom.storyTreeContainer.appendChild(groupNode);
  });

  const unassignedDocs = filteredDocs.filter(d => !d.group_id);
  if (unassignedDocs.length > 0) {
    const groupNode = document.createElement('div');
    groupNode.className = 'tree-node group-node';
    groupNode.dataset.id = 'unassigned';
    const isExpanded = state.expandedNodes.has('unassigned');

    groupNode.innerHTML = `
      <div class="tree-node-content">
        <div class="tree-node-info">
          <span class="material-symbols-outlined tree-node-toggle ${isExpanded ? 'is-expanded' : ''}" data-action="toggle-group" data-id="unassigned">chevron_right</span>
          <span class="material-symbols-outlined text-primary" data-icon="folder_open">folder_open</span>
          <span class="tree-node-title">미지정 그룹 문서</span>
          <span class="tree-node-path opacity-50">(${unassignedDocs.length}개 문서)</span>
        </div>
      </div>
    `;

    if (isExpanded) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-children';
      unassignedDocs.forEach((doc, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === unassignedDocs.length - 1;
        childrenContainer.appendChild(renderDocumentTreeNode(doc, unassignedDocs, isFirst, isLast));
      });
      groupNode.appendChild(childrenContainer);
    }
    dom.storyTreeContainer.appendChild(groupNode);
  }
}

function renderDocumentTreeNode(doc, siblings, isFirst, isLast) {
  const docNode = document.createElement('div');
  docNode.className = 'tree-node document-node';
  docNode.dataset.id = doc.id;

  const childDocs = state.storyDocuments.filter(d => d.parent_id === doc.id);
  const hasChildren = childDocs.length > 0;
  const isExpanded = state.expandedNodes.has(doc.id);

  const toggleHtml = hasChildren
    ? `<span class="material-symbols-outlined tree-node-toggle ${isExpanded ? 'is-expanded' : ''}" data-action="toggle-doc" data-id="${doc.id}">chevron_right</span>`
    : `<span class="w-[20px] inline-block"></span>`;

  const row = document.createElement('div');
  row.className = 'tree-node-content';
  row.innerHTML = `
    <div class="tree-node-info" data-action="open-doc" data-id="${doc.id}">
      ${toggleHtml}
      <span class="material-symbols-outlined text-accent2" data-icon="description">description</span>
      <span class="tree-node-title">${doc.name}</span>
      ${doc.path ? `<span class="tree-node-path">${doc.path}</span>` : ''}
    </div>
    <div class="tree-node-actions">
      <button class="tree-node-btn" title="위로 이동" data-action="move-up" data-id="${doc.id}" ${isFirst ? 'disabled' : ''}>
        <span class="material-symbols-outlined" data-icon="arrow_upward">arrow_upward</span>
      </button>
      <button class="tree-node-btn" title="아래로 이동" data-action="move-down" data-id="${doc.id}" ${isLast ? 'disabled' : ''}>
        <span class="material-symbols-outlined" data-icon="arrow_downward">arrow_downward</span>
      </button>
      <button class="tree-node-btn" title="하위 문서 추가" data-action="add-sub-doc" data-id="${doc.id}" data-group-id="${doc.group_id}">
        <span class="material-symbols-outlined" data-icon="add">add</span>
      </button>
      <button class="tree-node-btn" title="편집" data-action="open-doc" data-id="${doc.id}">
        <span class="material-symbols-outlined" data-icon="edit">edit</span>
      </button>
      <button class="tree-node-btn hover:text-error" title="삭제" data-action="delete-doc" data-id="${doc.id}">
        <span class="material-symbols-outlined" data-icon="delete">delete</span>
      </button>
    </div>
  `;

  docNode.appendChild(row);

  if (hasChildren && isExpanded) {
    const childrenContainer = document.createElement('div');
    childrenContainer.className = 'tree-children';
    childDocs.forEach((child, idx) => {
      const childIsFirst = idx === 0;
      const childIsLast = idx === childDocs.length - 1;
      childrenContainer.appendChild(renderDocumentTreeNode(child, childDocs, childIsFirst, childIsLast));
    });
    docNode.appendChild(childrenContainer);
  }

  return docNode;
}

async function handleSyncStories() {
  if (state.isGuestMode || !state.authEnabled) {
    showToast('게스트 모드에서는 로컬 파일 동기화를 할 수 없습니다.');
    return;
  }

  const confirmed = confirm('로컬 story/ 디렉터리의 마크다운 파일 구조를 데이터베이스와 연동하시겠습니까?\n동일한 경로의 파일이 이미 존재하면 로컬 내용으로 업데이트됩니다.');
  if (!confirmed) return;

  dom.storySyncBtn.disabled = true;
  const originalText = dom.storySyncBtn.innerHTML;
  dom.storySyncBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" data-icon="sync">sync</span>동기화 중...';

  try {
    const response = await fetch('/api/story?type=sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin'
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '동기화 실패');

    showToast(`동기화 완료: 파일 ${result.totalFilesChecked}개 연동 (새 그룹 ${result.syncedGroups}개, 새 문서 ${result.syncedDocuments}개)`);
    await fetchStories();
  } catch (error) {
    showToast(`동기화 중 오류 발생: ${error.message}`);
  } finally {
    dom.storySyncBtn.disabled = false;
    dom.storySyncBtn.innerHTML = originalText;
  }
}

async function handleAddGroup() {
  if (state.isGuestMode || !state.authEnabled) {
    showToast('게스트 모드에서는 그룹을 생성할 수 없습니다.');
    return;
  }
  const name = prompt('새로운 스토리 그룹 이름을 입력해주세요:');
  if (!name || !name.trim()) return;

  try {
    const response = await fetch('/api/story?type=group', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name: name.trim() })
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '그룹 생성 실패');
    showToast('새 그룹이 생성되었습니다.');
    await fetchStories();
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function handleEditGroup(groupId, currentName) {
  if (state.isGuestMode || !state.authEnabled) return;
  const name = prompt('수정할 그룹 이름을 입력해주세요:', currentName);
  if (!name || !name.trim() || name.trim() === currentName) return;

  try {
    const response = await fetch(`/api/story?type=group&id=${groupId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ name: name.trim() })
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '그룹명 수정 실패');
    showToast('그룹 이름이 수정되었습니다.');
    await fetchStories();
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function handleDeleteGroup(groupId) {
  if (state.isGuestMode || !state.authEnabled) return;
  const confirmed = confirm('이 그룹을 삭제하시겠습니까?\n그룹 내의 문서들은 미지정 그룹으로 분류됩니다.');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/story?type=group&id=${groupId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '그룹 삭제 실패');
    showToast('그룹이 삭제되었습니다.');
    await fetchStories();
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function handleAddDoc(parentDocId = null, defaultGroupId = null) {
  if (state.isGuestMode || !state.authEnabled) {
    showToast('게스트 모드에서는 문서를 추가할 수 없습니다.');
    return;
  }
  const name = prompt('새로운 문서 제목을 입력해주세요:');
  if (!name || !name.trim()) return;

  try {
    const body = {
      name: name.trim(),
      group_id: defaultGroupId || null,
      parent_id: parentDocId || null,
      content: '',
      sort_order: 10
    };

    const response = await fetch('/api/story?type=document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body)
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '문서 생성 실패');
    showToast('새 문서가 생성되었습니다.');
    await fetchStories();
    openStoryFile(result.id);
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function handleDeleteDoc(docId) {
  if (state.isGuestMode || !state.authEnabled) return;
  const confirmed = confirm('이 문서를 정말 삭제하시겠습니까?\n하위 문서의 연결도 해제되며 연결된 참조선 정보도 삭제됩니다.');
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/story?type=document&id=${docId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '문서 삭제 실패');
    showToast('문서가 삭제되었습니다.');
    await fetchStories();
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function handleMoveDoc(docId, direction) {
  if (state.isGuestMode || !state.authEnabled) return;
  
  const doc = state.storyDocuments.find(d => d.id === docId);
  if (!doc) return;

  const siblings = state.storyDocuments.filter(d => 
    d.group_id === doc.group_id && d.parent_id === doc.parent_id
  );

  const index = siblings.findIndex(d => d.id === doc.id);
  if (index === -1) return;

  let targetSibling = null;
  if (direction === 'up' && index > 0) {
    targetSibling = siblings[index - 1];
  } else if (direction === 'down' && index < siblings.length - 1) {
    targetSibling = siblings[index + 1];
  }

  if (!targetSibling) return;

  const tempOrder = doc.sort_order || 0;
  const targetOrder = targetSibling.sort_order || 0;

  const newDocOrder = targetOrder === tempOrder ? tempOrder - 5 : targetOrder;
  const newTargetOrder = targetOrder === tempOrder ? tempOrder + 5 : tempOrder;

  try {
    await Promise.all([
      fetch(`/api/story?type=document&id=${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sort_order: newDocOrder })
      }),
      fetch(`/api/story?type=document&id=${targetSibling.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ sort_order: newTargetOrder })
      })
    ]);

    await fetchStories();
  } catch (error) {
    showToast('순서 변경 실패');
  }
}

async function openStoryFile(docId) {
  const doc = state.storyDocuments.find(d => d.id === docId);
  if (!doc) return;

  state.activeStory = doc;
  dom.storyModal.classList.remove('is-hidden');
  dom.storyModalTitle.textContent = doc.name;
  dom.storyModalPath.textContent = doc.path || 'DB 생성 문서 (로컬 파일 없음)';
  
  dom.storyEditor.value = '문서를 불러오는 중...';
  dom.storyEditor.disabled = true;
  dom.storyEditStatus.textContent = '문서를 불러오는 중...';

  if (doc.content) {
    dom.storyEditor.value = doc.content;
    dom.storyEditor.disabled = false;
    dom.storyEditStatus.textContent = '문서를 열었습니다.';
    state.activeStoryOriginal = doc.content;
    dom.storyEditor.selectionStart = 0;
    dom.storyEditor.selectionEnd = 0;
    dom.storyEditor.scrollTop = 0;
    dom.storyEditor.focus();
    updateModalDropdowns();
    renderModalReferencesList();
  } else if (doc.path) {
    try {
      const response = await fetch(encodeURI(doc.path), { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const content = await response.text();
      doc.content = content;
      
      dom.storyEditor.value = content;
      dom.storyEditor.disabled = false;
      dom.storyEditStatus.textContent = '원본 파일을 로드했습니다.';
      state.activeStoryOriginal = content;
      dom.storyEditor.selectionStart = 0;
      dom.storyEditor.selectionEnd = 0;
      dom.storyEditor.scrollTop = 0;
      dom.storyEditor.focus();
    } catch (error) {
      dom.storyEditor.value = '';
      dom.storyEditStatus.textContent = `파일을 불러오지 못했습니다: ${error.message}`;
    }
    updateModalDropdowns();
    renderModalReferencesList();
  } else {
    dom.storyEditor.value = '';
    dom.storyEditor.disabled = false;
    dom.storyEditStatus.textContent = '빈 문서입니다.';
    state.activeStoryOriginal = '';
    updateModalDropdowns();
    renderModalReferencesList();
  }
}

function updateModalDropdowns() {
  if (!dom.storyModalGroupSelect || !state.activeStory) return;

  dom.storyModalGroupSelect.innerHTML = '<option value="">미지정</option>' + 
    state.storyGroups.map(g => 
      `<option value="${g.id}" ${g.id === state.activeStory.group_id ? 'selected' : ''}>${g.name}</option>`
    ).join('');

  const currentGroupId = state.activeStory.group_id;
  const sameGroupDocs = state.storyDocuments.filter(d => 
    d.group_id === currentGroupId && d.id !== state.activeStory.id
  );

  function isDescendant(potentialParentId, selfId) {
    if (!potentialParentId) return false;
    const doc = state.storyDocuments.find(d => d.id === potentialParentId);
    if (!doc) return false;
    if (doc.parent_id === selfId) return true;
    return isDescendant(doc.parent_id, selfId);
  }

  const validParentDocs = sameGroupDocs.filter(d => !isDescendant(d.id, state.activeStory.id));

  dom.storyModalParentSelect.innerHTML = '<option value="">없음 (최상위)</option>' + 
    validParentDocs.map(d => 
      `<option value="${d.id}" ${d.id === state.activeStory.parent_id ? 'selected' : ''}>${d.name}</option>`
    ).join('');

  dom.storyModalSortOrder.value = state.activeStory.sort_order || 0;

  const otherDocs = state.storyDocuments.filter(d => d.id !== state.activeStory.id);
  dom.storyModalLinkDocSelect.innerHTML = '<option value="">연결할 문서 선택...</option>' + 
    otherDocs.map(d => 
      `<option value="${d.id}">${d.name} (${d.path || 'DB'})</option>`
    ).join('');
}

function renderModalReferencesList() {
  if (!dom.storyModalReferencesList || !state.activeStory) return;
  dom.storyModalReferencesList.innerHTML = '';

  const docId = state.activeStory.id;
  const refs = state.storyReferences.filter(r => r.source_id === docId || r.target_id === docId);

  if (refs.length === 0) {
    dom.storyModalReferencesList.innerHTML = '<p class="text-xs text-on-surface-variant font-mono opacity-50 text-center py-md">연결된 참조 문서가 없습니다.</p>';
    return;
  }

  refs.forEach(ref => {
    const isSource = ref.source_id === docId;
    const targetDocId = isSource ? ref.target_id : ref.source_id;
    const targetDoc = state.storyDocuments.find(d => d.id === targetDocId);
    if (!targetDoc) return;

    const item = document.createElement('div');
    item.className = 'ref-item';
    item.innerHTML = `
      <div class="flex items-center gap-xs min-w-0">
        <span class="font-label-sm text-[10px] px-sm py-unit border border-on-surface uppercase ${isSource ? 'bg-[#ffdbd0] text-[#783018]' : 'bg-secondary-container text-on-secondary-container'}">
          ${isSource ? 'OUT' : 'IN'}
        </span>
        <span class="ref-item-text truncate font-bold">${targetDoc.name}</span>
      </div>
      <div class="flex gap-xs">
        <button class="tree-node-btn" title="이동" data-action="jump-ref" data-id="${targetDoc.id}">
          <span class="material-symbols-outlined" data-icon="arrow_forward">arrow_forward</span>
        </button>
        <button class="tree-node-btn hover:text-error" title="연결 해제" data-action="delete-ref" data-id="${ref.id}">
          <span class="material-symbols-outlined" data-icon="link_off">link_off</span>
        </button>
      </div>
    `;
    dom.storyModalReferencesList.appendChild(item);
  });
}

async function handleAddReference() {
  if (!state.activeStory || !dom.storyModalLinkDocSelect) return;
  const targetId = dom.storyModalLinkDocSelect.value;
  if (!targetId) {
    showToast('연결할 대상을 선택하세요.');
    return;
  }

  try {
    const response = await fetch('/api/story?type=reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        source_id: state.activeStory.id,
        target_id: targetId,
        link_type: 'reference'
      })
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '참조 추가 실패');
    showToast('참조 관계가 연결되었습니다.');
    
    await fetchStories();
    updateModalDropdowns();
    renderModalReferencesList();
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function handleDeleteReference(refId) {
  try {
    const response = await fetch(`/api/story?type=reference&id=${refId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '참조 삭제 실패');
    showToast('참조 관계를 삭제했습니다.');

    await fetchStories();
    updateModalDropdowns();
    renderModalReferencesList();
  } catch (error) {
    showToast(`오류: ${error.message}`);
  }
}

async function saveActiveStory() {
  if (!state.activeStory) return;
  
  if (state.isGuestMode || !state.authEnabled) {
    showToast('게스트 모드에서는 내용을 저장할 수 없습니다.');
    return;
  }

  const content = dom.storyEditor.value;
  const groupId = dom.storyModalGroupSelect.value || null;
  const parentId = dom.storyModalParentSelect.value || null;
  const sortOrder = Number(dom.storyModalSortOrder.value || 0);

  dom.storySaveBtn.disabled = true;
  const originalText = dom.storySaveBtn.innerHTML;
  dom.storySaveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin" data-icon="sync">sync</span>저장 중...';

  try {
    const response = await fetch(`/api/story?type=document&id=${state.activeStory.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        content,
        group_id: groupId,
        parent_id: parentId,
        sort_order: sortOrder
      })
    });
    const result = await readJsonResponse(response);
    if (!response.ok) throw new Error(result.message || '저장 실패');

    showToast('문서 속성 및 내용을 성공적으로 저장했습니다.');
    state.activeStoryOriginal = content;
    dom.storyEditStatus.textContent = '성공적으로 저장되었습니다.';

    await fetchStories();
    updateModalDropdowns();
  } catch (error) {
    showToast(`저장 실패: ${error.message}`);
  } finally {
    dom.storySaveBtn.disabled = false;
    dom.storySaveBtn.innerHTML = originalText;
  }
}

function resetActiveStory() {
  if (!state.activeStory) return;
  dom.storyEditor.value = state.activeStoryOriginal;
  dom.storyEditStatus.textContent = '원본 내용으로 복원했습니다.';
}

function closeStoryModal() {
  dom.storyModal.classList.add('is-hidden');
  state.activeStory = null;
  state.activeStoryOriginal = '';
  
  // Reset sidebar state to default (expanded)
  state.sidebarCollapsed = false;
  if (dom.storyModalSidebar) {
    dom.storyModalSidebar.classList.remove('hidden');
    dom.storyEditor.classList.remove('md:w-full');
    dom.storyEditor.classList.add('md:w-[70%]');
    dom.storyModalToggleSidebarIcon.textContent = 'menu_open';
    dom.storyModalToggleSidebarText.textContent = '속성 창 접기';
  }
}

async function copyText(text, successMessage) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
  } catch (error) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(copied ? successMessage : '복사 실패');
  }
}

function bindEvents() {
  dom.storySyncBtn.addEventListener('click', handleSyncStories);
  dom.storyAddGroupBtn.addEventListener('click', handleAddGroup);
  dom.storyAddDocBtn.addEventListener('click', () => { handleAddDoc(); });
  dom.storySearchInput.addEventListener('input', () => {
    state.storyQuery = dom.storySearchInput.value;
    renderStoryTreeView();
  });

  // Story Tree click delegation
  dom.storyTreeContainer.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    
    const action = target.dataset.action;
    const id = target.dataset.id;
    const groupId = target.dataset.groupId;
    const name = target.dataset.name;

    if (action === 'toggle-group' || action === 'toggle-doc') {
      if (state.expandedNodes.has(id)) {
        state.expandedNodes.delete(id);
      } else {
        state.expandedNodes.add(id);
      }
      renderStoryTreeView();
    } else if (action === 'open-doc') {
      openStoryFile(id);
    } else if (action === 'add-doc') {
      handleAddDoc(null, groupId);
    } else if (action === 'add-sub-doc') {
      handleAddDoc(id, groupId);
    } else if (action === 'edit-group') {
      handleEditGroup(id, name);
    } else if (action === 'delete-group') {
      handleDeleteGroup(id);
    } else if (action === 'delete-doc') {
      handleDeleteDoc(id);
    } else if (action === 'move-up') {
      handleMoveDoc(id, 'up');
    } else if (action === 'move-down') {
      handleMoveDoc(id, 'down');
    }
  });

  // Story Modal details close/actions
  dom.storyModalCloseBtn.addEventListener('click', closeStoryModal);
  dom.storyModalBackdrop.addEventListener('click', closeStoryModal);
  dom.storySaveBtn.addEventListener('click', saveActiveStory);
  dom.storyResetBtn.addEventListener('click', resetActiveStory);
  dom.storyCopyBtn.addEventListener('click', () => {
    copyText(dom.storyEditor.value, '스토리 내용 복사됨');
  });

  dom.storyModalToggleSidebarBtn.addEventListener('click', () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    if (state.sidebarCollapsed) {
      dom.storyModalSidebar.classList.add('hidden');
      dom.storyEditor.classList.remove('md:w-[70%]');
      dom.storyEditor.classList.add('md:w-full');
      dom.storyModalToggleSidebarIcon.textContent = 'menu';
      dom.storyModalToggleSidebarText.textContent = '속성 창 열기';
    } else {
      dom.storyModalSidebar.classList.remove('hidden');
      dom.storyEditor.classList.remove('md:w-full');
      dom.storyEditor.classList.add('md:w-[70%]');
      dom.storyModalToggleSidebarIcon.textContent = 'menu_open';
      dom.storyModalToggleSidebarText.textContent = '속성 창 접기';
    }
  });

  // Modal sidebar references
  dom.storyModalGroupSelect.addEventListener('change', () => {
    if (!state.activeStory) return;
    state.activeStory.group_id = dom.storyModalGroupSelect.value || null;
    state.activeStory.parent_id = null; // reset parent when group changes
    updateModalDropdowns();
  });

  dom.storyModalAddLinkBtn.addEventListener('click', handleAddReference);

  dom.storyModalReferencesList.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const refId = btn.dataset.id;
    if (action === 'jump-ref') {
      openStoryFile(refId);
    } else if (action === 'delete-ref') {
      handleDeleteReference(refId);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !dom.storyModal.classList.contains('is-hidden')) {
      closeStoryModal();
    }
  });
}

async function init() {
  const session = await checkSessionOrRedirect();
  if (!session) return; // Redirecting...

  state.currentUser = session.user;
  state.isGuestMode = session.isGuest;
  state.authEnabled = session.authEnabled;

  cacheDom();
  bindEvents();
  await fetchStories();
  bindCommonNavbar(session.user, session.isGuest);
}

document.addEventListener('DOMContentLoaded', init);
