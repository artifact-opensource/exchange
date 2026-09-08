# Huawei OptiXstar / EchoLife ONT Series — Research Report
## Can It Be Repurposed as a Mesh Relay Node?

**Date:** March 5, 2026
**Researcher:** AVA (Artifact Virtual)
**Context:** StormFiber Pakistan ISP-provided fiber ONT/router combo. Evaluating repurposing potential for mesh networking.

---

## TL;DR — The Verdict

**OpenWrt: ❌ NO.** Not a single OptiXstar/EchoLife V5-series model is supported by OpenWrt. The HiSilicon chipset is proprietary and completely unsupported.

**Mesh relay: ⚠️ PARTIALLY POSSIBLE** — but only via bridge mode + external hardware, not natively on the device itself. The WiFi radio cannot be independently controlled for mesh operation.

**Best strategy:** Put it in bridge mode → use a proper OpenWrt-compatible router (GL.iNet, TP-Link, etc.) behind it → run mesh on THAT device. The Huawei box becomes a dumb fiber-to-ethernet converter.

---

## 1. Models in the OptiXstar / EchoLife Line

### GPON ONTs (Home/Residential — what StormFiber typically deploys)

| Model | WiFi | Ports | PON Type | Notes |
|-------|------|-------|----------|-------|
| **EchoLife HG8145V5** | 2.4GHz single-band | 4 GE + 2 POTS + 1 USB | GPON | **Most common in Pakistan/StormFiber** |
| **EchoLife HG8245H5** | 2.4G + 5G dual-band | 4 GE + 2 POTS + 2 USB | GPON | Dual-band variant |
| **EchoLife HG8247H5** | 2.4G + 5G dual-band | 4 GE + 2 POTS + 2 USB | GPON | Similar to HG8245H5 |
| **EchoLife HG8240T5** | None (bridging ONT) | 4 GE | GPON | No WiFi, pure bridge |
| **EchoLife HG8141A5** | 2.4GHz | 1 GE + 1 FE + 1 POTS | GPON | Budget/entry-level |
| **EchoLife EG8145V5** | 2.4GHz | 4 GE + 2 POTS + 1 USB | GPON | Newer naming (EG prefix) |
| **EchoLife EG8021V5** | None | 1 GE | GPON | Minimal bridge ONT |

### XG-PON / XGS-PON ONTs (10G — newer deployments)

| Model | WiFi | Ports | PON Type | Notes |
|-------|------|-------|----------|-------|
| **EchoLife HN8245Q** | 2.4G + 5G dual-band | 4 GE + 2 POTS + 2 USB | XG-PON | 10G upstream, common upgrade model |
| **EchoLife HN8346V5** | WiFi 5 dual-band | 4 GE + 2 POTS + USB | XG-PON | WiFi 5 + 10G PON |
| **OptiXstar HG8245X6-8Ne** | WiFi 6 | Multiple GE | GPON/XGS-PON | WiFi 6 residential |
| **OptiXstar EN8245X6s-8N** | WiFi 6 | Multiple GE | XGS-PON | Enterprise WiFi 6 |

### OptiXstar Enterprise/Campus ONUs (NOT residential)

The OptiXstar line is actually enormous — Huawei's current product page lists **60+ models**:
- **P-series:** Panel/campus ONUs (P603E, P612L, P613E, P632E, P803, P813, P871E, P882E, P883E, P884E, P885E, P892M, P893E...)
- **S-series:** SFP mini-ONUs (S600E, S800E — fit into SFP ports of cameras/APs)
- **T-series:** Industrial-grade ONUs (T602E, T650E, T823E variants — PoE++, IP67)
- **W-series:** WiFi ONUs (W617, W627, W826, W827 — campus WiFi 6/7)
- **E-series:** Edge optical gateways (E852E, E853E)
- **M-series:** 50G PON (M990 — bleeding edge)
- **EG/EN prefixed:** Next-gen residential ONTs with WiFi 6/7

**Key insight:** The residential models (HG8145V5, HG8245H5, HN8245Q, HN8346V5) are what ISPs like StormFiber deploy. The OptiXstar enterprise models are entirely different devices.

---

## 2. OpenWrt Support — NONE for V5 Series

### What OpenWrt DOES support from Huawei:

From the OpenWrt Table of Hardware (checked March 2026):

