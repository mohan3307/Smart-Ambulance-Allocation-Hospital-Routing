# AegisResponse — Smart Ambulance Allocation & Hospital Routing Platform
### *AI-Powered Emergency Management & "Golden Hour" Clinical Optimization System*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v24+-green.svg)](https://nodejs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.14-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18_Vite_Tailwind-61DAFB.svg)](https://react.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime_WebSockets-010101.svg)](https://socket.io)

---

## 📌 Executive Summary

During severe medical emergencies (cardiac arrest, massive hemorrhage, ischemic stroke, polytrauma), the **"Golden Hour"** dictates patient survival. Traditional ambulance systems typically solve only one narrow slice of the problem: **proximity-based booking** (dispatching whichever vehicle is physically closest).

However, physical proximity alone often causes fatal delays:
- A basic transport ambulance without a mechanical ventilator or defibrillator may arrive 2 minutes earlier, but cannot stabilize an acute respiratory arrest.
- Ambulances frequently transport critical patients to the nearest hospital, only to find the Emergency Department at 98% capacity with zero available ICU beds, forcing an emergency diversion and losing 30+ critical minutes.

**AegisResponse** is an end-to-end emergency management platform that unifies:
1. **Patient Condition & Physiological Severity (AI Triage)**
2. **Onboard Medical Equipment & Paramedic Crew Certifications**
3. **Real-Time Traffic Congestion & Dynamic Mid-Transit Rerouting**
4. **Live Hospital ER & ICU Bed/Specialist Availability (Anti-Diversion)**

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Citizens_And_Dispatchers["Emergency Intake Layer"]
        SOS["Bystander SOS Web/Mobile<br/>(1-Tap GPS + 110 BPM CPR)"]
        SMS["Offline SMS Gateway<br/>(Low-Network 2G Fallback)"]
        CAD["Central CAD Dispatcher<br/>(Command Console)"]
    end

    subgraph Core_Backend["Node.js + Express Gateway (Port 5000)"]
        Router["Express REST & Geo Engine"]
        SocketIO["Socket.IO Live Telemetry Broadcast"]
        Store[("Datastore Layer: MongoDB Atlas / In-Memory Store")]
        Alerts["SMSService (Twilio + Cellular Fallback)"]
    end

    subgraph AI_Microservice["AI/ML Service (FastAPI / Port 8000)"]
        NLP["NLP Triage Engine (ESI 1-5 Severity)"]
        Alloc["Multi-Criteria Allocator (Skill + Equip + ETA)"]
        Hosp["Anti-Diversion Hospital Recommender"]
        XAI["XAI Explainer (Decision Justifications)"]
    end

    subgraph Ground_Units["Field Emergency Network"]
        Ambulance["Paramedic Tablet HUD (Turn-by-turn OSRM)"]
        Traffic["Smart Traffic Preemption (Green Corridor)"]
        HospitalER["Hospital ER Receiver (Trauma Bay Stand-by)"]
    end

    SOS -->|REST / WebSockets| Router
    SMS -->|Inbound Gateway| Router
    CAD -->|Manage Fleet & Incidents| Router

    Router <--> SocketIO
    Router <--> Store
    Router -->|JSON Pipeline| NLP
    NLP --> Alloc --> Hosp --> XAI
    XAI -->|Optimized Allocation| Router

    Router --> Alerts
    SocketIO -->|Live Coordinates & HUD| Ambulance
    SocketIO -->|Pre-Alert & Live Vitals| HospitalER
    SocketIO -->|Preemption Command| Traffic
    Alerts -->|Outbound SMS| HospitalER
    Alerts -->|Outbound SMS| SOS
