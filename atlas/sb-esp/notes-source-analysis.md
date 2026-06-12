# SB-ESP Source Analysis Notes

Source basis: `https://github.com/stek747/SB-SmartBay.git@0b017619aed175ae7fdd72af5142f7f6993902c2`

Firmware version: `SB260610-001`, from `sb-esp32/SB_ESP32.h:8`.

## Total Command Count

- YAML command entries: 49.
- Unique command strings: 47.
- `serialCmd(String str)` live branches: 40, from `sb-esp32/SB_ESP32.ino:15013` through `sb-esp32/SB_ESP32.ino:15532`.
- Parser/help entries outside `serialCmd`: `HELP`, `???`, and `MHELP`, with `HELP` and `???` split by context because normal runtime serial and AP/telnet print different lists.
- Boot-menu entries: `D`, `S`, `B`, `R`.

## Parser Branches Found

- `serialCmd(String str)` begins at `sb-esp32/SB_ESP32.ino:15013`. Live command branches were extracted from direct `str == "..."` comparisons only. Branches inside block comments (`READOUTFW`, `SETGID`, `SCOM`, `Ver`, `DEBUG`) were not counted.
- Normal runtime serial parsing is in `loop()` at `sb-esp32/SB_ESP32.ino:16505`. It buffers serial input into `msg`, handles `>` and `<` command history, backspace, tab echo, buffer timeout clearing, and executes on enter when `msg.length() > 2`. Its `HELP`/`???` branch at `sb-esp32/SB_ESP32.ino:16578` prints 34 commands and does not expose `MHELP`.
- AP-mode serial/telnet parsing is in the AP-mode setup loop at `sb-esp32/SB_ESP32.ino:15853`. Its `HELP`/`???` branch at `sb-esp32/SB_ESP32.ino:15908` prints only `RESET`, `REFLASHSTM`, and `REFLASHESP`; `MHELP` at `sb-esp32/SB_ESP32.ino:15913` prints a longer 30-command list; other strings dispatch to `serialCmd(msg)` at `sb-esp32/SB_ESP32.ino:15937`.
- Telnet input collection is in `telnetProc_loop()` at `sb-esp32/SB_ESP32.ino:14749`. It accepts telnet clients, echoes input, handles backspace/tab, sets `fendMsg` on CR/LF at `sb-esp32/SB_ESP32.ino:14850`, and stores text in `strRevedDatFromClient`. It does not implement a separate command set; the AP-mode parser later copies `strRevedDatFromClient` into `msg` and dispatches the same branch logic.
- Boot menu is in setup at `sb-esp32/SB_ESP32.ino:15652`. It starts with `tmpcnt = 1000`, refreshes to 5000 when any key is received, and handles `D`, `S`, `B`, and `R` at `sb-esp32/SB_ESP32.ino:15660` through `sb-esp32/SB_ESP32.ino:15672`.

## Hidden Or Non-Obvious Commands

- `MHELP` is hidden from normal runtime serial and appears only in the AP-mode/telnet parser.
- Commands present in `serialCmd` but absent from AP/telnet `MHELP`: `PRINTSENDPROC`, `VSAVEEVENTCNT`, `CHKMEM`, `CMPMEM`, `MGWANGCHA`, `OPERFUNCT`, `CDOWNBIN`, `VAL`, `DUMPFILE`, `SERIAL`.
- Commands present in `serialCmd` but absent from normal runtime serial `HELP`: `MGWANGCHA`, `OPERFUNCT`, `CDOWNBIN`, `VAL`, `DUMPFILE`, `SERIAL`.
- R3 entries include file removal/format/download/reflash paths: `DOWNBIN`, `CDOWNBIN`, `REMFILE`, `FORMAT`, `WFORMAT`, `REFLASHESP`, `REFLASHSTM`, and boot-menu `D`.

## Ambiguities Or Gaps

- The plan mentioned boot-menu `D/S/B/I/R`, but current HEAD has no `tmpuart0 == 'I'` branch and the printed menu contains only `D`, `S`, `B`, `R`, plus "any key except above" to extend the timeout. No `I` atlas command was created.
- `runtime-telnet` is available only while AP mode is active and a telnet client is connected. The telnet source code is transport handling; command behavior is the AP-mode parser plus `serialCmd`.
- `sb-esp32/관리자 모드 활용.txt` exists but was not used for atlas commands because the plan defined it as outside command-atlas scope.
- All `observed` fields are `null`; no hardware or serial port was accessed.

## Failure Criteria

- No Section 7 failure criterion triggered.
- Parser structures matched the plan: `serialCmd` exists, command dispatch uses string comparisons, source files are original source files, and command volume is small.
