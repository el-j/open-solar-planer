# Electrical & Physics Reference — Open Solar Planer

> Engineering reference for contributors implementing physics modules.  
> All formulae, data models, and TypeScript signatures required to build the electrical engine in the browser (no backend, no native code).

---

## Chapter I — PV Cell & Module Physics

### I.1 Photovoltaic Effect

A photon with energy **E = h·f = h·c/λ** excites an electron across the semiconductor band-gap **Eg**.

| Symbol | Meaning | Value |
|--------|---------|-------|
| h | Planck constant | 6.626 × 10⁻³⁴ J·s |
| c | Speed of light | 2.998 × 10⁸ m/s |
| Eg (Si, 300 K) | Silicon band-gap | 1.12 eV |

**Condition for carrier generation:** E_photon > Eg

**Temperature dependence of Eg (Varshni equation):**

```
Eg(T) = 1.17 − (4.73 × 10⁻⁴ × T²) / (T + 636)   [eV, T in Kelvin]
```

Photons with E < Eg pass through without generating carriers (infrared losses).  
Photons with E >> Eg generate a carrier but the excess energy is lost as heat (thermalisation losses).  
These two effects together limit single-junction efficiency to ~33 % (Shockley–Queisser limit).

---

### I.2 Single-Diode Model (SDM) — 5 Parameters

The industry-standard model for a PV module:

```
I = Iph − I0 · (exp((V + I·Rs) / (n·Vt)) − 1) − (V + I·Rs) / Rsh
```

| Parameter | Symbol | Unit | Typical range |
|-----------|--------|------|---------------|
| Photocurrent | Iph | A | ≈ Isc at STC |
| Dark saturation current | I0 | A | 10⁻¹² – 10⁻⁶ |
| Series resistance | Rs | Ω | 0.1 – 1.0 |
| Shunt resistance | Rsh | Ω | 100 – 10 000 |
| Diode ideality factor | n | — | 1.0 – 1.5 |
| Thermal voltage | Vt = k·T/q | V | 0.02585 at 25 °C |

Constants: k = 1.381 × 10⁻²³ J/K, q = 1.602 × 10⁻¹⁹ C

**Extracting 5 parameters from a datasheet** (Voc, Isc, Vmpp, Impp at STC):

1. `Iph ≈ Isc` (first approximation)
2. At open circuit: `I0 ≈ Isc · exp(−Voc / (n·Vt))`
3. At MPP: use Impp, Vmpp to solve for Rs and Rsh via Newton iteration
4. Refine n by matching dI/dV at Voc from datasheet (if available)

---

### I.3 Double-Diode Model (DDM) — 7 Parameters

More accurate at low irradiance (< 200 W/m²):

```
I = Iph − I01·(exp((V+I·Rs)/(n1·Vt)) − 1)
        − I02·(exp((V+I·Rs)/(n2·Vt)) − 1)
        − (V+I·Rs)/Rsh
```

- **n1 ≈ 1.0** — diffusion current (dominant at high irradiance)
- **n2 ≈ 2.0** — recombination current (dominant at low irradiance)
- Prefer DDM when simulating dawn/dusk, overcast days, or partial shading

---

### I.4 Newton-Raphson I-V Curve Solver

The SDM/DDM equation is **implicit** in I — it must be solved numerically for each voltage point.

```typescript
/**
 * Solve for current I at a given voltage V using Newton-Raphson.
 * Falls back to bisection if NR diverges.
 */
export function solveCurrentNR(
  V: number,
  Iph: number,
  I0: number,
  Rs: number,
  Rsh: number,
  n: number,
  Vt: number,
  maxIter = 50,
  tol = 1e-7
): number {
  // Initial guess: short-circuit current
  let I = Iph;

  for (let iter = 0; iter < maxIter; iter++) {
    const expTerm = Math.exp((V + I * Rs) / (n * Vt));
    const f = I - Iph + I0 * (expTerm - 1) + (V + I * Rs) / Rsh;
    const df = 1 + (I0 * Rs / (n * Vt)) * expTerm + Rs / Rsh;

    if (Math.abs(df) < 1e-12) break; // guard against divide-by-zero
    const dI = f / df;
    I -= dI;

    if (Math.abs(dI) < tol) return I;
  }

  // Fallback: bisection between 0 and Iph
  return bisection(
    (x: number) => x - Iph + I0 * (Math.exp((V + x * Rs) / (n * Vt)) - 1) + (V + x * Rs) / Rsh,
    0,
    Iph,
    tol
  );
}

function bisection(f: (x: number) => number, a: number, b: number, tol: number): number {
  for (let i = 0; i < 100; i++) {
    const mid = (a + b) / 2;
    if (Math.abs(b - a) < tol) return mid;
    if (f(mid) * f(a) < 0) b = mid; else a = mid;
  }
  return (a + b) / 2;
}
```

