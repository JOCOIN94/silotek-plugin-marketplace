---
name: sb-esp
description: SB-ESP 보드(SmartBay ESP32, SB260610-001)를 serial-mcp로 다룰 때 쓴다 — ESP32 로그·상태, 명령 목록(HELP·MHELP), WiFi 상태(STWIFI), WiFi 송신출력(SETWIFI), 코어 설정(SETCONFIG), bay 설정(SETBAYCONFIG), 등록 MAC(SETREGMAC), 카드 정보(SETCARDINFO), 재부팅·AP모드(RESET·APMODE), 펌웨어 버전(FWVER), 식별(GID·UNITID·MAC·CHANNEL), 코인(COIN), 파일(VFILELST·VFILE). SETWIFI는 SSID/password가 아니라 WiFi TX power 변경이다. firmware/format 계열(DOWNBIN·FORMAT·REFLASHESP·REFLASHSTM)은 실행 금지. 호스트 PC의 WiFi/네트워크 설정에는 쓰지 않는다.
---

# SB-ESP (SmartBay ESP32, serial-mcp)

SB-ESP는 SmartBay의 ESP32(통신·WiFi 담당, STM32와 짝)다. 이 스킬은 SB-ESP **명령의 의미·risk·prompt 동작·검증 신호**를 담는다. 관찰·조작·검증 절차(루프·승인 게이트·interactive prompt·risk gate)는 `serial` 스킬의 `references/ops.md`를 따른다.

- 작업 전 **`references/command-surface.md`를 읽어라** — 의도→명령, critical confusion(SETWIFI≠credential), 명령별 risk, interactive 동작, 검증 신호가 거기 있다.
- runtime HELP(34개)와 AP-mode/telnet HELP(3개) surface가 다르고, boot-menu(D/S/B/R)는 리셋 직후 setup 창 전용이다.

## 자주 혼동되는 것

- **WiFi SSID/코어 설정 변경 = `SETCONFIG`**(R2, interactive). **`SETWIFI`가 아니다** — `SETWIFI`는 WiFi 송신출력(TX power)만 바꾼다(R1).
- firmware/file 파괴 계열(`DOWNBIN`·`CDOWNBIN`·`REMFILE`·`FORMAT`·`WFORMAT`·`REFLASHESP`·`REFLASHSTM`, boot-menu `D`)은 R3 — 자동 실행 금지.
- 호스트 PC의 WiFi/네트워크 설정은 이 스킬 범위 밖이다.
