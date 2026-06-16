# SSM ESP-NOW Protocol Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note records the SSM-side ESP-NOW transport and route protocol visible in source. It covers SSM-to-lower-device JSON sends, receive buffering, route plan distribution, route-aware ACK/duplicate handling, and ReadmeSSM change anchors for SSM260525-002 through SSM260525-004.

## ESP-NOW Classes And Setup

- `ESP_NOW_Broadcast_Peer` wraps a broadcast peer; `begin()` calls `ESP_NOW.begin()` and `add()`, and `send_message()` sends a byte buffer then sets `tx_done_flag` (`SSM_esp32.h:1792` through `SSM_esp32.h:1824`).
- `ESP_NOW_Peer_Class` is defined for peer registration and prints received messages in `onReceive()`, but the active setup registers `OnRevFromWiFiByBoardcating()` as the new-peer callback (`SSM_esp32.h:1829` through `SSM_esp32.h:1852`, `SSM_esp32.ino:15829` through `SSM_esp32.ino:15831`).
- Setup failure resets the board: failure to initialize/register the broadcast peer or failure of `ESP_NOW.begin()` prints a failure message, disconnects Socket.IO, delays 1500 ms, and calls `ESP.restart()` (`SSM_esp32.ino:15805` through `SSM_esp32.ino:15827`).

## Receive Path

- `OnRevFromWiFiByBoardcating()` is the raw receive callback (`SSM_esp32.ino:4895`).
- The callback drops zero-length or over-size packets and prints `[Proc-WiFiRxErr] Data_Overflow` when `len > DATAMAXSIZE - 2` (`SSM_esp32.ino:4900` through `SSM_esp32.ino:4904`).
- When extended unit info logging is enabled, SSM prints `[Proc-WiFiRx] From Mac. ... RSSI:...` (`SSM_esp32.ino:4934` through `SSM_esp32.ino:4938`).
- Duplicate unregistered-buffer packets are skipped by `ChkunRegbuffDuplicate()`; accepted packets are copied into `strAllRevData[WrunRegbuffcnt]` with source MAC, payload, RSSI, and length (`SSM_esp32.ino:4940` through `SSM_esp32.ino:4954`).
- JSON packet processing occurs later in `WiFi_rev_proc()`, which deserializes the received string and prints `[Proc-WiFiRxErr] DeserializationError` on parse failure (`SSM_esp32.ino:6873` through `SSM_esp32.ino:6897`).

## Send Path

- `sendMessage(String outgoing)` deserializes outgoing JSON before transmission. If parsing fails it prints `[Proc-WiFiTxErr] DeserializationError-->`, resets `WiFiTxWaitCnt`, and returns (`SSM_esp32.ino:5316` through `SSM_esp32.ino:5335`).
- Target selection uses `Mac` or `UnID` and `CheckInfoTable()`; if a known `Mac` has a `UnitID`, SSM rewrites `Mac` into `UnID` except for `RESET` packets (`SSM_esp32.ino:5340` through `SSM_esp32.ino:5397`).
- Every outgoing JSON gets `Cidx = TxInx_Cnt`, then `TxInx_Cnt` increments (`SSM_esp32.ino:5399` through `SSM_esp32.ino:5401`).
- The serialized JSON must fit under `DATAMAXSIZE - 2`; over-size sends print `[Proc-WiFiTxErr] Buffer Overflow.` or `[Proc-WiFiTxErr] Over-size` (`SSM_esp32.ino:5403` through `SSM_esp32.ino:5443`).
- The byte payload is XOR-obfuscated with `cHidden` before broadcast (`SSM_esp32.ino:5417` through `SSM_esp32.ino:5425`).
- SSM records the outgoing plaintext packet with `WrSendedPacket()` before broadcasting, then sends it twice through `broadcast_peer.send_message()` with a 10-20 ms random gap (`SSM_esp32.ino:5445` through `SSM_esp32.ino:5473`).
- After sending, `TimeCntSendMessage` is randomized to 30-60 ms and `ftimerReqInfo` is enabled (`SSM_esp32.ino:5476` through `SSM_esp32.ino:5480`).

## Common JSON Keys

