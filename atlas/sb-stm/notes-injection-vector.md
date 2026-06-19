# SB-STM 주입 벡터 — UART1 명령 채널 인척(impersonation) 정밀 포맷

Source basis: `https://github.com/stek747/SB-SmartBay.git@0b017619aed175ae7fdd72af5142f7f6993902c2`

Firmware version: `v2.34` (`smartBay/Core/Src/main.c:31`)
Date: 2026-06-17
조사: Claude (소스 전수 추출). 선행: [`notes-uart1-sharing.md`](notes-uart1-sharing.md) (UART1 공유 확정), [`notes-source-analysis.md`](notes-source-analysis.md).

## Scope

이 노트는 "SB-STM인척 → SB-ESP → SSM → WEB" 주입 가설의 **소스 근거와 정확한 와이어 포맷**을 기록한다. 어느 물리 라인이 어느 파서로 가는지, 어떤 명령을 어떤 바이트열로 조립하는지, 응답을 어떻게 확인하는지를 담는다. 실장비 주입은 아직 수행하지 않았다(포맷은 소스 추출이며 라이브 검증 전).

## 1. 두 층위 모델 — 무엇을 "인척"하는가

주입 목표에 따라 물리 경로가 갈린다. **혼동하면 안 된다.**

| 층위 | 정의 | 물리 경로 | serial-mcp 도달성 |
|---|---|---|---|
| **Tier 1: ESP→STM 명령 채널 인척** | ESP가 STM에 보내는 명령을 흉내 → STM이 진짜로 동작하고 그 결과가 정상 상향 | COM12(SB-STM 콘솔) = STM **USART1/Rx1** (CLI와 ESP 명령이 공유) | **가능** (`send_hex` 추가 시) |
| **Tier 2: STM→ESP 상향 위조** | STM 동작 없이 가짜 이벤트(가짜 카드 UID·금액·사용종료)를 위로 흘림 | STM **USART3 TX → ESP `Serial2` RX(GPIO16)** 라인 (COM12와 **다른 선**) | **불가** (별도 배선 필요) / ESP-NOW 무선 위조는 라디오 영역 |

근거:
- `HAL_UART_RxCpltCallback`에서 **USART1→Rx1Buffer, USART3→Rx3Buffer** (`main.c:3170`-`3188`).
- CLI 파서(`Receive_NoWait_Byte`, `main.c:2255`)와 ESP 명령 파서 `ChkPacket()`(`main.c:8062`)이 **둘 다 Rx1(USART1)을 소비** → COM12 쓰기가 ESP 명령과 같은 버스에 실림 ([`notes-uart1-sharing.md`](notes-uart1-sharing.md) §1·§3, 가설 확정).
- STM 상향은 `Send_MsgToESP32`/`Send_String3`가 **USART3 TX**로 JSON `{...}\n` 송신. ESP는 `Serial2`(GPIO16 RX, `SB_ESP32.ino:15573`)로 수신.

> **SB-ESP 콘솔(COM13/Serial0)은 주입점이 아니다** — 콘솔 버퍼와 STM 파이프라인이 분리돼 ESP 송신 경로로 흘러들지 않음(SB-ESP 소스 확인). **COM12가 유일한 시리얼 주입점.**

## 2. 프레임 문법 (Tier 1, `ChkPacket()` `main.c:7856`)

스캐너는 Rx1에 **3바이트 이상** 쌓이면 동작(`main.c:7875`-`7883`). 분기 우선순위:

1. `buf[0]==0xFF` → 1바이트 핑, `0xFF` 에코 (`main.c:7865`)
2. `buf[0..1]==0xFA,0xFA` → 롱프레임 `[FA FA][CMD][LenH][LenL][Data..][chksum][FB]`, 체크섬=단순합(CMD+Len+Data) (`main.c:7887~`)
3. `buf[0]==0x02(STX)` → 카메라 호환 프레임 (`main.c:7977~`)
4. `buf[2]==0xFB` → **3바이트 표준 프레임 `[CMD][VAL][0xFB]`**, 체크섬 없음, `fChannel=true` 설정 후 반환 (`main.c:8060`-`8101`)

명령군 `0x60~0x77`,`0xEE`는 `0xFF/0xFA/0x02`와 겹치지 않아 항상 3바이트 경로로 진입한다.

### 후속 페이로드 읽기 — `RecieveData()` (`main.c:8368`)

`[CMD][VAL][0xFB]` 처리 후 `Command_Proc()`가 추가 바이트를 `RecieveData()`로 읽는다:
- **같은 UART(fChannel에 따라 Rx1/Rx3)에서 1바이트씩, 바이트당 200ms 타임아웃.** 반환 0=성공, 1=타임아웃.
- 페이로드에 **프레이밍·체크섬·종결자 없음.** 호출 측이 정해진 개수만 순차로 읽음.
- **멀티바이트 정수 = 빅엔디안(MSB first)** — 호출부가 `Dat<<24 | Dat<<16 | Dat<<8 | Dat` 식으로 조립.

