# SSM Reset Trigger Catalog

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope And Use

This catalog maps active `ESP.restart()` and `fReset` paths to operator-visible causes. It excludes calls inside disabled preprocessor blocks or block-commented source.

Useful reset triage queries:

```text
query_serial_logs(pattern="WEB ORDER_RESET - SSM")
query_serial_logs(pattern="WEB ORDER_APMODE - SSM")
query_serial_logs(pattern="Reboot due to consecutive negative response")
query_serial_logs(pattern="Failed to initialize ESP-NOW")
query_serial_logs(pattern="Failed to initialize broadcast peer")
query_serial_logs(pattern="Reboot...")
```

## Active Reset Paths

| Trigger | Condition | Log signal | Recovery / operator note | Source |
|---|---|---|---|---|
| Serial `RESET` | `serialCmd("RESET")` | no dedicated prefix; command echo depends on serial input layer | Reboots SSM after socketIO disconnect and 1500 ms delay. Treat as R2 and require operator intent. | `SSM_esp32.ino:18907` through `SSM_esp32.ino:18913` |
| Serial `APMODE` | `serialCmd("APMODE")` | no dedicated prefix in branch | Writes EEPROM AP-mode flag `0x55`, disconnects socketIO, delays, then reboots. Next boot enters AP mode. | `SSM_esp32.ino:19448` through `SSM_esp32.ino:19459` |
| Serial `SETCONFIG` success | `setConfig() == 0` inside `serialCmd("SETCONFIG")` | `Reboot...` | Config changes can reboot SSM after socketIO disconnect. | `SSM_esp32.ino:19532` through `SSM_esp32.ino:19550` |
| Boot-menu `S` | Reset-time setup key `S`; `setConfig() == 0` | boot menu text shows `Set the config.(Reboot) ------- 'S'` | Sets `fReset`, then post-menu restart occurs after 2000 ms. | `SSM_esp32.ino:19996` through `SSM_esp32.ino:20000`; restart at `SSM_esp32.ino:20041` through `SSM_esp32.ino:20044` |
| Boot-menu `I` | Reset-time setup key `I`; `setSSMID()` succeeds | boot menu text shows `Set the SSMID(Reboot) --------- 'I'` | Sets `fReset`, then post-menu restart occurs after 2000 ms. | `SSM_esp32.ino:20007` through `SSM_esp32.ino:20010`; restart at `SSM_esp32.ino:20041` through `SSM_esp32.ino:20044` |
| Boot-menu `R` | Reset-time setup key `R` | boot menu text shows `Reboot ------------------------ 'R'` | Sets `fReset`, breaks the menu loop, then restarts. | `SSM_esp32.ino:20012` through `SSM_esp32.ino:20014`; restart at `SSM_esp32.ino:20041` through `SSM_esp32.ino:20044` |
| AP-mode loop delayed reset | `fReset == true` while AP-mode loop is running | depends on the command that set `fReset` | Delays 2000 ms, restarts, and halts in `while(1)` after `ESP.restart()`. | `SSM_esp32.ino:20186` through `SSM_esp32.ino:20189` |
| Web legacy `RESET:"YES"` | Web JSON command path receives `RESET == "YES"` after optional config save | ` - Reset` | Disconnects socketIO, delays, restarts. | `SSM_esp32.ino:11304` through `SSM_esp32.ino:11313` |
| Web `RESET` targeting SSM | Web JSON has `RESET`, and `RESET == "SSM"` or `mac` is empty or `mac == "SSM"` | `[Proc-WebTx] Resp-RESET`, `[Proc-Alarm] WEB ORDER_RESET - SSM` | Acknowledges to Web, disconnects socketIO, delays, restarts. If `mac` targets another known device, SSM forwards `RESET` over ESP-NOW instead of self-resetting. | `SSM_esp32.ino:11840` through `SSM_esp32.ino:11880`; forward path starts at `SSM_esp32.ino:11884` |
| Web `APMODE` targeting SSM | Web JSON has `APMODE`, and `APMODE == "SSM"` or `mac` is empty or `mac == "SSM"` | `[Proc-WebTx] Resp-APMODE`, `[Proc-Alarm] WEB ORDER_APMODE - SSM` | Writes EEPROM AP-mode flag, disconnects socketIO, delays, restarts. If `mac` targets another known device, SSM forwards `APMODE` over ESP-NOW instead. | `SSM_esp32.ino:11933` through `SSM_esp32.ino:11975`; forward path starts at `SSM_esp32.ino:11979` |
| ESP-NOW broadcast peer init failure | `broadcast_peer.begin()` fails | `Failed to initialize broadcast peer`, `Reebooting in 5 seconds...` | Disconnects socketIO, waits 1500 ms, restarts. This points to ESP-NOW peer setup failure during initialization. | `SSM_esp32.ino:15806` through `SSM_esp32.ino:15813` |
| ESP-NOW protocol init failure | `ESP_NOW.begin()` fails | `Failed to initialize ESP-NOW`, `Reeboting in 5 seconds...` | Disconnects socketIO, waits 1500 ms, restarts. This points to ESP-NOW stack initialization failure. | `SSM_esp32.ino:15817` through `SSM_esp32.ino:15826` |
| Local ESP32 reflash success | `ReflashProc()` writes firmware successfully | `  -> Reflash was a success.`, `Reboot...` | Sets `ResetTime = 5000` and `fReset = true`; main repeat loop later disconnects socketIO and restarts when `ResetTime` reaches zero. | `SSM_esp32.ino:16705` through `SSM_esp32.ino:16718`; delayed restart at `SSM_esp32.ino:21327` through `SSM_esp32.ino:21334` |
| Main-loop delayed reset flag | Any active path sets `fReset == true` and `ResetTime` counts to zero | depends on setter; final restart has no unique prefix | Disconnects socketIO, waits 1500 ms, restarts. Use earlier logs to identify the setter. | `SSM_esp32.ino:21327` through `SSM_esp32.ino:21334` |
| HTTP negative response accumulation | `procNegativeHttpResponse()` sees enough negative HTTP responses | `*** Reboot due to consecutive negative response from http library.` | Saves fault JSON with `faultCode: C0006`, `message: Rebooted by Http Negative Response`, sets `fReset`, then delayed reset path restarts. | `SSM_esp32.ino:21381` through `SSM_esp32.ino:21405`; restart at `SSM_esp32.ino:21327` through `SSM_esp32.ino:21334` |

