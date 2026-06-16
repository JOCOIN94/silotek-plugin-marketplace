# SSM Time And Network Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps time synchronization and network-health behavior in SSM source: NTP/RTC setup, lower-device time propagation through `INFO`, serial time commands, WiFi reconnect logic, Socket.IO state, HTTP post health, and network-related fault codes.

## Time Constants And Time Zone Model

| Item | Source-defined behavior | Source anchors |
|---|---|---|
| NTP refresh interval | `PERIOD_GETTIME = 60 * 60 * 1000` | `SSM_esp32.h:2000` through `SSM_esp32.h:2005` |
| Time zones | `easternTimeZone = EST5EDT...`, `koreaTimeZone = KST-9` | `SSM_esp32.h:1991` through `SSM_esp32.h:2002` |
| Active NTP call | `setTimeForSSM("UTC0", ntpServer, "time.nist.gov", "time.google.com")` | `SSM_esp32.ino:20480` through `SSM_esp32.ino:20483`; `SSM_esp32.ino:21994` through `SSM_esp32.ino:22001`; `SSM_esp32.ino:22044` through `SSM_esp32.ino:22051` |

`setTimeForSSM()` calls `configTzTime()`, waits for `getLocalTime()`, selects country/time-zone handling from WiFi country code, writes the time into RTC with `rtc.setTimeStruct(timeinfo)`, and prints RTC time (`SSM_esp32.ino:18476` through `SSM_esp32.ino:18547`).

`printLocalTime()` prints system time fields and also writes RTC from the obtained `tm` struct (`SSM_esp32.ino:18360` through `SSM_esp32.ino:18401`). `GetTime()` is a shorter system-time-to-RTC helper (`SSM_esp32.ino:18449` through `SSM_esp32.ino:18473`).

## RTC Drift And Lower-Device Time Exchange

`AnalyzerTime()` compares a received year/month/day/hour/minute against current RTC. It returns `-1` when the received time is later by more than two minutes or when SSM RTC is later than the received time (`SSM_esp32.ino:127` through `SSM_esp32.ino:148`).

When SSM sends lower-device `INFO` requests:

- If SSM system time is after `2026-01-01 00:00:00 UTC`, it includes `RTC[0..5]` from RTC and sends `INFO:"REQ"` with channel and target identity (`SSM_esp32.ino:2005` through `SSM_esp32.ino:2032`).
- If system time is not valid enough, it sends `ASK:"TIME"` instead (`SSM_esp32.ino:2018` through `SSM_esp32.ino:2021`).
- Targeted communication checks use the same `RTC` / `ASK:"TIME"` pattern (`SSM_esp32.ino:2050` through `SSM_esp32.ino:2101`).

When SSM receives an `INFO` packet containing `RTC`, it calls `AnalyzerTime()` and, if correction is required, logs `** [SET] NEW RTC TIME.` and calls `setRtcFromLocalData()` with the received values (`SSM_esp32.ino:7235` through `SSM_esp32.ino:7265`).

## Serial Time Commands

| Command | Behavior | Source anchors |
|---|---|---|
| `SETRTCTIME` | Prompts year/month/day/hour/minute/second and calls `setRtcFromLocalData()` | `SSM_esp32.ino:18941` through `SSM_esp32.ino:18970` |
| `VRTC` | Prints RTC date/time | `SSM_esp32.ino:18971` through `SSM_esp32.ino:18976` |
| `VTIME` | Prints system local time fields through `VTime()` | `SSM_esp32.ino:18977` through `SSM_esp32.ino:18980`; `SSM_esp32.ino:18403` through `SSM_esp32.ino:18447` |

## WiFi And Socket Setup

In AP-mode setup, SSM starts SoftAP, FTP, Telnet, and optional local HTTP server when `HTTPSERVER` is compiled (`SSM_esp32.ino:20053` through `SSM_esp32.ino:20169`). In normal station mode, SSM scans router channel, connects to router when needed, calls `SetWifiProc()`, registers Socket.IO event handling, and connects to `ssm-ws.silotek.co.kr:443` with auth header (`SSM_esp32.ino:20353` through `SSM_esp32.ino:20441`).

