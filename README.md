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

```
                                  +-------------------------------------------------+
                                  |            CLIENT-FACING APPLICATIONS           |
                                  |       (React 18 + Tailwind CSS + Leaflet)       |
                                  +-----------------------+-------------------------+
                                                          |
             +-----------------------+--------------------+-------------------+-----------------------+
             |                       |                                        |                       |
+------------v------------+ +--------v---------------+               +--------v------------+ +--------v------------+
|  Command Dispatcher CAD | |    Bystander SOS &     |               | Hospital ER Intake  | | Paramedic In-Vehicle|
|  - Live GIS Map         | |    CPR Metronome App   |               | - Inbound Ticker    | | Tablet HUD          |
|  - Triage Queue         | | - 1-Tap Geolocation    |               | - Live Vitals Stream| | - Turn-by-turn GIS  |
|  - Green Corridor Ctrl  | | - 110 BPM Audio Beat   |               | - Bed Capacity Ctrl | | - Reroute Alerts    |
|  - Decision Audit Logs  | | - Emergency Protocols  |               | - Trauma Bay Prep   | | - Vitals Logger     |
+------------+------------+ +--------+---------------+               +--------+------------+ +--------+------------+
             |                       |                                        |                       |
             +-----------------------+--------------------+-------------------+-----------------------+
                                                          | HTTP REST & WebSockets (Port 5000)
                                                          v
                                  +-------------------------------------------------+
                                  |            CORE GATEWAY & BACKEND               |
                                  |          (Node.js + Express + Socket.IO)        |
                                  +-----------------------+-------------------------+
                                                          |
                      +-----------------------------------+-----------------------------------+
                      |                                                                       |
                      v                                                                       v
        +---------------------------+                                           +---------------------------+
        |   DATASTORE LAYER         |                                           | RESILIENT CIRCUIT BREAKER |
        | - MongoDB (Port 27017)    |                                           | If AI service is offline, |
        | - Resilient In-Memory     |                                           | automatically engages     |
        |   Collections Fallback    |                                           | Manchester Triage Rules   |
        +---------------------------+                                           +-------------+-------------+
                                                                                              |
                                  +-------------------------------------------------+         |
                                  |            AI / ML MICROSERVICE                 |<--------+
                                  |             (Python 3.14 + FastAPI)             | (Graceful Fallback)
                                  +-----------------------+-------------------------+
                                                          |
             +--------------------------------------------+-------------------------------------------+
             |                                            |                                           |
+------------v------------+                  +------------v------------+                 +------------v------------+
|  NLP Triage Classifier |                  | Multi-Criteria Allocator|                 | Bed-Aware Recommender   |
| - Text & Vitals Parsing |                  | - Score = w_eta*ETA +   |                 | - Specialty Matching    |
| - ESI 1 to 5 Scoring    |                  |   w_eq*Equip +          |                 | - Anti-Diversion Penalty|
| - Specialty Detector    |                  |   w_sk*Skill - Traffic  |                 | - ICU Saturated Filter  |
+-------------------------+                  +-------------------------+                 +-------------------------+
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

## 🔮 Future Roadmap

- **IoT Ambulance Health Telemetry**: Direct Bluetooth/LTE integration with onboard monitor defibrillators (Zoll, Physio-Control Lifepak) for 12-lead ECG waveforms.
- **Predictive Surge Forecasting**: Spatial-temporal ML models forecasting emergency surges during festivals, sporting events, and heatwaves.
- **Drone-Assisted First Response**: Autonomous AED / Narcan delivery to bystander GPS coordinates ahead of the ambulance.
- **Smart Traffic-Signal Preemption (V2I)**: Direct C-V2X integration with municipal traffic signal controllers (SCATS/SCOOT) for real hardware green light clearing.
- **Multilingual Voice Assistant**: Natural language voice bot for panicked callers supporting regional dialects and background audio stress classification.