---

### I.5 I-V and P-V Curve Generation

```typescript
export interface IVPoint { V: number; I: number; P: number; }

export interface IVCurve {
  points: IVPoint[];
  Isc: number;
  Voc: number;
  Impp: number;
  Vmpp: number;
  Pmpp: number;
  FF: number;        // Fill Factor
  efficiency: number; // η = Pmpp / (G × A_module)
}

export function generateIVCurve(
  params: { Iph: number; I0: number; Rs: number; Rsh: number; n: number; Vt: number },
  Voc_est: number,
  G: number,
  A_module: number,
  nPoints = 200
): IVCurve {
  const points: IVPoint[] = [];
  let Pmpp = 0, Impp = 0, Vmpp = 0;

  for (let i = 0; i <= nPoints; i++) {
    const V = (i / nPoints) * Voc_est;
    const I = solveCurrentNR(V, params.Iph, params.I0, params.Rs, params.Rsh, params.n, params.Vt);
    const P = V * I;
    points.push({ V, I, P });
    if (P > Pmpp) { Pmpp = P; Impp = I; Vmpp = V; }
  }

  const Isc = points[0].I;
  const Voc = points[nPoints].V; // refine: last V where I ≈ 0
  const FF = Pmpp / (Isc * Voc);
  const efficiency = Pmpp / (G * A_module);

  return { points, Isc, Voc, Impp, Vmpp, Pmpp, FF, efficiency };
}
```

**Fill Factor typical values:** Mono-Si 0.78–0.83, Poly-Si 0.74–0.80, CdTe 0.72–0.77

---

### I.6 Temperature Coefficients

| Coefficient | Symbol | Typical value | Unit |
|-------------|--------|--------------|------|
| Current (Isc) | αIsc | +0.04 | %/°C |
| Voltage (Voc) | βVoc | −0.30 | %/°C |
| Power (Pmax) | γPmax | −0.35 | %/°C |

**Corrected values at cell temperature Tc:**

```
Isc(Tc) = Isc_STC × (1 + αIsc/100 × (Tc − 25))
Voc(Tc) = Voc_STC × (1 + βVoc/100 × (Tc − 25))
Pmpp(Tc) = Pmpp_STC × (1 + γPmax/100 × (Tc − 25))
```

**NOCT cell temperature model:**

```
Tc = Ta + (G / 800) × (NOCT − 20)
```

NOCT (Normal Operating Cell Temperature): typically 45 °C, measured at G=800 W/m², Ta=20 °C, wind=1 m/s.

---

### I.7 Irradiance Correction

```
Isc(G, T) = Isc_STC × (G / 1000) × (1 + αIsc/100 × (Tc − 25))
Voc(G, T) = Voc_STC + n·Vt·ln(G / 1000) + βVoc/100 × (Tc − 25)   [V, not %]
```

**STC (Standard Test Conditions):** G = 1000 W/m², Tc = 25 °C, AM1.5G spectrum.

---

## Chapter II — String & Array Electrical Design

### II.1 Series String

```
V_string = N × Vmpp        (sum of module voltages at MPP)
I_string = Impp             (current is limited by the weakest module)
P_string = V_string × I_string
```

Series connection: voltages add, current equals the minimum module current.

---

### II.2 Parallel Strings

```
V_array = V_string          (common voltage)
I_array = M × I_string      (currents sum)
P_array = V_array × I_array
```

---

### II.3 Mismatch & Bypass Diodes

When one cell is shaded, it becomes a **reverse-biased load** for the rest of the string.  
A bypass diode (one per 20–24 cells in modern modules) activates and routes current around the shaded cell group.

**Hotspot power dissipation:**
```
P_hotspot = I_string² × R_cell_shaded
```

Avoid if cell Rshunt is low — can permanently damage the cell.

**Partial shading power loss (simplified):**
```
Loss_% ≈ (shaded_cells / bypass_diode_group_cells) × (I_string / I_mpp) × 100
```

---

### II.4 Temperature-Corrected MPPT String Sizing

**Worst-case high voltage** (coldest expected temperature Tmin):
```
Voc_cold = N × Voc_STC × (1 + βVoc/100 × (Tmin − 25))
Constraint: Voc_cold ≤ Vinv_max
```

