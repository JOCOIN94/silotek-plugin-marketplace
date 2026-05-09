---
description: 중앙 저장소에 저장된 사일로텍 연구일지 YAML을 선택해 DOCX 문서로 생성합니다.
---

# 사일로텍 연구일지 DOCX 생성

중앙 저장소의 YAML 목록을 보여주고, 사용자가 선택한 항목을 DOCX로 생성한다.

## 절차

1. YAML 목록을 조회한다.

Windows PowerShell:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\list-yaml.js"
```

macOS/Linux shell:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/list-yaml.js"
```

2. 사용자가 번호, 파일명, basename 중 하나로 항목을 선택하게 한다.
3. 선택한 YAML을 DOCX로 생성한다.

Windows PowerShell:

```powershell
node "$env:CLAUDE_PLUGIN_ROOT\scripts\build-docx.js" <번호|파일명|basename>
```

macOS/Linux shell:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/build-docx.js" <번호|파일명|basename>
```

4. 생성된 DOCX 경로와 manifest 업데이트 경로를 사용자에게 알려준다.

## 주의

- 이 명령은 기존 YAML을 DOCX로 변환하는 명령이다.
- 새 연구일지 초안이 필요하면 먼저 `/silotek-research-log:draft`를 사용한다.
- 스키마 오류가 나오면 YAML을 임의로 우회하지 말고 `/draft` 규칙의 flat `sections` 형식에 맞게 보정한다.
