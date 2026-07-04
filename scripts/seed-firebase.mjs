import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Environment Loader
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
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
  }
}

async function seed() {
  loadEnv();

  const projectId = process.env.FIREBASE_PROJECT_ID || 'bloom-universe';
  
  // Initialize admin app
  if (getApps().length === 0) {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        projectId,
      });
    } else {
      initializeApp({
        projectId,
      });
    }
  }

  const auth = getAuth();
  const db = getFirestore();

  const email = 'mohenz@hotmail.com';
  const password = 'adminpassword123';
  const displayName = 'Bloom Admin';

  console.log('Firebase Seeding을 시작합니다...');
  console.log(`프로젝트 ID: ${projectId}`);
  console.log(`대상 계정: ${email}`);

  let userRecord;
  try {
    // Check if user already exists in Auth
    userRecord = await auth.getUserByEmail(email);
    console.log(`기존 계정이 Auth에 존재합니다. UID: ${userRecord.uid}`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      // Create user in Auth
      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      console.log(`새로운 관리자 계정을 Auth에 생성했습니다. UID: ${userRecord.uid}`);
    } else {
      throw error;
    }
  }

  // Write user document in Firestore
  const userRef = db.collection('users').doc(userRecord.uid);
  await userRef.set({
    email,
    displayName,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Firestore 'users' 컬렉션에 프로필 작성을 완료했습니다.`);
  console.log('==================================================');
  console.log('Firebase Seeding이 성공적으로 완료되었습니다!');
  console.log(`이메일: ${email}`);
  console.log(`비밀번호: ${password}`);
  console.log('==================================================');
}

seed().catch(err => {
  console.error('[오류] Seeding 실패:', err);
  process.exit(1);
});