**Worst-case low voltage** (hottest expected temperature Tmax):
```
Vmp_hot = N × Vmp_STC × (1 + βVoc/100 × (Tmax − 25))
Constraint: Vmp_hot ≥ MPPT_Vmin
```

**Also check:**
```
N × Vmp_STC × (1 + βVoc/100 × (Tmin − 25)) ≤ MPPT_Vmax
```

```typescript
export interface ModuleSpec {
  Voc_STC: number; Vmp_STC: number; Isc_STC: number; Imp_STC: number;
  Pmp_STC: number; betaVoc_pct_per_C: number;
}
export interface InverterSpec {
  Vinv_max: number; MPPT_Vmin: number; MPPT_Vmax: number; mppt_count: number;
}

export function calculateStringSizing(
  module: ModuleSpec,
  inverter: InverterSpec,
  Tmin: number,
  Tmax: number
): { Nmin: number; Nmax: number; Nrecommended: number; warnings: string[] } {
  const warnings: string[] = [];
  const bV = module.betaVoc_pct_per_C / 100;

  const Nmax_abs  = Math.floor(inverter.Vinv_max / (module.Voc_STC * (1 + bV * (Tmin - 25))));
  const Nmin_mppt = Math.ceil(inverter.MPPT_Vmin / (module.Vmp_STC * (1 + bV * (Tmax - 25))));
  const Nmax_mppt = Math.floor(inverter.MPPT_Vmax / (module.Vmp_STC * (1 + bV * (Tmin - 25))));

  const Nmax = Math.min(Nmax_abs, Nmax_mppt);
  const Nmin = Nmin_mppt;
  const Nrecommended = Math.floor((inverter.MPPT_Vmax * 0.85) / module.Vmp_STC);

  if (Nmin > Nmax) warnings.push('No valid string length — module/inverter incompatible at given temperature range.');
  if (Nrecommended < Nmin || Nrecommended > Nmax) warnings.push('Recommended string length outside valid range; check manually.');

  return { Nmin, Nmax, Nrecommended, warnings };
}
```

---

### II.5 String Summary JSON Schema

```typescript
export interface StringSummary {
  stringId: string;
  moduleCount: number;
  Voc_corrected_V: number;
  Vmp_corrected_V: number;
  Isc_A: number;
  Imp_A: number;
  totalPower_W: number;
  bypassDiodeGroups: number;
  warnings: string[];
}
```

---

## Chapter III — Inverter Models

### III.1 Topology Comparison

| Type | MPPT inputs | Typical range | Shading tolerance | Notes |
|------|-------------|--------------|-------------------|-------|
| String inverter | 1–3 | 1–20 kW | Medium | Most common residential |
| Central inverter | 1 | 30 kW–2 MW | Low | Large commercial/utility |
| Microinverter | 1 per module | 250–500 W | Excellent | Module-level MPPT |
| Power optimizer + inv. | 1 per module (DC) | 1–20 kW | Excellent | SolarEdge/Enphase model |

---

### III.2 Weighted Efficiency

**CEC weighted efficiency:**
```
η_CEC = 0.04·η_10% + 0.05·η_20% + 0.12·η_30% + 0.21·η_50% + 0.53·η_75% + 0.05·η_100%
```

**European weighted efficiency:**
```
η_EU = 0.03·η_5% + 0.06·η_10% + 0.13·η_20% + 0.10·η_30% + 0.48·η_50% + 0.20·η_100%
```

EU weighting better reflects central European irradiance distribution (more overcast hours).

---

### III.3 DC:AC Sizing Ratio

```
Sizing ratio = P_DC_peak (Wp) / P_AC_rated (W)
Typical: 1.1 – 1.3
```

**Clipping losses** occur when P_DC > P_AC_rated:
```
P_clipped = max(0, P_DC(t) − P_AC_rated)   [integrated over all hours]
Annual clipping loss ratio = ΣP_clipped / ΣP_DC
```

Clipping < 3 % is generally acceptable; use simulation to verify.

---

### III.4 InverterSpec JSON Schema

```typescript
export interface InverterEfficiencyPoint {
  load_pct: number;      // 5, 10, 20, 30, 50, 75, 100
  efficiency_pct: number;
}

export interface InverterSpec {
  id: string;
  brand: string;
  model: string;
  Pac_max_W: number;
  Pdc_max_W: number;
  Vdc_max_V: number;
  Vmppt_min_V: number;
  Vmppt_max_V: number;
  Idc_max_A: number;
  Iac_max_A: number;
  mppt_count: number;
  efficiency_curve: InverterEfficiencyPoint[];
  topology: 'string' | 'central' | 'micro' | 'optimizer';
  frequency_hz: 50 | 60;
  price_eur: number | null;
  datasheet_url: string | null;
  notes: string;
}
```

