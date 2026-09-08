# Sovereign Communication: Internet-Independent Data Transmission
## Research for Artifact Virtual's Resilience Layer
### Compiled 2026-03-05

---

## 1. BITCOIN'S APPROACH TO INTERNET-FREE TRANSACTIONS

### Bitcoin P2P Network
- **Protocol:** Gossip-based flooding. Each node maintains connections to ~8 peers, relays valid transactions/blocks to all connected peers
- **Transport:** TCP port 8333, custom binary protocol with version handshake
- **Key insight:** Bitcoin doesn't require "the internet" — it requires *any* TCP/IP connectivity between nodes. This can be satellite, mesh, radio, sneakernet
- **Relevance:** Proves that a globally consistent ledger can survive on heterogeneous, unreliable transport layers

### Blockstream Satellite
- **What:** One-way broadcast of the full Bitcoin blockchain via geostationary satellites (4 satellites, 6 coverage zones as of 2019)
- **Coverage:** Global (Africa, Americas, Europe, Asia-Pacific)
- **Hardware:** ~$100 satellite dish + USB SDR dongle + Raspberry Pi
- **Bandwidth:** Full blockchain sync possible; API allows broadcasting arbitrary data payloads
- **Limitation:** ONE-WAY only — you can receive the blockchain but still need an uplink to send transactions (SMS gateway, mesh relay, etc.)
- **Open source:** Satellite receiver software is open source (GNU Radio based)
- **Cost:** Free to receive; ~$0.01/KB to broadcast data via Blockstream's API
- **Feasibility:** HIGH for receive-side resilience. Combined with mesh uplink = full sovereignty

### goTenna + Bitcoin (Mesh Relay)
- **What:** goTenna Mesh devices pair with smartphones via Bluetooth, create 915 MHz mesh network
- **Range:** 1-6 km per hop (line of sight), multi-hop relay extends range
- **Bandwidth:** ~1 kbps (text messages, GPS coords)
- **Hardware:** goTenna Mesh device (~$180/pair), smartphone
- **Protocol:** Proprietary mesh protocol, store-and-forward
- **Open source:** SDK available but NOT copyleft-compatible (proprietary license)
- **Limitation:** Company pivoted to government/pro market (goTenna Pro X2), consumer devices discontinued
- **Feasibility:** MEDIUM — hardware dependency on single vendor, proprietary protocol

### TxTenna Project (Samourai Wallet)
- **What:** Android app that broadcasts signed Bitcoin transactions over goTenna mesh network
- **How it works:** Samourai Wallet signs tx → TxTenna encodes into mesh-compatible packets → goTenna relays hop-by-hop → any node with internet broadcasts to Bitcoin network
- **Protocol:** Signed transaction hex split into segments, reassembled at gateway node
- **Status:** Proof of concept / experimental. Samourai Wallet team faced legal issues (2024)
- **Open source:** Yes (GitHub, though repos may be archived)
- **Key innovation:** Proved Bitcoin transactions can traverse mesh networks without any participant having internet — only ONE node in the mesh needs connectivity
- **Feasibility:** HIGH conceptual value. The architecture pattern (sign offline → relay via mesh → broadcast at edge) is exactly what Foundry Courier does

---

## 2. MESH NETWORKING PROTOCOLS

### LoRa / LoRaWAN
- **Physical layer:** Chirp Spread Spectrum (CSS) modulation on license-free sub-GHz bands (868 MHz EU, 915 MHz US/AU, 433 MHz)
- **Range:** 10-16 km rural (line of sight), 3-5 km urban. Record: 331 km (Meshtastic)
- **Bandwidth:** 0.3-27 kbps depending on spreading factor (SF5-SF12)
- **Power:** Extremely low — battery-operated sensors last years
- **Latency:** 100ms-seconds depending on SF and payload
- **Hardware:** LoRa modules (SX1276/SX1262) cost $5-15. Complete boards (Heltec, TTGO, RAK): $15-40
- **Open source:** LoRa PHY is proprietary (Semtech), but LoRaWAN spec is open. Many open-source implementations
- **Key trade-off:** Long range OR high bandwidth — never both simultaneously
- **Feasibility:** VERY HIGH — cheapest long-range option, massive ecosystem, license-free globally

