# SSM Communication Health Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps the source-defined communication health model between SSM and lower devices. It covers periodic `INFO` probing, serial/Web inspection mode, automatic communication-fault confirmation, stale/offline connection state, and the `C0002` fault output.

## State And Thresholds

| Item | Value / fields | Source anchors |
|---|---|---|
| Inspect mode flag | `fInspectMode` | `SSM_esp32.h:2047` |
| Inspect interval | `INSPECTMODETIME = 1200` timer ticks | `SSM_esp32.h:2048` |
| Auto check interval | `CYCLEAUTOCHECKCOMM = 20` full `INFO` cycles | `SSM_esp32.h:2053` |
| Fault check cycles | `CYCLECHECKCOMM = 20` | `SSM_esp32.h:2082` |
| Hysteresis thresholds | enter bad at `<= 35.0%`, recover at `>= 65.0%` | `SSM_esp32.h:2050` through `SSM_esp32.h:2051` |
| Per-device counters | `cntReq`, `cntRev`, `InspcntReq`, `InspcntRev`, response-time averages | `SSM_esp32.h:2057` through `SSM_esp32.h:2080` |
| Connection freshness | `lastRxMs`, `connState`, `SB_STALE_MS = 15000`, `SB_OFFLINE_MS = 60000` | `SSM_esp32.h:530` through `SSM_esp32.h:539` |

The current source uses hysteresis. Older/commented single-threshold code remains nearby, but the active logic is 35/65, not 50/60 (`SSM_esp32.ino:1898` through `SSM_esp32.ino:1919`; `SSM_esp32.ino:21106` through `SSM_esp32.ino:21126`).

## Probe Generation

`ReqInfoTo(false)` is the normal periodic probe generator.

- `ReqInfoTo(true)` clears the function-local static `pos` cursor and returns without sending (`SSM_esp32.ino:1817` through `SSM_esp32.ino:1831`).
- After two post-boot full cycles, SSM initializes each lower-device communication state as `Good` or `Bad` by comparing `bkcntRev[pos]` with `InfoListArr[pos].cntRev` (`SSM_esp32.ino:1837` through `SSM_esp32.ino:1866`).
- Every 20 full cycles, SSM computes `rateCommByUnit = cntRev * 100 / cntReq`, prints `<< Check the comm >>`, applies the 35/65 hysteresis, resets the counters, and starts a confirmation window when a state changed or no fault has yet been sent (`SSM_esp32.ino:1873` through `SSM_esp32.ino:1960`).
- Each `INFO` request includes the WiFi channel, `INFO:"REQ"`, and either `UnID` or `Mac`. If current time is after `2026-01-01 00:00:00 UTC`, SSM includes `RTC[0..5]`; otherwise it sends `ASK:"TIME"` (`SSM_esp32.ino:2005` through `SSM_esp32.ino:2032`).
- `ReqInfoTo(String tmac)` sends the same targeted `INFO` request to a specific MAC/UnitID during fault confirmation (`SSM_esp32.ino:2050` through `SSM_esp32.ino:2101`).

## Request And Response Counters

`sendMessage(String outgoing)` updates counters when an outgoing JSON packet targets a registered lower device by `Mac` or `UnID`:

- Normal mode increments `InfoListArr[pos].cntReq` and marks `finforeq` unless `fchkFaultComm` is active (`SSM_esp32.ino:5356` through `SSM_esp32.ino:5371`).
- All non-inspect communication health checks increment `sChkComm[pos].cntReq`; inspection mode increments `sChkComm[pos].InspcntReq` instead (`SSM_esp32.ino:5372` through `SSM_esp32.ino:5382`).

Incoming lower-device `INFO` responses update the corresponding receive counters:

- Normal responses increment `InfoListArr[pos].cntRev`, refresh `lastRxMs`, set `connState = SB_CONN_ONLINE`, clear `finforeq` / `noRevedCnt`, and update average response time (`SSM_esp32.ino:7277` through `SSM_esp32.ino:7311`).
- Normal communication-health counters increment `sChkComm[pos].cntRev`; inspection mode increments `sChkComm[pos].InspcntRev` and tracks inspection response time separately (`SSM_esp32.ino:7316` through `SSM_esp32.ino:7334`).

## Serial And Web Surfaces

