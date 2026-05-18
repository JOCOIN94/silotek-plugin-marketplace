# Silotek Claude Plugins

Silotek 워크플로용 내부 Claude Code 플러그인 마켓플레이스입니다.

## 플러그인

이 저장소는 현재 한 개의 플러그인 패키지를 노출합니다:

- `silotek-tools`: 연구 로그 YAML 생성, YAML 재작성, DOCX 내보내기, 설치 진단, 독립 다이어그램 생성.

플러그인 소스:

```text
plugins/silotek-tools/
```

마켓플레이스 레지스트리:

```text
.claude-plugin/marketplace.json
```

## 노출되는 명령어

```text
/silotek-tools:setup-check
/silotek-tools:research-log-yaml-create
/silotek-tools:research-log-yaml-retouch
/silotek-tools:research-log-docx-create
/silotek-tools:diagram-create
```

## 설치

Claude Code에서:

```text
/plugin marketplace add <this-repo-or-marketplace-url>
/plugin install silotek-tools@silotek-tools --scope user
```

v0.3.0 브레이킹 이름 변경의 경우, 이전 패키지가 이미 설치되어 있다면 먼저 제거하세요:

```text
/plugin uninstall silotek-research-log@silotek-tools
/plugin marketplace update silotek-tools
/plugin install silotek-tools@silotek-tools --scope user
```

## 로컬 개발

Windows PowerShell:

```powershell
npm.cmd install --prefix .\plugins\silotek-tools
claude plugin validate .
claude --plugin-dir .\plugins\silotek-tools
```

자주 쓰는 로컬 점검 명령:

```powershell
node .\plugins\silotek-tools\scripts\setup-check.js
node .\plugins\silotek-tools\scripts\list-yaml.js
node .\plugins\silotek-tools\scripts\save-draft.js .silotek-research-log-draft.yaml --mode folder --source-root .
node .\plugins\silotek-tools\scripts\build-docx.js 1
npm.cmd test --prefix .\plugins\silotek-tools
```

## 저장소

연구 로그 데이터는 플러그인 디렉터리 외부에 저장됩니다:

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```

플러그인은 모든 산출물(YAML, DOCX, 매니페스트, 다이어그램)을 이 중앙 저장소에 보관합니다. 독립 다이어그램은 `<central>/diagrams/<YYYY-MM-DD>/` 아래에 자동 할당됩니다. 작업 폴더(현재 디렉터리)에는 어떤 파일도 만들지 않습니다.
