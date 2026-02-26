# NovelEditor 고도화 계획: Google Docs 수준의 집필 경험 구현

## 1. 목표 (Objective)
기존 `NovelEditor` 컴포넌트를 고도화하여, 사용자가 웹 기반 에디터가 아닌 '전문적인 데스크탑 워드 프로세서(Google Docs, MS Word, 한글)'를 사용하는 듯한 쾌적한 집필 경험(UX)을 제공한다. 현재의 데이터 흐름(TipTap -> Zustand -> IndexedDB) 아키텍처는 그대로 유지한다.

## 2. 필수 구현 기능 (Core Features)

### A. A4 용지 형태의 페이지 뷰어 UI (Page-like UI)
- 무한 스크롤(Infinity scroll) 방식 탈피.
- 회색 배경(`bg-gray-100`) 위에 그림자가 있는 흰색 A4 비율의 컨테이너(`bg-white shadow-lg`)를 배치.
- 에디터의 최대 너비(max-width)를 고정하고 중앙 정렬.
- 상/하/좌/우에 실제 종이 문서와 유사한 여백(Padding) 적용.

### B. 고급 서식 제어 (Advanced Typography)
- **줄 간격 (Line Height):** 1.15, 1.5, 2.0 등 줄 간격을 조절할 수 있는 커스텀 TipTap Extension 구현.
- **문단 첫 줄 들여쓰기 (First-line Indent):** 기존 Tab 키를 이용한 공백 삽입 대신, CSS `text-indent` 속성을 제어하는 TipTap Extension 적용.
- **페이지 나누기 (Page Break):** Ctrl+Enter 입력 시 시각적인 구분선(Page Break 노드) 삽입 기능.

### C. 집필 편의 기능 (Writer Utilities)
- **실시간 글자 수/단어 수 통계:** 에디터 하단에 상태 표시줄(Status Bar)을 고정하여 공백 포함/제외 글자 수 및 단어 수 표시.
- **찾기 및 바꾸기 (Find and Replace):** 에디터 내 텍스트 검색 및 일괄 변경 기능 (단축키 Ctrl+F / Cmd+F 연동).
- **실행 취소/재실행 (Undo/Redo) 강화:** TipTap의 기본 History를 명시적인 툴바 버튼과 단축키로 제어.

## 3. 기술 스택 및 라이브러리 추가 계획

현재 기술 스택(React 19, TipTap v2, Tailwind CSS 3)을 기반으로 다음 패키지/모듈을 활용한다.

* **UI 레이아웃:** Tailwind CSS (종이 질감 및 그림자, 하단 상태바 등)
* **글자 수 통계:** `@tiptap/extension-character-count`
* **텍스트 정렬:** `@tiptap/extension-text-align` (이미 있다면 고도화)
* **커스텀 Extension 개발 (직접 구현):**
    * `Extension-LineHeight`: 선택된 텍스트 블록의 `line-height` 스타일 제어.
    * `Extension-Indent`: 문단 노드의 `text-indent` 스타일 제어.
    * `Extension-FindAndReplace`: 텍스트 검색 및 하이라이팅, 치환 로직 구현.

## 4. 단계별 구현 계획 (Phased Implementation)

### Phase 1: 워드 프로세서 UI 레이아웃 개편
1. `NovelEditor/index.tsx`의 래퍼(Wrapper) 구조를 변경.
2. 툴바를 상단에 고정(Sticky)하고, 에디터 영역을 회색 배경의 스크롤 영역으로 분리.
3. TipTap `.ProseMirror` 클래스에 Tailwind를 적용하여 A4 종이 형태(가운데 정렬, 고정 너비, 그림자, 패딩) 시각화.
4. 하단에 고정된 상태 표시줄(Status Bar) 영역 확보.

### Phase 2: 기본 확장 기능 및 상태바 연동
1. `@tiptap/extension-character-count` 설치 및 에디터 초기화 배열에 추가.
2. 하단 상태 표시줄에 글자 수(공백 포함/제외) 실시간 반영 컴포넌트 구현.
3. 툴바에 Undo/Redo 버튼 추가 및 `editor.chain().focus().undo().run()` 연동.

### Phase 3: 고급 서식 커스텀 Extension 개발
1. `NovelEditor/extensions/LineHeight.ts` 작성 (Global Attribute 활용).
2. `NovelEditor/extensions/FirstLineIndent.ts` 작성.
3. 툴바에 줄 간격 및 들여쓰기 제어 드롭다운/버튼 추가.
4. 해당 서식이 `.docx` 내보내기(`handleExport`) 시에도 반영되도록 `docx` 라이브러리 매핑 로직 업데이트.

### Phase 4: 찾기 및 바꾸기 (Find & Replace) 구현
1. 검색어 입력, 이전/다음 찾기, 바꾸기, 모두 바꾸기 기능이 있는 플로팅 UI(또는 모달) 컴포넌트 제작.
2. TipTap Editor 내에서 일치하는 텍스트 범위를 계산하여 하이라이팅 처리.
3. 텍스트 치환(Replace) 트랜잭션 구현.

## 5. 기존 아키텍처 유지 시 주의사항
* **저장 로직 (Zustand & IndexedDB):** `NovelEditor`의 변경 사항이 많아지더라도 기존의 '500ms 디바운스 자동 저장' 로직은 훼손되지 않아야 한다. `editor.getJSON()` 형태의 저장이 새로운 서식(줄 간격, 들여쓰기 등)을 온전히 포함하는지 디버깅 필수.
* **내보내기 연동:** 화면에 보이는 서식(줄 간격 등)이 `src/components/NovelEditor/index.tsx`의 `handleExport` (docx 생성) 함수에서도 동일하게 파싱되어 반영되도록 DOCX 변환 로직을 반드시 동기화할 것.