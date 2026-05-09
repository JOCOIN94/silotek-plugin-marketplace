# Silotek Claude Plugins

Internal Claude Code plugin marketplace for Silotek workflows.

## 포함 플러그인

- `silotek-research-log`: Claude 대화, 작업 폴더, 산출물을 기반으로 사일로텍 연구일지 YAML과 DOCX를 생성한다.

## 설치

개인 GitHub private repo에서 테스트할 때:

```powershell
claude plugin marketplace add JOCOIN94/silotek-claude-plugins
claude plugin marketplace list
claude plugin install silotek-research-log@silotek-tools --scope user
```

설치 후 Claude Code를 재시작하고 `/help` 또는 `/` 목록에서 다음 명령을 확인한다.

```text
/silotek-research-log:setup
/silotek-research-log:draft
/silotek-research-log:build-docx
```

처음 설치한 팀원은 먼저 `/silotek-research-log:setup`을 한 번 실행해 Node 의존성을 설치한다.

## 로컬 개발 검증

```powershell
claude plugin validate .
claude plugin marketplace add .
claude plugin install silotek-research-log@silotek-tools --scope user
```

플러그인 자체를 직접 로드해 테스트할 때:

```powershell
claude --plugin-dir .\plugins\silotek-research-log
```

## 저장 위치

연구일지 산출물은 각 프로젝트 폴더가 아니라 사용자 Documents 아래 중앙 저장소에 모인다.

```text
Windows: %USERPROFILE%\Documents\Silotek Research Logs
macOS:   $HOME/Documents/Silotek Research Logs
```
