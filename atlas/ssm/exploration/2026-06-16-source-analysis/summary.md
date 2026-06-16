# SSM Source Analysis Summary

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This exploration executed `docs/plans/2026-06-16-ssm-atlas-source-analysis.md` in P0 -> P1 -> P2 order. The source tree `firmware-src/ssm-esp32` was treated as read-only. No serial, hardware, Web, or deployed-device observation was performed; every `observed` field in the YAML atlas remains `null`.

## Outputs

### P0

- `atlas/ssm/SSM260525-004.yaml`: SSM command atlas with source-cited parser surfaces and `observed: null`.
- `atlas/ssm/notes-log-vocabulary.md`: boot, parser, INFO/STCOMM, Web, ESP-NOW, card/charge, OTA, event, and reset log vocabulary.
- `atlas/ssm/notes-source-analysis.md`: parser count, parser-site split, hidden/test commands, boot menu, inactive features, and source-vs-plan notes.
- `atlas/ssm/notes-reset-triggers.md`: active reset/fReset paths and inactive reset candidates.

### P1

- `atlas/flows.md`: cross-device SSM/Web/lower-device flows.
- `atlas/ssm/notes-web-commands.md`: `OperationType`, Socket.IO dispatch, body-key commands, and SSM-originated Web endpoints.
- `atlas/ssm/notes-espnow-protocol.md`: ESP-NOW setup/send/receive, route headers, RSSI route plan, ACK and duplicate handling.
- `atlas/ssm/notes-ota-lifecycle.md`: OTA Web/serial entry points, admission gates, binary download, lower-device prep/piece/reflash, and cleanup.
- `atlas/ssm/notes-fault-codes.md`: `C0002`, `C0003`, `C0004`, `C0005`, `C0006`, `C0008`, `S0001`, and lower-device `uFault` paths.
- `atlas/ssm/notes-config-model.md`: `/Security.txt`, `/config.txt`, `/Bayconfig.txt`, Config/ConfigBay, Web bayConfig, and lower-device CBay sync.
- `atlas/ssm/notes-comm-health.md`: INFO counters, STCOMM/REQSTCOMM, inspection mode, stale/offline freshness, and C0002 confirmation.
- `atlas/ssm/notes-card-charge.md`: MAC-free charge queue, target-MAC direct send, `Gubun:15/17`, `ResRfCtrl`, `/usage`, reconnect catch-up, and TTL cleanup.
- `atlas/ssm/notes-event-reliability.md`: `saveEvent`, `/Event.txt`, `/bkEvent.txt`, `/missingEvents`, duplicate suppression, ACK replay, and C0008 queue fault.

### P2

- `atlas/ssm/notes-time-network.md`: NTP/RTC, INFO time exchange, serial time commands, WiFi/Socket/HTTP health, and C0003/C0004/C0005.
- `atlas/ssm/notes-peripherals.md`: LittleFS/SPIFFS alias, EEPROM, NVS, RTC, WSCL reset pin, AP-mode FTP/Telnet, and inactive peripheral candidates.
- `atlas/topology.md`: source topology across SSM, Web, Socket.IO, binary server, lower devices, local stores, and AP-mode tools.
- `atlas/ssm/discrepancies.md`: source-vs-Readme and enum-vs-active-branch discrepancies found during P2.
- `atlas/ssm/exploration/2026-06-16-source-analysis/summary.md`: this summary.

## Key Source Conclusions

- `SSM260525-004` is the authoritative firmware string in this source snapshot (`SSM_esp32.h:4`).
- The live runtime `serialCmd` surface contains 56 logical live commands, plus HELP/parser and boot-menu surfaces documented in the YAML atlas.
- `COM_CAN`, `HTTPSERVER`, and `DEFMQTT` are present as source blocks but inactive because their defines are commented out.
- Local persistent storage uses the `SPIFFS` symbol but the active backend is `LittleFS`.
- Current communication-fault classification uses 35/65 hysteresis, not the older Readme 50% threshold.
- Current fault payloads use `faultCode` for the fault identifier and `message` for details.
- Active WSCL hardware reset is a Socket.IO body key `WSRESET`, not `operationType == CMD_TO_WSCL`.
- MAC-free `SET_CARD` uses a CuID-centered SSM queue and reconnect catch-up; target-MAC `SET_CARD` is direct-send only in this source snapshot.
- Event reliability has multiple layers: Web fallback to `/Event.txt`, retry backup to `/bkEvent.txt`, bulk `/missingEvents`, raw ESP-NOW duplicate buffers, route duplicate cache, route ACK replay, and per-MAC `Unique` cache.
- OTA is stateful and guarded by mode/admission checks; lower-device OTA uses explicit prep/piece/reflash/cancel steps and SSM self-reflash uses local filesystem staging.

## Discrepancies To Preserve

`atlas/ssm/discrepancies.md` records these source-analysis differences:

- Readme C0002 50% criterion vs active 35/65 hysteresis.
- Older Readme fault-code-as-`message` statement vs active `faultCode` field.
- `UNIT_PRICE = 6` enum/legacy branch vs active `REQ_UNITPRICE = 20`.
- `CMD_TO_WSCL = 500` enum vs active `WSRESET` body-key handling.
- `SPIFFS` naming vs active `LittleFS` implementation alias.

## Verification Notes

- The plan required source-only extraction. Hardware and serial observations were intentionally not performed.
- Source-based uncertainty is recorded as `observed: null` in the YAML atlas.
- Final command verification should check YAML parseability, required file presence, progress completion, source HEAD, and source worktree cleanliness.

## Open Follow-Up

- Cross-firmware validation with SB ESP32 / STM32 sources would be needed to prove lower-device interpretation of `Gubun:15`, `Gubun:17`, route headers, and OTA binary commands.
- Runtime validation would require serial/Web/hardware observation and should not overwrite these source-only notes without marking the observation source and date.
