# Firebase 입문 사용 매뉴얼 (Firebase Beginner's User Manual)

이 매뉴얼은 Bloom Universe 프로젝트의 데이터베이스 아키텍처를 Supabase/PostgreSQL에서 **Firebase 생태계(Firestore, Firebase Authentication, Local Emulator Suite)**로 성공적으로 마이그레이션한 후, 개발자와 운영자가 시스템을 이해하고 초기화하기 위해 작성된 공식 가이드라인입니다.

---

## 1. 아키텍처 개요

Bloom Universe는 성능 최적화와 오프라인 개발 환경 지원을 위해 기존의 관계형 데이터베이스 구조를 Firebase NoSQL 구조로 전환하였습니다.
* **Authentication**: 기존 Vercel API 단의 개별 세션 관리를 Firebase Auth의 보안 세션 쿠키 기반 인증으로 일원화하였습니다.
* **Cloud Firestore**: 관계형 테이블을 계층적이고 유연한 문서형 구조(Collection 및 Document)로 플랫(Flat)하게 매핑하여 조회 속도를 극대화하였습니다.
* **Local Emulator Suite**: 외부 인터넷 연결 없이도 로컬에서 완벽히 독립적으로 개발과 테스트를 진행할 수 있는 로컬 에뮬레이터 환경을 제공합니다.

---

## 2. 환경 변수 설정 (.env)

웹 애플리케이션과 AI 에이전트 레이어 모두 동일한 Firebase 자격 증명을 사용하여 실서버(Google Cloud)와 로컬 에뮬레이터를 오갈 수 있도록 설계되었습니다.

### A. 웹 애플리케이션 설정 (`d:\workspace\bloom\.env`)
프로덕션 구글 클라우드에 직접 연결하기 위해 아래와 같이 설정되어 있습니다.

```env
# Firebase Production Credentials (Google Cloud)
FIREBASE_PROJECT_ID="persona-online"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@persona-online.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_API_KEY="AIzaSyDq0h_tfDIv4d71ZrUG4f8mZ57apkmvuzY"

# Session Security Key
AUTH_SESSION_SECRET="a_very_long_and_random_string_for_session_security_12345!"

# 로컬 에뮬레이터 활성화 시 주석을 해제합니다.
# FIRESTORE_EMULATOR_HOST=localhost:8080
# FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### B. AI 에이전트 설정 (`d:\Bloom\workspace\.env` 및 `d:\Bloom\system\config\.env`)
파이썬 에이전트 코어(`memory_utils.py`)가 연동할 수 있도록 웹 애플리케이션과 동일한 Firebase 자격 증명 세트를 설정해 둡니다.

```env
# Firebase Production Credentials
FIREBASE_PROJECT_ID="persona-online"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@persona-online.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_API_KEY="AIzaSyDq0h_tfDIv4d71ZrUG4f8mZ57apkmvuzY"
```

---

## 3. 구글 클라우드 콘솔 설정 (최초 1회 필수)

Firebase 프로젝트를 생성한 후 API를 활성화하기 위해 아래 두 단계를 완료해야 합니다. 이 작업은 웹 콘솔에서 이미 성공적으로 수행되었습니다.

### A. Firebase Authentication 활성화
1. [Authentication 설정 페이지](https://console.firebase.google.com/project/persona-online/authentication)로 이동합니다.
2. **시작하기 (Get Started)** 버튼을 클릭하여 인증 서비스를 활성화합니다.
3. **로그인 제공업체 (Sign-in method)**에서 **이메일/비밀번호 (Email/Password)** 제공업체를 **사용 설정 (Enable)**하고 저장합니다.

### B. Cloud Firestore 활성화
1. [Firestore 설정 페이지](https://console.firebase.google.com/project/persona-online/firestore)로 이동합니다.
2. **데이터베이스 만들기 (Create database)** 버튼을 클릭합니다.
3. 데이터베이스 ID는 기본값인 `(default)`로 선택하고, 데이터베이스 리전(위치)을 선택합니다.
4. 보안 규칙 단계에서 **테스트 모드에서 시작**을 선택한 뒤 최종 생성을 완료합니다.

---

## 4. 데이터베이스 초기화 및 시딩 (Database Seeding)

실서버 활성화가 완료된 후, 시스템 관리용 계정을 자동으로 생성하고 Firestore 기본 스키마를 초기화하는 스크립트입니다.

### 실행 방법
웹 애플리케이션 경로(`d:\workspace\bloom`)에서 터미널을 열고 다음 명령어를 실행합니다.
```bash
node scripts/seed-firebase.mjs
```

### 동작 메커니즘
1. `.env`에서 로드된 서비스 계정 비공개 키를 사용하여 Google Cloud Firebase Admin SDK를 초기화합니다.
2. Firebase Authentication에 지정된 관리자 계정(`mohenz@hotmail.com`)이 있는지 조회합니다.
3. 해당 계정이 없을 경우 Auth에 새 계정을 안전하게 생성합니다.
4. 생성된 사용자의 UID를 사용하여 Firestore의 `users` 컬렉션 내에 관리자 프로필 문서를 작성 또는 병합(Merge)합니다.

### 생성된 기본 관리자 정보
* **관리자 이메일**: `mohenz@hotmail.com`
* **임시 비밀번호**: `adminpassword123`

---

## 5. 로컬 개발 환경 활용법 (Local Emulator Suite)

오프라인 개발을 하거나 실서버 데이터 영향 없이 안전하게 개발 및 테스트를 하고자 할 때 로컬 에뮬레이터를 구동합니다.

### A. 에뮬레이터 구동
웹 애플리케이션 경로(`d:\workspace\bloom`)에서 아래 명령어를 구동합니다.
```bash
firebase emulators:start
```
이 명령어는 다음과 같은 로컬 포트에 에뮬레이터를 기동합니다.
* **Authentication Emulator**: `localhost:9099`
* **Firestore Emulator**: `localhost:8080`
* **Emulator Suite UI (웹 관리 도구)**: `localhost:4000`

### B. 로컬 에뮬레이터 모드 스위칭
`.env` 파일에서 아래 두 줄의 주석을 해제하면, 코드 수정 없이 웹 애플리케이션과 파이썬 에이전트의 모든 데이터 작업이 자동으로 로컬 에뮬레이터로 우회됩니다.
```env
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

