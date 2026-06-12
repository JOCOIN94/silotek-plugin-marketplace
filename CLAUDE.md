# CLAUDE.md

이 저장소는 `silotek`이라는 이름의 로컬 Claude Code/Codex 플러그인 마켓플레이스입니다. 개별 플러그인은 기능 단위로 나누며, 현재 `research-log`와 `serial-mcp`를 제공한다.

## 현재 플러그인

주요 소스 위치:

```text
plugins/research-log/  # 연구 로그 / 다이어그램 플러그인
plugins/serial-mcp/    # 시리얼 MCP wrapper + serial skill
```

노출되는 명령어:

```text
/research-log:setup-check
/research-log:research-log-yaml-create
/research-log:research-log-yaml-retouch
/research-log:research-log-docx-create
/research-log:diagram-create
```

## 아키텍처

Claude 쪽 계층:

- `commands/*.md`: 슬래시 명령 프롬프트.
- `skills/research-log-yaml-create/`: 연구 로그 YAML 생성 규칙.
- `skills/research-log-yaml-retouch/`: AI 재작성 및 수정본 사본 워크플로.
- `skills/research-log-docx-create/`: DOCX 빌드 워크플로.
- `skills/diagram-create/`: 자체 완결형 HTML/SVG 출력 규칙을 갖춘 독립 Silotek 라이트 다이어그램 작성 스킬.
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
- `scripts/next-basename.js`: 제목·날짜로부터 중앙 보관소의 충돌 없는 basename과 대응하는 `inputs/<basename>.yaml`·`figures/<basename>/` 절대 경로를 발급. 연구일지 작성 스킬이 작업 폴더 경유 없이 곧장 중앙에 쓰기 위해 시작 시 호출.
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

독립 다이어그램의 기본 경로(중앙 보관소 안 — `/diagram-create`의 `--standalone` 플래그가 오늘 날짜 폴더에 자동 할당):

```text
<중앙>/diagrams/<YYYY-MM-DD>/
  diagram-N.html
  diagram-N.png
```

연구 로그용 다이어그램의 경로 — 두 흐름 모두 중앙 보관소 직행이며, 작업 폴더에는 어떤 산출물도 만들지 않습니다:

```text
<중앙>/figures/<basename>/
  diagram-N.html
  diagram-N.png
```

코드 invariant 가드: `scripts/common.js`의 `assertInsideStorage`/`assertInsideSubdir`가 모든 쓰기 경로를 중앙 보관소 내부 절대 경로로 강제합니다. 작업 폴더 기준 상대 경로나 중앙 외부 절대 경로는 `next-diagram-path.js`, `save-draft.js`, `resolve-yaml.js`, `build-docx.js`, `rasterize-svg.js` 모두에서 즉시 거부됩니다.

`visual_brief`는 연구 로그 YAML 안에 남아 있는 기획 요소입니다. 다이어그램 스킬은 독립적이고 재사용 가능하며, 연구 로그 생성 스킬이 그림이 필요할 때 이를 소비합니다.

