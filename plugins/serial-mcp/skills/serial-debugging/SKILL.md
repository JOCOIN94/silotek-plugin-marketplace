---
name: serial-debugging
description: 시리얼/펌웨어 디버깅 중 장비 로그를 확인하거나, 사람이 장비를 동작시키고 그 결과 로그를 AI가 확인하는 블랙박스 시험 루프를 돌릴 때 사용한다.
---

# 시리얼 블랙박스 디버깅 (serial-mcp)

서버의 조회 도구는 읽기 전용이고, 쓰기는 `send_serial_command`·`reset_board` 2종만 매 호출 승인 게이트로 허용된다. 각 도구의 인자·반환 구조는 도구 docstring이 자족적으로 설명한다(여기 중복하지 않음). 이 스킬은 **여러 도구를 엮는 순서·판단**만 담는다.

## Codex 설치 확인

Codex에서 이 스킬은 보이는데 `list_serial_ports` 같은 MCP 도구가 보이지 않으면, 플러그인 설치만 된 상태일 수 있다. 현재 Codex는 플러그인 내부 MCP 선언을 목록에는 올려도 대화 도구로 안정적으로 주입하지 못하므로, Codex에서는 top-level MCP 등록을 한 번 수행해야 한다.

저장소 루트에서:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\install-codex.ps1
```

확인만 할 때:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\plugins\serial-mcp\scripts\verify-codex.ps1 -RequireDirectConfig
```

등록 뒤에는 새 Codex 세션을 열어야 MCP tool schema가 다시 로드된다.

## 표준 루프

1. `clear_log_buffer(port=...)` — 시험 시작. **관찰 대상 보드만 지정해 비워라.** 미지정은 전체 비우기다 — 다른 보드의 맥락 로그(예: 게이트웨이 쪽 통신 기록)를 보존해야 하면 반드시 선택 비우기.
2. 리셋이 필요한 경우 먼저 `reset_board(port=...)`를 호출한다. 승인 팝업이 뜨면 사람이 수락해야 하며, `status="declined"`면 같은 리셋을 재시도하지 말고 사람과 이유·다음 행동을 합의한다. 클라이언트가 승인 팝업을 지원하지 않거나, native-USB/미배선 보드라 0줄이 회수되면 폴백으로 사람에게 요청한다: "지금 [보드]를 리셋(또는 [동작])해 주세요. 하시면 알려 주세요."
3. 회수: 응답 직후 `get_recent_logs(port=...)`. 비어 있으면 **2~3초 간격으로 `get_log_buffer_info(port=...)`를 2~3회** 폴링해 유입을 확인하고, 그래도 0이면 `get_serial_status`(연결) → 사람(전원·배선·리셋 재요청) 순으로 의심.
4. 분석 → 코드 수정 → 1로 반복. 표적 확인은 `query_serial_logs(pattern=..., port=...)`.

## 명령 전송 판단

- `send_serial_command(command=..., port=...)`는 펌웨어가 제공하는 CLI/AT/진단 명령을 알고 있을 때만 쓴다. 명령 문법은 서버가 보장하지 않는다.
- 호출마다 승인 팝업이 뜬다. `status="declined"`는 재시도 금지 신호다 — 같은 명령을 반복 호출하지 말고 사람에게 이유를 묻고 다음 행동을 합의한다.
- 응답 `lines`에는 `[TX]` 송신 감사 마커가 함께 섞일 수 있다. 분석할 때 보드 응답과 감사 마커를 구분하라.

## 보드 식별 — 추측하지 말 것

- **별칭이 진실이다**: `list_serial_ports`/`get_serial_status`의 `name`·`label`(SERIAL_NAMES/SERIAL_AUTONAME 산출). **VID/PID로 칩 벤더를 보고 보드를 단정하지 마라** — 이 환경은 CH343·Prolific 같은 범용 USB-UART 어댑터를 쓰므로 벤더가 보드 종류를 말해주지 않는다(ESP32가 ST 어댑터에, STM32가 CH 어댑터에 물릴 수 있다).
- **이름 없는 포트 = 아직 침묵한 보드**일 수 있다. 자동 식별(SERIAL_AUTONAME)은 그 보드의 로그가 처음 흘러야 1회 확정되므로, idle 보드는 동작/리셋을 시키면 이름이 붙는다.
- 그래도 모호하면 사람에게 포트↔보드 매핑을 물어라.

## 함정·해석

- **포트 점유 에러**(`connected=false` + 점유/권한 `last_error`): 플래싱 도구·IDE 시리얼 모니터·테라텀이 쥔 것이다 — 사람에게 해당 프로그램 종료를 요청하고 재확인(서버가 3초 간격으로 자동 재연결).
- **서버 기동 후에 꽂은 보드**도 핫플러그 스캔(기본 5초 간격)이 자동 추가한다 — 새 보드가 `list_serial_ports`에 monitored=false로 나오면 몇 초 뒤 재조회하고, 그래도 안 붙으면 `SERIAL_PORT` 고정 모드인지(고정 모드는 스캔 없음) 확인하라.
- **플래싱 직후엔 부팅 로그가 잘려 있을 수 있다**(플래셔가 포트를 쥐고 있던 동안 못 읽음) — 깨끗한 판정은 루프(클리어→사람 리셋)로 다시 받아라.
- **`(N회 반복, t0~t1)` 접힘은 요약이다**: 반복 줄들의 정밀한 교차 순서가 필요하면 `SERIAL_DEDUP=1` 또는 `0`으로 낮춰 재시험하라(tee 파일엔 수신 원본이 그대로 보존된다).
- 사람이 로그를 눈으로 직접 보고 싶어 하면 도구 응답의 `viewer_url`(웹 뷰어 — 포트 셀렉터·실시간 스트림)을 안내하라.

## 사일로텍 장비 메모

SSM=게이트웨이(ESP32-S3), SB=Smart Board(ESP32-S2 + STM32; STM32가 카드·요금·디스플레이 담당). 자동 식별 규칙 예(터미널에서 1회 설정):

```
setx SERIAL_AUTONAME "SSM=\[Proc-;SB1-ESP=Send to the STM32|\[Tx_RSSI\]|\[WiFi_Rx\];SB1-STM=Found card with UID|Read\(Block|Remaing TotalAmount|Disp\. Step"
```
