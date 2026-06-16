# SSM Fault Code Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note records fault-code production visible in source. The source does not contain one central fault-code table; the observed source of truth is `Send_FaultCode()` call sites, direct fault-event saves, and lower-device `uFault` pass-through handling.

## Fault Report Payload

`Send_FaultCode()` builds the Web fault payload and posts it to `https://device.silotek.co.kr/fault` (`SSM_esp32.ino:3541` through `SSM_esp32.ino:3596`).

| Field | Source behavior |
|---|---|
| `macAddress` | Included only when non-empty |
| `authCode` | Always included |
| `userId` | Included only when non-empty and not `"0"` |
| `userTransactionId` | Included only when non-empty and not `"null"` |
| `faultCode` | Set from `fFaultCode` |
| `reason` | Boolean fault/clear state from `treason` |
| `message` | Set from `tmessage` |
| `UTC` | Optional UTC array when `teventTime` is non-zero |

If `fSendToWeb == false`, `Send_FaultCode()` returns `-3` and prints `[Proc-Alarm] Reject - Try to send twice.` (`SSM_esp32.ino:3548` through `SSM_esp32.ino:3552`). It also sends the same JSON over Socket.IO when connected before posting HTTP (`SSM_esp32.ino:3583` through `SSM_esp32.ino:3596`).

## Observed Source Fault Codes

| Code | Producer | Meaning in source | reason semantics | Source anchors |
|---|---|---|---|---|
| `C0002` | SSM communication-health checker | Lower-device communication quality fault/clear, message contains success rate and average response time | `true` when `fStateComm == COMMERR`, `false` when recovered | `SSM_esp32.ino:21068` through `SSM_esp32.ino:21144` |
| `C0003` | SSM periodic connection-health fault check | WiFi often disconnected | Always sent with `reason = true`; state is reset after successful send | `SSM_esp32.ino:21261` through `SSM_esp32.ino:21281` |
| `C0004` | SSM periodic connection-health fault check | Socket is often disconnected | Always sent with `reason = true`; state is reset after successful send | `SSM_esp32.ino:21284` through `SSM_esp32.ino:21300` |
| `C0005` | SSM HTTP send-health fault check | It failed to send to the HTTP server | Sent with `reason = true` after delayed failure threshold | `SSM_esp32.ino:21303` through `SSM_esp32.ino:21318` |
| `C0006` | SSM HTTP negative-response reboot guard | Rebooted by Http Negative Response | Directly saved as fault event with `reason = true`, then `fReset = true` | `SSM_esp32.ino:21388` through `SSM_esp32.ino:21408` |
| `C0008` | Route Event.txt queue monitor | SB Event.txt queue stuck/clear | `true` for `EVENT_QUEUE_STUCK...`, `false` for `EVENT_QUEUE_CLEAR` | `SSM_esp32.h:553` through `SSM_esp32.h:554`, `SSM_esp32.ino:6545` through `SSM_esp32.ino:6601` |
| `S0001` | Channel-change / channel setup paths | SSM channel changed, message `chgedChannel:<channel>` | Sent with `reason = true` | `SSM_esp32.ino:15593` through `SSM_esp32.ino:15599`, `SSM_esp32.ino:22220` through `SSM_esp32.ino:22228` |
| lower-device `uFault` | Lower device over ESP-NOW | Pass-through fault code from lower-device JSON key `uFault` | Uses lower-device `stFault` boolean | `SSM_esp32.ino:9030` through `SSM_esp32.ino:9039`, `SSM_esp32.ino:9140` through `SSM_esp32.ino:9149` |

No active literal `C0001` or `C0007` was found in `SSM_esp32.ino`, `SSM_esp32.h`, or `ReadmeSSM.txt` during this source-only pass. Do not assign meanings to them from this source.

## C0002 Communication Fault Details

- The fault checker runs while `fchkFaultComm == true`; it periodically sends `ReqInfoTo()` to devices whose communication fault state needs checking (`SSM_esp32.ino:21068` through `SSM_esp32.ino:21080`).
- After the configured check cycles, it computes `rateCommByUnit = cntRev * 100 / cntReq` and uses hysteresis: recover from `COMMERR` if rate is at or above `CRITERIA_JUDGEMENT_COMM_PROBLEM_H`; enter `COMMERR` if rate is at or below `CRITERIA_JUDGEMENT_COMM_PROBLEM_L` (`SSM_esp32.ino:21091` through `SSM_esp32.ino:21119`).
- If the state changed or no fault has been sent before, SSM calls `Send_FaultCode(mac, UnitID, "", "C0002", fStateComm, "<rate>[%],<avg>[ms]", 0)` (`SSM_esp32.ino:21128` through `SSM_esp32.ino:21144`).
- Readme older text says communication fault was originally based on 50% or lower and shows an example `C0002` payload (`ReadmeSSM.txt:1180` through `ReadmeSSM.txt:1196`). Current source uses high/low criteria constants rather than the old single 50% threshold.

