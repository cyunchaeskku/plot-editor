# Plot Editor — 시나리오 작가를 위한 데스크탑 집필 도구

> A three-panel desktop app for Korean screenwriters and novelists, built with Tauri v2 + React 18 + TipTap v2.

모든 데이터는 **AWS DynamoDB + S3**에 저장되며, 로컬 메모리에만 유지됩니다. 명시적 저장 시에만 클라우드에 지속됩니다.
Tauri를 통해 네이티브 데스크탱 바이너리로도 패키징할 수 있습니다.

---

## 목차

1. [주요 기능](#주요-기능)
2. [화면 구성](#화면-구성)
3. [작품 유형 (plot vs novel)](#작품-유형-plot-vs-novel)
4. [에디터 블록 노드](#에디터-블록-노드--plot-모드)
5. [내보내기](#내보내기-docx--png)
6. [기술 스택](#기술-스택)
7. [사전 요구사항](#사전-요구사항)
8. [설치 및 실행](#설치-및-실행)
9. [개발 명령어](#개발-명령어)
10. [아키텍처](#아키텍처)
11. [프로젝트 구조](#프로젝트-구조)
12. [데이터 저장](#데이터-저장)
13. [개발 로그](#개발-로그)

---

## 클라우드 동기화 (선택 사항)

`backend/` 디렉터리에 **FastAPI 백엔드**가 포함되어 있으며, 현재 **AWS Lambda (Serverless)**로 배포되어 있습니다. 로컬 SQLite와 병행하여 AWS DynamoDB + S3에 데이터를 미러링합니다.

- **백엔드 API 주소**: `https://2d7yy4qlcb.execute-api.ap-northeast-2.amazonaws.com`
- **인증**: AWS Cognito OIDC (Google 로그인 등 외부 IdP 연동 가능)
- **메타데이터**: DynamoDB 6개 테이블 (works / episodes / plots / characters / character_relations / graph_layouts)
- **대본 본문**: S3 버킷 (`plot-editor-contents`) — TipTap JSON을 `plots/{sub}/{plot_id}.json` 키로 저장
- **이중 저장**: 백엔드가 없어도 로컬 SQLite로 완전히 동작, 서버가 켜진 경우에만 클라우드 동기화

백엔드 실행 방법은 [백엔드 실행](#백엔드-실행) 섹션을 참고하세요.

---

## 주요 기능

### 작품 관리
- **작품 / 에피소드(챕터) / 플롯** 3단계 계층 구조 생성 및 삭제
- 작품 유형 선택: **플롯 모드** (시나리오) 또는 **소설 모드**
- 작품별 **기획 문서** 패널 (마크다운 에디터)

### 플롯 모드 에디터
- TipTap v2 기반 리치 텍스트 에디터
- 4가지 커스텀 블록 노드: **씬 헤딩 / 대사 / 나레이션 / 지문**
- **씬 번호 자동 재정렬** — 씬 헤딩 추가·삭제 시 S#n 번호 즉시 갱신
- **슬래시 커맨드** (`/` 입력) 로 블록 타입 빠르게 삽입
- 대사 블록: 등장인물 이름·색상 연동, Enter 연속 입력 지원
- **5줄 단위 줄 번호** 표시 (좌측 거터)
- **Cmd+클릭** 으로 여러 플롯 카드 동시 선택 및 탭 전환
- 500ms 디바운스 자동 저장

### 소설 모드 에디터
- 챕터(= 에피소드) 목록 드래그 정렬
- 제목 1·2·3, 본문, 굵게·기울임·밑줄·취소선
- 글자 색상, 폰트 크기 (12–32px)
- 텍스트 정렬 (좌·중앙·우·양쪽)
- **Tab 키 들여쓰기** 토글 (2em)
- 전체 소설 `.docx` 내보내기

### 등장인물 관리
- 인물별 **색상 태그**, 자유 형식 **특성 목록** (키-값), **메모**, **프로필 이미지**
- **AI 인물 요약** — OpenAI GPT-4o-mini로 자동 생성 (성격, 타 인물과의 관계, 행보 분석)
- **대사 패널** — 전체 작품에서 해당 인물이 한 모든 대사 검색 및 표시 (에피소드·플롯·텍스트)
- 인물 이름·색상 변경 시 모든 대사 블록 **자동 동기화**
- 삭제 시 관련 관계 일괄 삭제

### 관계도 그래프
- React Flow 기반 인물 관계 시각화
- 노드 원형 배치, 드래그 이동, 바운스 애니메이션
- 노드 단일 클릭 → 컨텍스트 메뉴 (관계 추가 / 인물 상세)
- 노드 더블 클릭 → 인물 상세 패널로 이동
- 양방향 관계 병렬 오프셋 렌더링
- **PNG 내보내기** (2× 해상도)

### 내보내기
- 플롯 모드: 현재 에피소드 또는 전체 작품 `.docx` 내보내기
  - 씬 헤딩 → 대문자 보라색 / 대사 → 인물명 정렬 / 나레이션 → 가운데 이탤릭 / 지문 → 들여쓰기 이탤릭
  - 가장 긴 등장인물 이름 기준 대사 콜론 동적 정렬
- 소설 모드: 전체 챕터 `.docx` 내보내기 (서식·색상 완전 반영)
- 관계도: `.png` 내보내기

---

## 화면 구성

```
Left Sidebar       │  Middle Panel        │  Right Panel
───────────────────┼──────────────────────┼──────────────────────────
작품 / 에피소드     │  [플롯 모드]          │  탭: 에디터 / 인물 상세
/ 플롯 트리         │  플롯 카드 (드래그)   │       관계도 / 기획서
                   │  [소설 모드]          │
등장인물 목록       │  챕터 목록 (드래그)   │
```

오른쪽 패널은 4개 탭으로 전환됩니다.

| 탭 | 내용 |
|---|---|
| 에디터 | TipTap 집필 에디터 (플롯/소설 유형에 따라 자동 전환) |
| 인물 상세 | 특성·메모·이미지 편집, 관계 목록 |
| 관계도 | React Flow 인물 관계 그래프 |
| 기획서 | 작품별 마크다운 메모 |

---

## 작품 유형 (plot vs novel)

작품 생성 시 유형을 선택합니다.

| 항목 | 플롯 모드 (`plot`) | 소설 모드 (`novel`) |
|---|---|---|
| 중앙 패널 | 플롯 카드 목록 | 챕터 목록 |
| 에디터 | 시나리오 블록 노드 | 자유 서식 텍스트 |
| 계층 | 작품 → 에피소드 → 플롯 | 작품 → 챕터(= 에피소드) |
| 자동 저장 단위 | 플롯 카드별 | 챕터당 1개 플롯 |
| 내보내기 | 에피소드 / 전체 .docx | 전체 소설 .docx |

---

## 에디터 블록 노드 — plot 모드

`src/components/Editor/nodes.ts` 에 정의된 4가지 커스텀 TipTap 노드입니다.

| 노드명 | CSS 클래스 | 기능 |
|---|---|---|
| `sceneHeading` | `.scene-heading` | S#n 씬 마커, 대문자, 보라색. 씬 번호 자동 재정렬. |
| `dialogue` | `.dialogue-node` | 좌측 컬러 테두리, 인물명 헤더. `characterName` · `characterColor` 속성 저장. Enter 연속 입력 지원. |
| `narration` | `.narration-node` | 가운데 정렬, 이탤릭, 회색. |
| `stageDirection` | `.stage-direction-node` | 들여쓰기, 이탤릭, 음소거 색상. |

슬래시 커맨드 메뉴는 커서 직전 텍스트가 `/` 로 끝날 때 자동 표시됩니다.

---

## 내보내기 (.docx / .png)

### 플롯 모드 .docx

`src/components/Export/index.tsx` 의 `docx` 라이브러리로 생성됩니다.

- **씬 헤딩**: 굵은 대문자, 보라색 (#a78bfa), 우측에 장소·시간 정보 탭 정렬
- **대사**: `인물명(공백 5칸)대사 내용` 형식, 가장 긴 인물명 기준 동적 탭 위치 계산
- **나레이션**: 빈 줄 앞뒤 삽입, 가운데 정렬 이탤릭
- **지문**: 빈 줄 앞뒤 삽입, 들여쓰기 이탤릭
- 내보내기 범위: **현재 에피소드** 또는 **전체 작품 (모든 에피소드)**

### 소설 모드 .docx

`src/components/NovelEditor/index.tsx` 의 `handleExport` 에서 생성됩니다.

- 챕터 제목 → Heading 1, 모든 텍스트 서식 (굵기·이탤릭·밑줄·취소선·색상·폰트 크기) 완전 반영
- 들여쓰기(`textIndent`) → firstLine 480 twip

### 관계도 .png

`html-to-image` 라이브러리로 2× 픽셀 비율 PNG 생성, UI 패널 요소는 필터로 제거됩니다.

---

## 기술 스택

| 역할 | 라이브러리 | 버전 |
|---|---|---|
| UI 프레임워크 | React | 19 |
| 언어 | TypeScript | ~5.8 |
| 빌드 도구 | Vite | 7 |
| 스타일 | Tailwind CSS | 3 |
| 상태 관리 | Zustand | 5 |
| 에디터 | TipTap v2 (StarterKit + 커스텀 노드) | 3.x |
| 마크다운 에디터 | @uiw/react-md-editor | 4 |
| 드래그 앤 드롭 | dnd-kit | 6 / 10 |
| 관계도 그래프 | React Flow | 11 |
| 문서 내보내기 | docx | 9 |
| 이미지 내보내기 | html-to-image | 1 |
| 데스크탑 래퍼 | Tauri | v2 |

---

## 백엔드 실행

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# .env 파일 작성 (아래 참고)
python main.py   # localhost:8000
```

### 환경변수 (`backend/.env`, gitignore 처리됨)

```dotenv
SECRET_KEY=<임의의 긴 랜덤 문자열, JWT 서명용>

# AWS Cognito
COGNITO_REGION=ap-northeast-2
COGNITO_USER_POOL_ID=ap-northeast-2_XXXXXXXXX
COGNITO_CLIENT_ID=<앱 클라이언트 ID>
COGNITO_CLIENT_SECRET=<앱 클라이언트 시크릿>
COGNITO_DOMAIN=https://<your-domain>.auth.ap-northeast-2.amazoncognito.com

REDIRECT_URI=http://localhost:8000/authorize
LOGOUT_URI=https://plot-editor.vercel.app/
FRONTEND_URL=https://plot-editor.vercel.app/

# AWS 자격증명
AWS_ACCESS_KEY_ID=<IAM 액세스 키>
AWS_SECRET_ACCESS_KEY=<IAM 시크릿 키>
S3_BUCKET=plot-editor-contents

# OpenAI (AI 인물 요약용)
OPENAI_API_KEY=<OpenAI API 키>
```

---

## 사전 요구사항

### 프론트엔드만 실행 (서버 없이, 브라우저에서 사용)

- **Node.js** 18 이상
- **npm** 9 이상

### 데스크탑 바이너리 빌드 (Tauri)

Rust 및 Tauri 시스템 의존성이 추가로 필요합니다.

```bash
# Rust 설치 (아직 없다면)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# macOS 추가 의존성
xcode-select --install
```

> Tauri 빌드 공식 문서: https://tauri.app/start/prerequisites/

---

## 설치 및 실행

```bash
# 1. 저장소 클론
git clone <repo-url>
cd plot_editor

# 2. 의존성 설치
npm install

# 3. 개발 서버 실행 (브라우저)
npm run dev
# -> http://localhost:5173
```

---

## 개발 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | Vite 개발 서버 실행 (프론트엔드, Tauri 불필요) |
| `npm run build` | TypeScript 타입 검사 + 프로덕션 번들 생성 |
| `npm run preview` | `dist/` 빌드 결과 로컬 미리보기 |
| `npm run tauri dev` | Tauri 데스크탑 앱 개발 모드 실행 (Rust 필요) |
| `npm run tauri build` | 최종 데스크탑 바이너리 빌드 (Rust 필요) |

---

## 아키텍처

### 3패널 레이아웃

```
App.tsx
├── Sidebar (w-56, 좌측 고정)
│   ├── 작품 / 에피소드 / 플롯 트리
│   └── 등장인물 목록
├── Middle Panel (w-72, 고정)
│   ├── [plot 모드] PlotPanel — 플롯 카드 드래그 정렬
│   └── [novel 모드] ChapterList — 챕터 드래그 정렬
└── Right Panel (flex-1)
    ├── 탭 헤더 + .docx 내보내기 버튼
    └── 탭 콘텐츠
        ├── Editor / NovelEditor
        ├── CharacterDetail
        ├── GraphView
        └── PlanningDoc
```

### 데이터 흐름

```
컴포넌트
   │  useStore() 훅으로 읽기 / 액션 호출
   ▼
src/store/index.ts  (Zustand, 로컬 메모리)
   │  대기 중인 변경사항 큐 누적
   │  Save 버튼 클릭 시 saveAll() 호출
   ▼
src/api/index.ts  (AWS REST API)
   │  DynamoDB / S3에 저장
   ▼
AWS DynamoDB + S3 (클라우드 source of truth)
```

컴포넌트는 `src/api` 를 직접 호출하지 않고 반드시 `useStore` 를 통해서만 상태를 변경합니다. 모든 변경사항은 메모리에만 저장되며, 명시적 `saveAll()` 호출 시에만 클라우드에 지속됩니다.

### DynamoDB + S3 스키마

**메타데이터 (DynamoDB):**
- `works`: work_id, user_id(sub), title, type, planning_doc, created_at, updated_at
- `episodes`: episode_id, user_sub, work_id, title, order_index, created_at, updated_at
- `plots`: plot_id, user_sub, episode_id, title, content_s3_key, order_index, created_at, updated_at
- `characters`: character_id, user_sub, work_id, name, color, properties, memo, image, ai_summary, created_at, updated_at
- `character_relations`: relation_id, user_sub, work_id, from_character_id, to_character_id, relation_name, created_at
- `graph_layouts`: layout_id, user_sub, work_id, layout_data (JSON), updated_at

**콘텐츠 (S3):**
- `plots/{sub}/{plot_id}.json` — TipTap JSON

모든 테이블의 PK는 `{sub}#{local_id}` 형식으로 사용자별 데이터 격리.

### 명시적 저장

에디터 업데이트 시 메모리만 변경되고, 대기 중인 변경사항 큐(`pendingCreates/Updates/Deletes`)에 추가됩니다.
사용자가 Save 버튼 클릭 또는 `Cmd+S` / `Ctrl+S` 단축키로 명시적 저장을 시작할 때만 `saveAll(workId)` 실행:
1. 대기 중인 큐 정리 (net-zero 최적화)
2. API 호출 순서: 삭제 → 생성 → 업데이트
3. 각 plot의 콘텐츠를 S3에 저장

로컬 메모리이므로 페이지 새로고침 시 최후 저장본으로 복구됩니다.

---

## 프로젝트 구조

```
plot_editor/
├── src/
│   ├── App.tsx                    # 루트 레이아웃, 작품 유형 분기, JWT 토큰 관리
│   ├── App.css                    # Tailwind 지시문 + TipTap 노드 CSS + 슬래시 메뉴 CSS
│   ├── db/
│   │   └── index.ts               # TypeScript 타입 정의만 (Work, Episode, Plot, Character, CharacterRelation)
│   ├── api/
│   │   └── index.ts               # AWS REST API 레이어, 응답 정규화, JWT 헤더 관리
│   ├── store/
│   │   └── index.ts               # Zustand 전역 상태 (메모리 + 대기 변경사항 큐) + 모든 액션
│   └── components/
│       ├── Sidebar/               # 좌측: 작품/에피소드/플롯 트리, 인물 목록
│       ├── PlotPanel/             # 중앙 (plot 모드): 플롯 카드 + dnd-kit 정렬
│       ├── Editor/
│       │   ├── index.tsx          # TipTap 에디터 (plot 모드), 줄 번호, 슬래시 메뉴
│       │   ├── nodes.ts           # SceneHeading, Dialogue, Narration, StageDirection 노드 정의
│       │   └── SlashMenu.tsx      # 슬래시 커맨드 팝업
│       ├── NovelEditor/
│       │   ├── index.tsx          # TipTap 에디터 (novel 모드), 툴바, .docx 내보내기
│       │   └── ChapterList.tsx    # 챕터 목록 + dnd-kit 정렬
│       ├── CharacterDetail/       # 인물 특성·메모·이미지·관계 편집
│       ├── GraphView/             # React Flow 관계도, PNG 내보내기
│       ├── PlanningDoc/           # 마크다운 기획 문서 에디터
│       └── Export/
│           └── index.tsx          # 플롯 모드 .docx 내보내기 버튼 + 범위 선택 모달
├── src-tauri/
│   ├── src/lib.rs                 # Tauri 플러그인 등록 (sql, dialog, fs)
│   └── capabilities/default.json # Tauri 권한 선언
├── work_log/                      # 일별 개발 노트
├── CLAUDE.md                      # Claude Code 지침 (아키텍처 레퍼런스)
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

---

## 데이터 저장

모든 데이터는 **브라우저 IndexedDB** (`plotEditorDB` v2) 에 저장됩니다.

| 상황 | 결과 |
|---|---|
| 앱 재시작 / 새로고침 | 데이터 유지 |
| 브라우저 사이트 데이터 삭제 | 데이터 소멸 |
| 다른 브라우저 / 다른 기기 | 공유 안 됨 |
| JS만 업데이트 | 데이터 유지 |

> 중요한 작업은 `.docx 내보내기`로 백업을 권장합니다.

---

## 개발 로그

`work_log/YYYY-MM-DD.md` 파일에 일별 개발 내용을 기록합니다.
형식은 `work_log/README.md` 를 참조하세요.

현재까지 로그:

| 날짜 | 주요 내용 |
|---|---|
| 2026-02-25 | 초기 Tauri v2 마이그레이션, SQLite 전환, 기본 3패널 구현 |
| 2026-02-26 | 소설 모드(novel) 추가, 기획서 패널, 관계도 PNG 내보내기, 줄 번호 표시, DOCX 서식 개선 |
| 2026-02-27 | FastAPI 백엔드, Cognito OIDC 인증, DynamoDB + S3 클라우드 동기화, GraphView 레이아웃 저장 |
| 2026-02-28 | IndexedDB 제거, AWS single-write 패턴 전환, 명시적 Save 버튼 + Cmd+S, 전역 상태 재작성 |
| 2026-03-01 | 세션 → JWT Bearer 토큰 인증, Character Dialogues 패널, AI 인물 요약 (GPT-4o-mini), 버그 수정 |
