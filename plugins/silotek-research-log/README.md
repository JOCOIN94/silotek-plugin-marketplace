# 사일로텍 연구일지 자동 생성 엔진

연구 작업이 끝나면 Claude와의 대화 내용을 요약해서 YAML로 작성하고, 한 줄 명령으로 포맷팅된 Word 문서(.docx)를 자동 생성합니다.

---

## Claude Code 플러그인 사용

이 폴더는 Claude Code 플러그인 루트로도 동작합니다.

### 로컬 테스트

```bash
npm install
claude --plugin-dir .
```

Claude Code 안에서 사용할 명령:

```text
/silotek-research-log:setup
/silotek-research-log:draft
/silotek-research-log:build-docx
```

이 명령들은 `commands/`에 정의되어 있고, 관련 작성 규칙은 `skills/`에도 함께 들어 있습니다.

처음 설치한 경우 `/silotek-research-log:setup`을 한 번 실행해 Node 의존성을 설치합니다.

### 기본 저장 위치

플러그인으로 생성한 연구일지는 프로젝트 폴더가 아니라 사용자 Documents 아래 중앙 저장소에 모입니다.

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

중앙 저장소 구조:

```text
Silotek Research Logs/
├── inputs/      # YAML 원본
├── outputs/     # DOCX 산출물
├── manifests/   # 원본 프로젝트/참고 파일/생성 이력
└── figures/     # 로고 및 일지별 이미지 복사본
```

### CLI 보조 명령

```bash
npm run research:list
node scripts/save-draft.js path/to/draft.yaml --mode folder --source-root .
node scripts/build-docx.js 1
```

실제 연구일지 작성과 DOCX 생성은 로컬 파일만 사용합니다. 최초 `npm install`은 npm 의존성 다운로드가 필요할 수 있습니다.

---

## 빠른 시작

### 1. 최초 1회 설치

```bash
cd research-log-tool
npm install
```

필요 사항:
- Node.js 18 이상
- npm

### 2. 연구일지 작성

#### 방법 A: Claude에게 요약 맡기기 (추천)

1. 연구/실험/개발 작업을 Claude와 대화하며 진행
2. 작업이 끝나면 `claude_prompt.md` 내용을 복사해서 Claude에게 던짐
3. Claude가 YAML 형식으로 연구일지 초안을 작성해 줌
4. 그 내용을 `inputs/YYYY-MM-DD-주제.yaml` 파일로 저장

#### 방법 B: 직접 작성

```bash
# 템플릿 복사
cp inputs/_template.yaml inputs/2026-04-19-my-research.yaml

# 편집기로 열어서 작성
code inputs/2026-04-19-my-research.yaml
```

### 3. DOCX 생성

```bash
node build.js inputs/2026-04-19-my-research.yaml
```

결과는 `outputs/2026-04-19-my-research.docx`에 저장됩니다.

---

## 폴더 구조

```
research-log-tool/
├── build.js                          # 메인 엔진
├── package.json
├── README.md                         # 이 파일
├── claude_prompt.md                  # Claude에게 보낼 요약 프롬프트
├── figures/                          # 이미지/로고 저장소
│   ├── logo_silotek.png              # 회사 로고 (헤더에 자동 삽입)
│   └── (연구별 이미지들)
├── inputs/                           # YAML 입력 파일
│   ├── _template.yaml                # 템플릿 (복사해서 사용)
│   └── example_rag_research.yaml     # 샘플 예시
└── outputs/                          # 생성된 DOCX 출력
```

---

## YAML 작성 가이드

### 기본 구조

```yaml
title: "연구 일지"
subtitle: "연구 주제"

meta:
  연구 주제: "한 줄 요약"
  작성일: "2026년 4월 19일"
  작성자: "홍길동"

sections:
  - h1: "1. 배경"
  - p: "본문 내용..."
```

### 사용 가능한 요소 타입