| Model | Status | Chipset | Notes |
|-------|--------|---------|-------|
| HG253s v2 | Supported | Lantiq | Old DSL gateway |
| HG255D | Supported | Ralink RT3052 | Old WiFi router |
| HG520v | Supported | BCM6348 | Old DSL modem |
| HG532/532C | Supported | BCM6328 | Old DSL |
| HG553 | Supported | BCM6358 | Old DSL |
| HG556a (A/B/C) | Supported | BCM6358 | Old DSL |
| HG622/622u | Supported | BCM6362 | Old DSL |
| HG655a/b/d/m | Supported | BCM6362 | Old DSL |
| **HG8245** | **Listed but UNSUPPORTED** | HiSilicon SD5115 | Tagged "Unsupported devices" |
| **HG8245H** | **Listed but UNSUPPORTED** | HiSilicon SD5115 | Tagged "Unsupported devices" |
| MA5671A | Supported (SFP module) | Lantiq PEB98035 | SFP stick only, different arch |
| E970 | Supported | BCM4712 | Very old |
| AP5030DN | Supported | ? | Enterprise AP |
| WS7200 | Listed | ? | WiFi 6 router |

### Why the V5 series will NEVER get OpenWrt support:

1. **HiSilicon chipset** — proprietary, no public datasheets, no GPL source release
2. **Dopra Linux** — Huawei's custom OS, not standard Linux. While it runs a Linux kernel underneath, the userspace is completely proprietary
3. **Locked bootloader** — U-Boot is locked, serial console halting is disabled on newer V5 models
4. **No community interest** — the few people who've tried have hit dead ends (see Reddit thread below)
5. **ARM + GPON = dead end** — the SoC combines ARM cores with GPON MAC/PHY in a way that requires proprietary drivers

**Bottom line: There is zero chance of running OpenWrt on any HG8145V5, HG8245H5, HN8245Q, or HN8346V5.**

---

## 3. Chipset & Hardware Specifications

### HG8145V5 / EG8145V5 (most likely your StormFiber unit)

| Component | Specification |
|-----------|--------------|
| **SoC** | **HiSilicon SD5116** (or SD5118 in newer revisions) |
| **CPU** | ARM Cortex-A9 dual-core (ARMv7), ~650-900 MHz |
| **RAM** | 128 MB DDR (some variants 256 MB) |
| **Flash** | 128 MB SLC NAND (Micron MT29F1G08ABAEA or XTX equivalent) |
| **WiFi** | 2.4 GHz 802.11b/g/n (single-band on HG8145V5) |
| **Ethernet** | 4x Gigabit Ethernet (GE) |
| **POTS** | 2x analog phone ports (VoIP) |
| **USB** | 1x USB 2.0 |
| **PON** | GPON SC/APC connector (Class B+/C+) |
| **OS** | Dopra Linux (Huawei proprietary, BusyBox-based) |
| **Boot** | U-Boot 2010.03 (locked on newer firmware) |
| **Serial** | UART available on PCB (J8 header: RX, NC, 3V3, GND, TX @ 115200 8N1) |
| **JTAG** | Available on PCB (J32 header) |
| **Power** | 12V DC adapter |

### HiSilicon SD51xx Family (all Huawei ONTs)

| SoC | Used In | Era |
|-----|---------|-----|
| SD5115 | HG8245, HG8245H (older) | ~2012-2016 |
| **SD5116** | **HG8145V5, HG8245H5** | **~2017-2022** |
| SD5117 | HN8010Ts (XGS-PON) | ~2020+ |
| SD5118/SD5182 | Newer V5/V6 revisions | ~2022+ |

**Critical fact:** All HiSilicon GPON SoCs are ARM-based but with tightly integrated GPON MAC/PHY blocks that require proprietary blobs. No open-source driver exists for the GPON subsystem.

### PCB Details (from teardowns)

- Single-board design, relatively simple
- NAND flash is on the back of the PCB (easily accessible for chip-off dumping)
- UART pads are accessible (labeled J8)
- JTAG pads are accessible (labeled J32)
- WiFi is integrated into the SoC (not a separate radio module)
- The V5 versions have hardware revisions (V1, V2, V3) with slightly different boards

---

## 4. Alternative Custom Firmware Options

### There are NO viable custom firmware alternatives.

Here's what people have tried:

#### a) ONT Enable Tools (Chinese community)
- Chinese and Brazilian forums have tools that upload `.bin` files via TFTP to unlock the WAP shell
- These are firmware-version-specific and hardware-version-specific
- They work on older V3/V4 series but **fail on V5 R020+ firmware**
- The tools essentially exploit a firmware update mechanism to inject a shell-enabling payload
- **Status:** Working for pre-V5 hardware, mostly broken for V5

