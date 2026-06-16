# 계획서: SSM 게이트웨이 명령·인터페이스 아틀라스 — 소스 분석 (Codex 인계용
)
> **이 문서는 자족적(self-contained) 맥락 캡슐이다.** 구현자(Codex)는 대화 맥락 없이 이 문서와 레포만으로 작업을 완수할 수 있어야 한다. 설계 결정은 모두 확정됐다 — 재협의하지 말고, §8 실패 기준에 해당하면 중단하고 보고하라.
>
> **이 작업의 진짜 목적은 "명령 목록 만들기"가 아니다.** 미래에 serial-mcp(읽기/쓰기/리셋)로 SSM을 운용·자동화하는 **스킬과 워크플로우의 재료**를 모으는 것이다. 그래서 단일 명령 표만이 아니라 여러 차원(로그 어휘·리셋 트리거·OTA 생애주기·교차장치 효과·Fault 사전·통신 건강도·설정 모델·토폴로지 등)을 함께 추출한다. 각 산출물에 "→ 쓰임"을 명시해 뒀으니, 그 쓰임을 머리에 두고 깊이를 조절하라.
>
> **이 작업은 길고 무겁다 — 그래도 좋다.** Codex의 GOAL(장시간 자율) 실행을 전제로 설계됐다. 범위가 크다는 이유로 임의 축소하지 말고, 단계(P0→P1→P2)로 완결하며 진행하라.

## 1. 목표

`C:\Users\User\projects\firmware-src\ssm-esp32` 소스(ESP32-S3, 단일 스케치 `SSM_esp32.ino` ~19,243줄)에서 SSM 게이트웨이의 **명령·통신·로그·설정·생애주기 인터페이스를 다각도로 전수 추출**해, `atlas/ssm/`(일부는 `atlas/` 루트) 아래에 아틀라스 YAML + 노트군을 작성한다.

**장비 접근 불필요 — 소스만 읽는다. 어떤 시리얼 포트에도 연결하지 마라.** 실측(observed) 채움은 별도 단계(분석자/사람 입회)에서 한다. 이 작업의 모든 `observed`는 `null`이다.

## 2. 왜 SB 계획서를 그대로 복제하면 안 되는가 (SSM의 다면성)

SB 보드(`atlas/sb-esp`, `atlas/sb-stm`)는 **로컬 시리얼 CLI 하나**가 거의 전부였다. SSM은 **현장 중앙 노드 + ESP-NOW 마스터**(AGENTS.md)라서 표면이 다섯이고, 그 위에서 도는 생애주기·진단 로직이 두껍다:

- **명령 입력 표면 3개**: ① 로컬 시리얼 Debug CLI, ② Web/클라우드(Socket.IO over WSS + HTTP)로 오는 `operationType` 명령, ③ ESP-NOW로 하위장치(SB·APU·APU_C·Repeater·WSCL)와 주고받는 패킷.
- **보고 출력 표면 2개**: ① HTTP 상위 보고(`device.silotek.co.kr`의 /usage·/fault·…), ② 시리얼 로그(`[Proc-*]`, INFO 테이블).
- **그 위의 장기 로직**: OTA 생애주기(11단계 상태머신), 통신 건강도 판정(Inspect), 이벤트 보고 신뢰성(재전송 큐), 카드 충전 큐, 시간/WiFi/네트워크 관리, 그리고 다양한 **자동 리셋 트리거**.

블랙박스 디버깅 스킬이 SSM 로그만 보고 "지금 무슨 일이 일어나는지" 판정하려면 이 표면과 로직의 어휘를 모두 알아야 한다. 그래서 산출물이 SB보다 훨씬 넓다(§5).

**그리고 이 모든 차원에 직교하는 축이 하나 더 있다 — 종단간 흐름.** 위가 "무엇이 있나"(기능별)라면, 실제 디버깅은 "하나의 사건이 `SB-STM ↔ SB-ESP ↔ SSM ↔ WEB` 사슬을 어떻게 타고 흐르나"(흐름별)로 진행된다. 한 증상(예: 카드 태그했는데 충전 안 됨)은 여러 보드·여러 포트에 걸쳐 찍히므로, **정상 흐름의 종단간 시퀀스**(각 홉에서 어느 보드에 어떤 로그가 찍혀야 하는가, 트랜잭션을 잇는 상관 키가 무엇인가)가 없으면 "어느 홉에서 끊겼나"를 판정할 수 없다. 이건 §5의 독립 1급 산출물(`atlas/flows.md`)로 만든다 — 기존 SB atlas와 SSM 분석을 꿰는 **조립도**다.