---

## Chapter IV — Transformer Models

### IV.1 Basics

```
Turns ratio:   n = N1/N2 = V1/V2 = I2/I1
Power balance: P1 = P2  (ideal)
```

In reality, magnetising current flows in the primary regardless of load (iron losses).

---

### IV.2 Loss Model & Efficiency

```
Pfe  = k · f^α · B^β         (Steinmetz — iron / core losses, load-independent)
Pcu  = I² · R_winding         (copper losses, load-dependent)
η(x) = (x · Pn) / (x · Pn + Pfe + x² · Pcu)
```

Where **x** = load fraction (0–1), **Pn** = rated power (VA).

**Peak efficiency** at:
```
x* = sqrt(Pfe / Pcu)
```

---

### IV.3 When Transformers Are Required

| Scenario | Requirement |
|----------|-------------|
| Grid connection > 100 kWp | LV (400 V) → MV (10/20/35 kV) step-up transformer |
| TL (transformerless) inverter with certain panel types | Check leakage current path; some BIPV/frameless panels require isolation transformer |
| Façade / BIPV integration | Isolation transformer for safety & ground isolation |
| Hospital / sensitive loads | Medical-grade isolation transformer |

---

### IV.4 TransformerSpec JSON Schema

```typescript
export interface TransformerSpec {
  id: string;
  brand: string;
  model: string;
  type: 'isolation' | 'grid-tie' | 'step-up' | 'step-down';
  rating_kVA: number;
  v_primary_V: number;
  v_secondary_V: number;
  Pfe_W: number;
  Pcu_W: number;
  efficiency_at_full_load_pct: number;
  price_eur: number | null;
  notes: string;
}
```

---

## Chapter V — Battery & Storage Models

### V.1 Chemistry Comparison

| Chemistry | V_nom (V) | Wh/kg | DoD max | Cycle life @ DoD | Self-disch (%/mo) | Thermal runaway risk |
|-----------|-----------|-------|---------|-----------------|-------------------|---------------------|
| Lead-acid flooded | 2.0/cell | 30–40 | 50 % | 500 @ 50 % | 3–5 | Low |
| AGM | 2.0/cell | 35–45 | 60 % | 600 @ 50 % | 1–3 | Low |
| GEL | 2.0/cell | 35–45 | 60 % | 800 @ 50 % | 1–2 | Low |
| LiFePO4 (LFP) | 3.2 | 90–160 | 90 % | 3000–6000 @ 80 % | 1–2 | Very low |
| NMC/NCA | 3.6 | 150–270 | 80 % | 1000–2000 @ 80 % | 2–3 | Medium |
| Sodium-ion | 3.1 | 100–140 | 80 % | 4000+ | 2–3 | Very low |
| Vanadium flow | 1.2/cell | 25–35 | 100 % | 20 000+ | ~0 | Very low |

---

### V.2 Equivalent Circuit Model

```
V_term = OCV(SoC) − I · Ri
```

- **OCV(SoC):** Open-circuit voltage as function of state of charge (lookup table per chemistry)
- **Ri:** Internal resistance (mΩ) — varies with SoC, temperature, and cycle age

**LFP OCV-SoC curve (approximate):**

| SoC (%) | OCV (V/cell) |
|---------|-------------|
| 0 | 3.00 |
| 10 | 3.10 |
| 20 | 3.20 |
| 50 | 3.27 |
| 80 | 3.30 |
| 90 | 3.33 |
| 100 | 3.65 |

---

### V.3 State of Charge Estimation

**Coulomb counting:**
```
SoC(t) = SoC(t0) + (1 / C_nom) × ∫ η_coulomb · I dt
```
η_coulomb = Coulombic efficiency (~99 % for LFP, ~85–90 % for lead-acid on charge)

**OCV-based SoC** (only valid at rest, ≥ 30 min after load removal):
Look up SoC from OCV-SoC table with interpolation.

**Kalman filter** (implementation not in browser v1): merges coulomb counting + OCV measurement to correct drift.

---

### V.4 Peukert Effect (Lead-Acid)

```
C_actual = C_rated × (I_rated / I_actual)^(k − 1)
```

| Chemistry | Peukert exponent k |
|-----------|--------------------|
| Ideal | 1.00 |
| LFP | 1.02–1.05 |
| AGM | 1.05–1.15 |
| Flooded lead-acid | 1.15–1.30 |

---

### V.5 State of Health & Capacity Fade

```
SoH = C_current / C_rated × 100 %
```

