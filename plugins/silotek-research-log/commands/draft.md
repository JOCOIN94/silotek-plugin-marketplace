---
description: 사일로텍 연구일지 YAML 초안을 만들고 중앙 저장소에 저장합니다.
---

# 사일로텍 연구일지 초안 생성

사용자의 요청을 보고 다음 모드 중 하나로 연구일지 YAML을 작성한다.

- `conversation`: 현재 대화와 결정 사항을 기반으로 작성
- `folder`: 현재 작업 폴더의 코드, 문서, 설정, 테스트, 산출물을 조사해 작성
- `mixed`: 대화 맥락과 작업 폴더 조사를 함께 반영해 작성

모드가 명확하지 않으면 짧게 확인한다.

## 플러그인 방식

임시 YAML을 만든 뒤 플러그인 스크립트로 사용자 Documents 아래 중앙 저장소에 저장한다.

중앙 저장소:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

## 조사 규칙

- 한국어 기술 보고서 문체로 작성한다.
- folder/mixed 모드에서는 README, docs, package/config 파일, 주요 source entrypoint, 테스트, 산출물, 이미지/스크린샷을 먼저 조사한다.
- `node_modules`, `.git`, `.next`, `dist`, `build`, 캐시, 대용량 바이너리 의존성은 제외한다.
- 고객사명, 개인명, 내부 URL, API 키, 시크릿, 실제 매장명, UID, 독점 쿼리 문자열은 일반화한다.
- 이미지가 문서 이해에 도움이 되고 실제 파일이 확인될 때만 `image` 요소를 사용한다.

## 문서 품질 기준

단순 요약이 아니라 연구/개발 보고서처럼 작성한다. 구현, 검증, 폴더 분석 성격이면 다음 흐름을 우선한다.

```text
1. 연구 배경 및 목적
2. 문제 정의
3. 시스템 구조 및 동작 방식
4. 구현 과정과 시행착오
5. 핵심 변경 사항
6. 변경 전후 비교
7. 핵심 교훈
8. 종합 분석
9. 결론 및 향후 과제
10. 참고 사항
```

모든 항목을 기계적으로 넣지는 말고, 실제 내용에 맞게 조정한다. 그래도 `문제 -> 구조 -> 과정 -> 변경 -> 검증 -> 교훈 -> 결론`의 흐름은 드러나야 한다.

## YAML 스키마 강제

`sections`는 DOCX 빌더가 바로 읽는 flat command list다. 각 항목은 하나의 타입만 가진 객체로 작성한다.

허용 타입:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank
```

올바른 형식:

```yaml
sections:
  - h1: "1. 연구 배경 및 목적"
  - h2: "1.1 배경"
  - p: "본문을 문단 단위로 작성한다."
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

`heading`, `body`, `paragraph`, `list`, `items`, `content`, `subsections`는 사용하지 않는다.
저장 스크립트가 스키마 오류를 내면 YAML을 flat 형식으로 고친 뒤 다시 저장한다.

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
4. 이 명령에서는 DOCX를 자동 생성하지 않는다. 사용자가 Word 문서를 원하면 `/silotek-research-log:build-docx`를 안내한다.