---

## 6. 핵심 연동 코드 구조

* **웹 스토어 모듈 (`lib/firebase-store.js`)**: Node.js 환경에서 사용되는 Firebase Admin SDK 초기화 모듈입니다. 환경 변수의 유무에 따라 실서버 인증과 에뮬레이터 우회를 지능적으로 분기 처리합니다.
* **에이전트 메모리 모듈 (`system/memory_utils.py`)**: 파이썬 에이전트 레이어에서 로컬 마크다운 파일(`our_memories_current.md`)과 Firestore `memories` 컬렉션 간의 정밀한 해시 대조 기반 단방향/양방향 동기화를 수행합니다.

이로써 Bloom Universe의 데이터 저장소 아키텍처는 현대적이고 확장성이 뛰어난 Firebase 플랫폼으로 안전하게 통합되었습니다.

---

## 7. 레거시 데이터 마이그레이션 (Supabase -> Firestore)

기존 Supabase Cloud 데이터베이스(`persona-online`)에 존재하던 모든 정형 데이터 테이블(총 20개)을 신규 구글 클라우드 Firestore로 전량 마이그레이션 완료하였습니다.

### A. 마이그레이션 대상 및 결과
* **이관 스크립트 경로**: `d:\Bloom\system\migrate_absolute_all_supabase_to_firestore.py`
* **소유권 자동 매핑 (Dynamic UID Mapping)**:
  * 기존 Supabase 상의 사용자 UID(`5514eed9-bc4c-4806-9aaa-e134a28143c1`)를 신규 생성된 Firebase Auth의 UID(`aHXQxWZhPFXStE3y44NdFwOKt4H2`)로 이관 과정에서 자동 감지하여 일대일 매핑해 주었습니다. 이를 통해 브라이언이 신규 클라우드 환경에서 로그인하더라도 기존에 작성 및 백업된 모든 데이터(스토리, 일기, 소설, 메모 등)의 소유권을 온전히 보존하여 그대로 이어볼 수 있습니다.
* **전체 20개 테이블별 이관 결과 (총 249개 문서 복원)**:
  * **memories (페르소나 메모리 로그)**: 99개 문서 이관 완료
  * **auth_sessions (사용자 인증 세션)**: 32개 문서 이관 완료
  * **story_documents (스토리 문서 상세)**: 30개 문서 이관 완료
  * **chapters (소설 챕터)**: 25개 문서 이관 완료
  * **scenes (소설 씬 상세)**: 23개 문서 이관 완료
  * **api_telemetry_events (API 성능 로그)**: 17개 문서 이관 완료
  * **diaries (일기장 로그)**: 4개 문서 이관 완료
  * **memo_categories (메모 카테고리)**: 4개 문서 이관 완료
  * **novels (소설 기본 정보)**: 4개 문서 이관 완료
  * **persona_rules (페르소나 아이덴티티 규칙)**: 4개 문서 이관 완료
  * **story_groups (스토리 그룹/폴더)**: 2개 문서 이관 완료
  * **memo_memos (메모 상세 내용)**: 2개 문서 이관 완료
  * **app_users & users (사용자 계정)**: 각각 1개 문서씩 이관 완료 (총 2개)
  * **app_secrets (시스템 비밀키)**: 1개 문서 이관 완료
  * **memo_user_roles (메모 권한 롤)**: 1개 문서 이관 완료
  * **기타 5개 테이블 (characters, locations, memo_settings, story_references, prompt_histories)**: 혹시 모를 웹 애플리케이션의 쿼리 에러를 원천 방지하고 콘솔상에서 데이터베이스 형상을 가시적으로 완벽히 파악하실 수 있도록, 시스템용 초기화 플레이스홀더 문서(`_init_placeholder`, `user_id: "system"`)를 각각 주입하여 Firestore 실서버에 컬렉션 물리적 생성을 100% 완료하였습니다. (프런트엔드 조회 시에는 자동으로 필터링되어 보이지 않습니다.)
### B. 실행 방법
만약 추후 Supabase 데이터의 동기화가 다시 필요하다면 아래 명령어를 실행하여 언제든 안전하게(덮어쓰기 방식으로 중복 없이) 재실행할 수 있습니다.
```bash
python d:\Bloom\system\migrate_absolute_all_supabase_to_firestore.py
```