**Simple linear model:**
```
SoH = 100 % − (cycle_count / cycle_life_at_DoD) × 100 %
```

At SoH < 80 %, battery should be replaced (industry standard end-of-life criterion).

---

### V.6 Battery Sizing Formula

```
E_bat (kWh) = (E_daily_kWh × autonomy_days) / (DoD × η_roundtrip × η_inverter)
```

**Worked example** — residential home:
- Daily consumption: 10 kWh/day
- Autonomy: 2 days
- LFP battery: DoD = 90 %, η_roundtrip = 96 %
- Inverter efficiency: 97 %

```
E_bat = (10 × 2) / (0.90 × 0.96 × 0.97)
      = 20 / 0.8381
      ≈ 23.9 kWh  → select 25 kWh battery bank
```

---

### V.7 C-Rate

```
C-rate = I_discharge / C_rated      (e.g. C/10 = 10-hour discharge)
```

| Chemistry | Max continuous charge C-rate | Max continuous discharge C-rate |
|-----------|-----------------------------|--------------------------------|
| Lead-acid flooded | C/10 | C/5 |
| AGM | C/5 | C/2 |
| LFP | 0.5C | 1C (2C peak) |
| NMC | 1C | 2C (3C peak) |

---

### V.8 BatterySpec JSON Schema

```typescript
export interface BatterySpec {
  id: string;
  brand: string;
  model: string;
  chemistry: 'lead-acid-flooded' | 'agm' | 'gel' | 'lfp' | 'nmc' | 'nca' | 'sodium-ion' | 'vanadium-flow';
  capacity_kWh: number;
  voltage_nominal_V: number;
  DoD_max_pct: number;
  cycle_life: number;            // at stated DoD
  cycle_life_DoD_pct: number;   // the DoD used for cycle_life rating
  efficiency_roundtrip_pct: number;
  max_charge_rate_C: number;
  max_discharge_rate_C: number;
  bms_integrated: boolean;
  price_eur: number | null;
  datasheet_url: string | null;
  weight_kg: number | null;
  notes: string;
}
```

---

## Chapter VI — Charge Controllers

### VI.1 PWM Controller

The PWM controller simply shunts excess power by chopping the panel current once the battery is near full.

```
Loss = (V_panel − V_bat) × I_panel     [wasted as heat in switching element]
```

Use when: V_panel_Vmpp ≈ V_bat × 1.1 to 1.2 (panel and battery voltages closely matched).

---

### VI.2 MPPT Controller

Uses a DC-DC converter (buck or boost) to operate the panel at its true MPP regardless of battery voltage.

**Harvest gain vs PWM:** up to 25–30 % in cold/high-irradiance conditions.

**Perturb & Observe (P&O) algorithm:**
```
1. Measure P(t) = V(t) × I(t)
2. Perturb operating voltage: V(t+1) = V(t) ± ΔV
3. Measure P(t+1)
4. If P(t+1) > P(t): continue in same direction
5. Else: reverse direction
```

**Incremental Conductance (INC) algorithm — exact MPP condition:**
```
dP/dV = 0  →  I + V·(dI/dV) = 0  →  dI/dV = −I/V
```

---

### VI.3 MPPT Efficiency Table

| Load % | Typical MPPT efficiency |
|--------|------------------------|
| 10 % | 93–95 % |
| 25 % | 96–97 % |
| 50 % | 97–98.5 % |
| 75 % | 97–98.5 % |
| 100 % | 96–98 % |

---

### VI.4 Sizing Rules

```
I_controller ≥ Isc_array × 1.25          (NEC 690.8 safety factor)
I_controller_derated = I_rated × (1 − 0.005 × (Tambient − 25))   [−0.5 %/°C above 25 °C]
Voc_array(Tmin) ≤ Voc_controller_max
```

---

## Chapter VII — DC & AC Wiring Physics

### VII.1 Voltage Drop Formula

```
ΔV = (2 × ρ × L × I) / A
```

| Symbol | Meaning | Value |
|--------|---------|-------|
| ρ | Copper resistivity at 20 °C | 1.68 × 10⁻⁸ Ω·m |
| L | One-way cable length (m) | — |
| I | Current (A) | — |
| A | Cross-sectional area (m²) | — |

Factor of 2 accounts for both conductors (live + return).

**Temperature correction:**
```
ρ(T) = ρ_20 × (1 + 0.00393 × (T − 20))
```

**Maximum recommended voltage drop:**
- DC string wiring: ≤ 1 % (EU best practice)
- AC wiring to meter: ≤ 3 % (IEC 60364-7-712)

---