### Meshtastic (Open Source LoRa Mesh)
- **What:** 100% open source, community-driven LoRa mesh communication platform
- **Protocol:** Custom mesh protocol on LoRa. Flood-based routing with hop limits
- **Range:** Up to 331 km record. Practical: 5-30 km per hop depending on terrain/antennas
- **Bandwidth:** ~1-10 kbps (text messages, GPS, telemetry)
- **Encryption:** AES-256 channel encryption, PSK-based
- **Features:** Text messaging, GPS tracking, telemetry, no phone required for mesh relay, decentralized
- **Hardware:** ESP32 + LoRa boards ($15-40): Heltec V3, TTGO T-Beam, RAK WisBlock, LilyGO
- **Phone app:** Android, iOS, Web — connects to node via Bluetooth/WiFi/USB
- **No license required** — uses ISM bands
- **Battery life:** Days to weeks on relay nodes, months on solar-powered setups
- **Open source:** Yes, GPLv3. Extremely active community (GitHub: meshtastic/firmware)
- **Feasibility:** HIGHEST — this is the #1 recommendation for our use case. Cheap, proven in disaster scenarios, massive community, fully open

### goTenna Mesh Protocol
- **Frequency:** 151-154 MHz (MURS in US) or 902-928 MHz ISM
- **Range:** 1-6 km per hop, 3+ hops
- **Bandwidth:** ~1 kbps
- **Encryption:** End-to-end RSA-1024 + AES-256 (claimed)
- **Hardware:** Proprietary goTenna devices ($180/pair)
- **Open source:** NO — proprietary hardware and protocol. SDK has restrictive license
- **Status:** Consumer product discontinued; company focuses on government (goTenna Pro X2)
- **Feasibility:** LOW — vendor lock-in, discontinued consumer line, closed source

### Briar Messenger
- **What:** Encrypted P2P messenger designed for activists/journalists under hostile conditions
- **Transport layers (multi-modal):**
  - Tor (when internet available)
  - WiFi (local network, no internet)
  - Bluetooth (device-to-device, ~10m range)
  - Removable storage (USB drives — sneakernet)
- **Encryption:** End-to-end, Bramble protocol suite (custom, audited by Cure53)
- **Protocol:** Bramble — delay-tolerant networking, store-and-forward
- **Range:** Bluetooth ~10m, WiFi ~100m, Tor = global
- **Bandwidth:** Limited by transport (Bluetooth ~2 Mbps, WiFi ~50+ Mbps)
- **Platform:** Android (primary), Desktop (Windows/macOS/Linux). NO iOS (by design — Apple restrictions)
- **Open source:** Yes, GPLv3
- **Key feature:** Designed for internet shutdown scenarios. App can be sideloaded from device-to-device
- **Funded by:** Open Technology Fund ($361K+)
- **Feasibility:** HIGH for human-to-human messaging. Not designed for machine-to-machine (no API), but the protocol patterns are excellent reference architecture

### Reticulum Network Stack
- **What:** Cryptography-based networking stack for building sovereign communication networks
- **Philosophy:** "Unstoppable Networks for The People" — no kill-switches, no surveillance, no censorship
- **Transport agnostic:** Works over ANY medium — LoRa, packet radio, serial, TCP, UDP, WiFi, I2C, anything
- **Performance envelope:** 150 bps to 1.2 Gbps (adapts to medium)
- **Encryption:** ALL communication encrypted by default (X25519 + HKDF + Fernet). No unencrypted mode exists
- **Addressing:** Self-sovereign, no central authority. No source addresses in packets (privacy by design)
- **Routing:** Automatic, self-healing, works with high latency and extremely low bandwidth
- **Key apps:**
  - **Nomad Network:** Off-grid encrypted mesh communication platform
  - **Sideband:** Android/Linux/macOS app with GUI
  - **LXMF:** Distributed, delay-tolerant message transfer protocol
