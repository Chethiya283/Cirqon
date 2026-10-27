# Component Image Inventory & Checklist

This checklist inventories every electronic component in the Cirqon catalogue to facilitate sourcing and downloading high-resolution, royalty-free photographic assets (`.webp` format).

---

## Summary Totals

| Metric | Count | Details |
| :--- | :--- | :--- |
| **Total Components** | **11** | Full catalogue across 9 categories |
| **Local Images** | **11** | Stored in `client/public/images/components/` (`.jpg` format) |
| **Remote Images** | **0** | No external image URLs referenced |
| **Missing Images** | **0** | All 11 parts currently have active local image assets |
| **Broken Images** | **0** | All local asset file paths verified to exist on disk |

---

## Filename Safety Audit

All component part numbers (MPNs) were evaluated against filesystem-prohibited characters:
`\` `/` `:` `*` `?` `"` `<` `>` `|` and whitespace ` `.

- **Unsafe part numbers detected:** `0`
- **Audit status:** PASSED. All 11 part numbers consist strictly of standard ASCII alphanumeric characters and hyphens (`-`). Every target filename can be safely created as `<MPN>.webp` across Windows, macOS, and Linux without modification.
- **Sanitization Rule (Reference):** If future part numbers include illegal characters or spaces, replace the invalid character with a hyphen (`-`) or underscore (`_`) (e.g., `ATmega328P/PU` → `ATmega328P-PU.webp`).

---

## Component Checklist

*Sorted by Category (A–Z), then Part Number (A–Z).*

| No. | Part number (MPN) | Name | Manufacturer | Category | Package / case | Current image | Image status | Search tip | Target filename |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| 1 | `BC547` | NPN General-Purpose Transistor | onsemi | BJTs and MOSFETs | TO-92 | `/images/components/BC547.jpg` | local file | BC547 TO-92 NPN transistor photo | `BC547.webp` |
| 2 | `C315C104K5R5TA` | 100 nF Radial Multilayer Ceramic Capacitor | KEMET | Capacitors | Radial (GoldMax 300, C315) | `/images/components/C315C104K5R5TA.jpg` | local file | KEMET C315 100nF radial ceramic capacitor photo | `C315C104K5R5TA.webp` |
| 3 | `0022232041` | KK 254 Solid Header, Vertical, 4 Circuits | Molex | Connectors | KK 254 Vertical Header (6373 Series) | `/images/components/0022232041.jpg` | local file | Molex KK 254 4-pin vertical header photo | `0022232041.webp` |
| 4 | `1N4007` | General-Purpose Rectifier Diode | Vishay | Diodes and LEDs | DO-204AL (DO-41) | `/images/components/1N4007.jpg` | local file | 1N4007 DO-41 rectifier diode photo | `1N4007.webp` |
| 5 | `1N4148` | Fast Switching Diode | Vishay | Diodes and LEDs | DO-35 | `/images/components/1N4148.jpg` | local file | 1N4148 DO-35 switching diode photo | `1N4148.webp` |
| 6 | `RLB0914-101KL` | 100 µH Radial Leaded Power Inductor | Bourns | Inductors | Radial (RLB0914) | `/images/components/RLB0914-101KL.jpg` | local file | Bourns RLB0914 100uH radial inductor photo | `RLB0914-101KL.webp` |
| 7 | `LM358` | Dual Operational Amplifier | Texas Instruments | Integrated circuits (ICs) | PDIP-8 | `/images/components/LM358.jpg` | local file | LM358 PDIP-8 dual op-amp photo | `LM358.webp` |
| 8 | `NE555` | 555 Timer IC | Texas Instruments | Integrated circuits (ICs) | PDIP-8 | `/images/components/NE555.jpg` | local file | NE555 PDIP-8 timer IC photo | `NE555.webp` |
| 9 | `MFR-25FTE52-10K` | 10 kΩ Metal Film Resistor | Yageo | Resistors | Axial (MFR-25) | `/images/components/MFR-25FTE52-10K.jpg` | local file | Yageo MFR-25 10k resistor axial photo | `MFR-25FTE52-10K.webp` |
| 10 | `B3F-1000` | SPST-NO Tactile Switch (6 mm × 6 mm) | OMRON | Switches and protection components | Tactile 6x6 mm Through-Hole | `/images/components/B3F-1000.jpg` | local file | OMRON B3F-1000 6x6 tactile switch photo | `B3F-1000.webp` |
| 11 | `LM7805` | 5 V Linear Voltage Regulator | Texas Instruments | Voltage regulators | TO-220 | `/images/components/LM7805.jpg` | local file | LM7805 TO-220 5V voltage regulator photo | `LM7805.webp` |

---

## Photo Credits & Attributions

*Fill in as new photographs are obtained and added to `client/public/images/components/`.*

| Part number | Photo source (URL) | Author | Licence |
| :--- | :--- | :--- | :--- |
| `0022232041` | | | |
| `1N4007` | | | |
| `1N4148` | | | |
| `B3F-1000` | | | |
| `BC547` | | | |
| `C315C104K5R5TA` | | | |
| `LM358` | | | |
| `LM7805` | | | |
| `MFR-25FTE52-10K` | | | |
| `NE555` | | | |
| `RLB0914-101KL` | | | |

