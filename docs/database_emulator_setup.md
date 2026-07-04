# Firebase Local Emulator Suite 설치 및 구동 가이드

이 문서는 로컬 개발 환경에서 Supabase/PostgreSQL 대신 **Firebase Local Emulator Suite**를 구동하여 완전히 오프라인 상태에서 데이터베이스 및 인증 기능을 테스트하는 방법을 설명합니다.

---

## 1. 사전 요구 사항

로컬 에뮬레이터를 실행하려면 시스템에 **Java Development Kit (JDK) 11 이상**이 설치되어 있어야 합니다.
(Firestore 및 기타 에뮬레이터들은 내부적으로 Java 기반으로 동작합니다.)

---

## 2. Firebase CLI 설치

글로벌로 Firebase CLI(도구)를 설치합니다.

```bash
npm install -g firebase-tools
```

---

## 3. 에뮬레이터 구동

프로젝트 루트 디렉터리(`D:\Workspace\bloom`)에서 아래 명령어를 실행하여 에뮬레이터를 구동합니다.

```bash
firebase emulators:start
```

### 구동 결과 예시:
```
┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your apps. │
└─────────────────────────────────────────────────────────────┘

┌───────────┬──────────────┬──────────────────────────────────┐
│ Emulator  │ Host:Port    │ View in Emulator UI              │
├───────────┼──────────────┼──────────────────────────────────┤
│ Auth      │ localhost:9099│ http://localhost:4000/auth       │
├───────────┼──────────────┼──────────────────────────────────┤
│ Firestore │ localhost:8080│ http://localhost:4000/firestore  │
└───────────┴──────────────┴──────────────────────────────────┘
```

* **에뮬레이터 대시보드 (UI)**: `http://localhost:4000`에 접속하면 시각적인 데이터 뷰어 및 사용자 추가 도구를 사용할 수 있습니다.

---

## 4. 환경 변수 구성 (`.env`)

웹 애플리케이션의 `.env` 파일에 아래와 같이 구성하여 로컬 에뮬레이터를 가리키도록 설정합니다.

```env
# Firebase 프로젝트 ID 지정
FIREBASE_PROJECT_ID=bloom-universe

# 아래 에뮬레이터 환경 변수들이 감지되면, Firebase Admin SDK가 자동으로 로컬 포트에 연결합니다.
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099

# 세션 암호화 비밀키
AUTH_SESSION_SECRET=a_very_long_and_random_string_for_session_security_12345!
```

---

## 5. 초기 관리자 계정 생성 (Seeding)

에뮬레이터가 켜진 상태에서, 아래 스크립트를 최초 1회 실행하면 개발용 테스트 계정이 자동으로 등록됩니다.

```bash
node scripts/seed-firebase.mjs
```
(이 스크립트는 Firebase Auth 에뮬레이터에 `mohenz@hotmail.com` 계정을 등록하고, Firestore의 `users` 컬렉션에 프로필을 생성합니다.)
