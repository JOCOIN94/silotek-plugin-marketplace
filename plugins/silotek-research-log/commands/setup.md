---
description: 사일로텍 연구일지 플러그인의 Node 의존성을 설치합니다.
---

# 사일로텍 연구일지 플러그인 설정

이 플러그인은 DOCX 생성을 위해 Node 의존성이 필요하다. 설치 후 한 번만 실행한다.

## 실행

Windows PowerShell:

```powershell
npm.cmd install --ignore-scripts --no-audit --no-fund --prefix "$env:CLAUDE_PLUGIN_ROOT"
```

macOS/Linux shell:

```bash
npm install --ignore-scripts --no-audit --no-fund --prefix "${CLAUDE_PLUGIN_ROOT}"
```

## 확인

설치 후 다음 명령으로 YAML 목록 조회가 되는지 확인한다.

Windows PowerShell:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\list-yaml.js"
```

macOS/Linux shell:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/list-yaml.js"
```

정상이라면 중앙 연구일지 저장소 경로가 출력된다.