### VII.2 Cable Cross-Section Calculator

```typescript
const STANDARD_CSA_MM2 = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120] as const;
const RHO_COPPER_20C = 1.68e-8; // Ω·m

export function calculateCableCSA(
  current_A: number,
  length_m: number,
  voltDrop_pct: number,
  voltage_V: number,
  temp_C = 20
): { csa_mm2: number; nextStandardSize_mm2: number; drop_V: number; drop_pct: number } {
  const rho = RHO_COPPER_20C * (1 + 0.00393 * (temp_C - 20));
  const ΔV_max = voltage_V * (voltDrop_pct / 100);
  const csa_m2 = (2 * rho * length_m * current_A) / ΔV_max;
  const csa_mm2 = csa_m2 * 1e6;

  const nextStandardSize_mm2 = STANDARD_CSA_MM2.find(s => s >= csa_mm2) ?? 120;
  const R = (2 * rho * length_m) / (nextStandardSize_mm2 * 1e-6);
  const drop_V = R * current_A;
  const drop_pct = (drop_V / voltage_V) * 100;

  return { csa_mm2, nextStandardSize_mm2, drop_V, drop_pct };
}
```

---

### VII.3 Ampacity Reference (IEC 60364-5-52, copper, PVC insulation, 30 °C ambient)

| CSA (mm²) | In conduit (A) | Free air (A) | Bundled ×0.7 (A) |
|-----------|---------------|-------------|-----------------|
| 1.5 | 13.5 | 17.5 | 9.5 |
| 2.5 | 18.0 | 24.0 | 12.6 |
| 4 | 24.0 | 32.0 | 16.8 |
| 6 | 31.0 | 41.0 | 21.7 |
| 10 | 42.0 | 57.0 | 29.4 |
| 16 | 56.0 | 76.0 | 39.2 |
| 25 | 73.0 | 101.0 | 51.1 |
| 35 | 89.0 | 125.0 | 62.3 |
| 50 | 108.0 | 151.0 | 75.6 |
| 70 | 136.0 | 192.0 | 95.2 |
| 95 | 164.0 | 232.0 | 114.8 |
| 120 | 188.0 | 269.0 | 131.6 |

---

### VII.4 String Fuse Sizing

```
I_fuse ≥ 2 × Isc                               (back-feed protection)
I_fuse < Isc_parallel = (M − 1) × Isc          (must not blow on parallel string fault)
```

Where M = number of parallel strings.

---

### VII.5 Surge Protection Device (SPD) Sizing

- **Type 1 (Class I):** Lightning arrestor at service entrance (required when lightning protection system present)
- **Type 2 (Class II):** At inverter DC input — protects against induced surges

```
Up_SPD ≤ 0.8 × Vinv_max_DC      (protection level must be below inverter rated insulation voltage)
```

---

### VII.6 Wiring Data Schemas

```typescript
export interface CableSpec {
  id: string;
  material: 'copper' | 'aluminium';
  csa_mm2: number;
  max_voltage_V: number;
  temperature_rating_C: number;
  ampacity_conduit_A: number;
  ampacity_free_A: number;
  price_eur_per_m: number | null;
}

export interface ProtectionSpec {
  id: string;
  type: 'fuse' | 'MCB' | 'MCCB' | 'SPD' | 'RCD' | 'AFCI';
  rating_A: number;
  voltage_V: number;
  breaking_capacity_kA: number;
  price_eur: number | null;
}
```

---

## Chapter VIII — Shading & Irradiance Physics

### VIII.1 Solar Position

```typescript
/**
 * Computes solar altitude and azimuth for a given location and time.
 * Azimuth: 0° = North, 90° = East, 180° = South, 270° = West.
 */
export function solarPosition(
  lat_deg: number,
  lon_deg: number,
  date: Date
): { altitude_deg: number; azimuth_deg: number } {
  const rad = Math.PI / 180;
  const d = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const δ = 23.45 * Math.sin(rad * (360 / 365) * (d - 81));    // declination
  const EoT = 9.87 * Math.sin(rad * 2 * (360 / 365) * (d - 81))
            - 7.53 * Math.cos(rad * (360 / 365) * (d - 81))
            - 1.5  * Math.sin(rad * (360 / 365) * (d - 81));   // Equation of Time (min)
  const solarTime = date.getHours() + date.getMinutes() / 60
                    + (lon_deg - 15 * Math.round(lon_deg / 15)) / 15
                    + EoT / 60;
  const ω = (solarTime - 12) * 15;   // hour angle (degrees)

  const φ = lat_deg, δr = δ * rad, φr = φ * rad, ωr = ω * rad;
  const sinAlt = Math.sin(φr) * Math.sin(δr) + Math.cos(φr) * Math.cos(δr) * Math.cos(ωr);
  const altitude_deg = Math.asin(sinAlt) / rad;

  const cosAz = (Math.sin(δr) - Math.sin(φr) * sinAlt) / (Math.cos(φr) * Math.cos(altitude_deg * rad));
  let azimuth_deg = Math.acos(Math.max(-1, Math.min(1, cosAz))) / rad;
  if (ω > 0) azimuth_deg = 360 - azimuth_deg; // afternoon: west of south

  return { altitude_deg, azimuth_deg };
}
```