## 3. 배경·계약

- 아틀라스 스키마·작성 규칙·위험 등급은 `atlas/README.md`가 계약이다 — **먼저 정독하라.** YAML 스키마(`device`/`fw_version`/`source_ref`/`version_skew`/`states`/`commands[]`), 위험 등급 R0~R3, 대화형 블로킹 명령(`prompts` 비면 블로킹 서브상태) 규칙을 그대로 적용한다.
- 참고 선례: `atlas/sb-esp/SB260610-001.yaml`, `atlas/sb-stm/v2.34.yaml`, 두 `notes-source-analysis.md`, `atlas/sb-stm/notes-uart1-sharing.md`(심층 단일주제 노트의 톤 참고).
- **기존 SSM 관찰 기록 `atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md`를 반드시 읽어라** — NoCompany 설정 전파 체인(SSM→SB-ESP→STM)·HTTP 동기화·triage 규칙이 이미 정리돼 있다. 키워드(`CBay[3]`, `NoCompany`, `bayConfigs`, `ReqCBayToSSM`, `Writing file: /Bayconfig.txt`, `Reved BayConfig Info`)는 §5의 여러 노트의 1차 입력이다.
- **`ReadmeSSM.txt`(1,642줄)는 버전별 변경 이력이자 사실상의 도메인 지식 사료다.** OTA 흐름·Fault 코드·HTTP 엔드포인트·라우팅(Plan A/B/C)·Web/Debug 명령·리셋 사유가 한국어로 설명돼 있다. **이것을 1차 사료(길잡이)로 쓰되, 진실은 소스 코드다** — Readme 주장이 실제 분기와 일치하는지 대조하고, 불일치는 noted한다.
- 분석 대상 레포는 **읽기 전용**. `firmware-src/ssm-esp32` 아래 절대 수정 금지.
- 산출물 쓰기 위치는 `silotek-plugin-marketplace\atlas\` 아래만. **git 커밋 금지** — 파일만 남기면 리뷰 후 분석자가 커밋한다.
- `source_ref`: 현재 HEAD `178e29f7e94ab4ba2b1e1e2059e097bb377a2b98`. 형식 `https://github.com/stek747/ssm-esp32.git@<해시>`.

## 4. 검증된 전제 (사전 정찰 좌표, 2026-06-16) — 시작점

라인 번호는 클론 HEAD(178e29f) 기준 **참고 좌표**다. 실제 파일을 읽고 시작하라. SSM은 SB-ESP와 같은 모놀리스 스타일이며 디스패처도 `str == "..."` 비교다.

### 4.0 ⚠️ 비활성 기능 (지도화 제외 — 활성으로 오인 금지)
다음은 `#ifdef`로 컴파일에서 빠진다. **명령/기능으로 지도화하지 말 것.** notes에 "비활성(빌드 제외)"으로 한 줄씩만 남겨라:
- **CAN/TWAI** (`COM_CAN`): `SSM_esp32.h:1` `//#define COM_CAN` 주석. 본문 `#ifdef COM_CAN` L440/456/482/5002~(TWISendData/ACAN). 비활성.
- **MQTT** (`DEFMQTT`): `SSM_esp32.h:68` `//#define DEFMQTT` 주석. 본문 L70~(pubClient/topic/subscribe) L247~318. ReadmeSSM 260204 "MQTT 제거" 확인. 비활성.
- **로컬 WebServer** (`HTTPSERVER`): `SSM_esp32.h:2` `//#define HTTPSERVER` 주석. 본문 `#ifdef HTTPSERVER` L10707~(httpServer 라우트·jquery 등). **단, `WiFi.softAP()`(AP 모드) 자체는 별개로 활성**(§4.12).
- **OLED 디스플레이**: `disDstMac` OLED 표출 코드가 전부 주석(L13044/13219/13270). `Adafruit_GFX` 라이브러리는 `libraries/`에 잔존하나 본문 미사용. 비활성 — 운용 UI로 지도화 금지.
- **RS485 / 추가 HardwareSerial**: SSM 본문에 RS485·`Serial1`/`Serial2` 사용 없음(ESP-NOW/WiFi 기반 통신). SB-STM의 RS485 릴레이보드(`VDISPRS485`)와 혼동하지 마라.