## C0005 HTTP Fault Delay

- `Http_Proc()` does not immediately fault on one negative HTTP response. It increments `httpSendFailCnt`; only when the count reaches `MAXCNT_HTTPSEND_FAULT` does it set `stHTTPSend = ERR_COMM` (`SSM_esp32.ino:2882` through `SSM_esp32.ino:2897`).
- `MAXCNT_HTTPSEND_FAULT` is defined as 3 (`SSM_esp32.h:1959`).
- While below threshold, SSM prints `[HTTP] Negative response cnt : x/3. Delay C0005 fault report.` (`SSM_esp32.ino:2891` through `SSM_esp32.ino:2892`).
- The saved-event resend path has the same delay/threshold behavior for negative HTTP responses (`SSM_esp32.ino:21665` through `SSM_esp32.ino:21679`).
- ReadmeSSM confirms the 800 ms post pacing and 3-consecutive-negative-response delay before `C0005` (`ReadmeSSM.txt:94` through `ReadmeSSM.txt:104`).

## C0006 Reboot Guard

`C0006` is exceptional because it is not sent through `Send_FaultCode()`. When HTTP library negative responses `-2` or `-3` accumulate to `MAXCNT_NEGATIVERESPONSE_TOREBOOT_HTTP`, SSM builds a fault JSON with `faultCode = "C0006"`, `reason = true`, and `message = "Rebooted by Http Negative Response"`, stores it with `saveEvent("https://device.silotek.co.kr/fault", ...)`, prints a reboot message, sets `fReset = true`, and clears the counter (`SSM_esp32.ino:21388` through `SSM_esp32.ino:21408`).

## C0008 Route Event Queue Fault

- `ROUTE_EVENT_QUEUE_FAULT_CODE` is `"C0008"` and `ROUTE_EVENT_QUEUE_STUCK_SEC` is 180 seconds (`SSM_esp32.h:553` through `SSM_esp32.h:554`).
- `RouteUpdateEventQueueFault()` reads SB EQ fields: `eq[0]` as event queue count, `eq[1]` as oldest age seconds, `eq[4]` as packet ID, and `eq[5]` as route stage (`SSM_esp32.ino:6573` through `SSM_esp32.ino:6576`).
- If count returns to zero and the fault is active, it reports `reason = false` with `EVENT_QUEUE_CLEAR` (`SSM_esp32.ino:6578` through `SSM_esp32.ino:6585`).
- If oldest age reaches the stuck threshold and the fault is not already active, it reports `reason = true` with `EVENT_QUEUE_STUCK,cnt=...,oldest=...,pid=...,stage=...` (`SSM_esp32.ino:6589` through `SSM_esp32.ino:6601`).
- ReadmeSSM top entry for SSM260525-003 describes the same C0008 set/clear behavior (`ReadmeSSM.txt:9` through `ReadmeSSM.txt:14`).

## Lower-Device uFault Pass-Through

Lower devices can report their own fault code in `uFault`. SSM forwards:

- `macAddress` from SSM's Web response context for the lower device.
- `userId` from lower JSON `uID` when present.
- `userTransactionId` from lower JSON `tsKey` when present.
- `faultCode` from lower JSON `uFault`.
- `reason` from lower JSON `stFault`.
- `message` from lower JSON `uFmsg` when present.
- `UTC` reconstructed from route/event time when available.

The pass-through exists in both the offline/message branch and the online/app-mode branch (`SSM_esp32.ino:9030` through `SSM_esp32.ino:9039`, `SSM_esp32.ino:9140` through `SSM_esp32.ino:9149`). ReadmeSSM notes the key rename from `uState` to `uFault` (`ReadmeSSM.txt:335` through `ReadmeSSM.txt:336`).

## Readme Caveats

- Older Readme text says the fault code number is sent in JSON key `message` (`ReadmeSSM.txt:1227` through `ReadmeSSM.txt:1230`). Current source sends fault code in `faultCode` and descriptive details in `message` (`SSM_esp32.ino:3559` through `SSM_esp32.ino:3561`).
- The current source has no central enum/table that defines all possible lower-device `uFault` values. Those codes must be sourced from lower-device firmware, not inferred from SSM.

## Diagnostic Signatures

| Signature | Interpretation |
|---|---|
| `[Proc-Alarm] Reject - Try to send twice.` | `Send_FaultCode()` was called while `fSendToWeb == false`; fault was not posted by this call |
| `Delay C0005 fault report` | HTTP negative response count is below the 3-failure threshold |
| `Send_FaultCod(Generated the fault code)-err` | Fault post attempt returned `-1` at caller |
| `EVENT_QUEUE_STUCK` | SSM reported route/Event.txt queue stuck fault `C0008` |
| `EVENT_QUEUE_CLEAR` | SSM cleared prior route/Event.txt queue stuck fault `C0008` |
| `Reboot due to consecutive negative response from http library.` | `C0006` was queued and reset was scheduled |