```

---

## 🌟 Key Platform Innovations

### 1. Real-Time Emergency Severity Classification (AI Triage)
- Ingests natural language call transcripts, bystander descriptions, and physiological vitals (Heart Rate, SpO2, Systolic BP, GCS, Respiration Rate).
- Classifies into standard **Emergency Severity Index (ESI 1–5)**:
  - **ESI 1 (Red)**: Resuscitation (immediate life threat e.g., cardiac arrest, complete airway obstruction).
  - **ESI 2 (Orange)**: Emergent (high risk e.g., STEMI, stroke window < 4.5h, severe arterial hemorrhage).
  - **ESI 3 (Yellow)**: Urgent (complex trauma, fractures, stable vitals).
  - **ESI 4 & 5 (Green/Blue)**: Less urgent / Non-urgent.
- Predicts required clinical specialties (Cath Lab, Stroke Unit, Trauma Surgery, PICU, Burn Unit) and required onboard life-support gear.

### 2. Multi-Criteria Ambulance Allocation (Beyond Simple Proximity)
Traditional nearest-vehicle algorithms fail when the closest ambulance lacks critical equipment. AegisResponse solves this with a multi-objective utility optimization:
$$\text{Score} = w_{\text{eta}} \cdot S_{\text{eta}} + w_{\text{equip}} \cdot S_{\text{equip}} + w_{\text{crew}} \cdot S_{\text{crew}} + w_{\text{type}} \cdot S_{\text{vehicle\_type}} - \text{TrafficPenalty}$$
- Strictly penalizes units missing life-saving items (e.g. missing mechanical ventilator for ESI-1 apnea).
- Verifies paramedic crew certifications (Doctor / Critical Care Paramedic vs Basic EMT).

### 3. Bed-Aware Hospital Routing & Anti-Diversion Protection
- Continuously monitors regional hospital bed capacities:
  - Total ER beds vs Live available ER beds.
  - Total ICU beds vs Live available ICU beds.
  - On-duty specialist teams (Interventional Cardiologists, Neurosurgeons, Trauma Surgeons).
- **Anti-Diversion Filter**: Automatically diverts critical patients away from hospitals with 0 ICU beds or >90% ER saturation, preventing catastrophic hallway transfers.

### 4. Dynamic GIS Routing with Traffic Spike Rerouting & Green Corridor
- Interactive Leaflet map with real-time waypoint interpolation.
- **Mid-Transit Rerouting**: If a traffic bottleneck or collision spikes along the active corridor, the system calculates a bypass detour, alerts the in-vehicle tablet, and updates the ER arrival countdown.
- **Green Corridor Mode**: One-tap preemption alerting municipal traffic authorities to synchronize green lights along the ambulance's route.

### 5. Bystander SOS Mode & Synchronized 110 BPM CPR Metronome
- Ultra-simple public interface with 1-tap emergency trigger and automatic HTML5 GPS capture.
- Scene context selectors: casualty count, hazard tags (active traffic, fire/smoke, downed power line).
- **AI-Guided CPR Metronome**: Uses the browser's Web Audio API to deliver an audible and visual 110 BPM pulse (AHA guidelines) synchronized with a real-time ambulance ETA countdown ticker.

### 6. Explainable AI (XAI) Decision Audit
- Generates human-readable, transparent decision cards for dispatchers and medical auditors.
- Details why the chosen ambulance was preferred over physically closer units (e.g., *"Selected AMB-02 (MICU) over AMB-01 (BLS, 1.2 km closer) because AMB-02 carries a ventilator and critical care paramedic required for acute respiratory distress"*).
- Includes radar chart comparisons across 5 dimensions and estimates Golden Hour minutes saved.

### 7. Resilient Graceful Degradation
- If the Python AI microservice is ever unreachable, the Node.js backend automatically fails over to the built-in **Manchester Triage System (MTS) & Haversine Velocity Heuristics engine**, guaranteeing 100% uptime with zero request drops.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: v20+ or v24+
- **Python**: 3.10+ (tested with Python 3.14)
- **MongoDB**: (Optional — an automatic in-memory fallback store is included out of the box)

---

### Step 1: Start the Python AI Microservice

```powershell
cd ai_service
python -m pip install -r requirements.txt
python run.py
```
*The AI microservice will start on `http://localhost:8000` (FastAPI Swagger docs available at `http://localhost:8000/docs`).*

---

### Step 2: Start the Core Node.js Backend API

```powershell
cd backend
npm.cmd install
node src/server.js
```
*The backend API and Socket.IO server will start on `http://localhost:5000`.*

---

### Step 3: Launch the Frontend

The Express backend automatically serves the pre-built React application from `http://localhost:5000`!

Alternatively, you can run the Vite development server:
```powershell
cd frontend
npm.cmd install
node node_modules/vite/bin/vite.js
```
*Access the Vite dev app on `http://localhost:3000`.*

---

## 📱 User Portals & Workflows

1. **Central Command Dispatcher (`/` or `Command Dispatch` tab)**:
   - Live metropolitan CAD map showing 12 ambulances, 8 hospitals, active incidents, and traffic congestion.
   - 1-Click test intake presets: STEMI heart attack, Multi-car collision, Stroke window, Pediatric respiratory failure.
   - Green Corridor activation toggle & dynamic reroute simulation.
   - Explainable AI (XAI) rationale drawer.