#### b) Firmware Dump & Modify
- Chip-off NAND dumping is possible but difficult:
  - Newer V5 units use obscure XTX brand NAND chips not in standard programmer databases
  - CH341A (cheap $3 programmers) struggle with these chips
  - Need a more capable programmer (RT809H or TNM5000)
- Even if you dump the firmware, the filesystem is UBI + SquashFS and the binaries are compiled for the proprietary Dopra Linux runtime
- Modifying and re-flashing doesn't give you a general-purpose Linux — you're still stuck in Huawei's ecosystem

#### c) Dopra Linux Shell Access (the WAP shell)
- **Telnet can be enabled** by modifying the XML config backup:
  - Download config from web UI (System Tools → Configuration File)
  - Config may be AES encrypted (key: `hex:13395537D2730554A176799F6D56A239` — same across all Huawei ONTs!)
  - Set `X_HW_CLITelnetAccess` → `Access="1"`
  - Set `TELNETLanEnable` → `1` in AclServices
  - Upload modified config, device restarts with telnet on port 23
- **But the shell is heavily restricted:**
  - You get a `WAP>` prompt first (Huawei's CLI)
  - `shell` command gives you `WAP(Dopra Linux)#` — a restricted BusyBox ash shell
  - Most standard Linux commands exist in /bin but **cannot be executed** — the shell has a command whitelist
  - `help` returns "ERROR::Command is not existed"
  - Even `/bin/cat`, `/bin/echo`, `/bin/busybox` are blocked despite existing as files
  - This is a **jailed shell** with proprietary command filtering, not a real Linux environment

#### d) There is no alternative firmware project
- No DD-WRT support
- No Tomato support
- No LEDE support
- No community firmware of any kind
- The hardware is too proprietary and too locked down

---

## 5. Bridge Mode — YES, This Works

**Bridge mode is the most practical path.** This makes the ONT a dumb fiber-to-ethernet converter, passing the WAN connection straight through to your own router.

### How to enable bridge mode on HG8145V5:

#### Method 1: ISP-Side (cleanest — ask StormFiber)
- Call StormFiber and request bridge mode
- They configure it on the OLT (their head-end equipment)
- They may set a WAN profile with Bridge connection type
- Your own router handles PPPoE/DHCP

#### Method 2: Web UI (if you have admin/telecomadmin access)
1. Log in to `192.168.100.1`
2. **Default credentials to try:**
   - `root` / `admin` (basic user, limited)
   - `telecomadmin` / `admintelecom` (super admin — hardcoded on many Huawei ONTs)
   - ISP-specific: varies by StormFiber deployment (they often change these)
3. Go to **WAN** settings
4. Create new WAN connection or modify existing:
   - Connection type: **Bridge WAN**
   - Enable VLAN if required (StormFiber typically uses VLAN tagging)
   - Bind to the LAN port you'll use for your router
5. Disable DHCP server on the ONT
6. Connect your own router to the bound LAN port

#### Method 3: Config file modification (if web UI is locked)
1. Download config (System Tools → Configuration File → Download)
2. If encrypted, decrypt with the universal AES key
3. Modify WAN connection to Bridge mode
4. Upload modified config

### What bridge mode gives you:
- ✅ ONT handles fiber ↔ ethernet conversion only
- ✅ Your router gets the public IP directly
- ✅ Full control of NAT, DHCP, DNS, firewall on YOUR hardware
- ✅ Can run OpenWrt/mesh on your own router behind it
- ❌ WiFi on the Huawei is wasted (or can be disabled)
- ❌ Phone (POTS) ports may stop working depending on config

### Bridge mode for mesh:
**This is the recommended approach:**
1. HG8145V5 in bridge mode → ethernet to OpenWrt router
2. OpenWrt router runs mesh (802.11s, batman-adv, or Meshtastic via USB)
3. The Huawei box is just the fiber termination point

---

## 6. Known Exploits & Root Access Methods

### 6.1 Universal Configuration Encryption Key
- **AES key:** `hex:13395537D2730554A176799F6D56A239`
- Present in `/etc/wap/aes_string` on the device
- Same key across ALL Huawei ONT/router products (HG series, EchoLife, OptiXstar)
- Tools exist on GitHub to decrypt/encrypt config files (search "aescrypt2_huawei")
- Config files have an 8-byte header before the AES-encrypted payload

### 6.2 Super Admin Access via Config Modification
1. Download config backup from web UI
2. Decrypt if needed (using the universal AES key)
3. Find `<X_HW_WebUserInfo>` section
4. Modify `UserLevel="1"` to `UserLevel="0"` for root account (or add new admin user)
5. Password hash formula: `SHA256(MD5(password))`
6. Upload modified config
7. **Caveat:** ISP can push config updates via OMCI that overwrite your changes. Once GPON link is up, the OLT (ISP side) can remotely reconfigure the ONT.

### 6.3 Telnet Enable (Config-based)
As described in section 4c above:
- Modify `X_HW_CLITelnetAccess` → `Access="1"`
- Modify `TELNETLanEnable` → `1`
- Upload config → telnet opens on port 23
- **Default telnet credentials:** `root`/`admin` or ISP-customized

### 6.4 WAP Shell Commands (after telnet access)
Once in `WAP>` prompt:
```
WAP> shell
WAP(Dopra Linux)#
```
Available commands (very limited — version dependent):
- `ls`, `cd`, `pwd` — basic navigation
- `ifconfig` — network interfaces
- `cat` — sometimes available
- `ps` — process list
- `mount` — mounted filesystems
- `omcicmd` — OMCI management (GPON parameters)
- `restorehwdefault` — factory reset (DANGER)
- `reboot` — reboot device

**NOT available:** `wget`, `curl`, `nc`, `ssh`, `scp`, `vi`, `nano`, `busybox` (blocked despite existing in /bin)

### 6.5 UART Serial Console
- Header J8 on PCB, 115200 8N1
- Gives boot log output (U-Boot → kernel → Dopra Linux)
- **On V5 R020+:** Serial output STOPS after kernel init. Boot interrupt is disabled.
- **On older firmware:** You can sometimes halt boot and access U-Boot shell
- U-Boot shell (if accessible) allows: NAND read/write, TFTP boot, memory manipulation

### 6.6 ONT Enable Tools (Shell Unlock)
- Community-developed tools (Chinese origin) that upload `.bin` payloads via TFTP
- The payload patches the firmware to enable full shell access
- **Hardware-version specific** — a tool for HW version 226D won't work on 226E
- **Firmware-version specific** — tools for V3R017 won't work on V5R020
- Someone on Reddit reverse-engineered the `.bin` format but couldn't get it working on V5-V2 R020
- **Status:** Unreliable, version-locked, not a general solution

### 6.7 NAND Chip-Off Dump
- Physically desolder the NAND chip
- Read with RT809H or similar programmer
- Dump the UBI filesystem
- Extract SquashFS rootfs
- Analyze/modify firmware
- **Challenge:** V5 units use XTX brand NAND chips that are poorly documented
- **Risk:** Desoldering can damage the chip/board. Re-soldering even more so.

### 6.8 JTAG Access
- J32 header on PCB
- Theoretically allows full memory access and debug
- Requires JTAG adapter compatible with HiSilicon ARM cores
- Very little community documentation on this attack vector for Huawei ONTs

### 6.9 ISP-Side Exploits (OMCI)
- The OLT (ISP head-end) has FULL control over the ONT via OMCI
- OMCI can: push firmware updates, change config, enable/disable features, read diagnostics
- If you could spoof OMCI commands... but this requires access to the PON network
- Not practically exploitable from the LAN side

---

## 7. Can the WiFi Radio Be Used Independently?

### Short answer: NO.

The WiFi radio in the HG8145V5 is:
- **Integrated into the HiSilicon SoC** — it's not a separate PCIe/USB WiFi module
- **Controlled entirely by Dopra Linux** — no way to load alternative WiFi drivers
- **Not accessible as a standard Linux wireless interface** — even with shell access, you can't use `iw`/`hostapd`/`wpa_supplicant` because the WiFi subsystem is managed by proprietary Huawei daemons
- **No monitor mode** — the driver doesn't expose it
- **No mesh mode (802.11s)** — impossible without driver-level control
- **No AP isolation** — you can configure WiFi via web UI but can't fundamentally change how it operates

### What you CAN do with the WiFi:
- Enable/disable it via web UI
- Change SSID and password
- Change channel
- Set it as a WiFi access point (its default and only real mode)
- Use WPS

### What you CANNOT do:
- Use it for mesh networking (802.11s, batman-adv)
- Put it in monitor mode for packet capture
- Run it as a WiFi client/repeater (hardware might support it, but firmware doesn't expose this)
- Load custom WiFi firmware/drivers
- Use it with hostapd or any standard Linux WiFi tooling

---

## 8. Repurposing Assessment — Can It Be a Mesh Relay?

### Mesh Relay Requirements:
1. ✅ Ethernet connectivity (4 GE ports — these work fine)
2. ❌ Controllable WiFi radio (locked down, no mesh mode)
3. ❌ Custom firmware (no OpenWrt, no alternative OS)
4. ❌ Root shell with package management (shell is jailed)
5. ⚠️ Bridge mode (works — passes through to your hardware)

### Verdict: NOT suitable as a standalone mesh node.

### But here's what it CAN do:

#### Role 1: Dumb Fiber Bridge (RECOMMENDED)
- Bridge mode → ethernet to your mesh router
- The HG8145V5 just converts fiber to copper
- Your mesh hardware (GL.iNet, Raspberry Pi, etc.) sits behind it
- **Cost:** $0 (you already have it)

#### Role 2: Wired Backhaul Endpoint
- If you have multiple ONTs (some ISPs deploy one per room), each could bridge to a wired mesh node
- The ethernet ports are GigE — decent for mesh backhaul
- But you'd need one mesh-capable device per ONT

#### Role 3: Parts Donor
- The ARM SoC isn't useful without documentation
- The 128MB NAND and 128/256MB RAM aren't worth salvaging
- The power supply (12V adapter) might be useful
- The fiber optic transceiver module... if it's socketed (some models), it could be reused in an SFP setup
- The case is decent for housing a Raspberry Pi or similar SBC

### What to Buy Instead (for actual mesh):
| Device | Price | OpenWrt | Mesh | Notes |
|--------|-------|---------|------|-------|
| GL.iNet GL-MT3000 | ~$70 | ✅ Full | 802.11s, batman-adv | WiFi 6, MT7981B |
| TP-Link Archer A6 v3 | ~$35 | ✅ Full | batman-adv | WiFi 5, great value |
| Xiaomi Mi Router 4A Gigabit | ~$20 | ✅ Full | batman-adv | WiFi 5, cheapest option |
| Raspberry Pi 4 + USB WiFi | ~$50 | Runs native Linux | Any mesh protocol | Most flexible |
| **TTGO T-Beam** | **~$20** | N/A | **Meshtastic (LoRa)** | **Long-range mesh, no WiFi needed** |

---

## 9. Recommendations for the Project

Given the context (Ali/AVA infrastructure, StormFiber Pakistan, GDI mesh plans):

### Immediate (zero cost):
1. **Put the HG8145V5 in bridge mode** — call StormFiber or use telecomadmin
2. Run your own OpenWrt router behind it
3. The Huawei box disappears from your network topology (it's just the fiber termination)

### For mesh networking:
1. **Meshtastic on TTGO T-Beam** ($20/node) — LoRa mesh, no internet needed, Foundry Courier compatible
2. **OpenWrt mesh** with cheap routers — 802.11s or batman-adv, commodity hardware
3. **Do NOT waste time trying to hack the Huawei** — the ROI is terrible. Hours of reverse engineering for a device that will never run clean custom firmware.

### For sovereign infrastructure:
The HG8145V5 is an ISP-controlled device at its core. Even with root access, the OLT can remotely reconfigure it. For sovereign infrastructure, you want to minimize trust in ISP hardware:
- Bridge mode = minimum trust (it just passes packets)
- Your own router = full control
- Meshtastic = zero ISP dependency

---

## 10. Sources

- OpenWrt Table of Hardware: https://openwrt.org/toh/hwdata/huawei/start
- OpenWrt Huawei HG8245H page (teardown/bootlog): https://openwrt.org/toh/huawei/hg8245h
- hack-gpon wiki (HiSilicon standalone devices): https://hack-gpon.github.io/
- DeepWiki analysis of hack-gpon: https://deepwiki.com/hack-gpon/hack-gpon.github.io/2.5-huawei-standalone-devices
- Reddit r/HowToHack: "Getting Full Shell on HG8145v5-V2" thread
- SuperUser: "Super admin access to Huawei HG8245" (config decryption method)
- StackExchange Unix&Linux: "Accessing regular linux commands in Huawei's Dopra Linux"
- Huawei Enterprise product page: https://e.huawei.com/en/products/optical-terminal
- Huawei support: EchoLife HG8145V5 product page
- FibertelCorp HG8145V5 datasheet PDF
- Chinese teardown (Zhihu): PCB photos showing Micron MT29F1G08A NAND
- CSDN blogs: Dopra Linux WAP shell command references
- YouTube: HG8145V teardown video
- Huawei universal AES config key: documented across multiple security forums

---

*This hardware is a dead end for custom firmware. Bridge it, bypass it, and invest in hardware you actually control.*