### 4.1 파일·버전·구조
- FW 버전: `SSM_esp32.h:4` `#define FW_VERSION "SSM260525-004"` → 파일명 `atlas/ssm/SSM260525-004.yaml`.
- HW: ESP32-S3, 16MB flash, LittleFS(=SPIFFS alias). 스택: `WiFi`/`HTTPClient`/`SocketIOclient`/`ESP32_NOW`/`SimpleFTPServer`(클라이언트)/`ESP32Ping`/`Update`(OTA)/`ymodem`/`ESP32Time`(rtc).
- 실행 구조: FreeRTOS 2-태스크. `setup()` L19729, `loop()` L21757, 별도 태스크 `main_repeat()` L20615(생성 L20594, 종료 L21342). **시리얼 CLI 입력·HELP는 `main_repeat` 쪽.**
- 저장 파일: `/Security.txt`, `/config.txt`, `/Bayconfig.txt`, `/Event.txt`·`/bkEvent.txt`. 저장소: NVS(`Preferences`, `putString("Jsoncfg")` L90 / `putUChar("Unique")` L107), EEPROM(512B, SSID 256 오프셋), LittleFS.

### 4.2 로컬 시리얼 Debug CLI (명령 입력 ①)
- 디스패처 본체: `void serialCmd(String str)` **L18895** (예: `else if(str == "VRXALLPKTS")` L19068, `RESET`→`ESP.restart()` L18913, `fReset` L18516). 분기 전수가 핵심.
- 입력 수집 + HELP 사이트 **둘**(SB-ESP runtime/AP 이중 구조 유사 — 차이 규명):
  - 사이트 A: HELP(짧) L20250 / HELP(긴) L20255 / Hidden L20264 / THELP L20267 → `serialCmd(strtmp)` L20289.
  - 사이트 B: HELP(긴, STCOMM 포함) L20969 / Hidden L20975 / THELP L20977 → `serialCmd(strtmp)` L20983.
- 노출 명령군(**HELP는 부분집합 — serialCmd 분기 전수가 진실**):
  - 짧: `RESET, REFLASHESP` / 긴: `RESET, REFLASHESP, REFLASH, APMODE, GID, UNITID, SETREGMAC, SETCONFIG, SETBAYCONFIG, STCOMM, …`
  - Hidden: `SETSSMID, VSSMID, CHKMEM, CMPMEM` / THELP(test): `VEXTUNITINFO, BYPASSCMD, VIRWEBCMD, DOWNBINWEB, SKIPDOWNLOAD, ALLREFLASH, VREVBUFF, VRXALLPKTS`
- 버퍼 타임아웃: ReadmeSSM "1분 무입력 시 버퍼 자동삭제". 빈 줄 동작은 소스로 확인(STM처럼 리셋인지).

### 4.3 Web/클라우드 명령 (명령 입력 ②)
- 진입: Socket.IO over WSS(`socketIO`) + HTTP. 수신 JSON `jsonWebSendBuf`.
- 디스패처: `jsonWebSendBuf["operationType"]` 정수 사다리 **L12895~L13310+**. 분기: `SET_CARD`/`COIN_DEVICE`/`APU_TEST`/`VOLUME`/`POWER`/`WASH_START`/`WASH_END`/`OPER_FUNCTION`(+0..9)/`SETBAY_OPERMODE`/`UNIT_PRICE`/`WSRESET`(L15071) 등. **`operationType` enum/#define 정의를 찾아 값↔이름↔동작 전수 매핑.**
- Web 명령은 대개 ESP-NOW `Gubun`으로 변환돼 하위로 나간다(L13021 `jsonWiFiSendBuf["Gubun"]`). §5-A/E/F 연결.

### 4.4 ESP-NOW 하위장치 통신 (명령 입력/출력 ③)
- 수신 콜백: `OnRevFromWiFiByBoardcating(const esp_now_recv_info_t*, const uint8_t* data, int len, void*)` **L4895**. 등록: `ESP_NOW.begin()` L15817, `ESP_NOW.onNewPeer(...)` L15831.
- 수신 링버퍼: `StructRevBuf strRevBuf[REVBUFSIZE=50]`, 쓰기 L3713~3717, 소비 L20847. 수신→파싱→처리 경로 추적.
- 송신/라우팅(ReadmeSSM): INFO 요청, `CHPLAN`(route v1, Plan A/B/C, TTL), `REPRSSI`/`REQRSSI`, OTA piece, `Gubun` 명령. 장치 종류: SSM/SB(ESP+STM)/APU/APU_C/Repeater/WSCL.

