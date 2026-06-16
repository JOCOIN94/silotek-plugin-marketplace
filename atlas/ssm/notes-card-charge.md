# SSM Card Charge Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps the SSM-side RF card charge control path. It covers Web `SET_CARD`, the SSM charge queue, ESP-NOW `Gubun:15` / `Gubun:17` messages, lower-device `ResRfCtrl` responses, `/usage` reporting, and timeout cleanup.

## Data Model

The charge queue is explicitly CuID-centered, not MAC-centered:

| Item | Source-defined behavior | Source anchors |
|---|---|---|
| Queue capacity | `MAX_CHARGE_QUEUE = 30` | `SSM_esp32.h:397` through `SSM_esp32.h:410` |
| Pending TTL | 30 days | `SSM_esp32.h:400` through `SSM_esp32.h:410` |
| Completed TTL | 24 hours catch-up window | `SSM_esp32.h:400` through `SSM_esp32.h:410` |
| Primary key | `cuID`, described as card UID hex string | `SSM_esp32.h:411` through `SSM_esp32.h:425` |
| Target override | `targetMac`; empty means any eligible device can serve it | `SSM_esp32.h:419` through `SSM_esp32.h:424` |

`EnqueueCharge()` skips zero-point commands, overwrites an existing active slot with the same `cuID`, otherwise stores a new active slot with `rfCard`, `points`, `cuID`, `tsKey`, `userTransId`, optional `targetMac`, and send/completion flags (`SSM_esp32.ino:707` through `SSM_esp32.ino:765`).

## Web Entry Points

### MAC-Free `SET_CARD`

When Web sends `operationType == SET_CARD` without `mac`, `macAddress`, or `macAdress`, SSM treats it as a card-anywhere charge:

- Logs `Cmd - Set RfCard (MAC-free, CuID queue mode)` and extracts `rfCard`, `points`, `CuID`, `userTransId`, and `userId` (`SSM_esp32.ino:12894` through `SSM_esp32.ino:12913`).
- Skips the request if `points == 0` (`SSM_esp32.ino:12914` through `SSM_esp32.ino:12918`).
- Enqueues by CuID and immediately calls `BroadcastChargeToAllSBs()` so each eligible SB/APU-C can persist the pending charge locally (`SSM_esp32.ino:12919` through `SSM_esp32.ino:12943`).
- Keeps the SSM slot after broadcast; completion, cancel/fail, or 30-day TTL is responsible for removing it (`SSM_esp32.ino:12935` through `SSM_esp32.ino:12940`).
- Acknowledges Web command handling with `fOKRev`, `OK_timer`, and `data_rev_flag = 4` (`SSM_esp32.ino:12945` through `SSM_esp32.ino:12953`).

### Target-MAC `SET_CARD`

When a target MAC is present, SSM uses the MAC-matched transmit buffer path:

- Enters the `SET_CARD` branch after MAC matching and logs `Cmd - Set RfCard` (`SSM_esp32.ino:13481` through `SSM_esp32.ino:13499`).
- Skips zero-point requests when `points` is explicitly present (`SSM_esp32.ino:13502` through `SSM_esp32.ino:13520`).
- Does not enqueue. The previous `EnqueueCharge(..., strMac)` call is commented out because target-MAC requests should not be re-pushed every 30 seconds by the CuID queue (`SSM_esp32.ino:13522` through `SSM_esp32.ino:13535`).
- Sends one `Gubun:"15"` packet to the matched device with `rfCard`, `points`, `uID`, `tsKey`, optional `CuID`, and `Ssn` (`SSM_esp32.ino:13538` through `SSM_esp32.ino:13565`).

## ESP-NOW Payloads

| Payload | Direction | Meaning | Source anchors |
|---|---|---|---|
| `Gubun:"15"` | SSM -> lower device | Store/execute pending RF card charge command | `SSM_esp32.ino:998` through `SSM_esp32.ino:1005`; `SSM_esp32.ino:1063` through `SSM_esp32.ino:1070`; `SSM_esp32.ino:13538` through `SSM_esp32.ino:13548` |
| `Gubun:"17"` | SSM -> lower device | Clear pending charge by `CuID`; comment says SB forwards to STM32 as `0x72 u2=9` | `SSM_esp32.ino:901` through `SSM_esp32.ino:915`; `SSM_esp32.ino:1109` through `SSM_esp32.ino:1148` |
| `ResRfCtrl` | lower device -> SSM | Terminal RF card control result such as `done`, `canceled`, or `failed` | `SSM_esp32.ino:9279` through `SSM_esp32.ino:9339` |