- **Hardware:** Any computer + any radio/serial/network interface. Commonly paired with LoRa boards
- **Installation:** `pip install rns` — pure Python, runs everywhere
- **Open source:** Yes, MIT license
- **Dependencies:** Minimal — PyCA/cryptography, netifaces, pyserial. Pure-Python fallback available
- **Feasibility:** HIGHEST — this is the ideal PROTOCOL LAYER for our use case. Transport-agnostic means it works over LoRa, radio, Bluetooth, serial, internet — anything. Combined with Meshtastic hardware = sovereign mesh

---

## 3. RADIO DATA PROTOCOLS

### JS8Call (HF Radio Digital Mode)
- **What:** Weak-signal keyboard-to-keyboard messaging over HF amateur radio
- **Based on:** FT8 (WSJT-X) modulation + custom messaging/networking protocol layer
- **Sensitivity:** Down to -24dB SNR — works when you can't even hear the signal
- **Range:** GLOBAL via HF propagation (ionospheric skip), 100s-1000s of km
- **Bandwidth:** ~5-50 characters/minute depending on mode (Slow/Normal/Fast/Turbo)
- **Features:** Real-time messaging, store-and-forward relay, heartbeat monitoring, APRS-IS integration
- **Hardware:** HF transceiver ($200-2000), computer with sound card, antenna
- **License:** Amateur radio license required (varies by country)
- **Open source:** Yes, GPLv3
- **Modes:** Slow (best sensitivity), Normal, Fast, Turbo (higher throughput, less sensitivity)
- **Feasibility:** HIGH for long-range emergency comms. HF reaches globally without ANY infrastructure. The -24dB sensitivity means it works in extreme conditions. Requires ham license.

### Winlink (Email Over Radio)
- **What:** Worldwide radio email system using amateur and government frequencies
- **Protocols:** PACTOR (I-IV), ARDOP, VARA HF/FM, AX.25 Packet, D-Star
- **Features:** Email with attachments, position reporting, weather bulletins, emergency comms
- **Infrastructure:** Hybrid — mesh-like HF gateway network + AWS cloud servers for store-and-forward
- **Range:** Global via HF, regional via VHF/UHF
- **Bandwidth:** 200-9600 bps depending on protocol (VARA HF up to ~9600 bps)
- **Users:** ~12,000 radio operators, ~100,000 internet correspondents
- **Used by:** FEMA, DHS SHARES, Red Cross, military, yacht cruisers
- **Hardware:** HF/VHF transceiver + sound card/modem + computer
- **License:** Amateur radio license (amateur bands) or government authorization (non-amateur)
- **Open source:** Winlink Express client is free but not open source. ARDOP is open.
- **Encryption:** AES-256 available on non-amateur frequencies. Prohibited on amateur bands (FCC rules)
- **Feasibility:** HIGH for email/file transfer over radio. Battle-tested in real disasters. The ARDOP + VARA protocols are the state of the art for radio email

### APRS (Automatic Packet Reporting System)
- **What:** Real-time digital communications protocol for amateur radio
- **Data types:** GPS positions, weather, text messages, telemetry, announcements
- **Network:** Unconnected broadcast — packets flood through digipeaters (store-and-forward repeaters)
- **Frequency:** Single shared channel per region (144.390 MHz US, 144.800 MHz EU)
- **Range:** Tens to hundreds of km via digipeater chains
- **Bandwidth:** 1200 baud (Bell 202 tones) on VHF — about 150 bytes/second
- **Infrastructure:** Digipeaters (radio repeaters) + IGates (internet gateways)
- **Key feature:** Any packet multiplied by every digipeater — redundancy built in
- **Hardware:** VHF transceiver + TNC (or software TNC like Dire Wolf) + GPS
- **License:** Amateur radio license
- **Open source:** Protocol is open. Dire Wolf (software TNC) is open source
- **Feasibility:** MEDIUM-HIGH — excellent for position reporting and short messages. Well-established infrastructure in many countries. 1200 baud is slow but reliable