`research-log-yaml-create`는 시작 직후 `next-basename.js`로 중앙 `yamlPath`·`figuresDir`를 확보하고, `visual_brief` 자리표시자를 그 중앙 YAML에 기록하며, 생성 전 사용자에게 확인을 받고, `next-diagram-path.js <figuresDir> --count`로 경로를 할당한 뒤 각 브리프마다 `silotek-diagrammer` 서브에이전트를 한 개씩 병렬로 디스패치합니다. 반환된 PNG는 즉시 뒤따르는 `image`(경로 `../figures/<basename>/diagram-N.png`)로 짝지웁니다. 건너뛰거나 실패한 브리프는 짝이 맞지 않은 채로 남으며 회색 폴백 박스로 렌더링됩니다. `save-draft.js`는 검증과 manifest 기록만 합니다 — YAML과 figures는 이미 중앙에 있으니 복사하지 않습니다.

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
node --check plugins/research-log/scripts/common.js
node --check plugins/research-log/scripts/save-draft.js
node --check plugins/research-log/scripts/build-docx.js
node --check plugins/research-log/scripts/rasterize-svg.js
node --check plugins/research-log/scripts/setup-check.js
node --check plugins/research-log/scripts/resolve-yaml.js
node --check plugins/research-log/scripts/next-diagram-path.js
node --check plugins/research-log/scripts/next-basename.js
node --check plugins/research-log/scripts/sync-version.js
node --check plugins/research-log/build.js
npm.cmd test --prefix plugins/research-log
claude plugin validate .
```

## 커밋 메시지

커밋 메시지는 한국어로 작성합니다. 고유명사·기술 용어·식별자(`research-log`, YAML, DOCX, PNG 등)는 영어 그대로 둡니다. Conventional Commits 형식(`feat:`, `fix:`, `chore:` 등)의 접두사는 영어를 유지하고, 그 뒤 설명만 한국어로 씁니다. 예: `chore: 문서 한국어 번역 및 .gitignore 정리`.

## 버전 관리

`research-log` 버전 범프는 `plugins/research-log`에서 `npm version <patch|minor|major>` 한 번으로 한다 — `package.json`이 갱신되면 `version` 스크립트 훅(`scripts/sync-version.js`)이 `.claude-plugin/plugin.json`과 루트 `.claude-plugin/marketplace.json`의 버전 문자열을 맞춰 쓰고, `package-lock.json`은 npm이 자동 갱신한다. 네 파일을 손으로 동기화하지 않는다. `setup-check.js`의 `manifest` 체크가 세 매니페스트 버전이 어긋나면 알린다. (CI 등에서 커밋·태그를 자동으로 만들고 싶지 않으면 `npm version <bump> --no-git-tag-version` 후 직접 커밋한다.)

`serial-mcp` 버전을 바꿀 때는 루트 `.claude-plugin/marketplace.json`, `plugins/serial-mcp/.claude-plugin/plugin.json`, `plugins/serial-mcp/.codex-plugin/plugin.json`을 함께 맞춘다. 서버 repo URL·실행 명령이 바뀌면 `plugins/serial-mcp/README.md`, `scripts/install-codex.ps1`, `scripts/verify-codex.ps1`도 같은 작업 단위에서 갱신한다.

버전 이력: v1.0.0에서 marketplace ID를 `silotek`, 연구 로그 플러그인을 `research-log`, 시리얼 스킬을 `serial`, 서버 repo를 `serial-mcp-server`로 표준화(브레이킹). v0.3.0에서 `silotek-research-log` → `research-log` 이름 변경(브레이킹). v0.4.1은 소스/유형 선택과 병렬 다이어그램 생성을 유지하면서 다이어그램 스킬을 단일 Silotek 라이트 규칙 세트로 정리(비-브레이킹). v0.4.3은 DOCX `code` 블록 멀티라인 줄바꿈 복구 및 버전 동기화 흐름 간소화(비-브레이킹). v0.5.0은 연구 로그 파이프라인을 중앙 보관소 직행으로 단순화 — 작업 폴더 잔여물 제거, `save-draft`의 복사·경로 재작성 단계 폐지, `next-basename.js` 도입(비-브레이킹: 사용자 명령 표면과 산출물 경로 동일). v0.6.0은 작업 폴더 쓰기를 모든 흐름에서 차단 — `/diagram-create` 출력 경로를 중앙 `diagrams/<YYYY-MM-DD>/`로 이전, `next-diagram-path.js`의 작업 폴더 폴백 제거 및 `--standalone` 플래그 신설, `save-draft`/`resolve-yaml`/`build-docx`/`rasterize-svg`의 모든 쓰기 경로에 `assertInsideStorage`/`assertInsideSubdir` invariant 가드 추가(브레이킹: 독립 다이어그램 출력 경로 변경). v0.7.0은 다이어그램 스킬 디렉터리 이름을 `silotek-diagram-design` → `diagram-create`로 통일해 다른 짝(`research-log-*`)과 명령==스킬 이름 패턴을 맞춤(비-브레이킹: 명령·서브에이전트 동작 동일, 슬래시 자동완성 목록만 정리됨). v0.8.0은 명령 5개의 description을 한국어로 정리하고, `setup-check`에 GitHub raw `marketplace.json` 비교 기반 원격 버전 체크(`update` 항목)를 추가 — 네트워크 실패 시 `warn` 한 줄로 끝나며, `RESEARCH_LOG_SKIP_UPDATE_CHECK=1`로 비활성 가능, `RESEARCH_LOG_UPDATE_URL`로 출처 override 가능(비-브레이킹). serial-mcp v1.1.0은 `install-codex.ps1`에 `-SerialWrite`/`-SerialWriteConfirm` 파라미터를 추가해 Claude plugin.json의 env 패스스루 13종과 패리티를 맞춤(비-브레이킹). serial-mcp v1.2.0은 서버 0.3.0의 `SERIAL_CHAR_DELAY`(전송 문자 간 지연, 기본 10ms — STM32 폴링 수신 문자 유실 대응)를 plugin.json 패스스루와 `-SerialCharDelay` 파라미터로 노출(비-브레이킹).
