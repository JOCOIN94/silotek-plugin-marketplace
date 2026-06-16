# SSM Event Reliability Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps source-visible reliability mechanisms for Web-bound operational events and lower-device event uplinks: local event persistence, saved-event retry, duplicate suppression, route ACK replay, route event-queue fault detection, and HTTP failure fallback.

## Persistent Event Files

| File | Constant | Role | Source anchors |
|---|---|---|---|
| `/Event.txt` | `EventToSendfilename` | Primary append-only saved event stream | `SSM_esp32.h:228` |
| `/bkEvent.txt` | `bkEventToSendfilename` | Retry backup stream for packets that still fail during saved-event replay | `SSM_esp32.h:229`; `SSM_esp32.ino:21613` through `SSM_esp32.ino:21618`; `SSM_esp32.ino:21643` through `SSM_esp32.ino:21649` |
| `/missingEvents` | `binsvrPath` | Bulk binary upload endpoint path for saved events | `SSM_esp32.h:2222`; `SSM_esp32.ino:21424` through `SSM_esp32.ino:21438` |

`saveEvent(turl, jsonBuffer)` serializes a JSON document, adds a UTC timestamp if missing, adds `URL` if missing, and appends the serialized packet to `/Event.txt` (`SSM_esp32.ino:10653` through `SSM_esp32.ino:10695`).

## When Events Are Saved

SSM saves Web-bound events instead of dropping them in these source-visible cases:

- `Http_Proc()` cannot begin an HTTP request, so it saves the JSON and sets HTTP communication state to error (`SSM_esp32.ino:2831` through `SSM_esp32.ino:2845`).
- `Http_Proc()` receives a non-2xx result for most event-like endpoints, excluding init/config/unit-price/inspect/reflash-done style endpoints (`SSM_esp32.ino:2870` through `SSM_esp32.ino:2880`).
- WiFi/router connectivity is absent for most event-like endpoints (`SSM_esp32.ino:3117` through `SSM_esp32.ino:3128`).
- `Send_Operation()` finds `fSendToWeb == false`; it logs busy state and saves a `/usage` event (`SSM_esp32.ino:3684` through `SSM_esp32.ino:3690`).
- Consecutive negative HTTP responses can save a `C0006` fault event before scheduling reset (`SSM_esp32.ino:21392` through `SSM_esp32.ino:21408`).
- `Send_FaultCode()` uses the same save-on-busy pattern for `/fault` events, as recorded in `notes-fault-codes.md`.

## Saved-Event Replay

The main loop contains a saved-event sender. Its behavior:

1. If WiFi is connected and no backup file exists, first attempt a bulk binary upload of `/Event.txt` to `https://device.silotek.co.kr/bin/{authCode}/missingEvents`. On success, remove `/Event.txt` (`SSM_esp32.ino:21417` through `SSM_esp32.ino:21438`).
2. Otherwise open `/Event.txt`, seek to `eventfile_pos`, and read JSON objects by brace counting into a 1024-byte buffer (`SSM_esp32.ino:21441` through `SSM_esp32.ino:21542`).
3. Drop malformed prefixes, over-1024-byte packets, invalid JSON packets, packets without `URL`, and packets identical to the immediately previous packet (`SSM_esp32.ino:21491` through `SSM_esp32.ino:21560`; `SSM_esp32.ino:21570` through `SSM_esp32.ino:21602`; `SSM_esp32.ino:21685` through `SSM_esp32.ino:21692`).
4. For a valid saved event, remove `URL` from the payload body, POST the JSON to that URL, and use `WaitForHttpPostSlot("saved event upload")` plus `HTTPTIMEOUT` (`SSM_esp32.ino:21582` through `SSM_esp32.ino:21641`).
5. If `http.begin()` fails or POST returns non-2xx, append the original packet to `/bkEvent.txt` (`SSM_esp32.ino:21604` through `SSM_esp32.ino:21618`; `SSM_esp32.ino:21643` through `SSM_esp32.ino:21649`).
6. If all events are consumed, remove `/Event.txt`; if `/bkEvent.txt` exists, rename it back to `/Event.txt` for a later retry (`SSM_esp32.ino:21712` through `SSM_esp32.ino:21750`).

The replay function returns after processing one sendable packet, so saved-event upload is paced rather than draining every packet in one loop pass (`SSM_esp32.ino:21695` through `SSM_esp32.ino:21703`).

## Duplicate Suppression Layers

### Raw ESP-NOW Packet Buffers