### AX.25 Packet Radio
- **What:** Data link layer protocol for amateur packet radio, derived from X.25
- **Modes:** Connected (acknowledged, reliable) and connectionless (APRS uses this)
- **Speeds:** 1200 baud (VHF, Bell 202), 9600 baud (UHF, G3RUH), 300 baud (HF, Bell 103)
- **Range:** Line of sight on VHF/UHF (10-100 km with digipeaters), global on HF
- **Features:** Source routing via digipeaters, error detection, retransmission
- **Implementation:** Linux kernel has native AX.25 support. Dire Wolf is best modern software TNC
- **Open source:** Yes — protocol spec is public, multiple open implementations
- **Hardware:** Any radio + sound card/TNC. Dire Wolf replaces hardware TNCs
- **Feasibility:** MEDIUM — foundational protocol for packet radio. Dated but proven. Best as transport layer under higher protocols

---

## 4. BLUETOOTH / WIFI DIRECT

### Bluetooth Low Energy (BLE) Mesh
- **Standard:** Bluetooth Mesh (adopted July 2017 by Bluetooth SIG)
- **Topology:** Flood-based mesh networking — nodes relay all authenticated packets
- **Range:** 10-100m per hop (BLE range), extended by mesh relaying up to ~1000m
- **Bandwidth:** ~1 Mbps theoretical (BLE), practical mesh throughput much lower
- **Max nodes:** 32,767 per network
- **Max TTL:** 127 hops
- **Security:** AES-CCM encryption, two-layer key model (network keys + application keys), replay protection
- **Message size:** Up to 384 bytes (segmented), most messages 11 bytes
- **Hardware:** Any BLE 4.0+ device — smartphones, ESP32, nRF52, Raspberry Pi
- **Open source:** Spec is open (Bluetooth SIG). Open implementations: Zephyr RTOS, nRF SDK, ESP-IDF
- **Latency:** 10-100ms per hop
- **Power:** Very low (designed for battery operation)
- **Feasibility:** HIGH for short-range device mesh. Every modern smartphone has BLE. Good for building-scale or campus-scale mesh. Limited range per hop

### WiFi Direct (P2P)
- **What:** WiFi standard for device-to-device connections without access point/router/internet
- **Range:** ~200m (WiFi range), single-hop only (NOT mesh)
- **Bandwidth:** Standard WiFi speeds (up to 250 Mbps on 802.11n, higher on 802.11ac)
- **Discovery:** Automatic peer discovery and WPS-based pairing
- **Platform support:** Android 4.0+, Windows 8+, most modern devices
- **Encryption:** WPA2
- **Limitation:** Single-hop only — no native mesh/relay capability
- **Open source:** WiFi Direct spec is open. Android has native APIs (WifiP2pManager)
- **Use case:** High-bandwidth file transfer between nearby devices. Miracast display streaming
- **Feasibility:** MEDIUM — excellent bandwidth but no mesh. Good for point-to-point bulk transfer (e.g., sneakernet acceleration)

### Apple AirDrop-Style Discovery (Multipeer Connectivity)
- **What:** Apple's framework combining Bluetooth (discovery) + WiFi Direct (transfer)
- **Range:** ~10m discovery (Bluetooth), ~70m transfer (WiFi)
- **Bandwidth:** WiFi speeds for actual transfer
- **Platform:** iOS/macOS only (proprietary)
- **Open source:** NO — Apple proprietary
- **Android equivalent:** Nearby Connections API (Google) — Bluetooth + WiFi P2P + WiFi hotspot
- **Feasibility:** LOW for our use case — platform-locked, no mesh, no relay

### Android Nearby Connections API
- **What:** Google's API for device-to-device communication
- **Transports:** Bluetooth Classic, BLE, WiFi hotspot, WiFi Direct (automatically selected)
- **Strategies:** P2P_CLUSTER (mesh-like), P2P_STAR (hub-spoke), P2P_POINT_TO_POINT
- **Range:** Bluetooth ~10m, WiFi ~200m
- **Bandwidth:** Up to WiFi speeds
- **Features:** Automatic transport selection, encrypted connections
- **Limitation:** Android only. No relay/multi-hop
- **Open source:** API is public, implementation is closed (Google Play Services)
- **Feasibility:** MEDIUM — useful for Android-to-Android bulk transfer, but no iOS, no mesh

---

## 5. SNEAKERNET + HYBRID APPROACHES