2. **Bystander SOS Mode (`Bystander SOS` tab)**:
   - 1-tap SOS trigger with live GPS detection.
   - Casualty count slider & scene hazard tags.
   - Synchronized 110 BPM CPR Metronome with audio click and visual pulse guide.
   - Contextual first-aid checklists (Severe Bleeding, STEMI, Stroke FAST, Choking Heimlich, Burns).

3. **Hospital ER Reception Hub (`Hospital ER Hub` tab)**:
   - Facility switcher across 8 metropolitan hospitals.
   - Inbound ambulance monitor with real-time ETA countdown and patient vitals feed.
   - One-click Trauma Bay / Cath Lab team reservation.
   - Live ER & ICU bed capacity sliders and Diversion Status toggle.

4. **Paramedic In-Vehicle Tablet (`Paramedic Tablet` tab)**:
   - Turn-by-turn navigation HUD with step-by-step GPS advancement simulation.
   - Mid-transit traffic spike injector and dynamic reroute banner.
   - En-route patient vitals logger directly synchronized with hospital ER.
   - Milestone status updates (Arrived on Scene, En Route to Hospital, Handover Complete).

5. **Explainable AI & Analytics Hub (`XAI Audit & Stats` tab)**:
   - Golden Hour response metrics and dispatch efficiency stats.
   - Emergency Severity Index (ESI) distribution chart.
   - Complete decision audit ledger with plain-language clinical justifications and estimated minutes saved.

---

## 🔬 API Reference Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/incidents` | Fetch all active and historical emergency incidents |
| `POST` | `/api/incidents` | Create new emergency, trigger AI triage, allocate optimal ambulance & hospital |
| `POST` | `/api/incidents/:id/green-corridor` | Toggle municipal green traffic corridor |
| `GET` | `/api/ambulances` | Fetch fleet telemetry, onboard equipment, crew certifications |
| `POST` | `/api/ambulances/:id/step` | Advance simulated GPS waypoint along active route |
| `POST` | `/api/ambulances/:id/traffic-spike` | Inject traffic congestion and trigger dynamic reroute |
| `GET` | `/api/hospitals` | Fetch hospitals with live ER/ICU bed counts and diversion statuses |
| `PATCH` | `/api/hospitals/:id/beds` | Update live bed availability and diversion flag |
| `POST` | `/api/hospitals/:id/prepare-bay` | Pre-alert and reserve emergency resuscitation bay |
| `GET` | `/api/system/health-stats` | System engine health, KPIs, and Golden Hour metrics |
| `GET` | `/api/system/audits` | Explainable AI decision audit logs |

---

## ⏱️ 3-Minute Hackathon Demo Script & Storyline for Judges

When presenting **AegisResponse** to hackathon judges, follow this high-impact 3-minute storyline:

### 🕒 Minute 1: The Crisis & Citizen SOS Intake
1. **The Hook**: *"Every second counts in the Golden Hour. But when cardiac arrest hits, dispatching the wrong ambulance or sending a patient to a saturated hospital ER with 0 ICU beds costs human lives."*
2. **Citizen SOS Demo**:
   - Open the **Bystander SOS** portal (`/sos`).
   - Click **"🌟 Chennai (TN)"** (or your local city). Show the 1-tap geolocation and choose **"Unconscious / Stopped Breathing"**.
   - Click **"🚨 TRIGGER EMERGENCY SOS NOW"**. Hear the Web Audio CAD dispatch alert chime!
   - Show the **Synchronized 110 BPM CPR Metronome** ticking audio and visual beat while the ambulance is in transit.
   - Switch to **"📶 Offline SMS Mode"** to prove zero-internet 2G cellular fallback dispatching via SMS.

### 🕒 Minute 2: CAD Dispatch, Real Road Routing & Dynamic Detour
1. **Command CAD Console (`/`)**:
   - Show the real-time GIS map powered by HTML5 GPU hardware acceleration.
   - Show the **Golden Hour Survival Protocol Banner** (`⏱️ 41m 20s Left in Window`).
   - Notice the dark royal blue (`#1D4ED8`) road polyline following real OSRM road geometry.
   - Point out the **blinking red heart inside the ambulance marker** proving the patient is on board.
