# Multi-Board Diagnostic Flows

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Additional basis: SB atlas `https://github.com/stek747/SB-SmartBay.git@0b017619aed175ae7fdd72af5142f7f6993902c2`

Date: 2026-06-16
FW version: SSM260525-004

## Purpose

This file is the cross-device assembly map for `SB-STM <-> SB-ESP <-> SSM <-> WEB`. Individual atlas entries explain single-board commands; this map explains how one event crosses hops, which logs should appear at each hop, and which key ties the hops together.

## Shared Channels And Keys

| Hop | Channel | Primary keys | Source/log anchors |
|---|---|---|---|
| WEB -> SSM | Socket.IO/Web JSON and HTTP responses | `operationType`, `reqId`, `userTransId`, `deviceId`, `mac` | Web dispatch reads `jsonWebSendBuf["operationType"]` (`SSM_esp32.ino:12899` and following); HTTP uses `Http_Proc()` (`SSM_esp32.ino:2808`) |
| SSM -> WEB | HTTP POST and Socket.IO response | `/usage`, `/fault`, `/inspect`, `/missingEvents`, `reqId`, `uniqueNo`, `cidx` | `Send_Operation()` posts `/usage` (`SSM_esp32.ino:3601`, `SSM_esp32.ino:3706`); `Send_FaultCode()` posts `/fault` (`SSM_esp32.ino:3541`, `SSM_esp32.ino:3596`) |
| SSM <-> SB-ESP/APU/APU_C/Repeater | ESP-NOW JSON/binary | `Mac`, `UnID`, `Ssn`, `Gubun`, `tsKey`, `Unique`, route `Rt` | ESP-NOW callback `OnRevFromWiFiByBoardcating()` (`SSM_esp32.ino:4895`); JSON send `sendMessage(String)` (`SSM_esp32.ino:5316`) |
| SB-ESP <-> SB-STM | SB-local UART/board protocol | SB atlas command effects, STM runtime logs | SB `SETBAYCONFIG` calls `Send_configBay()` after saving (`atlas/sb-esp/SB260610-001.yaml:405` through `atlas/sb-esp/SB260610-001.yaml:413`); STM config receipt is tracked by `Reved BayConfig Info` in SSM NoCompany note (`atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:19` through `atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:27`) |

## 1. Boot And Registration

Sequence:

| Step | Hop | Expected signature | Failure symptom |
|---|---|---|---|
| 1 | SSM local boot | `FW Ver:SSM260525-004`, PSRAM/SRAM checks, `Mounting FS...`, `>>> Setup completed <<<` | Banner without setup completion suggests AP-mode/setup/WiFi/file-system blocking (`atlas/ssm/notes-log-vocabulary.md`) |
| 2 | SSM -> WEB `/init` | `Req_Init()` calls `Http_Proc("https://device.silotek.co.kr/init")` | `[Proc-Err] HTTP begin failed!`, negative `[Proc-HttpRx]` code, or saved event (`SSM_esp32.ino:3133` through `SSM_esp32.ino:3144`) |
| 3 | WEB -> SSM device list | `/init` response `data.devices` is stored by `SaveUnitMac()` | `[Proc-Err] SaveUnitMac-Error`; lower-device INFO table remains empty (`SSM_esp32.ino:2940` through `SSM_esp32.ino:2955`) |
| 4 | SSM -> lower devices | INFO request over ESP-NOW | `[Proc_WiFiTx] Ask Info :` (`SSM_esp32.ino:2028`) |
| 5 | lower devices -> SSM | INFO response over ESP-NOW | `[Proc-WiFiRx] From Mac.` and INFO table rows (`SSM_esp32.ino:4936`, `SSM_esp32.ino:1494`) |

Correlation keys: device MAC, UnitID, `deviceIDUsingWeb`.

## 2. Configuration Sync Downward (NoCompany / BayConfig)