## 3. 명령별 정확한 와이어 포맷 (`Command_Proc()` switch `main.c:8607~`)

외부 HW 불필요 = 실카드/리더 없이 주입만으로 효과·상향이 나는 명령.

| CMD | 위치 | VAL 의미 | 추가 페이로드 | 예시 hex | 상향/응답 | 외부HW |
|---|---|---|---|---|---|---|
| `0x60` | 8657 | 0=Hold,1=**Reset**,2=Run,3=Update | 없음 | `60 02 FB` | ack | ✕ |
| `0x64` | 8758 | — | 단가정보 다수(`RecieveData`×6+) | (대형) | ack | ✕ |
| `0x65` | 8793 | — | 베이설정 14~20B(EndTime,price,NoCompany,MasterCard…) | (대형) | ack | ✕ |
| `0x66` | 8966 | 1=프리모드ON,2=OFF | **4B BE** WebAmount(u2≠0이면 항상 읽음) | `66 01 FB 00 00 09 C4` (ON,2500) | ack | ✕ |
| `0x67` | 9298 | ≠0 | 없음 | `67 01 FB` | **`{"state":N}` 상향** | ✕ |
| `0x68` | 9305 | ≠0 | **4B BE** 코인수 | `68 01 FB 00 00 00 0A` (+10) | ack | ✕ |
| `0x69` | 9327 | ≠0 | 2B BE len(==4)+4B BE WebUserID | — | ack | ✕(미사용) |
| `0x6A` | 9357 | ≠0 | 없음 | `6A 01 FB` | **`{"UnitID":..}` 상향**+ack | ✕ |
| `0x6B` | 9365 | 0=stop,1=start | **2B BE** AutoTestCnt | `6B 01 FB 00 64` (100) | ack | ✕ |
| `0x6C` | 9379 | — | 없음 | `6C 01 FB` | **`{"FWVer":..}` 상향**+ack | ✕ |
| `0x6D` | 9385 | 1=관리모드,0=해제 | 없음 | `6D 01 FB` | ack | ✕ |
| `0x6E` | 9455 | — | 1B Rfgain(1~8) | `6E 01 FB 04` | ack | ✕ |
| `0x6F` | 9480 | 길이 | (VAL+1)B ESP32 버전문자열 | — | ack | ✕ |
| `0x70` | 9497 | 버튼ID 0~10 | 없음 | `70 03 FB` | ack (`SWVal\|=1<<VAL`) | ✕ |
| `0x71` | 9506 | 기능 0~6 | **3B 부호**(timeAPP,CARD,COIN; int8 2의보수) | `71 00 FB 0A F6 00` (+10,−10,0) | ack | ✕ |
| `0x72` | 9537 | 1~9 카드제어 | 4B BE 포인트+1B lenCuID+CuID[len] | — | `ResRfCtrl`+`Amnt` 상향 | ✅카드 |
| `0x73` | 9848 | — | cardInfo 구조 다수 | — | ack | ✅ |
| `0x74` | 9953 | — | 실내/외 모드설정 다수 | — | ack | ✕ |
| `0x75` | 10122 | 1=강제정지,2=코인클리어 | 없음 | `75 01 FB` | ack | ✕* |
| `0x76` | 10188 | 1=적용 | **2B BE** 추가시간 | `76 01 FB 00 3C` (+60) | ack | ✕* |
| `0x77` | 10211 | 1=적용 | **2B BE** TimeStep(60~65535) | `77 01 FB 01 2C` (300s) | ack | ✕* |
| `0xEE` | 10240 | — | **이후 YMODEM 스트림** | `EE 01 FB`→YMODEM | ack→리셋 | ⚠️펌웨어 |

\* `0x75/0x76/0x77`: 프레임·페이로드는 무조건 소비되나 실제 효과는 내부 상태조건 충족 시에만 발동(예 `0x75 1`=`ChargedMoney && fBasePrice`, `0x76 1`=실내 앱모드 동작 중 `workingTime>=2`). 미충족 시 ack는 정상이나 동작 스킵(소스에 사유 printf).

## 4. 응답(ack) 의미 — COM12로 되돌아옴

COM12(UART1) 주입은 `fChannel=true` → 응답이 **같은 COM12로** 송신(`ok_return`/`unknown_return`/`fail_return` `main.c:7760`-`7806`):

| 응답 | 바이트 | 의미 |
|---|---|---|
| 정상 | `[CMD][VAL][0xFB]` (예 `66 01 FB`) | 프레임 수용·처리 |
| 미정의 명령 | `E2 00 FB` | unknown |
| 실패 | `FF FF FF` | fail |

주입 직후 raw로 ack를 받으면 STM 수용 확정 신호. (텍스트 아님 — `send_hex` 응답은 raw tee/hex로 확인.)

## 5. `0x67` 상태 비트맵 (`sendStateOfStm32()` `main.c:8390`-`8406`)

