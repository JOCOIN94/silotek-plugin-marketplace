---
description: 사일로텍 연구일지 YAML 초안을 만들고 중앙 저장소에 저장합니다.
---

# 사일로텍 연구일지 초안 생성

사용자의 요청을 보고 다음 모드 중 하나로 연구일지 YAML을 작성한다.

- `conversation`: 현재 대화와 결정 사항을 기반으로 작성
- `folder`: 현재 작업 폴더의 코드, 문서, 설정, 테스트, 산출물을 조사해 작성
- `mixed`: 대화 맥락과 작업 폴더 조사를 함께 반영해 작성

모드가 명확하지 않으면 짧게 확인한다.

## 작성 전 자가 질문 (필수)

작성 시작 전에 자기 자신에게 한 줄로 답한다:

> **이번 문서가 답하려는 연구 질문은 무엇인가?**

답이 떠오르지 않으면 사용자 작업 맥락에서 가장 좁은 질문을 직접 추론해 명시한다. 폴더 설명/요약이 답이 되면 안 된다.

## 필수 섹션 체크리스트

본문은 다음 흐름을 따른다. 모든 섹션을 기계적으로 넣지는 말고 실제 내용에 맞게 조정하되, 흐름은 드러나야 한다.

- [ ] **연구 질문** — 한 줄
- [ ] **문제 정의 / 배경** — 무엇이 문제인가, 왜 지금 다루는가
- [ ] **시도와 시행착오** — 실패 사례 포함, 원인 분석 동반
- [ ] **관찰 / 측정** — 수치, 로그, 스크린샷이 있으면 image element로
- [ ] **원인 분석** — 관찰에서 가설로
- [ ] **검증** — 실험, 비교, 측정 결과로 가설 확인
- [ ] **교훈 / 판단 기록** — 무엇을 알게 되었나
- [ ] **향후 과제 / 남은 불확실성** — 남은 질문

## 안티패턴 금지

다음 형태는 작성 직후 스스로 거절한다:

- 파일 경로/디렉터리만 나열하는 본문
- 검증 없는 결론 ("그래서 X가 맞다", "결국 Y가 좋다")
- 시행착오 없이 "이렇게 했더니 잘 됐다"형 단편 서술
- "단순히 ~을 정리한다", "구조를 살펴본다" 같은 폴더 탐구형 문장 — 코드가 자동 경고함

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

## 메타 표준 (warn 정책)

다음 5개 키를 권장한다. 빠지면 저장은 진행되지만 콘솔에 `META_MISSING_KEY` 경고가 출력된다.

- `연구 주제`
- `연구 단계`
- `분류`
- `작성일`
- `작성자`

추가로 필요한 한국어 키는 자유롭게 적는다 (예: `커밋버전`, `변경 규모`, `관련 프로젝트`).

**금지**: top-level에 `project`, `date`, `authors`, `keywords`, `category` 같은 영문 키를 두지 않는다 — 코드가 거절한다. 모두 `meta` 안의 한국어 키로 옮긴다.

## YAML 스키마

`sections`는 DOCX 빌더가 바로 읽는 flat command list다. 각 항목은 하나의 타입만 가진 객체로 작성한다.

허용 타입:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank
```

올바른 형식:

```yaml
sections:
  - h1: "1. 연구 질문"
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

3. 저장된 YAML 경로, manifest 경로, 복사된 이미지 개수, **출력된 품질 경고**를 사용자에게 알려준다.
4. 이 명령에서는 DOCX를 자동 생성하지 않는다. 사용자가 Word 문서를 원하면 `/silotek-research-log:build-docx`를 안내한다.