SSM keeps ring buffers for sent and received packet payloads. `WrSendedPacket()` and `WrRevedPacket()` write those buffers; `chk_DuplicateRev(..., CHKSEND/CHKREV)` is used during receive processing to ignore packets that SSM already sent or already received (`SSM_esp32.ino:4379` through `SSM_esp32.ino:4458`; `SSM_esp32.ino:7016` through `SSM_esp32.ino:7041`).

If a duplicate received routed event is detected, SSM can replay the ACK instead of reprocessing the event (`SSM_esp32.ino:7042` through `SSM_esp32.ino:7056`).

### Route Event Duplicate Cache

Route metadata includes protocol version, packet ID, tokens, TTL, and ACK-required flag (`SSM_esp32.h:542` through `SSM_esp32.h:583`). `RouteSeenOrRemember()` keeps a 64-entry `(srcToken, packetId)` duplicate cache with a 10-minute TTL (`SSM_esp32.h:550` through `SSM_esp32.h:551`; `SSM_esp32.ino:6788` through `SSM_esp32.ino:6830`).

For routed event packets, if the cache says the packet was already seen, SSM logs `Duplicate routed event skipped`, sends/replays an ACK, and returns without further event processing (`SSM_esp32.ino:7190` through `SSM_esp32.ino:7195`).

`RouteSendEventAck()` creates `Stat:"OK"`, copies `Asn` when present, attaches a route return header when ACK is required, drops the route header if the ACK would exceed packet size, and sends the ACK (`SSM_esp32.ino:6847` through `SSM_esp32.ino:6870`). The normal successful event path also calls `RouteSendEventAck()` after processing (`SSM_esp32.ino:9177` through `SSM_esp32.ino:9186`).

### Web Event UniqueID Cache

SSM tracks recent `Unique` values per lower-device MAC in `collectUniqueIDbyMac[]` (`SSM_esp32.h:867` through `SSM_esp32.h:877`). `chkUniqueIDbuff()` returns duplicate status by searching the per-MAC circular unique ID list; duplicates log `Duplicate UniqueID. - Throw away.` (`SSM_esp32.ino:5823` through `SSM_esp32.ino:5848`).

During lower-device event processing, if a packet has a MAC and `Unique`, SSM uses `chkUniqueIDbuff()` to decide `fSendToWeb`; otherwise it abandons Web sending (`SSM_esp32.ino:8121` through `SSM_esp32.ino:8134`).

## Route Event-Queue Faults

Route reliability also reports when a lower device says its local event queue is stuck:

- `INFO` responses may include an `EQ` array. When queue count is nonzero, SSM logs the queue count, oldest age, last age, wait, packet ID, and route stage, then starts urgent RSSI refresh (`SSM_esp32.ino:7431` through `SSM_esp32.ino:7449`).
- `RouteUpdateEventQueueFault()` raises `C0008` if the queue is nonempty and oldest age is at least `ROUTE_EVENT_QUEUE_STUCK_SEC = 180`; it clears the fault when queue count returns to zero (`SSM_esp32.h:553` through `SSM_esp32.h:554`; `SSM_esp32.ino:6559` through `SSM_esp32.ino:6602`).
- The fault message format is `EVENT_QUEUE_STUCK,cnt=...,oldest=...,pid=...,stage=...` (`SSM_esp32.ino:6592` through `SSM_esp32.ino:6599`).

## Failure Signatures

Useful source-defined signatures:

- `[SaveEvent] err - It's not the Json form.`: failed event serialization.
- `[Proc-Alarm] Busy - saved usage event to Event.txt instead of dropping it.`: `/usage` event deferred.
- `< Send the saved events >`: saved-event replay loop started.
- `A packet not to send(Abnormal json format)`: malformed bytes while replaying `/Event.txt`.
- `Abandon this packet! - the same as a previous packet.`: immediate duplicate in `/Event.txt` replay.
- `backup this packet to /bkEvent.txt`: retry POST failed and packet was preserved for later.
- `[Route] Duplicate event ACK replay`: duplicate routed event got ACK replay.
- `[Route] Duplicate routed event skipped`: duplicate route packet suppressed by route duplicate cache.
- `Duplicate UniqueID. - Throw away.`: Web event duplicate suppressed by lower-device `Unique`.
- `[Route] C0008 SET` / `[Route] C0008 CLEAR`: route event queue stuck/clear fault reporting.

## Open Questions

- No live network, Web server, or lower-device event queue was exercised. This note records source-defined behavior only.
- Saved-event replay is stateful around `eventfile_pos` and `/bkEvent.txt`; a field investigation should capture both files and serial replay logs before concluding whether an event was lost or merely deferred.
