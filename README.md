# Silotek Plugin Marketplace

Silotek 워크플로용 내부 AI 플러그인 마켓플레이스입니다. marketplace ID는 `silotek`이고, 두 개의 독립 플러그인(`research-log`, `serial-mcp`)을 같은 저장소에서 함께 배포합니다.

- **`research-log`** — 연구일지 YAML 작성·재작성, DOCX 내보내기, 다이어그램 생성.
- **`serial-mcp`** — 임베디드 보드(ESP32/STM32)의 시리얼 로그를 AI가 읽고 명령까지 보내는 MCP 서버 + 디버깅 스킬.

---

## 🚀 팀원 빠른 시작 (AI 도구가 처음이어도 OK)

아래 순서를 그대로 따라 하세요. **처음 한 번만** 하면 됩니다.

### 0단계 — `uv` 먼저 설치 *(serial-mcp 쓸 사람만)*

`serial-mcp`는 `uv`라는 실행기가 있어야 작동합니다. **안 깔고 설치하면 시리얼 도구가 조용히 안 뜹니다.** 반드시 먼저 깔아주세요.

Windows PowerShell에서:

```powershell
winget install astral-sh.uv
```

`winget`이 없으면 대신:

```powershell
pip install uv
```

설치 후 **새 터미널**을 열고 아래가 버전 숫자를 출력하면 성공입니다. (공식 안내: <https://docs.astral.sh/uv/>)

```powershell
uv --version
```

> 연구일지(`research-log`)만 쓸 사람은 이 단계를 건너뛰어도 됩니다.

### 1단계 — Claude Code 켜기

터미널(또는 PowerShell)을 열고 입력합니다.

```text
claude
```

그러면 Claude Code 대화창이 열립니다. **아래 명령들은 전부 이 대화창 안에 입력**하세요 — 터미널에 직접 치는 게 아닙니다.

### 2단계 — 마켓플레이스 등록 *(최초 1회)*

```text
/plugin marketplace add JOCOIN94/silotek-plugin-marketplace
```

처음이면 "이 마켓플레이스를 신뢰하시겠습니까?" 같은 확인이 뜹니다 — 엔터 또는 `y`로 승인하세요.

### 3단계 — 플러그인 설치 *(한 줄씩 입력 → 엔터)*

```text
/plugin install research-log@silotek --scope user
```

```text
/plugin install serial-mcp@silotek --scope user
```

> 한 줄 입력 → 엔터 → 끝나면 다음 줄. **두 줄을 통째로 붙여넣지 마세요.**
> 둘 중 필요한 것만 설치해도 됩니다.

### 4단계 — 잘 됐는지 확인

```text
/research-log:setup-check
```

체크가 전부 `ok`로 나오면 끝입니다. 🎉

> 설치가 안 보이면 Claude Code를 한 번 껐다 켜세요(`/exit` 입력 후 다시 `claude`).
> `dependencies` / `rasterizer` 체크가 실패하면 플러그인 폴더에서 `npm install`을 한 번 돌린 뒤 다시 점검합니다.

---

## 🔄 업데이트 & 제거

새 버전이 올라오면 갱신은 Claude Code 안에서 한 줄로:

```text
/plugin marketplace update silotek
```

제거:

```text
/plugin uninstall research-log@silotek
/plugin uninstall serial-mcp@silotek
```

---

## 사전 요구사항 (요약)

| 도구 | 필요한 플러그인 | 비고 |
| --- | --- | --- |
| 최신 Claude Code (`claude` CLI) | 공통 | 모든 명령을 여기 대화창에 입력 |
| Node.js 18 LTS 이상 | `research-log` | 개발은 Node 24에서 검증 |
| `uv` / `uvx` | `serial-mcp` | 없으면 시리얼 도구 미동작 — 빠른 시작 0단계 참고 |

## 노출되는 명령어

`research-log`가 제공하는 슬래시 명령:

```text
/research-log:setup-check
/research-log:research-log-yaml-create
/research-log:research-log-yaml-retouch
/research-log:research-log-docx-create
/research-log:diagram-create
```

`serial-mcp`는 슬래시 명령이 아니라 MCP 도구와 `serial` 스킬을 제공합니다.

---

## Codex에서 serial-mcp 사용

Codex용 `serial-mcp` 플러그인은 스킬과 MCP 서버 설정을 함께 번들합니다. 팀원은 플러그인을
설치하거나 업데이트한 뒤 새 Codex 작업을 시작하면 됩니다(`uv` 필요).

마켓플레이스 갱신·설치:

```powershell
codex plugin marketplace upgrade silotek --json
codex plugin add serial-mcp@silotek --json
```

`1.22.8` 이하에서 직접 MCP 등록 스크립트를 사용했던 PC는, 플러그인 번들보다 오래된 태그가
우선하지 않도록 기존 top-level 등록을 한 번만 제거합니다:

```powershell
codex mcp remove serial-mcp
```

검증(읽기 전용):

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\verify-codex.ps1
```

설치 뒤 새 Codex 작업을 열면 `list_serial_ports`, `get_serial_status`, `get_recent_logs` 등 MCP 도구가 주입됩니다. `scripts/install-codex.ps1`은 번들 MCP를 지원하지 않는 구형 Codex용 폴백입니다.

## v1.0.0 이전 이름에서 옮겨오는 경우

옛 marketplace(`silotek-tools`)에서 쓰던 팀원은 먼저 제거 후 다시 설치합니다:

```text
/plugin uninstall silotek-tools@silotek-tools
/plugin uninstall serial-mcp@silotek-tools
/plugin marketplace add JOCOIN94/silotek-plugin-marketplace
/plugin install research-log@silotek --scope user
/plugin install serial-mcp@silotek --scope user
```

---

## 산출물 저장소

연구일지·다이어그램·DOCX 산출물은 모두 플러그인 디렉터리 외부의 **중앙 저장소**에 모입니다:

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

---

## 🛠 트러블슈팅

- **시리얼 도구(MCP)가 안 보임**: 대부분 `uv` 미설치입니다. 빠른 시작 0단계로 `uv`를 깔고 Claude Code/Codex를 새로 여세요.
- **`assertInsideStorage` / `assertInsideSubdir` 에러**: 작업 폴더 기준 상대 경로나 중앙 저장소 외부 경로를 스크립트에 넘긴 경우입니다. 슬래시 명령이 자동으로 처리하니, 직접 호출할 때는 `next-basename.js` / `next-diagram-path.js`가 반환한 절대 경로를 따옴표로 감싸 그대로 넘기세요.
- **`meta.연구 성격`이 비어 있음 / 도메인 밖**: `save-draft.js`가 거부합니다. `구축` / `분석` / `검증` 중 하나여야 합니다.
- **DOCX에 회색 박스만 보임**: 해당 `visual_brief`에 짝지어진 `image` 파일이 없는 경우입니다. 같은 폴더에 형제 HTML이 있으면 `save-draft.js`가 자동으로 PNG로 래스터화해 복구합니다 (`--no-rasterize`로 비활성화 가능).
- **`fonts` 경고**: 번들 Pretendard 폰트가 없으면 래스터라이저가 시스템 폰트로 폴백합니다. 산출물이 깨지지 않으면 무시 가능합니다.

---

## 개발자용 (저장소 컨트리뷰터)

> 팀원으로서 **사용만** 한다면 여기 아래는 읽지 않아도 됩니다.

### 로컬 검증

Windows PowerShell:

```powershell
npm.cmd install --prefix .\plugins\research-log
claude plugin validate .
npm.cmd test --prefix .\plugins\research-log
```

읽기 전용 진단·목록:

```powershell
node .\plugins\research-log\scripts\setup-check.js --json
node .\plugins\research-log\scripts\list-yaml.js
```

DOCX 빌드(저장된 YAML 한 건 선택):

```powershell
node .\plugins\research-log\scripts\build-docx.js --list
node .\plugins\research-log\scripts\build-docx.js 1
```

연구일지 YAML 작성·저장은 슬래시 명령(`/research-log:research-log-yaml-create`)으로 흐름 전체를 거쳐야 합니다. `save-draft.js`를 직접 호출할 일은 거의 없습니다 — 첫 인자는 중앙 `inputs/<basename>.yaml`의 절대 경로여야 하고, 작업 폴더 경로는 invariant 가드가 거부합니다.

### 버전 범프

`research-log`는 `plugins/research-log`에서 한 번에:

```powershell
cd plugins\research-log
npm.cmd version <patch|minor|major>
```

`scripts/sync-version.js`가 `plugin.json`과 루트 `marketplace.json`을 자동으로 맞춰 씁니다 — 손으로 동기화하지 않습니다.

### atlas (스킬 제작 준비용 자료 보관소)

`atlas/`는 시리얼 MCP 서버를 구축·개선·디버깅하며 얻은 정보 중 **스킬 제작에 필요한 가이드라인을 모으는** 내부 저장소입니다. MCP가 있어도 AI가 도구 사용에 능숙하지 않을 수 있으므로, 같은 도구를 더 빠르고 정확하게 쓰게 해 줄 자료를 여기 축적합니다.

---

## 버전 이력 요약

- **v1.0.0**: marketplace ID를 `silotek`, 연구 로그 플러그인을 `research-log`, 시리얼 스킬을 `serial`로 표준화하고 repo 이름을 `silotek-plugin-marketplace` / `serial-mcp-server`로 정리 (브레이킹)
- **v0.8.0**: 명령 5개 description 한국어화 + `setup-check`에 원격 버전 비교 체크 추가 (비-브레이킹 — `RESEARCH_LOG_SKIP_UPDATE_CHECK=1`로 옵트아웃 가능)
- **v0.7.0**: 다이어그램 스킬 디렉터리 이름을 `silotek-diagram-design` → `diagram-create`로 통일 (비-브레이킹 — 명령·서브에이전트 동작 동일, 슬래시 자동완성 목록만 정리됨)
- **v0.6.0**: 작업 폴더 쓰기를 모든 흐름에서 차단 (브레이킹 — 독립 다이어그램 출력 경로가 중앙 `diagrams/<YYYY-MM-DD>/`로 이동, `--standalone` 플래그 신설)
- **v0.5.0**: 연구 로그 파이프라인을 중앙 보관소 직행으로 단순화 (`next-basename.js` 도입)
- **v0.4.3**: DOCX 코드 블록 멀티라인 줄바꿈 복구, 버전 동기화 흐름 간소화
- **v0.4.1**: 다이어그램 스킬을 단일 Silotek 라이트 규칙 세트로 통합, 병렬 다이어그램 생성
- **v0.3.0**: 패키지명을 `silotek-research-log` → `research-log`로 변경 (브레이킹)
