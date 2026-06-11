# Silotek Claude Plugins

Silotek 워크플로용 내부 Claude Code 플러그인 마켓플레이스입니다.

## 플러그인

이 저장소는 같은 marketplace 안에서 서로 독립된 플러그인 두 개를 노출합니다.

- `silotek-tools`: 연구 로그 YAML 작성·재작성, DOCX 내보내기, 독립 다이어그램 생성, 설치 진단.
- `serial-mcp`: 임베디드 보드 시리얼 로그를 AI가 읽는 MCP 서버 + 블랙박스 디버깅 스킬.

```text
plugins/silotek-tools/          # 연구 로그 / 다이어그램 플러그인
plugins/serial-mcp/             # 시리얼 MCP 플러그인
.claude-plugin/marketplace.json # 마켓플레이스 레지스트리
```

## 노출되는 명령어

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

`serial-mcp`는 slash command가 아니라 MCP tools와 `serial-debugging` skill을 제공한다.

## 사전 요구사항

- Node.js 18 LTS 이상 (개발은 Node 24에서 검증)
- 최신 Claude Code (`claude` CLI)

## 팀원 설치 (Claude Code 안에서)

```text
/plugin marketplace add <이 저장소의 git URL 또는 로컬 경로>
/plugin install silotek-tools@silotek-tools --scope user
```

시리얼 디버깅이 필요하면 별도로 설치합니다:

```text
/plugin install serial-mcp@silotek-tools --scope user
```

두 플러그인은 독립적입니다. 연구 로그/다이어그램만 쓰면 `serial-mcp`를 설치할 필요가 없고, 시리얼 디버깅만 쓰면 `silotek-tools`를 설치할 필요가 없습니다.

설치 직후 진단을 한 번 돌려 의존성·저장소·매니페스트가 일치하는지 확인합니다:

```text
/silotek-tools:setup-check
```

7개 체크가 전부 `ok`로 보고되면 사용 준비 완료입니다. `dependencies` 또는 `rasterizer` 체크가 실패하면 플러그인 디렉터리에서 `npm install`을 한 번 실행한 뒤 다시 진단합니다.

## Codex에서 serial-mcp 사용

Codex는 현재 플러그인 내부 MCP 선언을 목록에는 올려도 대화 도구로 안정적으로 주입하지 못할 수 있습니다. `serial-mcp`는 Codex용 직접 MCP 등록 스크립트를 포함합니다:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\install-codex.ps1
```

검증:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\verify-codex.ps1 -RequireDirectConfig
```

설치 뒤 새 Codex 세션을 열면 `list_serial_ports`, `get_serial_status`, `get_recent_logs` 등 MCP 도구가 주입됩니다.

### v0.3.0 이전 이름(`silotek-research-log`)에서 옮겨오는 경우

```text
/plugin uninstall silotek-research-log@silotek-tools
/plugin marketplace update silotek-tools
/plugin install silotek-tools@silotek-tools --scope user
```

## 산출물 저장소

