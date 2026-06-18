---
name: sb-stm
description: SB-STM 보드(SmartBay STM32, v2.34)를 serial-mcp로 다룰 때 쓴다 — STM32 콘솔 로그·상태, 명령 목록(HELP), RFID 게인(SETRFGAIN·VRGCNT·CLRRGCNT), RFID 테스트(RFIDTEST), 카드 동작 모드(TOUCH·INSERT), 기능 조작(OPERFUNCT), 실내 설정 조회(VCFGINDOOR), RS485 표시(VDISPRS485). STM32 콘솔은 ESP↔STM 바이너리 채널과 UART를 공유하므로 빈 줄(리셋)·운영 중 쓰기·문자 유실에 주의한다. ESP↔STM 바이너리 프레임은 일반 text serial 명령이 아니다.
---

# SB-STM (SmartBay STM32, serial-mcp)

SB-STM은 SmartBay의 STM32(카드·요금·디스플레이 담당)다. 이 스킬은 SB-STM **명령의 의미·risk·prompt 동작·검증 신호**를 담는다. 관찰·조작·검증 절차(루프·승인 게이트·interactive prompt·risk gate)는 `serial` 스킬의 `references/ops.md`를 따른다.

- 작업 전 **`references/command-surface.md`를 읽어라** — observed-public vs hidden/source-only 구분, 명령별 risk, prompt 동작, 검증 echo가 거기 있다.
- **HELP에서 관측된 public 명령만 runtime-sendable로 취급한다.** hidden/source-only(콘솔 미노출 명령·ESP↔STM 바이너리 프레임)는 실행하지 않는다.

## 주의

- **빈 줄(blank ENTER) = MCU 리셋** — 빈 줄로 찔러보지 마라(R2급으로 다룬다).
- **echo 검증 필수** — STM32 콘솔이 ESP↔STM 바이너리 채널과 UART를 공유해 문자 유실이 잦다. `Input : <명령>` echo를 송신과 대조하고, `Unknown command`면 재시도한다.
- 운영(과금 동작) 중 콘솔 쓰기는 ESP↔STM 프로토콜 오염 위험이라 피한다(읽기 관찰은 무해).
