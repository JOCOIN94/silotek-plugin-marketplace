# SB-STM Source Analysis Notes

Source basis: `https://github.com/stek747/SB-SmartBay.git@0b017619aed175ae7fdd72af5142f7f6993902c2`

Firmware version: `v2.34`, from `smartBay/Core/Src/main.c:31`.

## Total Command Count

- YAML command entries: 13.
- HELP-exposed commands: 9 (`SETRFGAIN`, `RFIDTEST`, `TOUCH`, `INSERT`, `OPERFUNCT`, `VRGCNT`, `CLRRGCNT`, `VCFGINDOOR`, `VDISPRS485`).
- Hidden live command: `TESTALIVE`.
- Non-string parser command branch: empty-line reset.
- HELP aliases recorded separately: `HELP` and `???`.

## Parser Branches Found

- Runtime UART0 receive loop begins at `smartBay/Core/Src/main.c:18157`.
- Empty enter with no buffered text enters the reset branch at `smartBay/Core/Src/main.c:18165`, calls `Send_Alive(256)`, prints `Reset.`, delays 100 ms, and calls `NVIC_SystemReset()`.
- String command dispatch is an `else if(!strcmp(...))` ladder from `TESTALIVE` at `smartBay/Core/Src/main.c:18174` through HELP/`???` at `smartBay/Core/Src/main.c:18340`.
- Backspace handling is at `smartBay/Core/Src/main.c:18349`; it decrements `Wrbufcnt` and prints the remaining buffer or `Empty!`.
- Buffer overflow handling is at `smartBay/Core/Src/main.c:18365`; when `Wrbufcnt >= 49`, the code prints that the UART0 receive buffer is cleared and resets `Wrbufcnt` and `buf[0]`.
- Unknown commands fall through to `printf("Unknown command : %s.\n", buf)` at `smartBay/Core/Src/main.c:18344`.

## Hidden Or Non-Obvious Commands

- `TESTALIVE` is live at `smartBay/Core/Src/main.c:18174` but omitted from the HELP string at `smartBay/Core/Src/main.c:18342`.
- Empty-line reset is a live branch before the string ladder and is not part of HELP.
- `VDISPRS485` is included in HELP and is also a toggle branch at `smartBay/Core/Src/main.c:18334`.

## Ambiguities Or Gaps

- `TOUCH` and `INSERT` change `ConfigBay.fOperOneTimeTouch` in RAM; no persistence call is present in those branches.
- `TESTALIVE` uses the local `flag` declared at `smartBay/Core/Src/main.c:17420` to alternate the value of `fskipSendingAlive`.
- No firmware download, flash, or format command branch was found in this HELP parser region.
- All `observed` fields are `null`; no hardware or serial port was accessed.

## Failure Criteria

- No Section 7 failure criterion triggered.
- Parser structure matched the plan: the HELP parser is a string-comparison ladder in source, source files are original source files, and command volume is small.