`SendChargeToSB()` writes a queued `Gubun:"15"` packet to one lower-device transmit buffer and marks the queue slot as sent (`SSM_esp32.ino:966` through `SSM_esp32.ino:1022`). `BroadcastChargeToAllSBs()` sends a no-retry `Gubun:"15"` to every eligible SB/APU-C and leaves the queue slot active for offline catch-up (`SSM_esp32.ino:1025` through `SSM_esp32.ino:1107`).

`BroadcastClearToAllSBs()` sends no-retry `Gubun:"17"` to every eligible SB/APU-C after completion/cancel/fail or TTL expiry (`SSM_esp32.ino:1109` through `SSM_esp32.ino:1155`).

## Reconnect And INFO Catch-Up

On lower-device `INFO` refresh, SSM throttles charge queue re-pushes to once per 30 seconds per device. If `chargeQueueCount > 0`, it calls `PushPendingChargesToDevice(pos)` and logs `[ChargeQ-PUSH] INFO-resume` when anything was sent (`SSM_esp32.ino:7355` through `SSM_esp32.ino:7380`).

`PushPendingChargesToDevice()`:

- Sends `Gubun:"15"` for active pending slots.
- Sends `Gubun:"17"` for completed slots that remain in the 24-hour catch-up window.
- Honors `targetMac` if present, and blocks a hard-coded MAC from MAC-free charge fan-out (`SSM_esp32.ino:930` through `SSM_esp32.ino:963`).

This means an offline device can receive either the pending charge or the clear instruction when it returns, depending on whether the SSM slot is still pending or already completed.

## Response Handling

The source intentionally distinguishes device save-ack from card-completion:

- A bare `Stat:"OK"` with `rfCard` only means the device saved the pending command into its local persistent queue. SSM logs it but does not dequeue (`SSM_esp32.ino:8707` through `SSM_esp32.ino:8733`).
- The real terminal path is `ResRfCtrl`. SSM decodes `CuID2` / `sCuID2`, extracts `Amnt`, and calls `Send_Operation(..., tResRfCtrl, ..., eventTime)` so Web receives `/usage` with `ResRfCtrl` and related RF card fields (`SSM_esp32.ino:9279` through `SSM_esp32.ino:9339`; `SSM_esp32.ino:3601` through `SSM_esp32.ino:3708`).
- `Send_Operation()` places `ResRfCtrl` in the Web payload, sends over Socket.IO when connected, and posts to `https://device.silotek.co.kr/usage`. If Web sending is busy, it saves the event to `/Event.txt` instead of dropping it (`SSM_esp32.ino:3648` through `SSM_esp32.ino:3653`; `SSM_esp32.ino:3684` through `SSM_esp32.ino:3707`).

## Queue Terminal States

| Result | SSM action | Source anchors |
|---|---|---|
| `done` | Broadcast `Gubun:"17"` clear, mark queue slot `completed`, keep it for 24-hour catch-up | `SSM_esp32.ino:9341` through `SSM_esp32.ino:9362`; `SSM_esp32.ino:767` through `SSM_esp32.ino:780` |
| `done` without queue match | Build CuID hex from response and broadcast clear anyway | `SSM_esp32.ino:9363` through `SSM_esp32.ino:9374` |
| `canceled` / `failed` before completion | Broadcast clear and immediately dequeue | `SSM_esp32.ino:9376` through `SSM_esp32.ino:9393` |
| `canceled` / `failed` after completion | Suppress duplicate `/usage` report | `SSM_esp32.ino:9321` through `SSM_esp32.ino:9329` |
| Pending TTL expiry | Broadcast clear, notify Web with `ResRfCtrl:"canceled"`, dequeue | `SSM_esp32.ino:21765` through `SSM_esp32.ino:21825` |
| Completed TTL expiry | Silent dequeue after 24 hours | `SSM_esp32.ino:21782` through `SSM_esp32.ino:21791` |

## Failure Signatures

Useful source-defined signatures:

- `[DEBUG-ChargeQ] operationType=..., SET_CARD=...`: Web command classification.
- `[ChargeQ] Enqueue[...]` or `[ChargeQ] Overwrite queue[...]`: SSM slot create/update.
- `[ChargeQ-BCST] Broadcast queue[...]`: MAC-free pending charge broadcast.
- `[ChargeQ-PUSH] INFO-resume`: reconnect/INFO catch-up push.
- `Stat:OK received from device`: lower device saved pending command; not terminal.
- `ResRfCtrl RECEIVED`: lower device reported terminal RF card result.
- `[ChargeQ-CLR] DONE`: successful completion, clear broadcast, 24-hour catch-up window.
- `[ChargeQ] Slot[...] TTL expired (30d...)`: pending charge expired without card completion.

## Open Questions

- No live RF card hardware or lower-device firmware behavior was observed.
- Target-MAC `SET_CARD` does not use the SSM charge queue in this source. If field logs show repeated target-MAC re-pushes, they likely come from a different firmware version or lower-device retry path, not this active SSM branch.
