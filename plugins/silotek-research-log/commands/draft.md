---
description: 사일로텍 연구일지 YAML 초안을 만들고 중앙 저장소에 저장합니다.
---

# 사일로텍 연구일지 초안 생성

사용자의 요청을 보고 다음 모드 중 하나로 연구일지 YAML을 작성한다.

- `conversation`: 현재 대화 내용을 기반으로 작성
- `folder`: 현재 작업 폴더의 코드, 문서, 이미지, 산출물을 조사해 작성
- `mixed`: 대화 맥락과 작업 폴더 조사를 함께 반영해 작성

모드가 명확하지 않으면 짧게 물어본다.

## 작성 규칙

- 한국어 기술 서술체로 작성한다.
- `title: "연구 일지"`를 유지한다.
- `subtitle`, `meta`, `sections`를 포함한다.
- `meta.작성일`은 현재 날짜를 `YYYY년 M월 D일` 형식으로 넣는다.
- 고객사명, 개인명, 내부 URL, API 키, 시크릿, 사내 특화 쿼리는 익명화하거나 일반화한다.
- 폴더 기반 또는 혼합형이면 README, 문서, 설정 파일, 소스 진입점, 테스트, 출력물, 이미지/스크린샷을 먼저 조사한다.
- `node_modules`, `.git`, `.next`, `dist`, `build`, 캐시, 대형 바이너리 의존성은 조사 대상에서 제외한다.

## YAML 스키마 강제

`sections`는 DOCX 빌더가 바로 읽는 flat 렌더링 명령 배열이다. 반드시 각 항목을 단일 키 객체로 작성한다.

허용 키:

```text
h1, h2, h3, p, bullets, numbers, code, image, table, note, spacer
```

올바른 형식:

```yaml
sections:
  - h1: "1. 연구 배경 및 목적"
  - h2: "1.1 배경"
  - p: "본문을 여기에 쓴다."
  - bullets:
      - "항목 1"
      - "항목 2"
```

금지 형식:

```yaml
sections:
  - heading: "1. 연구 배경"
    body: "본문..."
```

`heading`, `body`, `paragraph`, `list`, `items`, `content`, `subsections` 키를 사용하지 않는다. 저장 스크립트가 스키마 오류를 내면 YAML을 위 flat 형식으로 고친 뒤 다시 저장한다.

## 저장 절차

1. 현재 작업 폴더에 임시 YAML 파일 `.silotek-research-log-draft.yaml`을 만든다.
2. 아래 스크립트로 중앙 저장소에 저장한다.

Windows PowerShell:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root (Get-Location).Path
```

macOS/Linux shell:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/save-draft.js" .silotek-research-log-draft.yaml --mode <conversation|folder|mixed> --source-root "$PWD"
```

중요 참고 파일이 있으면 `--source-file <path>`를 여러 번 추가한다.

3. 저장된 YAML 경로, manifest 경로, 복사된 이미지 개수를 사용자에게 알려준다.
4. DOCX는 자동 생성하지 않는다. 사용자가 Word 문서를 원하면 `/silotek-research-log:build-docx`를 안내한다.