| Key | Direction | Meaning in SSM source | Source anchors |
|---|---|---|---|
| `Mac` | both | Lower-device MAC target/source. May be rewritten to `UnID` on send. | `SSM_esp32.ino:5342`, `SSM_esp32.ino:5389` through `SSM_esp32.ino:5395` |
| `UnID` | both | Unit ID target/source. Unknown UnitID triggers a `WHO` response. | `SSM_esp32.ino:5344`, `SSM_esp32.ino:7153` through `SSM_esp32.ino:7180` |
| `Cidx` | SSM -> lower | SSM transmit index added to outgoing JSON. | `SSM_esp32.ino:5399` |
| `Asn` | both | Application sequence / response correlation; copied into ACK responses when not `0xFF`. | `SSM_esp32.ino:6489`, `SSM_esp32.ino:6854` through `SSM_esp32.ino:6856`, `SSM_esp32.ino:8096` through `SSM_esp32.ino:8097` |
| `INFO` | SSM -> lower / lower -> SSM | Info request/response and communication-health base signal. | `SSM_esp32.ino:2023` through `SSM_esp32.ino:2031` |
| `RTC` / `ASK:TIME` | SSM -> lower | Time sync: send RTC when UTC is valid, otherwise ask lower device for time. | `SSM_esp32.ino:2005` through `SSM_esp32.ino:2021` |
| `RCBay` / `CBay` | lower -> SSM / SSM -> lower | Bay configuration request and response. | `SSM_esp32.ino:8026` through `SSM_esp32.ino:8098` |
| `Unique` | both | Unique event/packet correlation; duplicate UniqueID is discarded. | `SSM_esp32.ino:5823` through `SSM_esp32.ino:5848`, `SSM_esp32.ino:7072` |
| `Rt` | lower -> SSM | Passed-device route trace list, removed before later processing. | `SSM_esp32.ino:6904` through `SSM_esp32.ino:6968` |
| `R` | route-aware ACK | Route header attached to event ACKs. | `SSM_esp32.ino:6833` through `SSM_esp32.ino:6845` |
| `DT` | lower -> SSM | Delta-time/event-age field; removed and later used to reconstruct event time. | `SSM_esp32.ino:6972` through `SSM_esp32.ino:6984`, `SSM_esp32.ino:7198` through `SSM_esp32.ino:7209` |
| `REQRSSI` / `REPRSSI` | route maintenance | RSSI probe and reply for route matrix updates. | `SSM_esp32.ino:6622`, `SSM_esp32.ino:6719` through `SSM_esp32.ino:6727` |
| `CHPLAN` | SSM -> lower | Route plan distribution: protocol version, Plan A, Plan B, TTL, expiry. | `SSM_esp32.ino:6482` through `SSM_esp32.ino:6488` |

## Route Protocol State

Route state structs are declared in `SSM_esp32.h:559` through `SSM_esp32.h:605`.

| Struct | Key fields | Purpose |
|---|---|---|
| `RouteLinkState` | `rssi`, `lastUpdateMs` | Per-link RSSI matrix entry |
| `RoutePlanState` | `targetMac`, `targetToken`, `planA`, `planB`, `routeVersion`, `expiresMs`, `lastReason` | Per-target route plan cache |
| `RouteHeaderState` | `valid`, `ackRequired`, `packetId`, `srcToken`, `dstToken`, `nextHopToken`, `ttl`, `flags` | Parsed route header for received routed packets |
| `RouteDupEntry` | `srcToken`, `packetId`, `seenMs` | Duplicate routed-event cache |
| `RouteEventQueueFaultState` | `mac`, `active`, `lastReportMs` | Per-SB stuck Event.txt queue fault state |
| `RouteUrgentRssiState` | `targetMac`, `active`, `nextProbePos`, `sentCount`, timers | SSM260525-004 urgent RSSI refresh state |

## Route Plan And RSSI Refresh

- `RouteSendChplan()` builds a `CHPLAN` array containing `ROUTE_PROTO_VERSION`, Plan A, Plan B, default TTL, and expiry seconds, adds `Asn`, checks size, logs `[Route] CHPLAN to ...`, then sends with `sendMessage()` (`SSM_esp32.ino:6475` through `SSM_esp32.ino:6500`).
- `RouteRefreshAndMaybeSend()` recalculates plan tokens and only sends if forced, changed, or expired. It logs `[Route] Plan update (...)` before calling `RouteSendChplan()` (`SSM_esp32.ino:6503` through `SSM_esp32.ino:6528`).
- `RouteSendRssiProbeTo()` sends `REQRSSI = "REQ"` with `Rng[0]=0`, `Rng[1]=4`, and a `Unique` value to online SB/repeater devices (`SSM_esp32.ino:6610` through `SSM_esp32.ino:6637`).
- `RouteStartUrgentRssiRefresh()` starts the urgent target window and sends the first probe to the target; `RouteUrgentProbeTick()` probes other online candidates at a 250 ms-style gap until the window ends or candidates are exhausted (`SSM_esp32.ino:6640` through `SSM_esp32.ino:6707`).
- `RouteUpdateLinkFromReprssi()` reads `REPRSSI[n][0]` as target MAC and `REPRSSI[n][1]` as RSSI, updates the route link matrix, and logs `[Route] Link ... rssi=...` (`SSM_esp32.ino:6709` through `SSM_esp32.ino:6735`).

## Route-Aware ACK And Duplicate Handling