`socketIOEvent()` sets `fConnectSocket = false` on disconnect and `true` on connect, ACKs incoming Web messages with `reqId`, optionally handles `WSRESET`, and queues the Web command body via `wrWebMsg()` (`SSM_esp32.ino:15006` through `SSM_esp32.ino:15083`).

## External Network Probe

`chkConExtNetwork()` tries ping targets in this order:

1. `www.google.com`
2. `1.1.1.1`
3. `168.126.63.1`
4. `210.220.163.82`

Any success sets `fOKping = true`; all failures set `fOKping = false` (`SSM_esp32.ino:2491` through `SSM_esp32.ino:2518`).

During the main loop:

- If WiFi or Socket.IO is down, SSM sets `fOKping = false` and periodically tries to reconnect. If the previously found SSID is empty, it rescans and reconnects; otherwise it tries `ConnRouter(curfoundSSID, curfoundPWD)` (`SSM_esp32.ino:21875` through `SSM_esp32.ino:21963`).
- On first connected state, SSM records local IP, calls `setTimeForSSM("UTC0", ...)`, prints time, initializes ping and file-upload timers, and stores WiFi channel (`SSM_esp32.ino:21965` through `SSM_esp32.ino:22012`).
- While connected, it probes external network every `CHKPING = 20s`, and refreshes NTP/RTC every hour when `fOKping == true` (`SSM_esp32.h:2118` through `SSM_esp32.h:2119`; `SSM_esp32.ino:22032` through `SSM_esp32.ino:22055`).

## Network Fault State

| Fault | Trigger source | Message | Source anchors |
|---|---|---|---|
| `C0003` | WiFi disconnect state changes exceed `JUDGECNT_ERRWIFI = 2` inside a 20-second check window | `WiFi is often disconnected.` | `SSM_esp32.h:2128` through `SSM_esp32.h:2133`; `SSM_esp32.ino:21208` through `SSM_esp32.ino:21223`; `SSM_esp32.ino:21261` through `SSM_esp32.ino:21281` |
| `C0004` | Socket.IO disconnect state changes exceed `JUDGECNT_ERRSOCKET = 2` inside a 10-second check window | `Socket is often disconnected.` | `SSM_esp32.h:2121` through `SSM_esp32.h:2126`; `SSM_esp32.ino:21232` through `SSM_esp32.ino:21247`; `SSM_esp32.ino:21284` through `SSM_esp32.ino:21299` |
| `C0005` | HTTP send state reaches `ERR_COMM` after repeated failures | `It failed to send to the Http server.` | `SSM_esp32.h:1959`; `SSM_esp32.h:2135`; `SSM_esp32.ino:2831` through `SSM_esp32.ino:2904`; `SSM_esp32.ino:21303` through `SSM_esp32.ino:21318` |

`Http_Proc()` marks `stHTTPSend = ERR_COMM` on `http.begin()` failure, after repeated negative HTTP response codes, or after selected non-2xx responses; positive responses reset the counter and set `stHTTPSend = OK_COMM` (`SSM_esp32.ino:2831` through `SSM_esp32.ino:2904`). Saved-event replay uses the same negative-response counter for delayed C0005 reporting (`SSM_esp32.ino:21643` through `SSM_esp32.ino:21680`).

## Failure Signatures

Useful source-defined signatures:

- `>> Set the ntc time to UTC0....`: NTP synchronization started.
- `Failed to obtain time from NTP server`: NTP/local-time acquisition failed.
- `** [SET] NEW RTC TIME.`: SSM accepted lower-device RTC data and changed RTC.
- `[WiFi] connected`: station mode connected and time initialization follows.
- `>> Try connecting to the WiFi again.`: reconnect loop entered.
- `>> Ping - fail`: external network probe failed.
- `[IOc] Disconnected!` / `[IOc] Connected to url`: Socket.IO state change.
- `[HTTP] Negative response cnt`: HTTP negative response has not yet crossed fault threshold.
- `C0003`, `C0004`, `C0005`: generated WiFi/Socket/HTTP fault codes.

## Open Questions

- The source uses `UTC0` for NTP setup and later changes time-zone behavior based on WiFi country code. No deployed locale behavior was observed.
- No live network, DNS, NTP, or Socket.IO session was exercised.