### USB Dead Drops
- **What:** USB drives physically embedded in walls/public spaces for anonymous file exchange
- **Original concept:** Aram Bartholl's art project (2010), 1,500+ dead drops worldwide
- **Bandwidth:** USB 3.0 = 5 Gbps. Sneakernet bandwidth = (drive capacity / transport time)
- **Latency:** Hours to days (physical transport)
- **Security concern:** Malware injection, hardware keyloggers in modified USB devices
- **Mitigation:** Read-only file systems, hardware write-blockers, encrypted containers
- **For our use case:** Foundry Courier already supports sneakernet — encode signed tx → USB → carry → broadcast
- **Feasibility:** HIGH for bulk data movement. "Never underestimate the bandwidth of a station wagon full of tapes hurtling down the highway" — Andrew Tanenbaum

### QR Code Relay
- **What:** Encode data into QR codes, photograph to transfer between air-gapped devices
- **Capacity:** Standard QR: up to 2,953 bytes per code. Micro QR: less
- **For larger data:** Animated QR sequences (multiple codes shown rapidly, captured by video)
- **Bandwidth:** ~3-30 KB/s with animated QR at 10-30 fps
- **Tools:** `qrencode` (CLI), `zbarimg` (decoder), many libraries
- **Projects:** PSBT (Partially Signed Bitcoin Transactions) commonly transferred via QR in air-gapped Bitcoin wallets
- **Security:** Visual — can be observed. Encrypt payload before encoding
- **Feasibility:** HIGH — every device with a camera and screen can participate. Already standard in Bitcoin hardware wallets (Coldcard, Keystone)

### Audio Coupling (Data Over Sound — ggwave)
- **What:** Transmit data using audible or ultrasonic sound between devices via speaker/microphone
- **Library:** ggwave by Georgi Gerganov (creator of llama.cpp)
- **Protocol:** Multi-frequency FSK modulation, Reed-Solomon ECC
- **Bandwidth:** 8-16 bytes/second
- **Range:** Room-scale (1-10m depending on volume/noise)
- **Frequencies:** Audible (1875 Hz base) or ultrasonic (15000 Hz base), 96 frequency slots, dF=46.875 Hz
- **Payload:** Small data — keys, URLs, short messages, transaction hashes
- **Platforms:** C/C++ core, bindings for JavaScript (WebAudio), Python, Java, Kotlin, Objective-C, Arduino/ESP32
- **Open source:** Yes, MIT license (github.com/ggerganov/ggwave, 7.5K stars)
- **Hardware:** Any device with speaker + microphone. Works on ESP32, Arduino, Raspberry Pi, phones, browsers
- **Use cases:** Air-gapped device pairing, audio QR codes, IoT provisioning
- **Feasibility:** HIGH for small payloads (keys, hashes, short messages). Elegant for pairing and bootstrapping. Not for bulk data

### Steganography in Images
- **What:** Hide data within image files (or audio/video) such that the carrier appears unmodified
- **Tools:**
  - `steghide` — hide data in JPEG/BMP/WAV/AU files (open source, GPL)
  - `stegsolve` — analysis/detection tool
  - `exiftool` — metadata-based hiding (EXIF fields)
  - `openstego` — Java-based, watermarking + data hiding
- **Capacity:** Typically 10-15% of carrier file size (e.g., 1MB JPEG can hide ~100-150KB)
- **Bandwidth:** N/A (offline encoding, physical transport)
- **Security:** Encryption + steganography = double layer. Detection (steganalysis) is possible but difficult
- **Use case:** Covert communication in surveillance states — post innocent-looking images on social media that contain hidden messages
- **Available on Kali:** steghide, stegsolve, exiftool all native to our system
- **Feasibility:** HIGH for covert communication under surveillance. Low bandwidth but excellent for plausible deniability

---

## 6. EXISTING PROJECTS & PLATFORMS

### Briar (detailed above in Section 2)
- **Verdict:** Best existing messenger for internet-shutdown scenarios
- **Limitation:** Human-to-human only, no machine API, Android/desktop only