- `WiFi_rev_proc()` reads route headers before normal `Mac`/`UnID` device resolution (`SSM_esp32.ino:6904` through `SSM_esp32.ino:6908`).
- `Rt` passed-device entries are rendered into a `[Passed Device]` log and then removed from the JSON before later processing (`SSM_esp32.ino:6910` through `SSM_esp32.ino:6968`).
- Packets previously sent by SSM are ignored by `chk_DuplicateRev(..., CHKSEND)` (`SSM_esp32.ino:7024` through `SSM_esp32.ino:7033`).
- Previously received packets are ignored by `chk_DuplicateRev(..., CHKREV)`. If the duplicate is a route event with a valid header, SSM logs `[Route] Duplicate event ACK replay ...` and sends an ACK again (`SSM_esp32.ino:7035` through `SSM_esp32.ino:7055`).
- `RouteSeenOrRemember()` caches `srcToken + packetId` for route events and returns duplicate status (`SSM_esp32.ino:6788` through `SSM_esp32.ino:6830`).
- `RouteSendEventAck()` builds `Stat = "OK"`, copies `Asn` if present, attaches an `R` route header when ACK is required, falls back by removing `R` if ACK payload is too large, then logs `[Proc-WiFiTx-ACK]` and sends (`SSM_esp32.ino:6833` through `SSM_esp32.ino:6869`).
- Later in normal processing, duplicate routed events are skipped with `[Route] Duplicate routed event skipped ...` and ACKed again (`SSM_esp32.ino:7190` through `SSM_esp32.ino:7195`).

## Registration And Unknown Device Behavior

- If incoming JSON has `Mac`, SSM looks it up and may update `InfoListArr[pos].UnitID` from received `UnID`; duplicate UnitID only logs an error and processing continues during testing (`SSM_esp32.ino:7095` through `SSM_esp32.ino:7141`).
- If incoming JSON has `UnID` but no matching table entry, SSM sends `WHO` with that UnitID and a `Unique` value (`SSM_esp32.ino:7153` through `SSM_esp32.ino:7180`).
- If neither registered MAC nor known UnitID can resolve the packet, SSM logs `[!!! Packet Err.] This packet is a undefined structure.` and returns (`SSM_esp32.ino:7158` through `SSM_esp32.ino:7186`).

## Event Queue Fault On Route INFO

- SSM260525-003 Readme says SB Event.txt queue stuck alarms were added with `C0008` when pending event age exceeds 180 seconds and clear when queue count returns to zero (`ReadmeSSM.txt:9` through `ReadmeSSM.txt:14`).
- Source implements this with `RouteUpdateEventQueueFault()`: `eq[0]` is event queue count, `eq[1]` is oldest age seconds, `eq[4]` is packetId, and `eq[5]` is route stage (`SSM_esp32.ino:6559` through `SSM_esp32.ino:6576`).
- If `eventQueueCount == 0`, active fault state is cleared with `EVENT_QUEUE_CLEAR`; if oldest age is at or above the threshold and no active report exists, SSM sends `EVENT_QUEUE_STUCK,cnt=...,oldest=...,pid=...,stage=...` via `RouteReportEventQueueFault()` (`SSM_esp32.ino:6578` through `SSM_esp32.ino:6601`).

## ReadmeSSM Version Anchors

- SSM260525-004 adds urgent REQRSSI refresh when SB INFO shows EQ pending, probes online SB/repeater candidates, and force recalculates/redistributes CHPLAN when target-related REPRSSI arrives (`ReadmeSSM.txt:1` through `ReadmeSSM.txt:6`).
- SSM260525-003 adds Event.txt queue stuck fault `C0008` and active/clear state handling per MAC (`ReadmeSSM.txt:9` through `ReadmeSSM.txt:14`).
- SSM260525-002 adds route table, REPRSSI-based relay candidate selection, CHPLAN Plan A/B distribution, route-aware event ACK, and `srcToken + packetId` duplicate cache (`ReadmeSSM.txt:17` through `ReadmeSSM.txt:22`).

## Failure Signatures

| Signature | Likely layer | Source anchor |
|---|---|---|
| `Failed to initialize broadcast peer` | ESP-NOW/broadcast peer setup, followed by restart | `SSM_esp32.ino:15805` through `SSM_esp32.ino:15814` |
| `Failed to initialize ESP-NOW` | ESP-NOW setup, followed by restart | `SSM_esp32.ino:15817` through `SSM_esp32.ino:15827` |
| `[Proc-WiFiRxErr] Data_Overflow` | Oversize raw ESP-NOW receive | `SSM_esp32.ino:4900` through `SSM_esp32.ino:4904` |
| `[Proc-WiFiTxErr] Buffer Overflow.` | Serialized JSON exceeds lower-device payload limit | `SSM_esp32.ino:5403` through `SSM_esp32.ino:5409` |
| `[Route] Duplicate event ACK replay` | Duplicate receive cache saw route event; SSM re-sent ACK | `SSM_esp32.ino:7035` through `SSM_esp32.ino:7055` |
| `[Route] Duplicate routed event skipped` | Route event already processed; SSM avoids duplicate Web report | `SSM_esp32.ino:7190` through `SSM_esp32.ino:7195` |
| `[!!! Unknown UnitId]` with `WHO` response | Lower packet uses UnitID missing from SSM table | `SSM_esp32.ino:7153` through `SSM_esp32.ino:7180` |
