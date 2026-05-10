---
description: 저장된 사일로텍 연구일지 YAML을 채점하고 부족 항목·수정 제안을 보고합니다.
---

# 사일로텍 연구일지 채점

저장된 YAML 한 개를 받아 100점 만점 채점 결과를 사용자에게 보여준다.

## 사용법

```text
/silotek-research-log:critique <id|basename|yaml-path>
```

`<id>`는 `/silotek-research-log:build-docx --list`에 보이는 번호. basename은 `2026-05-10-...` 형태. yaml-path는 절대/상대 경로.

## 흐름

1. 가능하면 `research-critic` 서브에이전트를 호출한다 (Claude Code agents에 `research-critic`이 등록돼 있을 때).
   - 메인 세션이 저장된 YAML의 절대 경로를 인자로 넘긴다.
   - 서브에이전트가 한국어로 점수와 부족 항목을 보고.
2. `research-critic`이 등록되지 않은 환경에서는 fallback CLI 실행:

   Windows PowerShell:
   ```powershell
   node "$env:CLAUDE_PLUGIN_ROOT\scripts\critique.js" <id>
   ```

   macOS/Linux shell:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/critique.js" <id>
   ```

3. 결과를 사용자에게 그대로 보여준다 — 점수, 영역별 breakdown, 부족 항목, 수정 제안.
4. 사용자가 보강 요청하면 메인 세션이 부족 항목을 채워 다시 작성하고 `/silotek-research-log:draft`로 새 저장본을 만든다.

## JSON 출력 (CI / 자동화용)

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\critique.js" <id> --json
```

`{ total, breakdown, missing, suggestions }` JSON.

## 채점 기준 요약

10 영역 / 100점 — 자세한 표는 `agents/research-critic.md` 또는 `scripts/critique.js`의 `RUBRIC` 상수.