연구 로그·다이어그램·DOCX 산출물은 모두 플러그인 디렉터리 외부의 **중앙 저장소**에 모입니다:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs\
macOS:   $HOME/Documents/Silotek Research Logs/
```

레이아웃:

```text
inputs/      연구일지 YAML
outputs/     DOCX 산출물
manifests/   빌드 진단 기록
figures/     연구일지 다이어그램 (figures/<basename>/diagram-N.html|png)
diagrams/    독립 다이어그램 (diagrams/<YYYY-MM-DD>/diagram-N.html|png)
```

저장 위치를 바꾸려면 환경 변수 `SILOTEK_RESEARCH_LOG_ROOT`에 절대 경로를 지정합니다. 플러그인은 **작업 폴더(현재 디렉터리)에 어떤 파일도 만들지 않습니다** — `assertInsideStorage`/`assertInsideSubdir` invariant 가드가 모든 쓰기 경로를 중앙 저장소 안으로 강제합니다.

## 로컬 개발 (저장소 컨트리뷰터용)

Windows PowerShell:

```powershell
npm.cmd install --prefix .\plugins\silotek-tools
claude plugin validate .
npm.cmd test --prefix .\plugins\silotek-tools
```

읽기 전용 진단·목록:

```powershell
node .\plugins\silotek-tools\scripts\setup-check.js --json
node .\plugins\silotek-tools\scripts\list-yaml.js
```

DOCX 빌드(저장된 YAML 한 건 선택):

```powershell
node .\plugins\silotek-tools\scripts\build-docx.js --list
node .\plugins\silotek-tools\scripts\build-docx.js 1
```

연구일지 YAML 작성·저장은 슬래시 명령(`/silotek-tools:research-log-yaml-create`)으로 흐름 전체를 거쳐야 합니다. `save-draft.js`를 직접 호출할 일은 거의 없습니다 — 첫 인자는 중앙 `inputs/<basename>.yaml`의 절대 경로여야 하고, 작업 폴더 경로는 invariant 가드가 거부합니다.

버전 범프는 `plugins/silotek-tools`에서 한 번에:

```powershell
cd plugins\silotek-tools
npm.cmd version <patch|minor|major>
```

`scripts/sync-version.js`가 `plugin.json`과 루트 `marketplace.json`을 자동으로 맞춰 씁니다 — 손으로 동기화하지 않습니다.

## 트러블슈팅

- **`assertInsideStorage` / `assertInsideSubdir` 에러**: 작업 폴더 기준 상대 경로나 중앙 저장소 외부 경로를 스크립트에 넘긴 경우입니다. 슬래시 명령이 자동으로 처리하니, 직접 호출할 때는 `next-basename.js` / `next-diagram-path.js`가 반환한 절대 경로를 따옴표로 감싸 그대로 넘기세요.
- **`meta.연구 성격`이 비어 있음 / 도메인 밖**: v0.2.1부터 `save-draft.js`가 거부합니다. `구축` / `분석` / `검증` 중 하나여야 합니다.
- **DOCX에 회색 박스만 보임**: 해당 `visual_brief`에 짝지어진 `image` 파일이 없는 경우입니다. 같은 폴더에 형제 HTML이 있으면 `save-draft.js`가 자동으로 PNG로 래스터화해 복구합니다 (`--no-rasterize`로 비활성화 가능).
- **`fonts` 경고**: 번들 Pretendard 폰트가 없으면 래스터라이저가 시스템 폰트로 폴백합니다. 산출물이 깨지지 않으면 무시 가능합니다.

## 버전 이력 요약

- **v0.8.0**: 명령 5개 description 한국어화 + `setup-check`에 원격 버전 비교 체크 추가 (비-브레이킹 — `SILOTEK_TOOLS_SKIP_UPDATE_CHECK=1`로 옵트아웃 가능)
- **v0.7.0**: 다이어그램 스킬 디렉터리 이름을 `silotek-diagram-design` → `diagram-create`로 통일 (비-브레이킹 — 명령·서브에이전트 동작 동일, 슬래시 자동완성 목록만 정리됨)
- **v0.6.0**: 작업 폴더 쓰기를 모든 흐름에서 차단 (브레이킹 — 독립 다이어그램 출력 경로가 중앙 `diagrams/<YYYY-MM-DD>/`로 이동, `--standalone` 플래그 신설)
- **v0.5.0**: 연구 로그 파이프라인을 중앙 보관소 직행으로 단순화 (`next-basename.js` 도입)
- **v0.4.3**: DOCX 코드 블록 멀티라인 줄바꿈 복구, 버전 동기화 흐름 간소화
- **v0.4.1**: 다이어그램 스킬을 단일 Silotek 라이트 규칙 세트로 통합, 병렬 다이어그램 생성
- **v0.3.0**: 패키지명을 `silotek-research-log` → `silotek-tools`로 변경 (브레이킹)
