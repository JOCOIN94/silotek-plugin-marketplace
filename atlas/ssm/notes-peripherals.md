# SSM Peripherals And Local Resources Notes

Source basis: https://github.com/stek747/ssm-esp32.git@178e29f7e94ab4ba2b1e1e2059e097bb377a2b98

Date: 2026-06-16
FW version: SSM260525-004

## Scope

This note maps source-visible SSM local resources and peripherals: filesystem, EEPROM, NVS preferences, RTC, WSCL reset pin, FTP/Telnet/AP-mode tools, and inactive compile-time candidates such as CAN, MQTT, and local HTTP server.

## Compile-Time Feature Flags

| Feature | Source status | Effect |
|---|---|---|
| `COM_CAN` | Commented out | CAN include/setup/send/receive blocks are not active in this source build |
| `HTTPSERVER` | Commented out | local `WebServer httpServer(8081)` and local update routes are not active |
| `DEFMQTT` | Commented out | MQTT callback/reconnect/client blocks are not active |

Source anchors: `SSM_esp32.h:1` through `SSM_esp32.h:2`; `SSM_esp32.h:52` through `SSM_esp32.h:54`; `SSM_esp32.h:67` through `SSM_esp32.h:86`; `SSM_esp32.h:118` through `SSM_esp32.h:122`; `SSM_esp32.ino:20309` through `SSM_esp32.ino:20351`; `SSM_esp32.ino:22005` through `SSM_esp32.ino:22029`.

ReadmeSSM also records MQTT removal/change history, but the authoritative source state for SSM260525-004 is `//#define DEFMQTT` (`ReadmeSSM.txt:393`; `ReadmeSSM.txt:433`; `SSM_esp32.h:68`).

## Filesystem

The source aliases `SPIFFS` to `LittleFS`:

- `#include <LittleFS.h>` and `#define SPIFFS LittleFS` are active; `<SPIFFS.h>` is commented (`SSM_esp32.h:23` through `SSM_esp32.h:28`).
- Boot calls `SPIFFS.begin(FORMAT_SPIFFS_IF_FAILED)`, logs `SPIFFS Mount Failed` on failure, then runs `SPIFFS_Proc()` and `ViewFileList()` (`SSM_esp32.ino:19869` through `SSM_esp32.ino:19888`).
- `SPIFFS_Format()` calls `SPIFFS.format()` and logs success/error (`SSM_esp32.ino:18058` through `SSM_esp32.ino:18072`).
- `ViewFileList()` and `ChkFileList()` enumerate files from filesystem root (`SSM_esp32.ino:18074` through `SSM_esp32.ino:18116`).

Primary persistent files loaded by `SPIFFS_Proc()`:

| File | Purpose | Source anchors |
|---|---|---|
| `/Security.txt` | `authCode` / SSMID storage | `SSM_esp32.ino:18230` through `SSM_esp32.ino:18251` |
| `/config.txt` | general config and registered MAC table | `SSM_esp32.ino:18262` through `SSM_esp32.ino:18293` |
| `/Bayconfig.txt` | bay configuration | `SSM_esp32.ino:18295` through `SSM_esp32.ino:18318` |
| `/Event.txt`, `/bkEvent.txt` | saved Web event replay | `SSM_esp32.h:228` through `SSM_esp32.h:229`; see `notes-event-reliability.md` |
| OTA binaries such as `/SSM.bin` | staged firmware update files | `SSM_esp32.ino:16693` through `SSM_esp32.ino:16709`; see `notes-ota-lifecycle.md` |

Serial commands `FORMAT`, `KSFFORMAT`, `WFORMAT`, `VFILELST`, `VFILE`, and related file commands operate on this filesystem (`SSM_esp32.ino:19362` through `SSM_esp32.ino:19425`).

## EEPROM

EEPROM is active and sized at 512 bytes:

- `EEPROM_SIZE = 512`, `EEPROM_POS_FORSSID = 256`, `SIZE_SSMID = 50`, `EEPROM_CHANNEL = 100` (`SSM_esp32.h:171` through `SSM_esp32.h:179`).
- Boot reads EEPROM address 1 as a one-shot AP-mode flag. If it is `0x55`, SSM enters AP mode and clears the flag (`SSM_esp32.ino:19782` through `SSM_esp32.ino:19796`).
- Boot reads `EEPROM_CHANNEL`; valid 1..11 values become `ichannel`, otherwise channel 11 is used (`SSM_esp32.ino:19823` through `SSM_esp32.ino:19840`).
- `RdEEPROM()` bounds-checks address+length and reads bytes; `WrEEPROM()` writes and verifies each byte or single char (`SSM_esp32.ino:14196` through `SSM_esp32.ino:14260`).
- Router channel scan can write a changed channel back to `EEPROM_CHANNEL` and reconnect (`SSM_esp32.ino:15568` through `SSM_esp32.ino:15580`; `SSM_esp32.ino:22213` through `SSM_esp32.ino:22216`).

The old authCode/SSMID EEPROM path is present but commented in boot; current active storage is `/Security.txt` (`SSM_esp32.ino:19798` through `SSM_esp32.ino:19821`; `SSM_esp32.ino:18230` through `SSM_esp32.ino:18251`).

## NVS Preferences

`Preferences preferences` is active for the small rolling `uniqueValue` used by route/event IDs:

