import fs from 'node:fs';
import path from 'node:path';

// Environment Loader
function loadEnv() {
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
  let loaded = false;
  for (const file of envFiles) {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let value = trimmed.substring(index + 1).trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      });
      console.log(`[Env] Loaded configurations from: ${file}`);
      loaded = true;
      break;
    }
  }
  if (!loaded) {
    console.error('[Error] Environment file (.env / .env.local) not found in workspace root.');
    process.exit(1);
  }
}

async function runMigration() {
  loadEnv();

  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    console.error('[Error] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined.');
    process.exit(1);
  }

  // 1. Fetch User (prefer admin@bloom.local or first user)
  console.log('[Supabase] Connecting to get target user...');
  const usersUrl = `${supabaseUrl}/rest/v1/app_users?select=id,email`;
  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: 'application/json',
  };

  let users = [];
  try {
    const res = await fetch(usersUrl, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    users = await res.json();
  } catch (err) {
    console.error(`[Error] Failed to fetch users from database: ${err.message}`);
    process.exit(1);
  }

  if (users.length === 0) {
    console.error('[Error] No users found in public.app_users table. Create a user via signup/login first.');
    process.exit(1);
  }

  // Find admin or first user
  let targetUser = users.find(u => String(u.email).toLowerCase() === 'admin@bloom.local') || users[0];
  console.log(`[Supabase] Targeted owner user: ${targetUser.email} (${targetUser.id})`);

  // 2. Create or find default Group "Story Archive"
  console.log('[Supabase] Resolving default Story Group...');
  const groupName = 'Story Archive';
  const groupUrl = `${supabaseUrl}/rest/v1/story_groups?name=eq.${encodeURIComponent(groupName)}&select=id`;
  
  let groupId = '';
  try {
    const res = await fetch(groupUrl, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const existing = await res.json();
    if (existing.length > 0) {
      groupId = existing[0].id;
      console.log(`[Supabase] Found existing Story Group ID: ${groupId}`);
    } else {
      console.log('[Supabase] Story Group not found. Creating default "Story Archive" group...');
      const createUrl = `${supabaseUrl}/rest/v1/story_groups`;
      const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: targetUser.id,
          name: groupName,
          description: '로컬 story/ 디렉터리에서 가져온 기본 아카이브 문서 그룹입니다.',
        })
      });
      if (!createRes.ok) throw new Error(`HTTP ${createRes.status}: ${await createRes.text()}`);
      const created = await createRes.json();
      groupId = created[0].id;
      console.log(`[Supabase] Created new Story Group ID: ${groupId}`);
    }
  } catch (err) {
    console.error(`[Error] Failed to resolve story group: ${err.message}`);
    process.exit(1);
  }

  // 3. Scan story/ directory for markdown files
  const storyDir = path.resolve(process.cwd(), 'story');
  if (!fs.existsSync(storyDir)) {
    console.error(`[Error] Local "story/" directory not found at: ${storyDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(storyDir).filter(f => f.endsWith('.md'));
  console.log(`[Local] Found ${files.length} markdown file(s) in "story/" folder.`);

  if (files.length === 0) {
    console.log('[Migration] No files to migrate.');
    return;
  }

  // 4. Load existing documents to prevent duplicate paths
  const docsUrl = `${supabaseUrl}/rest/v1/story_documents?user_id=eq.${targetUser.id}&select=path`;
  let existingPaths = new Set();
  try {
    const res = await fetch(docsUrl, { headers });
    if (res.ok) {
      const records = await res.json();
      records.forEach(r => {
        if (r.path) existingPaths.add(r.path);
      });
    }
  } catch (err) {
    console.warn(`[Warning] Could not fetch existing documents list: ${err.message}`);
  }

  // 5. Migrate
  console.log('[Migration] Commencing migration...');
  let migratedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const docPath = `story/${filename}`;
    const docName = path.basename(filename, '.md');

    if (existingPaths.has(docPath)) {
      console.log(`[Skip] Document already exists in database: ${docPath}`);
      skippedCount++;
      continue;
    }

    const filePath = path.join(storyDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    const insertUrl = `${supabaseUrl}/rest/v1/story_documents`;
    try {
      const res = await fetch(insertUrl, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: targetUser.id,
          group_id: groupId,
          name: docName,
          content: content,
          path: docPath,
          sort_order: (i + 1) * 10
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      console.log(`[Migrate] Inserted story: ${docName} (${docPath})`);
      migratedCount++;
    } catch (err) {
      console.error(`[Error] Failed to migrate file ${filename}: ${err.message}`);
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Total Files Checked: ${files.length}`);
  console.log(`Successfully Migrated: ${migratedCount}`);
  console.log(`Skipped (Duplicate): ${skippedCount}`);
}

runMigration().catch(err => {
  console.error('[Fatal Error] Migration run failed:', err);
});