---

### VIII.2 Clear-Sky Irradiance (Simplified Ineichen-Perez)

```
I_ext = I_sc × (1 + 0.033 · cos(360 · d / 365))   [extraterrestrial, W/m²]
AM  = 1 / cos(z)                                    [air mass, z = zenith angle]
DNI = I_ext · exp(−0.8662 · AM · τ_B)              [Linke turbidity τ_B ≈ 3.0 typical]
GHI = DNI · cos(z) + DHI                            [global horizontal]
DHI ≈ 0.1 · I_ext · cos(z)                         [diffuse, rough approximation]
```

Solar constant **I_sc = 1361 W/m²**.

---

### VIII.3 Plane-of-Array (POA) Irradiance

Transposition from GHI/DHI to a tilted surface (tilt β, azimuth deviation from south γ):

**Angle of incidence (AOI):**
```
cos(AOI) = sin(δ)·sin(φ)·cos(β)
         − sin(δ)·cos(φ)·sin(β)·cos(γ)
         + cos(δ)·cos(φ)·cos(β)·cos(ω)
         + cos(δ)·sin(φ)·sin(β)·cos(γ)·cos(ω)
         + cos(δ)·sin(β)·sin(γ)·sin(ω)
```

**POA components:**
```
POA_beam    = DNI × max(0, cos(AOI))
POA_diffuse = DHI × (1 + cos(β)) / 2                      [isotropic sky model]
POA_ground  = GHI × ρ_ground × (1 − cos(β)) / 2          [ρ_ground ≈ 0.2]
POA_total   = POA_beam + POA_diffuse + POA_ground
```

**Hay-Davies model** (better for circumsolar diffuse, use when accuracy matters):
```
POA_diffuse_HD = DHI × (Ai · cos(AOI)/cos(z) + (1 − Ai) · (1 + cos(β))/2)
Ai = DNI / I_ext   [anisotropy index]
```

---

### VIII.4 Annual Yield Estimate

```
PR   = Performance Ratio (typical 0.75 – 0.85)
E_annual (kWh) = H_annual (kWh/m²) × P_peak (kWp) × PR
```

PR accounts for: temperature losses, wiring losses, inverter efficiency, soiling, mismatch, availability.

**Monthly irradiation lookup format (embed in assets/irradiance.json):**
```json
{
  "lat_50": { "lon_10": [55, 70, 100, 120, 140, 155, 150, 135, 100, 70, 45, 40] },
  ...
}
```
Array index = month (0=Jan), value = GHI_kWh_m2.

---

## Chapter IX — Grid-Tie Physics & Power Quality

### IX.1 AC Power Triangle

```
P (W)  = V · I · cos(φ)        active power
Q (VAR) = V · I · sin(φ)       reactive power
S (VA)  = V · I                apparent power
PF = P / S = cos(φ)
S = √(P² + Q²)
```

Grid code requirements: PF > 0.95 residential, PF > 0.90 commercial (varies by country).

---

### IX.2 Anti-Islanding Trips

| Standard | Region | Vmin trip | Vmax trip | Fmin trip (Hz) | Fmax trip (Hz) | Trip time |
|----------|--------|-----------|-----------|----------------|----------------|-----------|
| IEEE 1547-2018 | USA | 50 % Vn | 120 % Vn | 59.3 | 60.5 | ≤ 2 s |
| VDE-AR-N 4105 | Germany | 90 % Vn | 110 % Vn | 47.5 | 51.5 | ≤ 200 ms |
| EN 50549-1 | Europe | 85 % Vn | 110 % Vn | 47.5 | 51.5 | ≤ 200 ms |
| AS 4777.2 | Australia | 85 % Vn | 110 % Vn | 45.0 | 55.0 | ≤ 2 s |

---

### IX.3 Total Harmonic Distortion

```
THD_I = √(ΣI_n²) / I_1 × 100 %    (n = 2 to N)
```

