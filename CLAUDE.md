# CLAUDE.md

이 저장소는 `silotek-tools`라는 이름의 로컬 Claude Code 플러그인 마켓플레이스입니다.

## 현재 플러그인

소스 위치:

```text
plugins/silotek-tools/
```

노출되는 명령어:

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

## 아키텍처

Claude 쪽 계층:

- `commands/*.md`: 슬래시 명령 프롬프트.
- `skills/research-log-yaml-create/`: 연구 로그 YAML 생성 규칙.
- `skills/research-log-yaml-retouch/`: AI 재작성 및 수정본 사본 워크플로.
- `skills/research-log-docx-create/`: DOCX 빌드 워크플로.
- `skills/silotek-diagram-design/`: 자체 완결형 HTML/SVG 출력 규칙을 갖춘 독립 Silotek 라이트 다이어그램 작성 스킬.
- `agents/silotek-diagrammer.md`: 다이어그램 단위 서브에이전트. 연구 로그 생성 스킬이 각 `visual_brief`마다 한 인스턴스씩 병렬로 디스패치함.

Node 계층:

- `scripts/common.js`: 저장 경로, YAML 스키마 검증, 결정적 산출물 진단, 이미지 경로 재작성을 담당.
- `scripts/resolve-yaml.js`: 저장된 YAML을 번호·베이스네임·경로로 해석해 스킬에서 사용할 수 있게 함.
- `scripts/save-draft.js`: 초안을 검증하고, 형제 HTML에서 누락된 PNG를 자동 래스터화하며, 그림을 복사하고 YAML/매니페스트를 저장.
- `scripts/build-docx.js`: 저장된 YAML을 선택해 `build.js`를 호출.
- `scripts/next-diagram-path.js`: 다음 비어 있는 다이어그램 HTML/PNG 경로를 할당. `--count N`은 배치(병렬) 할당용으로 연속된 빈 경로 N개를 반환.
- `scripts/rasterize-svg.js`: HTML에서 인라인 SVG 한 개를 추출해 `@resvg/resvg-js`로 PNG로 렌더링.
- `scripts/setup-check.js`: 읽기 전용 진단. `manifest` 체크가 `package.json`/`plugin.json`/`marketplace.json` 버전이 어긋나면 알림.
- `scripts/sync-version.js`: `package.json`의 version을 `plugin.json`과 루트 `marketplace.json`에 동기화. npm `version` 라이프사이클 훅에서 호출됨.
- `build.js`: DOCX 렌더러.

Node 스크립트는 연구 로그를 재작성하거나 연구 논거가 충분히 강한지 판단해서는 안 됩니다. 그 판단은 Claude 쪽 스킬 지시 영역입니다.

## 데이터 흐름

연구 로그는 플러그인 디렉터리 외부의 중앙 저장소를 사용합니다:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs\
macOS:   $HOME/Documents/Silotek Research Logs/
```

저장 디렉터리 구조:

```text
inputs/
outputs/
manifests/
figures/
```

독립 다이어그램의 기본 경로:

```text
.silotek-diagrams/
  diagram-N.html
  diagram-N.png
```

연구 로그용 다이어그램의 기본 경로:

```text
.silotek-research-log-figures/
  diagram-N.html
  diagram-N.png
```

`visual_brief`는 연구 로그 YAML 안에 남아 있는 기획 요소입니다. 다이어그램 스킬은 독립적이고 재사용 가능하며, 연구 로그 생성 스킬이 그림이 필요할 때 이를 소비합니다.

`research-log-yaml-create`는 작성 중 `visual_brief` 자리표시자를 기록하고, 생성 전 사용자에게 확인을 받으며, `next-diagram-path.js --count`로 경로를 할당하고, 각 브리프마다 `silotek-diagrammer` 서브에이전트를 한 개씩 병렬로 디스패치한 뒤 반환된 PNG를 즉시 뒤따르는 `image`로 짝지웁니다. 건너뛰거나 실패한 브리프는 짝이 맞지 않은 채로 남으며 회색 폴백 박스로 렌더링됩니다.

DOCX는 PNG만 소비합니다. HTML 사이드카는 편집과 브라우저 미리보기를 위해 유지됩니다. `visual_brief` 바로 뒤에 기존 `image`가 있으면 `build.js`가 이미지를 렌더링하고 회색 폴백 브리프 박스를 억제합니다. 이미지가 없으면 폴백 박스가 렌더링됩니다.

## YAML 스키마 참고

`sections`는 평탄한 명령 목록입니다. 지원되는 요소 키는 `scripts/common.js`에서 정의되며 다음을 포함합니다:

```text
h1, h2, h3, p, text, bullets, numbers, ordered, code, image, table, note, callout, spacer, blank, visual_brief
```

`code`는 멀티라인 블록 스칼라(`code: |`)를 받으며, `build.js`가 줄바꿈을 유지해 렌더한다(각 줄이 하나의 음영 문단 안에서 `<w:br/>`로 구분됨).

`heading`, `body`, `paragraph`, `list`, `items`, `content`, `subsections` 같은 그룹화된 섹션 키는 도입하지 마세요.

`visual_brief`에 필요한 필드:

```text
purpose, claim, evidence, forbidden, palette, caption
```

## 로컬 검증

```powershell
node --check plugins/silotek-tools/scripts/common.js
node --check plugins/silotek-tools/scripts/save-draft.js
node --check plugins/silotek-tools/scripts/build-docx.js
node --check plugins/silotek-tools/scripts/rasterize-svg.js
node --check plugins/silotek-tools/scripts/setup-check.js
node --check plugins/silotek-tools/scripts/resolve-yaml.js
node --check plugins/silotek-tools/scripts/next-diagram-path.js
node --check plugins/silotek-tools/scripts/sync-version.js
node --check plugins/silotek-tools/build.js
npm.cmd test --prefix plugins/silotek-tools
claude plugin validate .
```

## 커밋 메시지

커밋 메시지는 한국어로 작성합니다. 고유명사·기술 용어·식별자(`silotek-tools`, YAML, DOCX, PNG 등)는 영어 그대로 둡니다. Conventional Commits 형식(`feat:`, `fix:`, `chore:` 등)의 접두사는 영어를 유지하고, 그 뒤 설명만 한국어로 씁니다. 예: `chore: 문서 한국어 번역 및 .gitignore 정리`.

## 버전 관리

버전 범프는 `plugins/silotek-tools`에서 `npm version <patch|minor|major>` 한 번으로 한다 — `package.json`이 갱신되면 `version` 스크립트 훅(`scripts/sync-version.js`)이 `.claude-plugin/plugin.json`과 루트 `.claude-plugin/marketplace.json`의 버전 문자열을 맞춰 쓰고, `package-lock.json`은 npm이 자동 갱신한다. 네 파일을 손으로 동기화하지 않는다. `setup-check.js`의 `manifest` 체크가 세 매니페스트 버전이 어긋나면 알린다. (CI 등에서 커밋·태그를 자동으로 만들고 싶지 않으면 `npm version <bump> --no-git-tag-version` 후 직접 커밋한다.)

버전 이력: v0.3.0에서 `silotek-research-log` → `silotek-tools` 이름 변경(브레이킹). v0.4.1은 소스/유형 선택과 병렬 다이어그램 생성을 유지하면서 다이어그램 스킬을 단일 Silotek 라이트 규칙 세트로 정리(비-브레이킹). v0.4.3은 DOCX `code` 블록 멀티라인 줄바꿈 복구 및 버전 동기화 흐름 간소화(비-브레이킹).