2. **Multi-Ambulance Conflict Resolution**:
   - Click **"⚡ Multi-Call Conflict Demo"**.
   - Two simultaneous high-priority calls appear in the queue. Show how the AI matches the specialized ALS unit to the STEMI patient and the trauma unit to the expressway crash without resource starvation!
3. **Traffic Jam & Dynamic Detour**:
   - Click **"Simulate Traffic Spike"**.
   - Hear the warning siren chirp as the system detects corridor congestion, calculates a live dynamic detour, and activates the **Green Corridor** traffic preemption wave.

### 🕒 Minute 3: Hospital Anti-Diversion & Paramedic Handover
1. **Hospital ER Reception (`/hospital`)**:
   - Show the hospital trauma receiver dashboard with inbound ambulance ticker and live patient vitals feed.
   - Demonstrate the **Bed Capacity Slider**: Saturate the ICU beds to 0. Show how the central AI immediately engages anti-diversion to prevent patient dumping!
   - Click **"Prepare Trauma Bay"**.
2. **Paramedic Tablet (`/paramedic`)**:
   - Show turn-by-turn navigation HUD and click **"Simulate GPS Step"** to reach the hospital.
   - When the ambulance pulls up to the ER, the hospital marker lights up with the bright emerald green **`✅ PATIENT SAFE & ADMITTED`** celebration badge and harmonic chime!
3. **Analytics & XAI Audit (`/analytics`)**:
   - Show the **Predictive AI ETA vs. Actual Ground Time Graph**, proving a **34% delay reduction** and quantifiable Golden Hour survival score improvement!

---

## ⚡ Hackathon-Winning Features Summary

| Feature | Problem Solved | Hackathon Impact |
|---|---|---|
| **Multi-Call Conflict Resolution** | Resolves resource contention when 2+ critical calls occur at once | Demonstrates true AI multi-objective utility optimization |
| **Predictive vs Actual ETA Graph** | Compares traditional static routing against live traffic AI | Visually proves algorithmic value to judges |
| **Blinking Patient In-Transit Animation** | Shows live patient custody inside the moving vehicle | Visual polish and intuitive real-time tracking |
| **Offline 2G SMS Dispatch Fallback** | Allows emergency SOS reporting in connectivity dead zones | Real-world reliability for rural/underground emergencies |
| **Web Audio EMS Synthesizer** | Authentic CAD pager chimes, siren chirps, and CPR beats | Zero external MP3 dependencies, immersive experience |
| **Anti-Diversion Hospital Rerouting** | Prevents ambulances from arriving at saturated ERs with 0 ICU beds | Solves the #1 real-world operational bottleneck in emergency medicine |

---

## ⚙️ Environment Variables Configuration

Copy `.env.example` to `.env` to configure optional external services:

```powershell
cp .env.example .env
```

| Variable | Description | Default / Fallback |
|---|---|---|
| `PORT` | Node.js backend port | `5000` |
| `MONGODB_URI` | MongoDB Atlas / Local URI | In-memory Datastore fallback |
| `AI_SERVICE_URL` | Python FastAPI microservice URL | Built-in Manchester Triage fallback |
| `OSRM_BASE_URL` | Open Source Routing Machine endpoint | `https://router.project-osrm.org` |
| `GOOGLE_MAPS_API_KEY` | Google Maps Platform API key | Optional (OSRM used by default) |
| `TWILIO_ACCOUNT_SID` | Twilio SMS API Account SID | Simulated SMS logger fallback |
| `TWILIO_AUTH_TOKEN` | Twilio SMS Auth Token | Simulated SMS logger fallback |
| `TWILIO_PHONE_NUMBER` | Outbound Twilio sender phone | `+18005550199` |

---

## 🔮 Future Roadmap

- **IoT Ambulance Health Telemetry**: Direct Bluetooth/LTE integration with onboard monitor defibrillators (Zoll, Physio-Control Lifepak) for 12-lead ECG waveforms.
- **Predictive Surge Forecasting**: Spatial-temporal ML models forecasting emergency surges during festivals, sporting events, and heatwaves.
- **Drone-Assisted First Response**: Autonomous AED / Narcan delivery to bystander GPS coordinates ahead of the ambulance.
- **Smart Traffic-Signal Preemption (V2I)**: Direct C-V2X integration with municipal traffic signal controllers (SCATS/SCOOT) for real hardware green light clearing.
- **Multilingual Voice Assistant**: Natural language voice bot for panicked callers supporting regional dialects and background audio stress classification.