- Global declaration and `MACUNIQUEVALUE = 99` appear in the header (`SSM_esp32.h:88` through `SSM_esp32.h:93`).
- Boot opens namespace `storage`, reads `Unique`, perturbs it, writes it back, and prints the obtained value (`SSM_esp32.ino:20523` through `SSM_esp32.ino:20534`).
- `getUniqueValue()` increments the value, wraps at 99, and periodically persists it with `preferences.putUChar("Unique", uniqueValue)` (`SSM_esp32.ino:97` through `SSM_esp32.ino:110`).

## RTC

The source uses `ESP32Time rtc(0)` as the software RTC object (`SSM_esp32.h:56` through `SSM_esp32.h:57`). RTC is set from NTP/system time and can be manually adjusted through serial commands:

- `setTimeForSSM()` calls `rtc.setTimeStruct(timeinfo)` after NTP sync (`SSM_esp32.ino:18476` through `SSM_esp32.ino:18547`).
- `printLocalTime()` and `GetTime()` also copy system time into RTC (`SSM_esp32.ino:18360` through `SSM_esp32.ino:18473`).
- `SETRTCTIME` / `VRTC` / `VTIME` expose manual set/view commands (`SSM_esp32.ino:18941` through `SSM_esp32.ino:18980`).

See `notes-time-network.md` for RTC exchange with lower devices.

## WSCL Reset Pin

`WSCL_RESET` is active on GPIO 12 and configured as open-drain low-active:

- Defined as `#define WSCL_RESET 12` (`SSM_esp32.h:181` through `SSM_esp32.h:183`).
- Boot sets `pinMode(WSCL_RESET, OUTPUT_OPEN_DRAIN)` and drives it high (`SSM_esp32.ino:19733` through `SSM_esp32.ino:19735`).
- Web Socket.IO command body field `WSRESET == 1` pulses the pin low for 500 ms and returns high (`SSM_esp32.ino:15070` through `SSM_esp32.ino:15077`).

## AP-Mode Tools: FTP, Telnet, Optional Local HTTP

AP-mode starts several local service surfaces:

- SoftAP SSID is `apSsidDef + config.apSsid`, with `WiFi.mode(WIFI_MODE_AP)`, `WiFi.softAP()`, and `WiFi.setSleep(false)` (`SSM_esp32.ino:20053` through `SSM_esp32.ino:20084`).
- FTP server uses `SimpleFTPServer` and starts as `Silotek` / `123456` (`SSM_esp32.h:30` through `SSM_esp32.h:31`; `SSM_esp32.h:2097` through `SSM_esp32.h:2098`; `SSM_esp32.ino:20090` through `SSM_esp32.ino:20095`).
- Telnet server uses `NetworkServer server(23)` with up to two clients (`SSM_esp32.h:2100` through `SSM_esp32.h:2105`; `SSM_esp32.ino:20098` through `SSM_esp32.ino:20103`).
- The local HTTP update server block is guarded by inactive `HTTPSERVER`; it is present in source but not active in this compile state (`SSM_esp32.h:118` through `SSM_esp32.h:122`; `SSM_esp32.ino:20105` through `SSM_esp32.ino:20167`).

## Inactive / Non-SSM-Local Candidates

- CAN functions and setup blocks exist under `#ifdef COM_CAN`, but `COM_CAN` is commented out (`SSM_esp32.h:1`; `SSM_esp32.ino:5002` through `SSM_esp32.ino:5061`; `SSM_esp32.ino:20309` through `SSM_esp32.ino:20351`).
- MQTT functions exist under `#ifdef DEFMQTT`, but `DEFMQTT` is commented out (`SSM_esp32.h:68` through `SSM_esp32.h:86`; `SSM_esp32.ino:229` through `SSM_esp32.ino:328`).
- Local HTTP update routes exist under `#ifdef HTTPSERVER`, but `HTTPSERVER` is commented out (`SSM_esp32.h:2`; `SSM_esp32.ino:20105` through `SSM_esp32.ino:20167`).
- OLED/display references found in active source are comments around `disDstMac`; no active display object or OLED write path was found (`SSM_esp32.ino:13044`; `SSM_esp32.ino:13219`; `SSM_esp32.ino:13270`).
- PN532/RC522 is mentioned as a lower-device RF reader in charge comments, not as an SSM-local hardware interface (`SSM_esp32.ino:1055` through `SSM_esp32.ino:1058`).
- No active `Serial1`, `Serial2`, `HardwareSerial`, or RS485 command path was found by source search.

## Failure Signatures

Useful source-defined signatures:

- `[Proc-Err] SPIFFS Mount Failed`: filesystem mount failed at boot.
- `[Proc-Alarm] Success formatting` / `[Proc-Err] Formatting-Err`: filesystem format result.
- `[Proc-Err] Out of EEPROM length defined(512).`: EEPROM helper bounds failure.
- `*** Start APmode`: EEPROM one-shot AP-mode flag was consumed.
- `[Proc-Alarm] A saved channel number`: EEPROM channel value used at boot.
- `*** WSCL HW Reset...`: Web command pulsed `WSCL_RESET`.

## Open Questions

- This is source-only. It does not prove board-level wiring, actual GPIO electrical behavior, or deployed compile flags outside this exact source snapshot.