This is the proven chain for `NoCompany` and other `CBay` fields.

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | WEB/backend -> SSM | `/bayConfig` HTTP response contains `data.bayConfigs` | `bayConfigs.NoCompany` | If value differs from desired local value, upstream is the truth source; do not keep repeating local `SETBAYCONFIG` (`atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:31` through `atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:44`) |
| 2 | SSM local parse | `ChkBayConfig()` maps `bayConfigs.NoCompany` to `configBay.NoCompany` | `NoCompany` | `NoCompany is out of range.` or `ChkBayConfig-Error` (`SSM_esp32.ino:4075` through `SSM_esp32.ino:4102`; `SSM_esp32.ino:3015` through `SSM_esp32.ino:3024`) |
| 3 | SSM local persist | `saveBayConfig()` writes `/Bayconfig.txt` after `Writing config values...` | `CBay[3]` | Local file is correct only until next upstream sync if Web value differs (`SSM_esp32.ino:3029` through `SSM_esp32.ino:3030`) |
| 4 | SSM -> SB-ESP | SSM sends `ReqCBayToSSM:"ALL"` by ESP-NOW | `ReqCBayToSSM` | Missing `[Proc_WiFiTx] Req-BayConfig :` means lower devices may not request/apply updated CBay (`SSM_esp32.ino:3032` through `SSM_esp32.ino:3040`; `SSM_esp32.ino:14815` through `SSM_esp32.ino:14823`) |
| 5 | SB-ESP -> SSM request/SSM response | SB request reaches SSM as `RCBay`; SSM replies with `CBay[]` | `CBay[3] = NoCompany` | `CBay[3]` mismatch proves SSM config mismatch before STM is involved (`SSM_esp32.ino:8026` through `SSM_esp32.ino:8057`) |
| 6 | SB-ESP local persist | SB-ESP accepts `CBay[...]` and writes `/Bayconfig.txt` | `CBay[...]` | Prior note observed SSM `CBay[15,3000,1000,47,...]` then SB writes `/Bayconfig.txt` (`atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:24` through `atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:26`) |
| 7 | SB-ESP -> SB-STM | SB `SETBAYCONFIG` local path eventually calls `Send_configBay()` | STM config payload | STM does not print `Reved BayConfig Info`; check SB-ESP-to-STM link (`atlas/sb-esp/SB260610-001.yaml:405` through `atlas/sb-esp/SB260610-001.yaml:413`) |
| 8 | SB-STM runtime | `Reved BayConfig Info` prints `NoCompany:<value>` | `NoCompany` | If STM value differs from SSM/SB-ESP CBay, fault is after SB-ESP receives config (`atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:19` through `atlas/ssm/exploration/2026-06-13-nocompany-truth-source/summary.md:27`) |

Normal completion signature: SSM `bayConfigs.NoCompany` equals desired value, SSM responds with matching `CBay[3]`, SB-ESP writes `/Bayconfig.txt`, STM prints matching `Reved BayConfig Info`.

## 3. Use Start Downward

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | WEB -> SSM | `operationType == WASH_START` | `userTransId` | Web command missing or rejected before SSM dispatch (`SSM_esp32.ino:13109`) |
| 2 | SSM -> lower device | SSM maps command into ESP-NOW JSON; `tsKey` is copied from `userTransId` | `tsKey` | No `[Proc_WiFiTx]` or no write to command buffer means command did not leave SSM (`SSM_esp32.ino:13114` through `SSM_esp32.ino:13189`) |
| 3 | lower device -> SSM | response with `Stat`, use/order fields | `Ssn`, `tsKey` | SSM may suppress duplicate/late response depending on pending Tx buffer (`SSM_esp32.ino:8819` through `SSM_esp32.ino:8900`) |
| 4 | SSM -> WEB | `Send_Operation(... Started ...)` posts `/usage` | `userTransId`/`tsKey` | `[Proc-Err] Send_Operation(Started...)` or Event.txt save path (`SSM_esp32.ino:8752` through `SSM_esp32.ino:8784`) |

Normal completion signature: Web `WASH_START` -> SSM `[Proc_WiFiTx]` with `Gubun`/`tsKey` -> lower-device `Stat`/operation response -> `/usage` post.