### Bridgefy
- **What:** Bluetooth mesh messaging app (Mexico-based)
- **Protocol:** Bluetooth mesh, daisy-chain relay
- **Range:** Bluetooth ~100m per hop, multi-hop
- **Fame:** Used in Hong Kong 2019 protests, India CAA protests
- **Security:** CRITICALLY FLAWED — multiple audits found impersonation, MITM, de-anonymization attacks
- **Signal Protocol integration:** Attempted in 2020, broken again in 2022 (Paterson et al.)
- **Open source:** NO — proprietary
- **Feasibility:** LOW — proven insecure, proprietary, single vendor. Use Briar instead

### Secure Scuttlebutt (SSB)
- **What:** Peer-to-peer social network protocol with offline-first design
- **Protocol:** Append-only signed feeds, gossip-based replication
- **Crypto:** Ed25519 signatures, SHA-256 hashing, Secret Handshake authenticated key exchange
- **Replication:** Over internet, LAN, or sneakernet (USB drives)
- **Data model:** Each user has an append-only log. Follows pull data from followed peers
- **~30,000 users** across 6+ social network apps on the protocol
- **Implementation:** Node.js (reference), Go, Python, Rust
- **Open source:** Yes, MIT license
- **Key insight:** "Offline-first gossip protocol" — designed by someone living on a sailboat with unreliable internet
- **Feasibility:** HIGH for social/messaging layer. The gossip replication model is perfect for delay-tolerant networks

### IPFS (InterPlanetary File System)
- **What:** Content-addressed distributed file system
- **Protocol:** libp2p (modular P2P networking), DHT for content discovery, Bitswap for transfer
- **Transport:** TCP, QUIC, WebSockets, WebRTC — any libp2p transport
- **Addressing:** Content-addressed (CID) — files identified by hash, not location
- **Offline capability:** Can function on local networks without internet. Content syncs when connectivity returns
- **Bandwidth:** Full network speed on local connections
- **Open source:** Yes, MIT/Apache-2.0 (github.com/ipfs/kubo)
- **We already have it:** `~/.local/bin/ipfs` (kubo 0.33.0) installed on dragonfly
- **Feasibility:** HIGH — we already use IPFS for SHARD assets. Content-addressing means files persist regardless of network topology

### Yggdrasil Network
- **What:** Experimental encrypted IPv6 overlay network — decentralized alternative to internet routing
- **Protocol:** Self-healing, peer-to-peer, compact routing scheme
- **Encryption:** End-to-end encrypted IPv6 for ALL traffic
- **Transport:** TCP/TLS peering over LAN, point-to-point links, or internet
- **Key feature:** Works entirely ad-hoc with no centralization. Self-healing on failures
- **Platform:** Linux, macOS, Windows, iOS, Android
- **Use case:** Build your own internet. Nodes peer locally or remotely, routing is automatic
- **Open source:** Yes (github.com/yggdrasil-network/yggdrasil-go)
- **Feasibility:** HIGH — provides IPv6 connectivity over any transport. If you can establish any data link between nodes, Yggdrasil gives you full IP networking

### Military/Government Open Source Mesh
- **ATAK (Android Team Awareness Kit):** US military situational awareness app, released as open source (CivTAK). Uses mesh networking for tactical comms
- **B.A.T.M.A.N. (Better Approach To Mobile Ad-hoc Networking):** Linux kernel mesh routing protocol (batman-adv). Layer 2 mesh — transparent to applications
- **OLSR (Optimized Link State Routing):** Proactive mesh routing protocol, used in community mesh networks (Freifunk, guifi.net)
- **Serval Project:** Open source mesh telephony for disaster response (Android). Encrypted calls/messages over WiFi mesh
- **All open source, all designed for infrastructure-free operation**

### Disaster Communication Systems
- **Disaster.radio:** Solar-powered LoRa mesh network for。。。。。disaster communication (open source, ESP32-based)
- **Gotenna (Pro):** Used by FEMA, fire departments, search & rescue
- **Project Owl (OWL = Organization, Whereabouts, and Logistics):** IoT mesh emergency network, IBM Call for Code winner
- **FireChat:** Bluetooth/WiFi mesh messenger (used in Hong Kong protests, Catalonia) — now DISCONTINUED

---

## 7. SYNTHESIS: RECOMMENDED ARCHITECTURE FOR SOVEREIGN INTELLIGENCE PLATFORM

