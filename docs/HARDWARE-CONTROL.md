# Hardware Monitoring & Control Bridge — Open Solar Planer

> **Scope:** Specification for a fully optional, local-only hardware bridge that connects Open Solar Planer (running in the browser) to real solar inverters, battery systems, and smart meters — without any cloud service, without any account, without any data leaving the local network.

---

## Architecture Principle

Open Solar Planer's core constraint is **100 % static** — no server, no backend, no database.  
The hardware bridge respects this constraint:

```
┌──────────────────────────────────────┐
│  Browser (Open Solar Planer)         │
│  - Planning UI (React/TypeScript)    │
│  - Live monitoring dashboard         │
│  - WebSocket client                  │
└────────────────┬─────────────────────┘
                 │  WebSocket  ws://localhost:8765
                 │  (local network only)
┌────────────────▼─────────────────────┐
│  osp-bridge  (local process)         │
│  - Tiny Node.js / Python daemon      │
│  - Runs on same machine or RPi       │
│  - Polls devices via Modbus/SunSpec  │
│  - Pushes JSON telemetry over WS     │
│  - Receives control commands from WS │
└────────────────┬─────────────────────┘
                 │  RS-485 / TCP / USB
                 │
        ┌────────┴──────────┐
        │   Physical devices │
        │  Inverter / BMS    │
        │  Smart meter       │
        │  Weather station   │
        └───────────────────┘
```

The browser **never** connects to the internet to reach the devices.  
The bridge **never** sends data outside the local network.  
Running the bridge is **optional** — the planner works fully without it.

---

## Chapter 1 — Communication Protocols

### 1.1 Modbus RTU (RS-485)

Most residential and commercial string inverters expose a Modbus RTU slave on their RS-485 port.

| Parameter | Typical value |
|-----------|--------------|
| Baud rate | 9600 or 19200 bps |
| Data bits | 8 |
| Stop bits | 1 |
| Parity | None |
| Slave address | 1–247 (configurable on device) |
| Max cable length | 1200 m with proper termination (120 Ω at both ends) |

**Frame structure:**
```
[Slave Addr 1B] [Function Code 1B] [Data ...] [CRC-16 2B]
```

Common function codes used by inverters:

| Code | Name | Use |
|------|------|-----|
| 0x03 | Read Holding Registers | Read operating data |
| 0x04 | Read Input Registers | Read measurement data |
| 0x06 | Write Single Register | Set parameter |
| 0x10 | Write Multiple Registers | Batch parameter set |

---

### 1.2 Modbus TCP

Ethernet-connected inverters often implement Modbus TCP (port **502**).

```
[MBAP Header 6B] [Function Code 1B] [Data ...]
MBAP: Transaction ID (2B) + Protocol ID (2B, always 0) + Length (2B) + Unit ID (1B)
```

The bridge connects as a Modbus TCP master; the inverter acts as the TCP server.

---

### 1.3 SunSpec Alliance Register Map