### 4.5 HTTP 상위 보고 (보고 출력 ①)
- 공통: `int Http_Proc(String turl, String tbody)` **L2808**(로그 `[Http_Proc]` L2815, POST L2861). 실패 시 `saveEvent()` 재전송.
- 엔드포인트(base `https://device.silotek.co.kr`): `/init`(authCode), `/unitPrice`, `/bayConfig`, `/unitPriceByTypeOfCharge`, `/usage`, `/fault`, `/share`, `/inspect`, `/missingEvents`, `device/<id>/reflash/done`. 바이너리: `binUrl=.../bin/download`, `uploadBinaryFile()` L2722.
- 페이싱: `WaitForHttpPostSlot()`(≥800ms), 응답 코드 해석(ReadmeSSM 251215에 한글 해석 출력).

### 4.6 Fault/에러 코드 (진단 핵심)
- `int Send_FaultCode(macAddress, userID, userTransID, fFaultCode, treason, message, eventTime)` **L3541**.
- 관측 코드: `S0001`(채널변경 L15596), `C0002`(통신 L21139), `C0003`(L21271), `C0005`(HTTP 누적실패), `C0008`(Event 큐 stuck), `ROUTE_EVENT_QUEUE_FAULT_CODE` L6552. **모든 `Send_FaultCode(... "X000Y" ...)`를 grep해 코드↔트리거↔reason 전수화.**
- OTA 거절: `Err. #0`~`#3` L12256~12271 (의미는 ReadmeSSM 260309).

