# Silotek Claude Plugins

Internal Claude Code plugin marketplace for Silotek workflows.

## 포함 플러그인

- `silotek-research-log`: Claude 대화, 작업 폴더, 산출물을 기반으로 사일로텍 연구일지 YAML과 DOCX를 생성한다.

플러그인 본체는 [plugins/silotek-research-log/](plugins/silotek-research-log/) 안에 있고, 자세한 사용법과 YAML 스키마는 plugin 폴더의 [README](plugins/silotek-research-log/README.md)와 [CLAUDE.md](CLAUDE.md)에 있다.

> **명령 입력 위치**
> - **슬래시 명령** (`/...`): Claude Code 채팅창에 입력한다. `/`를 누르면 명령 목록이 뜬다.
> - **셸 명령** (`claude ...`, `npm ...`): 시스템 터미널에서 입력한다 (Windows: PowerShell / macOS: 터미널 앱).

## 설치

팀원이 사내 마켓플레이스에서 받을 때, 시스템 터미널을 열어 다음 명령을 실행한다.

Windows PowerShell:

```powershell
claude plugin marketplace add JOCOIN94/silotek-claude-plugins
claude plugin marketplace list
claude plugin install silotek-research-log@silotek-tools --scope user
```

macOS 터미널:

```bash
claude plugin marketplace add JOCOIN94/silotek-claude-plugins
claude plugin marketplace list
claude plugin install silotek-research-log@silotek-tools --scope user
```

설치 후 Claude Code를 재시작한 뒤, Claude Code 채팅창에서 `/help` 또는 `/`를 눌러 명령 목록에 다음이 보이는지 확인한다.

```text
/silotek-research-log:setup
/silotek-research-log:draft
/silotek-research-log:build-docx
```

처음 설치한 팀원은 Claude Code 채팅창에서 `/silotek-research-log:setup`을 한 번 실행해 Node 의존성을 설치한다.

## 업데이트

이미 설치한 팀원이 새 버전을 받을 때 Claude Code 채팅창에서 다음 슬래시 명령을 입력한다.

1. marketplace 캐시 갱신 (새 버전 메타 가져오기):

```text
/plugin marketplace update silotek-tools
```

2. 자동 업데이트가 켜져 있으면 그대로 새 버전이 적용된다. 수동으로 갈아끼우려면:

```text
/plugin uninstall silotek-research-log@silotek-tools
/plugin install silotek-research-log@silotek-tools --scope user
```

3. 새 버전을 처음 사용할 때 의존성 누락 안내가 뜨면 한 번 실행한다 (이미 깔려 있으면 생략):

```text
/silotek-research-log:setup
```

## 플러그인 개발 (로컬 검증)

시스템 터미널을 열어 레포 루트 폴더에서 실행한다.

### A. 빠른 반복 검증 (개발 중에 자주 쓰는 길)

marketplace 절차를 모두 건너뛰고 plugin 폴더를 Claude Code에 직접 로드한다. 코드/문서를 고치고 Claude Code를 다시 띄우면 변경분이 바로 반영된다.

Windows PowerShell:

```powershell
npm install --prefix .\plugins\silotek-research-log
claude --plugin-dir .\plugins\silotek-research-log
```

macOS 터미널:

```bash
npm install --prefix ./plugins/silotek-research-log
claude --plugin-dir ./plugins/silotek-research-log
```

각 줄이 하는 일:

- `npm install --prefix ...` — plugin 폴더 안에 Node 의존성을 설치한다 (첫 회만, 또는 의존성이 바뀐 경우에만).
- `claude --plugin-dir ...` — marketplace를 거치지 않고 plugin 폴더를 직접 로드해 Claude Code를 띄운다.

### B. 마켓플레이스 시뮬레이션 (push 직전 자기검증)

GitHub에 push했을 때 팀원이 받게 될 흐름을 push 전에 미리 굴려본다.

Windows PowerShell:

```powershell
claude plugin validate .
claude plugin marketplace add .
claude plugin install silotek-research-log@silotek-tools --scope user
```

macOS 터미널:

```bash
claude plugin validate .
claude plugin marketplace add .
claude plugin install silotek-research-log@silotek-tools --scope user
```

각 줄이 하는 일:

- `claude plugin validate .` — `.claude-plugin/marketplace.json`, plugin.json, commands/skills 메타데이터가 Claude Code 파서를 통과하는지 검사한다.
- `claude plugin marketplace add .` — 현재 폴더(`.`)를 로컬 marketplace로 등록한다.
- `claude plugin install silotek-research-log@silotek-tools --scope user` — 위에서 등록한 로컬 마켓플레이스에서 실제로 설치한다.

### A 와 B, 언제 뭘 써야 하나

- **A**는 "지금 내가 변경한 코드가 잘 동작하나?"를 가장 빠르게 본다. 평소 개발 사이클의 기본.
- **B**는 "팀원이 마켓플레이스에서 받았을 때 깨지지 않을까?"를 본다. GitHub에 push하기 직전에 한 번 돌리는 자기검증.

## 저장 위치

연구일지 산출물은 각 프로젝트 폴더가 아니라 사용자 Documents 아래 중앙 저장소에 모인다.

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```