## Readme-Backed Context

- ReadmeSSM documents SSM reset during OTA/download as an expected recovery concern: reset clears prior INIT/READY/FORMAT state, while devices in download can continue requesting pieces after SSM boot (`ReadmeSSM.txt:268` through `ReadmeSSM.txt:271`). The source has delayed reset/reflash and OTA piece request handling paths, so OTA reset triage should inspect both `[OTA]` logs and post-boot piece requests.
- ReadmeSSM records a historical country-code reset loop where country returned `"01"` instead of `"KR"` and the mitigation was to force `"KR"` (`ReadmeSSM.txt:620` through `ReadmeSSM.txt:626`). Current source does not reset on country mismatch in the checked branch; it prints initialization and calls `esp_wifi_set_country_code("KR", true)` plus `chgTimeZone("KR")` after the commented reset block (`SSM_esp32.ino:18509` through `SSM_esp32.ino:18520`).
- ReadmeSSM records old HTTP -1 handling that included reset after repeated failures (`ReadmeSSM.txt:689` through `ReadmeSSM.txt:692`). Current source implements an HTTP negative-response reset path via `procNegativeHttpResponse()` and logs the consecutive negative response reboot message (`SSM_esp32.ino:21381` through `SSM_esp32.ino:21405`).

## Inactive Or Excluded Reset-Like Paths

- MQTT `RESET` path calls `ESP.restart()` at `SSM_esp32.ino:262`, but it is excluded because `DEFMQTT` is disabled in `SSM_esp32.h:68` and the MQTT code is behind `#ifdef DEFMQTT` (`SSM_esp32.ino:229`).
- Local HTTP setup/update reset paths include `comeincnt >= 2` and `/update` upload callback resets (`SSM_esp32.ino:11114`, `SSM_esp32.ino:20128`), but they are excluded because `HTTPSERVER` is disabled in `SSM_esp32.h:2` and these handlers are behind `#ifdef HTTPSERVER` (`SSM_esp32.ino:10707`, `SSM_esp32.ino:20105`).
- `SCOM` contains an `ESP.restart()` at `SSM_esp32.ino:19496`, but the whole branch is block-commented (`SSM_esp32.ino:19462` through `SSM_esp32.ino:19502`).
- Country-code reset code around `fReset = true` is inside a block comment; current live code forces country/timezone instead (`SSM_esp32.ino:18509` through `SSM_esp32.ino:18520`).
- A commented `ESP.restart()` at `SSM_esp32.ino:11103` and commented `fReset` at `SSM_esp32.ino:21915` were not mapped as active reset triggers.

## Operator Triage Rules

1. If logs show `WEB ORDER_RESET - SSM` or `WEB ORDER_APMODE - SSM`, classify the reset as Web-command initiated before blaming watchdog, power, or firmware crash.
2. If logs show `Failed to initialize ESP-NOW` or `Failed to initialize broadcast peer`, classify it as startup ESP-NOW initialization failure.
3. If logs show `Reboot due to consecutive negative response from http library.`, classify it as HTTP negative-response reset and inspect `/fault` or saved event behavior next.
4. If logs show `Reflash was a success.` followed by `Reboot...`, classify it as expected post-reflash delayed reset.
5. If only `FW Ver:` appears after an unexplained reboot, search earlier retained logs for `fReset` setters above; the final delayed reset path itself does not identify the setter.