### The Stack (Bottom-Up)

```
┌─────────────────────────────────────────────────┐
│  APPLICATION LAYER                               │
│  Foundry Courier (signed tx)                     │
│  LXMF/Nomad Network (messaging)                 │
│  IPFS (file distribution)                        │
│  Scuttlebutt (social/gossip)                     │
├─────────────────────────────────────────────────┤
│  NETWORK LAYER                                   │
│  Reticulum (transport-agnostic encrypted routing)│
│  Yggdrasil (IPv6 overlay, self-healing)          │
├─────────────────────────────────────────────────┤
│  TRANSPORT LAYER (pick any/all)                  │
│  LoRa/Meshtastic  (10+ km, low bandwidth)        │
│  BLE Mesh         (100m, ubiquitous)             │
│  WiFi Direct      (200m, high bandwidth)         │
│  Packet Radio     (HF = global, VHF = regional)  │
│  Serial/USB       (sneakernet)                   │
│  Audio (ggwave)   (room-scale, air-gap crossing) │
│  TCP/IP           (when internet available)       │
├─────────────────────────────────────────────────┤
│  PHYSICAL LAYER                                  │
│  LoRa radios ($15-40)                            │
│  Smartphones (BLE + WiFi)                        │
│  HF/VHF transceivers ($200-2000)                 │
│  Any speakers/microphones                        │
│  USB drives                                      │
│  Satellite dishes (Blockstream)                  │
└─────────────────────────────────────────────────┘
```

### Priority Recommendations

1. **Meshtastic + Reticulum** — Primary mesh layer. $30 in hardware gives you 10+ km encrypted mesh. Reticulum runs on top for sovereign addressing and routing. Both fully open source.

2. **Foundry Courier integration** — We already have frame encoding, HMAC authentication, and multi-chain broadcast. Add Reticulum/LoRa as a transport = signed blockchain transactions over radio.

3. **ggwave for air-gap bridging** — When devices can't physically connect, audio coupling transfers keys, hashes, and short payloads through speakers/microphones. MIT license, runs on ESP32.

4. **JS8Call for intercontinental** — When everything local is down, HF radio reaches globally. -24dB sensitivity means it works in conditions nothing else can. Requires ham license.

5. **Briar patterns for messaging** — Study the Bramble protocol for delay-tolerant encrypted messaging design. Multi-transport (Tor + WiFi + Bluetooth + USB) is exactly our philosophy.

6. **QR + Steganography for covert** — When even radio is monitored, encode data in images and transfer physically. Kali has all tools native.

### Hardware Shopping List (Minimum Viable Sovereign Mesh)
| Item | Cost | Purpose |
|------|------|---------|
| Heltec LoRa32 V3 (×3) | $45 | Meshtastic mesh nodes |
| Solar panel + LiPo (×1) | $15 | Permanent relay node |
| ESP32 + speaker + mic | $10 | ggwave audio bridge |
| USB drives (×5) | $25 | Sneakernet |
| RPi + USB SDR | $80 | Blockstream satellite receiver |
| **Total** | **~$175** | **Full sovereign mesh** |

### What We Already Have
- **Foundry Courier** — Frame encoding, HMAC-SHA256, multi-chain broadcast
- **IPFS** — kubo 0.33.0 installed, content-addressed storage
- **Kali tooling** — steghide, stegsolve, exiftool for steganography
- **Blockchain wallet** — 0x21E9... on Base, can sign offline
- **COMB** — Lossless memory that survives restarts (our own delay-tolerant data)

### The Philosophy
The internet is a convenience, not a dependency. Every layer of Artifact Virtual's communication should degrade gracefully:
- Internet available → full speed, all features
- Internet down → mesh relay via LoRa/BLE, store-and-forward
- Mesh down → sneakernet (USB, QR codes, steganography)
- Everything down → HF radio (global reach, no infrastructure needed)
- All electronic comms monitored → steganography + dead drops

**"Sign offline, transmit over anything, broadcast when connectivity returns."** — This is already Foundry Courier's philosophy. The research above provides the transport layers to make it real.

---

*Research compiled by AVA for Artifact Virtual's sovereign resilience infrastructure. March 5, 2026.*