| Surface | Behavior | Source anchors |
|---|---|---|
| `STCOMM` | Prints current per-device state as `Good`, `Bad`, `Checking`, or not-yet-counted | `SSM_esp32.ino:1454` through `SSM_esp32.ino:1472`; `SSM_esp32.ino:19569` through `SSM_esp32.ino:19572` |
| `REQSTCOMM` | Starts manual inspection after asking for count 1..255; blocked while inspection, fault check, or OTA update is active | `SSM_esp32.ino:19586` through `SSM_esp32.ino:19635` |
| Web `INSPECTION_MODE` | Starts inspection from Socket.IO/Web with optional `count`; returns `Done=NOK` if inspection/fault/OTA mode is already active | `SSM_esp32.ino:13613` through `SSM_esp32.ino:13658` |

ReadmeSSM documents `STCOMM` as the debug command for communication state and notes that `Good` / `Bad` status appears after more than 20 checks (`ReadmeSSM.txt:484` through `ReadmeSSM.txt:486`).

## Inspection Result

During manual/Web inspection, the main loop calls `ReqInfoTo(false)` every `INSPECTMODETIME` until `cntInfo` reaches zero, then calls `Send_InspectResult()` and clears `fInspectMode` (`SSM_esp32.ino:21048` through `SSM_esp32.ino:21066`).

`Send_InspectResult()` emits an `Inspect` array with `[mac, rate, avg_time]` for each lower device and sends it through both Socket.IO and HTTPS `/device/{SSMdeviceId}/inspect` when the corresponding channels are available (`SSM_esp32.ino:3197` through `SSM_esp32.ino:3275`). ReadmeSSM also describes manual/automatic inspection as reporting success rate and response time (`ReadmeSSM.txt:1150` through `ReadmeSSM.txt:1152`).

## Automatic Fault Confirmation

When the periodic check detects a changed communication state, SSM sets `fchkFaultComm`, clears the probe cursor, and runs a 20-cycle confirmation window (`SSM_esp32.ino:1932` through `SSM_esp32.ino:1960`).

In that mode:

- The main loop probes only changed or not-yet-reported devices by targeted `ReqInfoTo(mac)` (`SSM_esp32.ino:21068` through `SSM_esp32.ino:21084`).
- After `cntInfo` reaches zero, it recomputes the rate, reapplies the 35/65 hysteresis, and sends `C0002` through `Send_FaultCode()` if the state should be reported (`SSM_esp32.ino:21088` through `SSM_esp32.ino:21143`).
- The `message` field is formatted as `<rate>[%],<avg>[ms]`; `reason` is the active `fStateComm` boolean passed to `Send_FaultCode()` (`SSM_esp32.ino:21128` through `SSM_esp32.ino:21139`).
- After the pass, SSM sets `fSentFault = true`, clears `fchkFaultComm`, resets counters/averages, and clears the `ReqInfoTo()` cursor (`SSM_esp32.ino:21146` through `SSM_esp32.ino:21165`).

## Stale / Offline State

`ProcTimer30()` recomputes connection freshness once per second. If a device is online or stale and has not produced an `INFO` response for 15 seconds, SSM marks it stale; after 60 seconds, it marks it offline. State changes print `[ConnSt] ...` and the same timer path also runs route RSSI probing (`SSM_esp32.ino:15834` through `SSM_esp32.ino:15868`).

This freshness state is separate from the 20-cycle communication-fault model. `lastRxMs` is refreshed on incoming `INFO` responses, while `C0002` uses the request/receive ratio accumulated in `sChkComm`.

## Failure Signatures

Useful source-defined signatures for log triage:

- `>>> Got the communication status at first after booting.`: first post-boot communication status initialization.
- `<< Check the comm >>`: automatic 20-cycle communication rate pass.
- `** There are changes in the communication.`: automatic fault confirmation started.
- `[Proc-Alarm] Inspecting Mode is working. =>`: serial/Web inspection command rejected because inspection is already active.
- `[Proc-Alarm] fchkFaultComm Mode is working. =>`: manual inspection rejected because communication-fault confirmation is active.
- `[Proc-Alarm] Updating Mode is working. =>`: manual inspection rejected because OTA is active.
- `[ConnSt] ...`: freshness state changed to stale/offline/online.

## Open Questions

- No hardware observation was performed; all `Good` / `Bad` behavior here is source-derived.
- The source contains older threshold comments/code blocks near the active logic. Treat source-line active branches as authoritative for SSM260525-004.