`{"state":N}` 상향(USART3→ESP→SSM→WEB). 비트:
- `bit0` fReboot, `bit1` fCoinInToSend, `bit2` fCardTouched, `bit3` fCardInserting, `bit4` fFree.

## 6. 특수 명령

- **`0x72`(카드)**: 게이트 복잡(`main.c:9547`). `u2=2`(ADD)/`u2=7`(SUB)는 "armed" 경로(다음 카드터치까지 대기), 나머지(1,3,4,5,6,8)는 엄격조건(`fManageMode==false && fFree==false && fuseBay==false && fCtrlCardOnline==false && fCardInit==false`). 페이로드=`set_Points`(4B BE)+`lenCuID`(1B)+`CuID[len]`. **실카드가 리더에 있어야** 유의미한 `ResRfCtrl`/`Amnt` 상향. SSM `Gubun:17` clear는 SB가 `0x72 u2=9`로 STM에 하달([`../ssm/notes-card-charge.md`](../ssm/notes-card-charge.md) 표).
- **`0xEE`(펌웨어)**: `ok_return`→Rx1/Rx3 카운터 리셋→500ms→`SerialDownload()`(YMODEM, `download.c:35`/`ymodem.c:335`, 'C'/SOH·STX 패킷·CRC16)→`NVIC_SystemReset`(`main.c:10240`-`10258`). 실사용엔 주입기 YMODEM 송신 필요, 실패 시 STM 브릭 위험.
- **빈 줄 = `NVIC_SystemReset`**: 콘솔 빈 엔터는 리셋 분기(`main.c:18165`, `Send_Alive(256)`→`Reset.`→100ms→리셋). 주입 시 빈 줄 금지.

## 7. serial-mcp 갭 — `send_hex` 필요

현재 `send_serial_command`는 **UTF-8 텍스트+EOL 4종만** 전송(`serial-mcp-server/src/serial_mcp/server.py:1056`, `(command+eol).encode("utf-8")`). `0xFB/0xEE/0xFA`는 UTF-8로 깨져 **프레임을 물리적으로 못 보냄.** 기존 hex/binary/replay 기능 전무.

추가안:
- **`send_hex`** (Tier 1 활성화): `bytes.fromhex()` → 기존 `mon.reader.write()` 재사용, `_confirm_write()` 게이팅 재사용 (~30줄, `server.py`). char_delay는 기존 `write()`가 1바이트씩 적용.
- **capture/replay**(REW): `SerialReader._ingest/write`에 캡처 훅 + `frame_capture.py`(신규) + `replay_frames` 도구. 실제 ESP→STM 프레임을 학습·재생용.

## 8. 운영 규칙·주의 (적용 전까지)

1. **빅엔디안 고정**, 모든 4B/2B 값 MSB 먼저.
2. **char-delay(배포 기본 100ms) < `RecieveData` 타임아웃(200ms)** → 7바이트 연속 전송 OK. 프레임~첫 페이로드 간격도 200ms 내.
3. **3바이트 경로 무체크섬** → 조용한 창에선 클린 주입이 잘 먹으나, **운영 중엔 ESP 명령과 USART1 경합**으로 바이트 섞임·실트래픽 오염(=[`notes-uart1-sharing.md`](notes-uart1-sharing.md) §4 역방향 위험). 운영 중 주입 피할 것.
4. **파괴적 명령 분리**: `60 01`(Reset)·`EE`(펌웨어)·빈 줄(리셋)은 시험 화이트리스트에서 격리.
5. **안전한 1차 검증 순서**: `67 01 FB`(상태질의)→`{"state":N}`가 SSM/WEB까지 오는지 확인 → 이후 `70`(버튼)·`66`(프리모드+금액)으로 확대.

## 9. 보안 함의 (소유자 관점)

체인 전체에 **암호학적 인증 부재**: 3바이트 프레임 무체크섬, 롱프레임 단순합, ESP-NOW는 `cHidden` XOR 난독화+MAC/UnID 신원+`Unique` 중복제거뿐([`../ssm/notes-espnow-protocol.md`](../ssm/notes-espnow-protocol.md)). 시험 주입의 용이함 = 동일한 실제 위협 표면. 차기 리비전에서 명령 프레임 인증/시퀀스 검증 고려 가치.

## Open Questions / Caveats

- 실장비 주입 미수행 — 포맷은 소스 추출. 라이브 검증(특히 멀티바이트 명령의 char-delay 타이밍, ack raw 회수)이 선행돼야 한다.
- ESP↔STM ack(`0xEF 0x01 0xFB`) 라인의 정확한 배선은 미확정([`notes-uart1-sharing.md`](notes-uart1-sharing.md) §4). Tier 1/2 결론은 이에 의존하지 않음.
- Tier 2(상향 위조)의 물리 탭 지점(STM USART3 TX/ESP GPIO16)과 ESP-NOW 무선 위조(필요값 `cHidden`+등록 MAC)는 별도 조사 대상.