IEEE 1547 limits: THD < 5 % total, individual harmonics 3rd–9th < 4 %.

---

### IX.4 Net Metering Calculation

```typescript
export function calculateNetMetering(
  exportRate_eur_per_kWh: number,
  importRate_eur_per_kWh: number,
  producedKWh: number,
  consumedKWh: number,
  gridImportKWh: number
): { selfConsumedKWh: number; exportedKWh: number; bill_eur: number; credit_eur: number; net_eur: number } {
  const selfConsumedKWh = Math.min(producedKWh, consumedKWh);
  const exportedKWh = Math.max(0, producedKWh - consumedKWh);
  const credit_eur = exportedKWh * exportRate_eur_per_kWh;
  const bill_eur   = gridImportKWh * importRate_eur_per_kWh;
  const net_eur    = bill_eur - credit_eur;
  return { selfConsumedKWh, exportedKWh, bill_eur, credit_eur, net_eur };
}
```

---

## Chapter X — Browser Implementation Guide

### X.1 Proposed File Structure

```
src/
  physics/
    constants.ts        — all physical constants (no logic)
    ivCurve.ts          — single/double diode model, NR solver, I-V curve
    stringDesign.ts     — string sizing, array power, mismatch
    irradiance.ts       — solar position, clear-sky, POA, annual yield
    battery.ts          — sizing, SoC, SoH, Peukert
    wiring.ts           — voltage drop, cable CSA, fuse sizing
    powerQuality.ts     — grid codes, THD, net metering
    index.ts            — re-exports all public API
  test/
    physics/
      ivCurve.test.ts
      stringDesign.test.ts
      irradiance.test.ts
      battery.test.ts
      wiring.test.ts
```

### X.2 Physical Constants (`constants.ts`)

```typescript
export const BOLTZMANN_K       = 1.380649e-23;  // J/K
export const ELECTRON_CHARGE_Q = 1.602176634e-19; // C
export const SOLAR_CONSTANT_W_M2 = 1361.0;       // W/m²
export const SILICON_BANDGAP_EV  = 1.12;         // eV at 300 K
export const COPPER_RESISTIVITY_OHM_M = 1.68e-8; // Ω·m at 20 °C
export const COPPER_TEMP_COEFF   = 0.00393;       // per °C
export const STC_IRRADIANCE_W_M2 = 1000.0;       // W/m²
export const STC_TEMP_C          = 25.0;          // °C
export const STEFAN_BOLTZMANN    = 5.670374419e-8; // W/(m²·K⁴)
export const AVOGADRO_N          = 6.02214076e23; // mol⁻¹
export const GRAVITY_M_S2        = 9.80665;       // m/s²
```

### X.3 Testing Requirements

| Module | Test approach | Reference data |
|--------|--------------|----------------|
| ivCurve | Unit test NR solver against known I-V tables | NREL SAM reference modules |
| stringDesign | Validate Voc_cold / Vmp_hot against manufacturer sizing tools | SMA / Fronius string sizing calculator |
| irradiance | Compare solarPosition() to NOAA solar calculator | Within ±0.5° altitude/azimuth |
| irradiance | Compare annual yield to PVGIS for 3 test locations | Within ±5 % |
| battery | Verify sizing formula worked example | Manual calculation above |
| wiring | Verify CSA formula against IEC tables | IEC 60364-5-52 example problems |

### X.4 Performance Budget

| Task | Target | Approach |
|------|--------|----------|
| Single I-V curve (200 pts) | < 2 ms | Tight NR loop, no allocations |
| Full project (20 modules) | < 40 ms | Sequential, main thread OK |
| Annual simulation (8 760 h × 20 modules) | < 500 ms | Web Worker, transferable results |
| Battery sizing calc | < 1 ms | Pure arithmetic |

Use **`performance.now()`** in development to profile.  
Move annual simulation to a **Web Worker** (`new Worker(new URL('./physics/worker.ts', import.meta.url))`) to avoid blocking the UI thread.

### X.5 Phased Rollout

| Sprint | Module | MVP | Full |
|--------|--------|-----|------|
| S1 | constants + wiring | Voltage drop calc | Cable CSA tool |
| S2 | ivCurve | SDM NR solver | DDM + bifacial |
| S3 | stringDesign | String sizing table | Multi-MPPT assignment |
| S4 | irradiance | Solar position | Hourly POA simulation |
| S5 | battery | Sizing formula | SoC/SoH model |
| S6 | powerQuality | Net metering | Grid code checker |
| S7 | All | Unit tests green | Performance benchmarks |

---

*Last updated: April 2026 — Open Solar Planer contributors*
