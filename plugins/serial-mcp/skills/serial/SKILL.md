---
name: serial
description: serial-mcp로 임베디드 보드의 serial port, 로그/logs, status/상태, command send/명령 전송, reset/reconnect, interactive prompt/대화형 프롬프트, configuration change/설정 변경, observe-act-verify를 수행할 때 쓴다. 장비 로그 확인·블랙박스 시험 루프와 그 결과 검증을 포함한다. 보드별 명령 의미와 risk는 ssm 같은 board 스킬이 함께 다룬다. 호스트 PC WiFi/네트워크 설정이나 serial 장비와 무관한 코드 작업에는 쓰지 않는다.
---

# 시리얼 운용 (serial-mcp)

serial-mcp로 임베디드 보드를 **관찰·조작·검증**하는 공통 하네스. 서버의 조회 도구는 읽기 전용이고, 쓰기는 `send_serial_command`·`reset_board` 2종이다. 승인 게이트는 **등급-인지(배포 기본 `SERIAL_WRITE_CONFIRM=r3`)** 라 R3 파괴 명령에만 승인 팝업이 뜨고 **R0–R2는 승인·입회 없이 자동 실행**된다(검증은 그대로 필수). 각 도구의 인자·반환 구조는 도구 docstring이 자족적으로 설명한다 — 이 스킬은 여러 도구를 엮는 순서·판단만 담는다.

- **운용 방법**(observe→act→verify, 표준 루프, risk gate, interactive prompt 처리, secret redaction, 보드 식별, 함정) → `references/ops.md`. 거의 모든 시리얼 작업이 이 문서로 처리된다.
- **보드별 명령 의미**(이 명령이 무엇을 하는지, risk·검증 시그니처) → 해당 board 스킬과 그 `references/command-surface.md`.

## live board 작업 시작 시 — viewer_url 안내

실제 live board 작업을 시작할 때만, 사용자가 링크를 요청하지 않아도 가장 먼저 `get_serial_status`를 호출해 응답의 `viewer_url`(웹 뷰어 — 포트 셀렉터·실시간 스트림)을 안내한다. 목적은 사용자가 같은 실시간 스트림을 눈으로 보며 AI가 회수·판단한 결과를 직접 교차검증하게 하는 것이다 — AI가 블랙박스로 읽고 단정하지 않는다. **문서 검토·skill 편집·사용자가 제공한 로그만 분석하는 작업에서는 live MCP를 호출하지 않는다.**

- `viewer_url`은 기본 `http://127.0.0.1:8743`(고정 포트)이지만 `SERIAL_WEB`으로 포트가 바뀔 수 있으니, 하드코딩하지 말고 매번 `get_serial_status` 응답에서 읽어라.
- `SERIAL_WEB=0` 또는 설치 스크립트 `-SerialWeb 0`은 웹 UI만 끈다. 이때도 owner 잠금은 기본 8743에 유지되며, `viewer_url`이 없으면 링크 안내 없이 owner 세션 종료 또는 해당 세션의 해제를 요청한다.
- live 작업 시작 시 1회 안내로 충분하다 — 이후 매 응답마다 반복하지는 않되, 로그를 회수해 보고할 때는 판단 근거가 된 라인과 함께 다시 동봉한다.
- 서버 미기동이거나 포트가 모두 미연결이면 뷰어는 빈 화면일 수 있다 — 그 사실(예: 포트 점유 `last_error`)도 함께 알려 사용자가 원인을 같이 보게 한다.

## 위험 작업 gate (요약)

명령의 risk 등급 정의와 게이트 절차는 `references/ops.md`의 risk gate를, 명령별 risk 판정은 보드 command-surface를 따른다. 요약하면 **R0** 조회는 바로 / **R1** 복원 가능 변경은 snapshot·verify / **R2** 재부팅·재연결·영구 변경은 **승인·입회 없이 자동 실행하되 snapshot·재부팅·boot 완료까지 검증** / **R3** 재플래시·포맷·임의 주입은 실행 금지(기본). SKILL.md는 등급 의미를 재정의하지 않는다.

## MCP 도구가 보이지 않을 때만

정상 live board 운용 중에는 실행하지 않는, 일회성 설치 troubleshooting이다. Codex에서 이 스킬은 보이는데 `list_serial_ports` 같은 MCP 도구가 보이지 않을 때만 `plugins/serial-mcp/README.md`의 'Codex install' 절차(`install-codex.ps1`)로 top-level MCP 등록을 한 번 수행한다(등록 후 새 Codex 세션을 열어야 MCP tool schema가 다시 로드된다).