| 타입 | 용도 | 예시 |
|------|------|------|
| `h1` | 1단계 제목 | `- h1: "1. 배경"` |
| `h2` | 2단계 제목 | `- h2: "1.1 목적"` |
| `h3` | 3단계 제목 | `- h3: "세부 항목"` |
| `p` | 일반 문단 | `- p: "본문 내용"` |
| `bullets` | 불릿 리스트 | `- bullets: ["항목1", "항목2"]` |
| `numbers` | 번호 리스트 | `- numbers: ["하나", "둘"]` |
| `code` | 코드 블록 | `- code: "print('hi')"` |
| `image` | 이미지 + 캡션 | 아래 참고 |
| `table` | 표 | 아래 참고 |
| `note` | 강조 박스 | `- note: "중요 사항"` |
| `spacer` | 빈 줄 | `- spacer: ""` |

### 인라인 서식

`**텍스트**`로 감싸면 굵게 표시됩니다.

```yaml
- p: "이 부분은 **매우 중요**합니다."
```

### 이미지 삽입

```yaml
- image:
    path: "../figures/my_diagram.png"  # figures 폴더 기준 상대경로
    caption: "[그림1] 시스템 아키텍처"
    width: 6.0                         # 인치 단위 (기본 6.0)
```

이미지 파일은 `figures/` 폴더에 먼저 복사해 두어야 합니다.

### 테이블

```yaml
- table:
    headers: ["항목", "값", "비고"]
    columnWidths: [2260, 3383, 3383]  # 선택, DXA 단위
    rows:
      - ["A", "1", "정상"]
      - ["B", "2", "확인 필요"]
```

`columnWidths` 합계는 9026을 맞추면 페이지에 꽉 찹니다. 생략하면 균등 분할됩니다.

---

## 파일명 규칙

권장 규칙: `YYYY-MM-DD-주제.yaml`

예시:
- `2026-04-19-rag-test.yaml`
- `2026-04-20-tdms-parser.yaml`
- `2026-04-21-llm-benchmark.yaml`

이렇게 하면 파일 시스템에서 자동으로 시간순 정렬됩니다.

---

## 팀 공유 가이드

### 방법 1: 공유 폴더 (간단)

사내 공유 폴더(Google Drive, Dropbox, OneDrive, 사내 NAS)에 `research-log-tool` 폴더 자체를 두고, 각자 자기 YAML을 `inputs/`에 저장하고 DOCX를 `outputs/`에서 공유.

### 방법 2: Git 저장소 (권장)

```bash
git init
git add .
git commit -m "initial research log tool"
```

장점:
- 작성자/수정 시간 자동 기록
- 변경 이력 추적
- 여러 명이 동시 작업 가능

### 방법 3: Notion 연동 (고도화)

`outputs/*.docx`를 Notion 데이터베이스로 자동 업로드하는 스크립트 추가 가능 (별도 요청 시 제공).

---

## 트러블슈팅

### "이미지를 찾을 수 없음" 경고

- `path`를 YAML 파일 기준 상대경로로 썼는지 확인
- `figures/` 폴더에 실제 파일이 있는지 확인

### 한글이 깨져 보이는 경우

- Word 2016 이상에서 여는 것을 권장 (맑은 고딕 폰트 사용)
- 맥의 Pages 또는 LibreOffice에서도 열리나 일부 서식이 달라질 수 있음

### 로고가 안 보이는 경우

- `figures/logo_silotek.png` 파일이 있는지 확인
- 다른 로고로 교체하려면 같은 파일명으로 저장 또는 YAML에 `logo:` 경로 직접 지정

---

## 라이선스

사일로텍 내부 사용 전용.  
기반 라이브러리: docx (MIT), js-yaml (MIT), adm-zip (MIT) — 상업적 재배포 가능.

---

## 문의

개선 요청이나 버그 발견 시 내부 개발 채널로 공유해 주세요.
