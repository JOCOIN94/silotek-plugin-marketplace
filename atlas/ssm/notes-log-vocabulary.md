# SSM Log Vocabulary

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope And Use

This note catalogs source-backed log signatures for black-box serial triage. It is not an exhaustive dump of every `Serial.print`; representative patterns are grouped by diagnostic use, and broad families are called out explicitly so later workflows can query by prefix.

Primary board-identification signature:

```text
query_serial_logs(pattern="FW Ver:SSM")
query_serial_logs(pattern="\\[Proc-")
query_serial_logs(pattern="\\[Proc_")
query_serial_logs(pattern="\\[SSM-RfCard\\]")
query_serial_logs(pattern="\\[OTA\\]")
```

The setup banner prints `FW Ver:` plus `versionInfo`, then ends with `>>> Setup completed <<<`; these two patterns identify an SSM boot and a completed setup path (`SSM_esp32.ino:19744`, `SSM_esp32.ino:20606`).

## Boot Sequence

Expected early boot markers, in source order:

| Pattern | Meaning | Source |
|---|---|---|
| `FW Ver:SSM260525-004` | Firmware/version banner from `versionInfo`. | `SSM_esp32.ino:19744`; `SSM_esp32.h:4` |
| `>> PSRAM...` | PSRAM measurement block starts. | `SSM_esp32.ino:19749` |
| `>> Check the SRAM...` | Heap/SRAM measurement block starts. | `SSM_esp32.ino:19771` |
| `*** Start APmode` | EEPROM flag caused AP-mode setup path. | `SSM_esp32.ino:19788` |
| `[Proc-Err] Chk a saved channel number - Err.` | Saved WiFi channel check failed. | `SSM_esp32.ino:19826` |
| `[Proc-Alarm] A saved channel number :` | Saved channel accepted and printed. | `SSM_esp32.ino:19840` |
| `My MAC:` | SSM MAC address printed. | `SSM_esp32.ino:19865` |
| `Mounting FS...` | LittleFS/SPIFFS mount phase. | `SSM_esp32.ino:19869` |
| `[Proc-Err] SPIFFS Mount Failed` | File-system mount failure. | `SSM_esp32.ino:19872` |
| `*** Connecting to the AP mode.` | AP-mode connection path starts. | `SSM_esp32.ino:20056` |
| `[Begin] FTP Server` | FTP server starts in AP-mode setup path. | `SSM_esp32.ino:20094` |
| `[Begin] Telnet Server` | Telnet server starts in AP-mode setup path. | `SSM_esp32.ino:20098` |
| `>>> Setup completed <<<` | Setup completed and main task can run. | `SSM_esp32.ino:20606` |

Normal boot completion for automation should require both `FW Ver:SSM...` and `>>> Setup completed <<<`; a banner without completion may still be inside AP-mode setup, WiFi/file-system setup, OTA cleanup, or another blocking setup branch.

## Serial Command Help Logs

The AP-mode/telnet parser prints a short help (`RESET, REFLASHESP`), a long `MHELP`, hidden `HHELP`, and test `THELP` (`SSM_esp32.ino:20248`, `SSM_esp32.ino:20253`, `SSM_esp32.ino:20262`, `SSM_esp32.ino:20267`).

The runtime parser prints a long `HELP`, hidden `HHELP`, and test `THELP` directly in `main_repeat()` (`SSM_esp32.ino:20967`, `SSM_esp32.ino:20973`, `SSM_esp32.ino:20977`).

Useful queries:

```text
query_serial_logs(pattern=" - Command : RESET, REFLASHESP")
query_serial_logs(pattern="Hidden Command : SETSSMID")
query_serial_logs(pattern="Test Command : VEXTUNITINFO")
```

## INFO Tables

`INFO` maps to `simplevInfoBuffer()` and prints the table headed:

```text
No. | unitName | ComRate(Rev/Req) | ComTime | LastComTime | FW Ver | RF | Mac(ID) | Unit | UseBay | Free | Function | BayMode
```

The header and SSM row are printed at `SSM_esp32.ino:1492` through `SSM_esp32.ino:1516`; lower-device rows include `ComRate(Rev/Req)`, send/receive timestamps, FW version, RSSI, MAC, unit type, `UseBay`, `Free`, function, and BayMode (`SSM_esp32.ino:1535` through `SSM_esp32.ino:1556`).

`TINFO` maps to `vInfoBuffer()` and adds `deviceId` to the table; its header and SSM row are at `SSM_esp32.ino:1572` through `SSM_esp32.ino:1596`.