### 4.7 설정·데이터 모델
- `configBay.*` L4078~ : `EndTimeToInform`/`Price1st`/`Price2nd`/**`NoCompany` L4099**(0~65535)/`TempoStopCount`/`TempoStopTime`/`fOperOneTimeTouch`(Touching/Inserting)/`fUseBubble`/`fUseUnder`/… Web `data.bayConfigs.*` 키 ↔ 구조체 필드 ↔ 시리얼 라벨 전수 대조.
- `config.*`(SSID/IP/채널/SSMID 등) 동일. CBay 인덱스↔의미(NoCompany=CBay[3] 등)는 `exploration/2026-06-13` 교차 확인.

### 4.8 로그 시그니처 + INFO 테이블 (보고 출력 ② — 블랙박스 해석 핵심)
- `[Proc-*]`: `[Proc-Erase]` L407 / `[Proc-Err]` L571 / `[Proc-Alarm]` L603 / `[Proc-Clear]` L1389 / `[Proc_WiFiTx]` L2028 / `[Proc-Init]` L2144 / `[Proc-HttpRx]` L2865 … 대부분 `if(fSerial==true)` 게이팅(`SERIAL` 토글 존재 가능성 확인).
- **INFO 장치 현황 테이블**: 시리얼 출력 표 L1212/L1516/L1596/L1675 (컬럼: versionInfo·RSSI·Mac·UseBay·Free·Funct·RateOKCom 등) + INFO JSON L1729/L1740. 현장 전체 장치 상태를 한 화면으로 — 해독 필수.
- SKILL.md 자동식별 `SSM=\[Proc-` 와 일치 확인됨.

### 4.9 OTA 생애주기
- 상태 enum **L1272**: `UP_NCOMM/UP_DOWN/UP_FORMAT/UP_READY/UP_SAVEAPIECE/UP_CHKFILES/UP_MERGE/UP_REFLASH/UP_RESET/UP_INIT/UP_CANCDOWN`. VUPDATE 상태표 L1212~1333.
- SSM 자체 OTA 다운로드 `[OTA] Streaming download finished` L17763, 하위 piece 전송, `InitInfoBufferOfUpdate()`. Web 명령 download/canceldown/reflash/erase. (ReadmeSSM의 최대 주제 — 260227~260525 다수 항목.)

### 4.10 리셋 트리거
- `ESP.restart()` 다수: L262/L11103/L11114(`comeincnt>=2`)/L11313/L11880/L11975/L15773/L15813/L15826/L18913(`RESET` 명령). `fReset` 플래그 L16712/L18516.
- 조건(ReadmeSSM 근거): country 오류(`"01"`→리셋, 251125), HTTP negative 누적, WiFi/setup 실패, 명령. **"SSM이 왜 리셋됐나"의 사전.**

### 4.11 통신 건강도 판정
- `sChkComm[]` L1458~ (`fStateComm`/`bk_fStateComm`, `COMMNORM`/`COMMERR`, "Good"/"Bad"/"Checking" L1469). `fInspectMode`/`timeInspectMode` L505. INFO 사이클·`RateOKCom`(성공률). Debug `STCOMM`, Web `CHKCOMM`.

### 4.12 카드/충전 흐름
- Charge Queue(CuID 기반, MAC-free) L702~ : `AddCharge…`/`FindChargeByCuID` L805/`MatchCuID` L818/`FindChargeByBCuID` L834, `chargeQueue[]`, `HexToDec`. Web `SET_CARD`/`RfControl`, 카드 ID 키 `CuID`/`sCuID`/`sCuID2`(ReadmeSSM 251220). `ResRfCtrl done`(충전 완료 이벤트).

### 4.13 이벤트 보고 신뢰성
- `saveEvent()` L10653 → `/Event.txt`(`EventToSendfilename`) 저장, 실패 시 재전송. 스트리밍 업로드 L2758, `/missingEvents`, `/bkEvent.txt` 백업. **Unique ID 중복방지**: `collectUniqueIDbyMac[]` L5771, `CNTUNIQUEIDSTORE`, `wrUniqueIDBuffcnt` (장치별 보관, ReadmeSSM 260130) — "왜 어떤 패킷은 보고되고 어떤 건 무시되나".

### 4.14 시간·WiFi·네트워크
- 시간: `chgTimeZone()` L18323(선언 L29), country `"KR"` 강제 L8895, NTP, 서머타임(ReadmeSSM 260130/260311). `ESP32Time rtc`.
- WiFi: `WiFi.scanNetworks()` L15140~, 채널변경 감지→`S0001` L15596, 재연결/재스캔, `WiFi.mode` L15582/15649. `STWIFI` L18981.
- AP 모드: `WiFi.softAP()` L10700/L20072, `WIFI_MODE_AP` L20057. (로컬 WebServer는 비활성이나 softAP 진입 자체는 동작.)
- 외부망 확인: `Ping.ping()` L2493~ (google/cloudflare/KT/SK DNS 순).

### 4.15 주변 기능
- **WSCL 제어**: Web `WSRESET` L15071 → `digitalWrite(WSCL_RESET=GPIO12)` Low-active 토글 L15074, 핀 초기화 L19734. (ReadmeSSM 260115.)
- **메모리 진단**: `getFreeHeap`/`getMinFreeHeap` L192~, `CHKMEM`/`CMPMEM`(ReadmeSSM 251130). OTA heap 이슈 다수(ReadmeSSM 260415).
- **FTP 클라이언트**: `ftp.OpenConnection()` L19902, `InitFile`/`ContentList` L19926(활성 — 용도 규명).
- **버전 보고**: `versionInfo`, INFO에 `FW Ver`, 하위 다운로드 버전 `DNFWVER`/`FWVER` L7480~.

### 4.16 종단간 흐름 (★ 사용자 강조 — 진단 조립도)
SSM은 모든 흐름의 교차점이다. 흐름을 잇는 핵심 함수·키:
- **상향 보고**(장치→SSM→WEB): `Send_Operation(...)` **L3601**(인자 다수: usageTime/coincnt/type/remainingPoint/reason/rfid/ResRfCtrl/uniqueNo/cidx/eventTime) → `/usage`. JSON 키 `remainingPoint` L3640·`ResRfCtrl` L3650. 실패 시 `saveEvent`(§4.13).
- **하향 송신**(SSM→하위 ESP-NOW): `sendMessage(String outgoing)` **L32**, 장치별 송신 대기 큐 `WiFiTxWaitMsgArr`/`Cmd_Order_*` L347/389, `Gubun` 코드로 명령 구분.
- **설정 흐름**(WEB→SSM→SB-ESP→STM): SB-ESP가 `jsonWiFiSendBuf["ReqCBayToSSM"]="ALL"` L3001/3032로 요청 → SSM CBay 응답 → SB-ESP `/Bayconfig.txt` → STM `Reved BayConfig Info`(NoCompany 노트의 실측 사슬).
- **카드 충전 왕복**: `EnqueueCharge(rfCard,points,cuID,tsKey,userTransId,targetMac)` **L707** → `Gubun:15` broadcast → 하위 적용 → `ResRfCtrl` 수신 L9279(로그 `[SSM-RfCard] ResRfCtrl RECEIVED` L9285) → `MarkCompleted` L777 → `Gubun:17` clear(L893, 24h 보관).
- **★ 상관 키(correlation key)**: `tsKey`·`userTransId`가 한 트랜잭션을 여러 홉에 걸쳐 잇는다(`FindChargeByTsKey` L846). 블랙박스 추적의 핵심 — "이 카드 태그(tsKey=X)가 어느 홉까지 갔나".
- 흐름 로그 시그니처: `[SSM-RfCard]`(카드), `[Proc_WiFiTx]`(ESP-NOW 송신), `[Http_Proc]`(WEB 보고).

## 5. 산출물 (다각도 — 우선순위)

`atlas/ssm/` 아래(토폴로지만 `atlas/` 루트). **P0 완결 → P1 → P2.** 각 "→ 쓰임"은 미래 스킬/워크플로우 입력.

### P0 (코어 — 블랙박스 운용의 최소 토대)
- **A. 시리얼 명령 아틀라스** `atlas/ssm/SSM260525-004.yaml` — `serialCmd()` 분기 전수 + 두 파서 사이트의 HELP/Hidden/THELP. README 전 필드 + `observed:null`. **교차장치 효과를 effect에 필수 명시**(ESP-NOW/HTTP로 무엇이 나가는지); 가능하면 `targets: [SB,APU,APU_C,Repeater,WSCL,Web,self]` 보조 키. `states`에 운영 모드. → 쓰임: 쓰기/리셋 워크플로우 명령 사전 + 파급 예측.
- **B. 로그 어휘 카탈로그** `atlas/ssm/notes-log-vocabulary.md` — `[Proc-*]`/`[Http_Proc]`/INFO 테이블/부팅 시퀀스(`setup()` 출력 순서, "정상 부팅 완료" 판정)/카테고리별 대표 패턴. `query_serial_logs(pattern=…)` 패턴 사전 형태. 자동식별 시그니처 정밀화. → 쓰임: **블랙박스 디버깅 스킬의 핵심** — 상태 판정·표적 검색·보드 식별.
- **C. notes-source-analysis.md** — 명령 수 카운트·파서 구조·숨은 명령·두 사이트 차이·gap·실패기준 점검 + §4.0 비활성 기능 명시.
- **D. 리셋 트리거 카탈로그** `atlas/ssm/notes-reset-triggers.md` — `ESP.restart()`/`fReset` 각 지점의 조건↔로그신호↔복구. → 쓰임: "SSM이 왜 리셋/재부팅됐나" 진단(현장 최빈 이슈). reset_board 워크플로우의 안전 근거.

### P1 (워크플로우의 폭을 결정)
- **★ E0. 종단간 데이터 흐름 맵** `atlas/flows.md`(루트, 전 device 공유) — 주요 시나리오별로 `SB-STM ↔ SB-ESP ↔ SSM ↔ WEB` 각 홉의 (방향·채널·식별 키/Gubun·관찰 로그 시그니처·어느 보드 포트)를 시퀀스로 명세. 시나리오: ①부팅·등록 ②설정 동기화(하향, NoCompany) ③사용 시작(명령 하향) ④사용 종료·이벤트(상향 /usage) ⑤카드 충전(왕복) ⑥Fault 보고(상향) ⑦OTA(하향+왕복) ⑧통신 점검(왕복) ⑨시간 동기화(하향). 각 흐름에 **상관 키**(tsKey/userTransId/Unique)·정상 완료 시그니처·**홉별 실패 증상**·retry/timeout 명시. **기존 sb-esp/sb-stm atlas의 effect(`Send_configBay`/`Send_SetCoin`/`Reved BayConfig Info` 등)와 SSM쪽 대응(ESP-NOW 수신·`Gubun` 변환·`Send_Operation`)을 양방향으로 연결하라** — 한 홉은 한 atlas의 출력이자 다음 atlas의 입력이다. → 쓰임: **모든 multi-board 디버깅 워크플로우의 조립도**, "증상→어느 홉에서 끊겼나" 판정 기반. P0 로그어휘(B)와 짝(B=개별 로그 의미, E0=로그들의 인과·시퀀스).
- **E. Web/operationType 카탈로그** `notes-web-commands.md` — enum 값↔이름↔동작↔JSON 필드↔Gubun 변환↔위험도. → 로그에서 "상위 명령" 해석.
- **F. ESP-NOW 프로토콜 맵** `notes-espnow-protocol.md` — 수신(L4895) 처리 + 송신(INFO/CHPLAN/Gubun/OTA piece) + 패킷 구조 + 라우팅(Plan A/B/C, REPRSSI) + 장치·MAC 관리. → SSM↔하위 통신 디버깅·파급 지도.
- **G. OTA 생애주기** `notes-ota-lifecycle.md` — 11단계 상태머신(전이도) + SSM 자체/하위 OTA + download/cancel/reflash/erase + 거절 Err#0~3 + VUPDATE 해독. → OTA 진행 모니터링·중단 복구 워크플로우.
- **H. Fault 코드 사전** `notes-fault-codes.md` — `Send_FaultCode` 전수 코드↔트리거↔reason, OTA Err, HTTP 코드 해석. → 자동 진단 워크플로우.
- **I. 설정·데이터 모델** `notes-config-model.md` — `configBay`/`config` 필드 전수(키↔필드↔범위↔라벨), CBay 인덱스, 파일 역할, **전파 체인**(Web→SSM→SB-ESP→STM). → 설정 드리프트 triage.
- **J. 통신 건강도 판정** `notes-comm-health.md` — `sChkComm`/Inspect/INFO 사이클/성공률/STCOMM·CHKCOMM. → "어느 하위장치가 통신 불량인가" 진단.
- **K. 카드/충전 흐름** `notes-card-charge.md` — CuID 충전 큐/RfControl/SET_CARD/카드ID 키 체계/충전 완료 이벤트. → 카드 인식·충전 실패 디버깅.
- **L. 이벤트 보고 신뢰성** `notes-event-reliability.md` — Event.txt 큐/재전송/스트리밍/missingEvents + Unique ID 중복방지. → "보고가 왜 누락/중복되나" 진단.

### P2 (시스템 전체 그림·주변)
- **M. 시간·WiFi·네트워크** `notes-time-network.md` — 타임존/country/NTP/서머타임 + WiFi 스캔·채널변경·재연결·softAP + Ping 외부망. → 연결/시간 이슈 진단.
- **N. 주변 기능** `notes-peripherals.md` — WSCL(GPIO12 리셋)·FTP 클라이언트·메모리/heap 진단·버전 보고. → 보조 제어·자원 이슈.
- **O. 시스템 토폴로지** `atlas/topology.md`(루트, 전 device 공유) — SSM(중앙)↔클라우드(Socket.IO/HTTP)↔하위(ESP-NOW), SB와의 관계, 채널·MAC·포트 지도. **E0(flows.md)가 동적 흐름이라면 O는 그 정적 배경 지도** — 누가 어느 채널로 누구와 연결되는가. SSM이 중심이라 여기서 착수.
- **P. 버전 스큐 / discrepancies** — YAML `version_skew`에 "소스 HEAD SSM260525-004, 배포 장비 버전 미확인(실측 검증 대상)". 불일치 발견 시 `atlas/ssm/discrepancies.md` 생성(README 정의, 아직 어느 device도 미작성).

## 6. 작업 규칙
- 위험 등급(README 표) 적용, 애매하면 더 위험한 쪽 + `risk_reason: "uncertain: …"`. R3 최소: `REFLASH`/`REFLASHESP`/`ALLREFLASH`/`DOWNBINWEB`/OTA erase/FORMAT 계열. `APMODE`/`RESET`/`WSRESET` 등 재부팅·HW 토글은 R2 예상(소스로 확정).
- `effect`에 해석·추측 금지 — 소스가 하는 일만. 불확실하면 `"uncertain: …"`.
- 한 명령이 채널/상태(시리얼 vs Web vs 두 파서 사이트)에 따라 다르면 항목 분리(README).
- 대화형 명령(`prompts` 비지 않음)은 블로킹 서브상태 표기. SETCONFIG/SETBAYCONFIG/SETREGMAC/SETSSMID 등.
- **§4.0 비활성 기능(CAN/MQTT/HTTPSERVER)을 활성 명령으로 지도화하지 마라** — 발견하면 "비활성(빌드 제외)" 한 줄.
- 산출 YAML 파싱 확인(`py` 사용 — `python`은 Store 별칭이라 동작 안 함).
- 산출물 외 파일 생성·수정 금지. 분석 대상 소스 수정 금지.
- **표본화·생략은 명시하라**(특히 B/E/F/G). 무엇을 대표로 뽑고 무엇을 생략했는지 노트에 적어라(silent truncation 금지).

### ★ 산출물 출력·작업 기록 규약 (GOAL 자율 실행 필수)
GOAL은 장시간 자율 실행이라 "결과 파일 경로"만으론 부족하다. 컨텍스트가 끊겨도 재개되고, 사람이 진척을 볼 수 있어야 한다.

**(1) 디렉터리·파일**: device별 산출물은 `atlas/ssm/` 아래, 전 device 공유(flows/topology)는 `atlas/` 루트. `atlas/ssm/`는 이미 존재(`exploration/`만 있음) — **기존 exploration summary는 보존**하고 그 옆에 yaml·notes를 추가한다. 파일명은 §5 명시 그대로, 임의 추가/변경 금지.

**(2) 노트 공통 포맷** (모든 `notes-*.md`): 헤더 = `# 제목` / `Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98` / 분석일(2026-06-16)·FW버전. (SB 선례 `atlas/sb-esp/notes-source-analysis.md` L1~5와 동일 톤.) 본문은 사실만, 추측은 `uncertain: …` 접두, 모든 주장에 소스 근거 `파일:라인` 인용.

**(3) 진행 추적 파일** `atlas/ssm/_PROGRESS.md` — **산출물 하나 완료할 때마다 갱신**. P0/P1/P2 산출물별 체크박스 + 상태(미착수/진행중/완료) + 산출물당 1줄 요약 + 막힌 점. 목적: 컨텍스트 끊겨도 **재개 가능**, 사람이 진척을 한눈에.

**(4) 완료 세션 요약** `atlas/ssm/exploration/2026-06-16-source-analysis/summary.md` — 종료 시 커버리지·생략·불확실 항목·§9 실패기준 점검·`ReadmeSSM` vs 소스 불일치 목록. (SB `exploration/.../summary.md` 톤.) **session.jsonl은 만들지 마라** — 장비 미접근(소스 분석)이라 실측 기록이 없다.

**(5) Open Questions**: uncertain·미검증·후속 필요 항목을 `notes-source-analysis.md` 말미 `## Open Questions` 섹션에 **한곳에 모아라**(여러 노트에 흩뜨리지 말 것).

**(6) 커밋·인계**: **git 커밋 금지** — 파일만 남긴다. 리뷰 후 분석자(사람)가 커밋한다. `_PROGRESS.md`로 상태를 가시화하는 것으로 인계를 갈음. §9 실패기준 해당 시 중단하고 `_PROGRESS.md`에 사유 기록 + 사람 호출.

## 7. 완료 기준
- [ ] `atlas/ssm/SSM260525-004.yaml`: `serialCmd` 분기 수 ≥ HELP/Hidden/THELP 노출 합. 전 항목 `source_ref`·`risk`·`risk_reason`·`observed:null`.
- [ ] 두 파서 사이트 차이 규명. R3에 reflash/OTA/format 포함, 재부팅 계열 R2.
- [ ] P0 4종 완결: A(YAML) + B(로그 어휘, 부팅 시퀀스·INFO 테이블 포함) + C(분석 노트, 비활성 명시) + D(리셋 트리거).
- [ ] P1 9종(E0 + E~L) 작성, 각자 "→ 쓰임" 충족 수준. **`atlas/flows.md`(E0)는 최소 시나리오 ②④⑤(설정·이벤트·카드)를 홉별 로그 시그니처·상관 키(tsKey)까지 명세** — 기존 SB atlas와 교차 연결.
- [ ] P2: 최소 O(topology) 골격 + P(version_skew 기재). M/N은 시간 허용 시.
- [ ] YAML 파싱 통과. `ReadmeSSM.txt` vs 소스 불일치 noted.
- [ ] **작업 메타 산출물**: `atlas/ssm/_PROGRESS.md`(진행 추적, 단계마다 갱신) + `atlas/ssm/exploration/2026-06-16-source-analysis/summary.md`(완료 요약) 작성. Open Questions를 `notes-source-analysis.md`에 모음. 기존 `exploration/2026-06-13-…` 보존.

## 8. 실패 기준 (해당 시 중단·보고 — 임의 우회 금지)
1. 파서 구조가 §4 전제와 근본적으로 다름(`serialCmd` 부재, 문자열 비교가 아닌 방식 등).
2. `operationType`/ESP-NOW 콜백 구조가 전제와 달라 Web/ESP-NOW 차원 추출 불가.
3. 규모가 비정상적으로 커 P0조차 한 세션에 불가 — P0(A/B/C/D)만 완결하고 P1/P2 범위를 보고 후 합의.
4. 분석 대상이 빌드 산출물 등으로 판단됨(원본 `.ino` 부재 등).