## 4. Use End And Event Upward

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | SB-STM/SB-ESP -> SSM | Lower device reports end/usage over ESP-NOW | `Unique`, `tsKey`, `Mac`, `UnID` | `[Proc-WiFiRxErr]` or duplicate Unique discard (`SSM_esp32.ino:5800`, `SSM_esp32.ino:5804`) |
| 2 | SSM duplicate check | UniqueID buffer registers or rejects event | `Unique` | `Duplicate UniqueID. - Throw away.` means SSM intentionally suppresses repeat (`SSM_esp32.ino:5780` through `SSM_esp32.ino:5804`) |
| 3 | SSM -> WEB `/usage` | `Send_Operation()` builds JSON with usage fields and posts `/usage` | `uniqueNo`, `cidx`, `userTransId` | `[Proc-Err] Send_Operation(End...)` or saved Event.txt on busy HTTP (`SSM_esp32.ino:3601` through `SSM_esp32.ino:3706`; `SSM_esp32.ino:3688`) |
| 4 | SSM retry queue | `saveEvent()` adds `UTC` and `URL`, then appends to Event.txt | `URL`, `UTC` | Event is not lost, but Web may not see it until resend (`SSM_esp32.ino:10653` through `SSM_esp32.ino:10695`) |
| 5 | route ACK | For routed SB event packets, SSM sends route ACK and duplicate cache protects `/usage` from repeats | route `srcToken`, `packetId` | `[Route] Duplicate routed event skipped` or ACK replay indicates duplicate route delivery (`SSM_esp32.ino:6788` through `SSM_esp32.ino:6856`; `SSM_esp32.ino:7190` through `SSM_esp32.ino:7193`) |

Normal completion signature: one lower event produces one `/usage` success or one Event.txt queued record, and duplicate route/Unique logs explain repeats.

## 5. Card Charge Round Trip

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | WEB -> SSM | `operationType == SET_CARD` | `userTransId`, `CuID`, `rfCard`, `points` | `points=0` skips target-MAC SET_CARD (`SSM_esp32.ino:13481` through `SSM_esp32.ino:13519`) |
| 2 | MAC-free path | SSM queues charge with `EnqueueCharge()` | `CuID`, `tsKey`, `userTransId` | Missing `[SSM-RfCard] SET_CARD(no MAC)` or no queue slot means no pending charge (`SSM_esp32.ino:12903`; `SSM_esp32.ino:707` through `SSM_esp32.ino:749`) |
| 3 | SSM -> SB-ESP | SSM sends `Gubun:15`, `rfCard`, `points`, `uID`, `tsKey`, `CuID` | `Gubun=15`, `tsKey`, `CuID` | Repeated pushes every INFO cycle were intentionally removed for target-MAC path; MAC-free queue can still push pending charges (`SSM_esp32.ino:13538` through `SSM_esp32.ino:13554`) |
| 4 | SB-ESP/SB-STM card application | SB applies card operation locally | SB/STM card state | Check SB-ESP/STM serial logs if SSM sent `Gubun:15` but no completion returns |
| 5 | SB-ESP -> SSM | `ResRfCtrl` returns with `tsKey` and amount | `ResRfCtrl`, `tsKey`, `Amnt` | Missing `ResRfCtrl RECEIVED` means completion did not return to SSM (`SSM_esp32.ino:9279` through `SSM_esp32.ino:9285`) |
| 6 | SSM -> WEB | `Send_Operation()` includes `ResRfCtrl` in `/usage` | `ResRfCtrl`, `userTransId`/`tsKey` | `[Proc-Err] Send_Operation2(...)` or Event.txt save path (`SSM_esp32.ino:3648` through `SSM_esp32.ino:3652`) |
| 7 | SSM -> SB clear | DONE/canceled/failed broadcasts `Gubun:17` clear | `CuID`, `tsKey` | `[ChargeQ-CLR]` logs show whether clear was matched to queue or fallback-broadcasted (`SSM_esp32.ino:9357` through `SSM_esp32.ino:9388`) |

Normal completion signature: Web `SET_CARD` -> SSM `[SSM-RfCard] SET_CARD...` -> SB `Gubun:15` -> SSM `[SSM-RfCard] ResRfCtrl RECEIVED` -> `/usage` with `ResRfCtrl` -> `Gubun:17` clear.