`OLDINFO` maps to `RdInfoBuffer()` and prints the older layout headed by `Mac(ID)`, `Unit`, `FW Ver`, `RF`, `UseBay`, `Free`, `Function`, `ComRate(Rev/Req)`, `ComTime`, and `deviceId` (`SSM_esp32.ino:1654`, `SSM_esp32.ino:1675`).

`VUPDATE` maps to `RdInfoUpdateBuffer()` and prints the OTA progress table with `Running FW Ver.`, `step`, `err`, `result`, `ProgressDown`, and `Downed FW Ver.` (`SSM_esp32.ino:1195`, `SSM_esp32.ino:1200` through `SSM_esp32.ino:1203`).

Useful queries:

```text
query_serial_logs(pattern="<< Information on the entire equipment >>")
query_serial_logs(pattern="ComRate(Rev/Req)")
query_serial_logs(pattern="Running FW Ver.")
query_serial_logs(pattern="Downed FW Ver.")
```

## Communication State

`STCOMM` maps to `vCommStateWithUnits()` and prints `Communication state by unit`; each row reports a unit name, MAC, and one of `Checking`, `Good`, or `Bad` from `sChkComm` state (`SSM_esp32.ino:1454` through `SSM_esp32.ino:1472`).

Useful query:

```text
query_serial_logs(pattern="Communication state by unit")
```

## HTTP And Web Logs

HTTP POSTs use `Http_Proc()` and print `[Http_Proc]` before issuing the request (`SSM_esp32.ino:2808`, `SSM_esp32.ino:2815`). HTTP responses print `[Proc-HttpRx] HttpResCode=` (`SSM_esp32.ino:2865`). Negative HTTP responses can later be logged as `[Proc-Err] Http_Proc:httpRes(Fail)=` in `procNegativeHttpResponse()` (`SSM_esp32.ino:21386`).

Web socket traffic uses `[Proc-WebRx]` for received JSON (`SSM_esp32.ino:11184`) and multiple `[Proc-WebTx]` response prefixes such as `Resp-RESET`, `Resp-APMODE`, `Resp-download`, `Resp-canceldown`, `Resp-erase`, and `Resp-Reflash` (`SSM_esp32.ino:11845`, `SSM_esp32.ino:11937`, `SSM_esp32.ino:12285` through `SSM_esp32.ino:12290`).

Useful queries:

```text
query_serial_logs(pattern="\\[Http_Proc\\]")
query_serial_logs(pattern="\\[Proc-HttpRx\\] HttpResCode=")
query_serial_logs(pattern="\\[Proc-WebRx\\]")
query_serial_logs(pattern="\\[Proc-WebTx\\] Resp-")
```

## ESP-NOW Logs

Incoming ESP-NOW packets are logged with `[Proc-WiFiRx] From Mac.` in `OnRevFromWiFiByBoardcating()` (`SSM_esp32.ino:4895`, `SSM_esp32.ino:4936`). Processed receive logs include `[Proc-WiFiRx]` with packet JSON (`SSM_esp32.ino:7021`) and OTA piece requests (`SSM_esp32.ino:8456`).

Outgoing ESP-NOW command logs use `[Proc_WiFiTx]` for requests such as `Ask Info`, `Req-BayConfig`, and `Ask ReqDnFwVer` (`SSM_esp32.ino:2028`, `SSM_esp32.ino:3007`, `SSM_esp32.ino:19436`). ACK logs use `[Proc-WiFiTx-ACK]` (`SSM_esp32.ino:6867`). Error logs use `[Proc-WiFiRxErr]`, `[Proc-WiFiTxErr]`, and `[Proc-WiFiBinTxErr]` (`SSM_esp32.ino:4902`, `SSM_esp32.ino:5327`, `SSM_esp32.ino:5508`).

Useful queries:

```text
query_serial_logs(pattern="\\[Proc-WiFiRx\\] From Mac")
query_serial_logs(pattern="\\[Proc_WiFiTx\\] Req-BayConfig")
query_serial_logs(pattern="\\[Proc-WiFiTx-ACK\\]")
query_serial_logs(pattern="\\[Proc-WiFiRxErr\\]")
query_serial_logs(pattern="\\[Proc-WiFiTxErr\\]")
```

## Card And Charge Logs

