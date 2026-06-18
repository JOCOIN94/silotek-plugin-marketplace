# SB-STM command surface

> SmartBay STM32(v2.34) 운용 증류본. **출처**: `atlas/sb-stm/v2.34.yaml`, `notes-uart1-sharing.md`, `notes-injection-vector.md`, `notes-source-analysis.md`, `exploration/2026-06-12-*`.
> 전체 명령 사전·`source_ref`는 atlas YAML이 단일 진실원이다. 다만 atlas는 plugin payload 밖의 원천 자료이므로, 정상 runtime 작업 중에는 이 command surface에 없는 명령(특히 hidden/source-only)을 임의로 실행하지 않는다 — 필요하면 atlas 보강·skill 재증류 대상으로 보고하고 멈춘다.
> 운용 절차(루프·승인·interactive prompt·redaction·검증)는 `serial` 스킬 `references/ops.md`.

## Board identity

- Device: **SB-STM** (SmartBay STM32, 카드·요금·디스플레이). Firmware basis: **v2.34**. Source: `SB-SmartBay@0b01761`.
- 상태: **실측 일부 검증** — `HELP`·`VRGCNT`·`VCFGINDOOR` observed. version_skew: 배포 빌드 **v2.19**(소스 HEAD v2.34); 2026-06-12 실측에서 HELP 9개 목록은 HEAD와 동일 확인.
- STM32 콘솔(UART, 예 COM12)은 ESP↔STM 바이너리 명령 채널과 **같은 UART1/Rx1 링버퍼를 공유**한다 — 콘솔 쓰기와 ESP 명령이 한 버스에서 경합한다.

## command surface (runtime 조작 표면의 경계)

핵심 구분. **runtime-sendable로 취급하는 것은 실제 HELP 출력에서 관측된 public 명령뿐이다.**

### Observed public command surface (HELP 출력 = runtime-sendable)

실측 HELP(`Defined Command : ...`): `SETRFGAIN` `RFIDTEST` `TOUCH` `INSERT` `OPERFUNCT` `VRGCNT` `CLRRGCNT` `VCFGINDOOR` `VDISPRS485` (+ `HELP`/`???` 자체).

### Hidden / source-only commands (HELP에 없음 — runtime-sendable 아님)

- `TESTALIVE` — 소스의 콘솔 명령이나 HELP 목록에 노출되지 않음(alive-packet toggle).
- HELP에 없거나 runtime sendability가 검증되지 않은 항목은 **brute-force로 찾지 않는다.** 실제 echo/response/안전성 근거가 생기기 전까지 runtime 실행 금지 — 필요하면 atlas 보강·skill 재증류 대상으로 보고하고 멈춘다.

### Internal protocol / non-text surface

ESP↔STM **inter-MCU UART1 바이너리 프레임** `0x60`~`0x77`, `0xEE` — ESP가 STM에 보내는 `[CMD][VAL][0xFB][+payload]` 바이너리 명령. **일반 text serial 명령으로 취급하지 않는다** — `send_serial_command`(UTF-8)로 보낼 수 없는 UART-level 프로토콜이다.

## risk별 명령 (observed-public 기준; 전체·바이너리는 atlas YAML)

- **R0 (조회 — 바로 조회 가능)**: `HELP`/`???` `VRGCNT` `VCFGINDOOR`
- **R1 (저위험·복원 가능 변경 — snapshot·verify)**: `SETRFGAIN`(prompt) `OPERFUNCT`(prompt) `RFIDTEST` `TOUCH` `INSERT` `CLRRGCNT` `VDISPRS485`
- **R2 (재부팅)**: **빈 줄(blank ENTER) = MCU 리셋**(`NVIC_SystemReset`). hidden UART1 `0x60 01`(reset)도 R2.
- **R3 (실행 금지, source-only)**: hidden UART1 `0xEE`(YMODEM 펌웨어 reflash, 브릭 위험).

## interactive 명령 (prompt dialogue — 처리법은 ops.md)

- `SETRFGAIN` — R1. prompt "값(1~8) 입력 또는 Q로 종료". 1~8 입력 시 RFID 게인 변경 후 ESP32에 STMConfig Rfgain 전송.
- `OPERFUNCT` — R1. prompt "값(0~9) 입력 또는 Q". 입력 digit으로 SWVal 비트 설정.
- prompt를 관측하며 한 단계씩 진행한다. Q 종료는 위 prompt가 명시한 명령에서만.

## verification signatures

- 명령 수신 증거 = **echo** `Input : <CMD>`(예 `Input : HELP`, `Input : VRGCNT`). 보낸 명령과 echo를 대조해 문자 유실을 검출한다.
- `HELP` 성공: `Defined Command : SETRFGAIN, RFIDTEST, ...`.
- `VRGCNT`: `< RxRfGain Counter Table >` + gain step(01~08)별 counter.
- `VCFGINDOOR`: `*** configuration Info. for the indoor.` + price/time table.
- 미정의 입력: `Unknown command`.

## 보드 특유 주의 (UART1 공유)

- **빈 줄(blank line) 전송 금지** — 빈 ENTER는 MCU 리셋이다. blank를 "현재값 유지"로 가정하지 말고, 리셋 위험이 있으므로 R2급으로 다룬다.
- **echo 검증 필수** — 콘솔 바이트가 ESP 명령 스캐너(`ChkPacket`)와 UART1을 공유해 **문자가 확률적으로 유실**될 수 있다(보드 루프 상태 의존; 실측 `VCFGINDOOR`→`VFIDOR`). echo가 송신과 다르거나 `Unknown command`면 재시도. 배포 기본 `SERIAL_CHAR_DELAY`=100ms.
- **운영(과금 동작) 중 콘솔 쓰기 회피** — 콘솔 ASCII가 ESP↔STM 프로토콜 트래픽을 오염시킬 수 있다. 읽기 관찰(STM TX 방향)은 무해.
- **UART/internal protocol/source-only frame을 text 명령으로 취급 금지** — `0x60~0x77`/`0xEE`는 ESP 전용 바이너리 채널이며 일반 text serial 명령으로 보낼 수 없다.
- write-like 명령(`SETRFGAIN`/`CLRRGCNT`/`TOUCH`/`INSERT`/`OPERFUNCT` 등)은 `serial` ops.md의 risk gate와 post-action 검증(echo·관련 조회 명령)을 따른다. SB 디버그 어댑터는 한 번에 하나만 연결한다(STM·ESP 동시 연결 시 콘솔 간헐 먹통, 2026-06-12 실측).