## 6. Fault Report Upward

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | lower device or SSM detects fault | `uFault`, route queue fault, comm state, HTTP negative, channel change | fault code | fault-specific logs in `notes-fault-codes.md` |
| 2 | SSM -> WEB `/fault` | `Send_FaultCode()` builds payload and calls `/fault` | `faultCode`, `reason`, `message` | `[Proc-Err] Send_FaultCode(...)` or saved Event.txt (`SSM_esp32.ino:3541` through `SSM_esp32.ino:3596`) |
| 3 | Retry/duplicate handling | Event queue saves failed fault; route duplicate cache suppresses repeated routed event | `Unique`, route `packetId` | repeated fault may be active state, duplicate routed event, or saved retry |

Normal completion signature: `faultCode` posted once with `reason:true` or clear with `reason:false`.

## 7. OTA Downward And Round Trip

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | WEB/serial -> SSM | download/canceldown/reflash/erase or serial `DOWNBINWEB`/`REFLASH` | target mask, `deviceId`/MAC | SSM rejects if busy or target not ready; see `notes-ota-lifecycle.md` |
| 2 | SSM own download | `[OTA] HTTP download attempt`, `[OTA] Streaming download finished...` | downloaded file/version | HTTP negative or invalid image prevents later target stages (`SSM_esp32.ino:17583`, `SSM_esp32.ino:17763`) |
| 3 | SSM -> lower devices | INIT/FORMAT/READY, then piece transfer over ESP-NOW binary | `procStep`, `NoPiece`, target type | `[Proc-WiFiRx] Req. a piece of the file` indicates lower device is requesting pieces (`SSM_esp32.ino:8456`) |
| 4 | lower devices -> SSM | update state reports fill `resultUpdate` | `UP_*`, `RepData` | VUPDATE shows `step`, `err`, `result`, `ProgressDown` (`SSM_esp32.ino:1195` through `SSM_esp32.ino:1272`) |
| 5 | SSM -> WEB | download/reflash done endpoints | `done:true/false` | `/device/<id>/download/done` and `/reflash/done` paths (`SSM_esp32.ino:3369`, `SSM_esp32.ino:3424`) |

Normal completion signature: Web/serial target accepted -> `[OTA]` download complete -> lower-device piece requests -> VUPDATE success -> done report.

## 8. Communication Check Round Trip

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | Web or serial starts inspect | Web `INSPECTION_MODE` or serial `REQSTCOMM` | count | If inspect/fault/OTA active, SSM returns/prints busy state (`SSM_esp32.ino:13613` through `SSM_esp32.ino:13648`; `SSM_esp32.ino:19586` through `SSM_esp32.ino:19615`) |
| 2 | SSM -> lower devices | request INFO/check packets | MAC/UnitID | lower devices absent from INFO table or marked offline |
| 3 | lower devices -> SSM | responses update `sChkComm` and INFO counters | `cntRev`, `cntReq`, taken time | `STCOMM` prints `Checking`, `Good`, or `Bad` (`SSM_esp32.ino:1454` through `SSM_esp32.ino:1469`) |
| 4 | SSM -> WEB `/inspect` | `Send_InspectResult()` posts per-device rate/timing | `Inspect[pos]` | `/inspect` HTTP failure or queued event (`SSM_esp32.ino:3197` through `SSM_esp32.ino:3273`) |

Normal completion signature: `STCOMM` good/bad state and `/inspect` post agree on the same target MAC.

## 9. Time Sync Downward

| Step | Hop | Expected signature | Key | Failure symptom |
|---|---|---|---|---|
| 1 | SSM time setup | country/timezone code sets `KR` and `chgTimeZone("KR")` | country code | Historical Readme country `"01"` reset loop is now mitigated by forcing KR in live source (`SSM_esp32.ino:18509` through `SSM_esp32.ino:18520`; `ReadmeSSM.txt:620` through `ReadmeSSM.txt:626`) |
| 2 | SSM -> lower device | time fields are included in operation/info payloads where applicable | UTC/delta time | Readme says SB event DT is restored to UTC before Web report (`ReadmeSSM.txt:32` through `ReadmeSSM.txt:34`) |
| 3 | SSM -> WEB retry queue | `saveEvent()` adds UTC to queued payloads | `UTC` | Missing UTC in Event.txt would be a saveEvent bug; source adds it if absent (`SSM_esp32.ino:10664` through `SSM_esp32.ino:10690`) |

Normal completion signature: queued/reported events contain UTC or restored event time, and country/timezone logs do not show the old `"01"` reset loop.