Card/charge flow has a dedicated `[SSM-RfCard]` family. Web `SET_CARD` without a MAC prints `SET_CARD(no MAC)` with `rfCard`, `points`, and `CuID` (`SSM_esp32.ino:12903`). Web `SET_CARD` with a target prints `SET_CARD received` with `rfCard`, `points`, `CuID`, and `tsKey` (`SSM_esp32.ino:13495`). Lower-device card completion prints `ResRfCtrl RECEIVED` with `ResRfCtrl`, `tsKey`, and `Amnt` (`SSM_esp32.ino:9285`). `Send_Operation()` prints when it sends `ResRfCtrl` to Web (`SSM_esp32.ino:3652`).

Charge queue lifecycle logs use `[ChargeQ]` and `[ChargeQ-CLR]`, including completed entries retained for 24 hours and clear broadcasts keyed by `cuID` and `tsKey` (`SSM_esp32.ino:777`, `SSM_esp32.ino:9358`, `SSM_esp32.ino:9388`, `SSM_esp32.ino:21799`).

Useful queries:

```text
query_serial_logs(pattern="\\[SSM-RfCard\\]")
query_serial_logs(pattern="ResRfCtrl RECEIVED")
query_serial_logs(pattern="tsKey=")
query_serial_logs(pattern="\\[ChargeQ-CLR\\]")
```

## OTA Logs

OTA logs use `[OTA]`. Important patterns include waiting for fresh INFO before binary prep, target mask printing, HTTP download attempts, streaming download finished, selected target reflash commands, and zero-target errors (`SSM_esp32.ino:16838`, `SSM_esp32.ino:17443`, `SSM_esp32.ino:17583`, `SSM_esp32.ino:17763`, `SSM_esp32.ino:17918` through `SSM_esp32.ino:17963`, `SSM_esp32.ino:17971`).

Useful queries:

```text
query_serial_logs(pattern="\\[OTA\\]")
query_serial_logs(pattern="Streaming download finished")
query_serial_logs(pattern="Err-TargetsPreparedForUpdate is 0")
```

## Event And Duplicate Suppression Logs

`Send_Operation()` logs busy `/usage` preservation as `[Proc-Alarm] Busy - saved usage event to Event.txt instead of dropping it.` (`SSM_esp32.ino:3688`). Unique-ID duplicate suppression prints `Registered a new UniqueID.` or `Duplicate UniqueID. - Throw away.` from `chkUniqueIDbuff()` (`SSM_esp32.ino:5780`, `SSM_esp32.ino:5800`, `SSM_esp32.ino:5804`).

Useful queries:

```text
query_serial_logs(pattern="Event.txt")
query_serial_logs(pattern="Duplicate UniqueID")
query_serial_logs(pattern="Registered a new UniqueID")
```

## Error And Alarm Prefixes

Common source-backed prefix families:

| Prefix | Typical meaning | Examples |
|---|---|---|
| `[Proc-Err]` | Local processing, parsing, HTTP, storage, or command error. | no order buffer space (`SSM_esp32.ino:571`), HTTP begin failed (`SSM_esp32.ino:2839`), formatting error (`SSM_esp32.ino:18068`) |
| `[Proc-Alarm]` | Important state change or notable non-fatal event. | APU registered (`SSM_esp32.ino:628`), SaveUnitPrice success (`SSM_esp32.ino:2983`), WEB ORDER_RESET (`SSM_esp32.ino:11873`) |
| `[Proc-Clear]` | Buffer clear action. | update info buffer clear (`SSM_esp32.ino:1389`) |
| `[Proc-Skip]` | Deliberately ignored path. | post-cancel orphan `UP_CHKFILES` ignored (`SSM_esp32.ino:8440`) |
| `[Proc-WebTx]` | Socket.IO/Web response or transmit action. | Send data to socketIO (`SSM_esp32.ino:8663`) |
| `[Proc_WiFiTx]` | ESP-NOW send action. | Ask Info (`SSM_esp32.ino:2028`) |
| `[Proc-WiFiRx]` | ESP-NOW receive action. | From Mac (`SSM_esp32.ino:4936`) |
| `[Proc-HttpRx]` | HTTP response handling. | `HttpResCode=` (`SSM_esp32.ino:2865`) |

## Sampling And Omissions

This note samples representative signatures from large prefix families instead of listing every `Serial.print`. It does not enumerate every concrete `[Proc-Err]` line because that would duplicate source search output; instead, it records the prefix taxonomy, key state-machine signatures, and the patterns needed by future `query_serial_logs(pattern=...)` workflows. Full line search should still be used when a specific prefix is present but the exact subtype is not listed here.