[SunSpec](https://sunspec.org/) defines a standard register layout on top of Modbus for interoperability.  
All SunSpec-compliant devices start with the identifier `0x53756E53` ("SunS") at holding register 40000 or 40001.

**SunSpec discovery:**
```
1. Connect to device (RTU or TCP)
2. Read 2 registers at address 40000
3. If value == 0x53756E53 → SunSpec device found at base 40000
4. Else try base address 0 and 50000
5. Read model blocks sequentially (block ID + block length)
```

**Common SunSpec model IDs:**

| Model ID | Name |
|----------|------|
| 1 | Common (device info) |
| 101 | Single-Phase Inverter |
| 102 | Split-Phase Inverter |
| 103 | Three-Phase Inverter |
| 160 | Multiple MPPT Extension |
| 201 | Single-Phase Meter |
| 203 | Three-Phase Meter |
| 802 | Battery Base Model |
| 803 | Lithium-Ion Battery |

**Model 103 (Three-Phase Inverter) key registers (offsets from model start):**

| Offset | Name | Type | Scale | Unit |
|--------|------|------|-------|------|
| 0 | A (AC current total) | uint16 | A_SF | A |
| 1 | AphA | uint16 | A_SF | A |
| 2 | AphB | uint16 | A_SF | A |
| 3 | AphC | uint16 | A_SF | A |
| 4 | A_SF | int16 (scale factor) | — | — |
| 5 | PPVphAB | uint16 | V_SF | V |
| ... | ... | ... | ... | ... |
| 14 | W (AC power) | int16 | W_SF | W |
| 15 | W_SF | int16 | — | — |
| 20 | Hz | uint16 | Hz_SF | Hz |
| 24 | VA | int16 | VA_SF | VA |
| 26 | VAr | int16 | VAr_SF | VAr |
| 28 | PF | int16 | PF_SF | % |
| 30 | WH (AC energy total) | acc32 | WH_SF | Wh |
| 68 | DCA (DC current) | int16 | DCA_SF | A |
| 70 | DCV (DC voltage) | uint16 | DCV_SF | V |
| 72 | DCW (DC power) | int16 | DCW_SF | W |
| 74 | TmpCab (cabinet temp) | int16 | Tmp_SF | °C |
| 78 | St (operating state) | enum16 | — | — |
| 80 | Evt1 (event flags) | bitfield32 | — | — |

**Inverter operating states (St):**

| Value | State |
|-------|-------|
| 1 | Off |
| 2 | Sleeping |
| 3 | Starting |
| 4 | MPPT (normal operation) |
| 5 | Throttled |
| 6 | Shutting down |
| 7 | Fault |
| 8 | Standby |

---

### 1.4 Manufacturer-Specific Protocols

Some inverters do not implement SunSpec and require brand-specific register maps:

| Brand | Protocol | Notes |
|-------|----------|-------|
| SMA | Modbus RTU/TCP, SunSpec compliant | Register map in SMA Modbus doc |
| Fronius | Fronius Solar API (HTTP/JSON on local LAN) + SunSpec Modbus | Prefer HTTP API |
| Huawei | Modbus TCP, proprietary register map | EMMA dongle required |
| Goodwe | Modbus TCP, SunSpec + extensions | SEMS portal optionally |
| Solis | Modbus RTU/TCP | Ginlong register map PDF |
| Victron | VE.Can, VE.Bus, Modbus TCP via Venus OS | Venus GX bridge recommended |
| Growatt | Modbus RTU, ShineWifi dongle | Growatt register map PDF |
| Deye | Modbus TCP | SolarmanV5 or direct Modbus |

---

### 1.5 HTTP/REST Local APIs

Some newer inverters expose a local REST API (no cloud required):

**Fronius Solar API v1 (local network):**
```
GET http://<inverter_ip>/solar_api/v1/GetInverterRealtimeData.cgi?Scope=Device&DeviceId=1&DataCollection=CommonInverterData
```
Response (JSON):
```json
{
  "Body": {
    "Data": {
      "PAC": { "Value": 2450, "Unit": "W" },
      "DAY_ENERGY": { "Value": 14200, "Unit": "Wh" },
      "YEAR_ENERGY": { "Value": 4200000, "Unit": "Wh" },
      "TOTAL_ENERGY": { "Value": 42000000, "Unit": "Wh" }
    }
  }
}
```

**SolarEdge Local API (SetApp-enabled inverters):**
```
GET http://<inverter_ip>/api/v1/status
```

---

### 1.6 CAN Bus (BMS / Battery Systems)

Lithium battery systems with integrated BMS often expose a CAN bus interface.

Common BMS CAN protocols:
- **PYLON CAN** (Pylontech batteries) — widely supported by Victron, Goodwe, SolarEdge
- **BYD CAN** (BYD Battery-Box)
- **SMA CAN** (SMA Home Storage)

Typical CAN frame IDs used by Pylontech:

| CAN ID | Direction | Content |
|--------|-----------|---------|
| 0x351 | BMS → Inverter | Charge voltage limit, max charge/discharge current, discharge cutoff |
| 0x355 | BMS → Inverter | State of Charge (SoC %), State of Health (SoH %) |
| 0x356 | BMS → Inverter | Battery voltage, current, temperature |
| 0x35A | BMS → Inverter | Alarm/protection bits |
| 0x35E | BMS → Inverter | BMS name string |

The bridge reads CAN frames using `socketcan` (Linux) or a USB CAN adapter (`SLCAN` protocol).

---

## Chapter 2 — Bridge Daemon (osp-bridge)

### 2.1 Technology Choice

The bridge is a **standalone local process**, NOT part of the browser app.  
It can be implemented in:

| Option | Pros | Cons |
|--------|------|------|
| **Node.js** (recommended) | Same language as app, easy WS server, `modbus-serial` npm package | Requires Node.js installed |
| **Python** | `pymodbus`, `can`, `websockets` mature packages; Raspberry Pi native | Separate language from main codebase |
| **Go** | Single binary, no runtime | Separate language |

Recommended: **Node.js** with:
- [`modbus-serial`](https://www.npmjs.com/package/modbus-serial) — Modbus RTU + TCP
- [`ws`](https://www.npmjs.com/package/ws) — WebSocket server
- [`can`](https://www.npmjs.com/package/socketcan) — CAN bus (Linux)
- [`serialport`](https://www.npmjs.com/package/serialport) — Serial port

---

### 2.2 Configuration File (`osp-bridge.config.json`)

```json
{
  "websocket": {
    "host": "127.0.0.1",
    "port": 8765
  },
  "devices": [
    {
      "id": "inverter-1",
      "type": "modbus-tcp",
      "protocol": "sunspec",
      "host": "192.168.1.100",
      "port": 502,
      "unitId": 1,
      "pollInterval_ms": 5000,
      "enabled": true
    },
    {
      "id": "battery-1",
      "type": "modbus-rtu",
      "protocol": "pylontech-can",
      "serialPort": "/dev/ttyUSB0",
      "baudRate": 115200,
      "pollInterval_ms": 2000,
      "enabled": true
    },
    {
      "id": "meter-1",
      "type": "modbus-tcp",
      "protocol": "sunspec-meter",
      "host": "192.168.1.101",
      "port": 502,
      "unitId": 2,
      "pollInterval_ms": 1000,
      "enabled": true
    },
    {
      "id": "weather-1",
      "type": "http",
      "protocol": "davis-weatherlink-local",
      "host": "192.168.1.102",
      "pollInterval_ms": 60000,
      "enabled": false
    }
  ],
  "logging": {
    "level": "info",
    "file": "osp-bridge.log"
  }
}
```

---

### 2.3 WebSocket Message Protocol

All messages are JSON. The connection is `ws://localhost:8765`.

**Telemetry message (bridge → browser):**
```json
{
  "type": "telemetry",
  "deviceId": "inverter-1",
  "timestamp": "2026-04-21T12:00:00.000Z",
  "data": {
    "ac_power_W": 4250,
    "ac_voltage_V": 230.4,
    "ac_current_A": 18.5,
    "ac_frequency_Hz": 50.01,
    "dc_voltage_V": 380.2,
    "dc_current_A": 11.6,
    "dc_power_W": 4411,
    "energy_today_Wh": 18400,
    "energy_total_Wh": 42000000,
    "temperature_cabinet_C": 38.5,
    "state": "mppt",
    "efficiency_pct": 96.3,
    "alarms": []
  }
}
```

**Battery telemetry:**
```json
{
  "type": "telemetry",
  "deviceId": "battery-1",
  "timestamp": "2026-04-21T12:00:00.000Z",
  "data": {
    "soc_pct": 78.5,
    "soh_pct": 97.2,
    "voltage_V": 51.2,
    "current_A": -15.3,
    "power_W": -783,
    "temperature_C": 24.5,
    "charge_limit_W": 5000,
    "discharge_limit_W": 5000,
    "alarms": [],
    "charging": false,
    "discharging": true
  }
}
```

**Meter telemetry (grid feed-in / consumption):**
```json
{
  "type": "telemetry",
  "deviceId": "meter-1",
  "timestamp": "2026-04-21T12:00:00.000Z",
  "data": {
    "grid_power_W": -1200,
    "grid_voltage_V": 230.1,
    "grid_current_A": -5.2,
    "grid_frequency_Hz": 50.00,
    "export_today_Wh": 8200,
    "import_today_Wh": 1100,
    "export_total_Wh": 12500000,
    "import_total_Wh": 3400000
  }
}
```

**Device status message (bridge → browser):**
```json
{
  "type": "device_status",
  "deviceId": "inverter-1",
  "status": "connected",
  "lastPollMs": 4980,
  "errorCount": 0
}
```

**Control command (browser → bridge):**
```json
{
  "type": "command",
  "deviceId": "inverter-1",
  "command": "set_power_limit",
  "params": {
    "limit_pct": 70
  },
  "requestId": "cmd-abc-123"
}
```

**Command response (bridge → browser):**
```json
{
  "type": "command_response",
  "requestId": "cmd-abc-123",
  "success": true,
  "message": "Power limit set to 70 %"
}
```

---

### 2.4 Supported Control Commands

| Command | Device type | Params | Description |
|---------|-------------|--------|-------------|
| `set_power_limit` | Inverter | `limit_pct: number` | Set active power output limit (0–100 %) |
| `set_reactive_power` | Inverter | `Q_VAR: number` | Set reactive power setpoint |
| `set_power_factor` | Inverter | `pf: number` | Set fixed power factor |
| `set_charge_limit` | Battery | `limit_W: number` | Max charge power |
| `set_discharge_limit` | Battery | `limit_W: number` | Max discharge power |
| `set_soc_limits` | Battery | `min_pct: number, max_pct: number` | Set min/max SoC operating range |
| `force_charge` | Battery | `power_W: number, duration_s: number` | Force charge from grid at given power |
| `force_discharge` | Battery | `power_W: number, duration_s: number` | Force discharge to grid/home at given power |
| `restart_inverter` | Inverter | — | Send soft restart command |
| `clear_alarms` | Any | — | Reset alarm / fault flags |

---

### 2.5 Security Model

The bridge binds **only to localhost (127.0.0.1)** by default.  
If the user needs to monitor from a different device on the LAN, they may configure:
```json
"host": "0.0.0.0"
```
In this case, the bridge should require a **shared secret token** in every WebSocket message:
```json
{
  "type": "auth",
  "token": "user-defined-secret-token"
}
```
The browser sends this token as the first message after WebSocket connection is established.

**Never implement:**
- Cloud relay
- Port forwarding instructions in docs (security risk)
- Remote access over the internet without VPN (out of scope)

---

## Chapter 3 — Browser Integration

### 3.1 WebSocket Client Hook

```typescript
// src/hooks/useBridgeConnection.ts

export interface BridgeConnectionOptions {
  url?: string;   // default: 'ws://localhost:8765'
  token?: string; // optional auth token
  onTelemetry?: (msg: TelemetryMessage) => void;
  onDeviceStatus?: (msg: DeviceStatusMessage) => void;
}

export function useBridgeConnection(options: BridgeConnectionOptions = {}) {
  const [connected, setConnected] = React.useState(false);
  const [devices, setDevices] = React.useState<Record<string, DeviceStatus>>({});
  const wsRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    const url = options.url ?? 'ws://localhost:8765';
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (options.token) {
        ws.send(JSON.stringify({ type: 'auth', token: options.token }));
      }
    };

    ws.onclose = () => setConnected(false);

    ws.onmessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as BridgeMessage;
      if (msg.type === 'telemetry')     options.onTelemetry?.(msg as TelemetryMessage);
      if (msg.type === 'device_status') options.onDeviceStatus?.(msg as DeviceStatusMessage);
    };

    return () => ws.close();
  }, [options.url, options.token]);

  const sendCommand = React.useCallback((command: ControlCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'command', ...command }));
    }
  }, []);

  return { connected, devices, sendCommand };
}
```

---

### 3.2 Live Monitoring Dashboard Requirements

When the bridge is connected, a **Live** indicator appears in the app header.  
Clicking it opens the monitoring dashboard panel:

**Dashboard panels:**

| Panel | Data | Update rate |
|-------|------|-------------|
| Inverter power gauge | AC power (W), efficiency %, state | 5 s |
| Solar yield today | Energy today (Wh), energy this month | 5 s |
| Battery status | SoC bar, power flow direction, voltage | 2 s |
| Grid meter | Import / export power (W), net today (kWh) | 1 s |
| Power flow diagram | Animated arrows: PV → Inverter → Home/Grid/Battery | 5 s |
| Alarms | Active alarm list with severity, timestamp | On change |
| Temperature | Inverter cabinet, battery temperature | 30 s |

**Power flow animation logic:**
```typescript
function getPowerFlows(inv: InverterTelemetry, bat: BatteryTelemetry, meter: MeterTelemetry) {
  return {
    pvToInverter_W:   Math.max(0, inv.dc_power_W),
    inverterToHome_W: Math.max(0, inv.ac_power_W - Math.max(0, -meter.grid_power_W)),
    inverterToGrid_W: Math.max(0, -meter.grid_power_W),
    gridToHome_W:     Math.max(0, meter.grid_power_W),
    batCharging_W:    bat.charging  ? Math.abs(bat.power_W) : 0,
    batDischarging_W: bat.discharging ? Math.abs(bat.power_W) : 0,
  };
}
```

---

### 3.3 Data Storage (Browser-Side, No Backend)

The bridge does not store historical data — it is a real-time relay only.  
Historical data storage in the browser uses **IndexedDB** via a thin wrapper:

```typescript
// src/storage/telemetryDB.ts
// Stores last 30 days of 5-minute resolution data per device
// IndexedDB stores up to ~50 MB before quota prompts on most browsers
// Total: 8640 samples/device/30 days × ~200 bytes/sample × 3 devices ≈ 5 MB

export async function storeTelemetrySample(deviceId: string, data: TelemetryData): Promise<void>
export async function queryTelemetry(deviceId: string, from: Date, to: Date): Promise<TelemetryData[]>
export async function pruneOldTelemetry(olderThanDays: number): Promise<void>
```

Data is downsampled to 5-minute resolution on insert (average of all samples in the window).

---

## Chapter 4 — Supported Devices (Initial List)

### 4.1 Inverters

| Brand | Model range | Protocol | Notes |
|-------|-------------|----------|-------|
| SMA | Sunny Boy 1.5–6.0, Sunny Tripower 3–20 | SunSpec Modbus TCP | Webconnect required for Ethernet |
| Fronius | Symo, Primo, Galvo, Eco | Fronius Solar API (HTTP) + SunSpec | Best local API experience |
| Huawei | SUN2000-2KTL–20KTL | Modbus TCP | FusionSolar EMMA dongle |
| Goodwe | ES, EH, ET, DNS series | Modbus TCP SunSpec | Direct LAN connect |
| Solis | S6, RHI, S5 | Modbus RTU/TCP | Ginlong register map |
| Victron | MultiPlus-II, Quattro | VE.Bus + Modbus via Venus OS | Venus GX/Cerbo required |
| Growatt | SPH, MOD, MIC series | Modbus RTU via ShineWifi | ShineWifi-X exposes Modbus TCP |
| Deye | SUN-xK-SG04LP3 series | Modbus TCP | SolarmanV5 or direct |
| Enphase | IQ7/IQ8 microinverters | Envoy local API (HTTP) | Envoy gateway required |
| SolarEdge | SE-xxxH, SE-xxxA | Modbus TCP (RS485 or Ethernet) | SetApp configuration required |

---

### 4.2 Battery Systems

| Brand | Model | Protocol | BMS CAN Protocol |
|-------|-------|----------|-----------------|
| Pylontech | US2000, US3000, Force H2 | RS-485 / CAN | PYLON CAN |
| BYD | Battery-Box Premium LVS/HVS | CAN | BYD CAN |
| Victron | Lithium Smart | VE.Direct / VE.Bus | — |
| Dyness | Tower B4850, A48100 | RS-485 / CAN | PYLON-compatible |
| EG4 | LifePower4, FlexBOSS | CAN | PYLON-compatible |
| CATL (OEM) | Various | CAN | Varies |

---

### 4.3 Smart Meters

| Brand | Model | Protocol |
|-------|-------|----------|
| SMA | Energy Meter 2.0 | SMA Energy Meter protocol (UDP multicast) |
| Eastron | SDM120, SDM630 | Modbus RTU/TCP SunSpec |
| ABB | B21/B23/B24 | Modbus TCP |
| Schneider | iEM3 series | Modbus TCP |
| ISKRA | MT174, MT175 | IEC 62056-21 (optical) / Modbus |
| Shelly | 3EM | HTTP REST (local API) |

---

### 4.4 Weather Stations

| Brand | Model | Protocol |
|-------|-------|----------|
| Davis Instruments | Vantage Pro2, Vantage Vue | WeatherLink Local API (HTTP/JSON) |
| Fronius | Sensor Box | SunSpec Modbus |
| Kipp & Zonen | SMP series pyranometer | 4–20 mA / RS-485 |
| Generic | Modbus irradiance sensor | Modbus RTU |

Weather data enriches yield simulation accuracy but is optional.

---

## Chapter 5 — Data Schemas (TypeScript)

### 5.1 Telemetry Message Types

```typescript
export type BridgeMessageType = 'telemetry' | 'device_status' | 'command' | 'command_response' | 'auth' | 'error';

export interface BaseBridgeMessage {
  type: BridgeMessageType;
  timestamp: string; // ISO 8601
}

export interface TelemetryMessage extends BaseBridgeMessage {
  type: 'telemetry';
  deviceId: string;
  data: InverterTelemetry | BatteryTelemetry | MeterTelemetry | WeatherTelemetry;
}

export interface InverterTelemetry {
  ac_power_W: number;
  ac_voltage_V: number;
  ac_current_A: number;
  ac_frequency_Hz: number;
  dc_voltage_V: number;
  dc_current_A: number;
  dc_power_W: number;
  energy_today_Wh: number;
  energy_total_Wh: number;
  temperature_cabinet_C: number;
  state: 'off' | 'sleeping' | 'starting' | 'mppt' | 'throttled' | 'shutdown' | 'fault' | 'standby';
  efficiency_pct: number;
  alarms: string[];
  mppt?: MPPTChannel[];
}

export interface MPPTChannel {
  mppt_id: number;
  dc_voltage_V: number;
  dc_current_A: number;
  dc_power_W: number;
}

export interface BatteryTelemetry {
  soc_pct: number;
  soh_pct: number;
  voltage_V: number;
  current_A: number;
  power_W: number;
  temperature_C: number;
  charge_limit_W: number;
  discharge_limit_W: number;
  charging: boolean;
  discharging: boolean;
  alarms: string[];
  cells?: CellTelemetry[];
}

export interface CellTelemetry {
  cell_id: number;
  voltage_V: number;
  temperature_C: number;
}

export interface MeterTelemetry {
  grid_power_W: number;
  grid_voltage_V: number;
  grid_current_A: number;
  grid_frequency_Hz: number;
  export_today_Wh: number;
  import_today_Wh: number;
  export_total_Wh: number;
  import_total_Wh: number;
  power_factor: number;
}

export interface WeatherTelemetry {
  irradiance_W_m2: number;
  temperature_ambient_C: number;
  wind_speed_m_s: number;
  wind_direction_deg: number;
  humidity_pct: number;
  pressure_hPa: number;
}

export interface DeviceStatusMessage extends BaseBridgeMessage {
  type: 'device_status';
  deviceId: string;
  status: 'connected' | 'disconnected' | 'error' | 'polling';
  lastPollMs: number;
  errorCount: number;
  errorMessage?: string;
}

export interface ControlCommand {
  deviceId: string;
  command: string;
  params?: Record<string, number | string | boolean>;
  requestId: string;
}
```

---

## Chapter 6 — Installation Guide

### 6.1 Minimum Hardware Requirements

| Scenario | Hardware |
|----------|----------|
| Inverter on LAN | Any PC/Mac/Linux box running Node.js |
| RS-485 Modbus RTU | USB-to-RS485 adapter (e.g., FTDI-based, CH340, or Waveshare) |
| CAN bus (battery BMS) | USB-CAN adapter (e.g., CANable, PEAK PCAN-USB) |
| Low-power always-on | Raspberry Pi 3B+ or Pi Zero 2W |

---

### 6.2 Raspberry Pi Setup (Recommended)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install osp-bridge
npm install -g osp-bridge

# Create configuration
mkdir ~/osp-bridge && cd ~/osp-bridge
osp-bridge init   # generates osp-bridge.config.json interactively

# Run as systemd service (auto-start on boot)
osp-bridge install-service
sudo systemctl enable osp-bridge
sudo systemctl start osp-bridge

# Check logs
journalctl -u osp-bridge -f
```

---

### 6.3 USB-to-RS485 Adapter Wiring

| Adapter pin | Inverter RS-485 terminal |
|-------------|------------------------|
| A+ | RS-485 A (or +) |
| B− | RS-485 B (or −) |
| GND | GND (if exposed) |

Add a 120 Ω termination resistor between A and B at the far end of the cable if the bus is > 10 m.

---

### 6.4 Connecting to Open Solar Planer

1. Open the app: `https://el-j.github.io/open-solar-planer/`
2. Open Settings → Hardware Bridge
3. Enter bridge URL: `ws://localhost:8765` (or your Pi's IP: `ws://192.168.1.50:8765`)
4. Click **Connect** — a green **Live** indicator appears in the header
5. Open the **Monitoring** tab to see live data

No configuration is stored on any server. The bridge URL is saved in `localStorage`.

---

## Chapter 7 — Development & Extension

### 7.1 Adding a New Device Driver

Create a new file in `bridge/drivers/<brand>-<model>.ts`:

```typescript
import { DeviceDriver, TelemetryData, DriverConfig } from '../types';

export class SolisInverterDriver implements DeviceDriver {
  constructor(private config: DriverConfig) {}

  async connect(): Promise<void> { /* open Modbus TCP connection */ }
  async disconnect(): Promise<void> { /* close connection */ }

  async poll(): Promise<TelemetryData> {
    // Read Solis-specific registers
    // Map to standard TelemetryData schema
    return { ... };
  }

  async executeCommand(command: string, params: Record<string, unknown>): Promise<void> {
    // Map command to Modbus write
  }
}
```

Register the driver in `bridge/driverRegistry.ts`:
```typescript
export const DRIVER_REGISTRY: Record<string, DriverConstructor> = {
  'solis-inverter': SolisInverterDriver,
  'fronius-inverter': FroniusInverterDriver,
  // ...
};
```

---

### 7.2 Testing a Driver

The bridge includes a **mock mode** for development without physical hardware:

```json
{
  "devices": [{
    "id": "inverter-1",
    "type": "mock",
    "protocol": "sunspec",
    "mockProfile": "sunny-day-2kw",
    "pollInterval_ms": 1000
  }]
}
```

Mock profiles are JSON files in `bridge/mock-profiles/` that describe a day's worth of telemetry at 1-minute resolution.

---

*Last updated: April 2026 — Open Solar Planer contributors*
