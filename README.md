# Intelligent API Monitoring & Alert System

A production-quality full-stack system that monitors external API health, detects anomalies using deterministic rules, synthesizes human-readable operational alerts via LLM (with zero-credential graceful fallback), persists incidents to MongoDB, and visualizes them through a high-performance React dashboard.

---

## Architecture Overview

```
                                      +---------------------------------------------+
                                      |                Client Request               |
                                      |   (cURL, cron jobs, external webhooks, UI)  |
                                      +----------------------+----------------------+
                                                             |
                                                             v POST /api/monitor
+--------------------------------------------------------------------------------------------------------------------+
| Backend (Node.js / Express / ESM)                                                                                  |
|                                                                                                                    |
|   1. Request Validation (Zod schema checking & sanitization)                                                        |
|   2. Anomaly Engine (Deterministic rules: High Latency, Server Error, Client Error, Zero Records, Payload Size)    |
|   3. Severity Classifier (Critical > High > Medium > Low with rule prioritization)                                 |
|   4. AI Alert Service:                                                                                             |
|        - OpenAI API with system & contextual user prompt + JSON Schema validation                                   |
|        - Graceful Fallback Engine (deterministic operational title, message & causes if offline/unconfigured)      |
|   5. Alert Persistence (MongoDB / Mongoose upsert with status active/acknowledged/resolved)                        |
+------------------------------------------------------+-------------------------------------------------------------+
                                                       |
                                                       v
+--------------------------------------------------------------------------------------------------------------------+
| Frontend Dashboard (React + Vite + Recharts + Lucide Icons)                                                         |
|                                                                                                                    |
|   - Real-time Health & DB Connectivity Banner                                                                      |
|   - Metrics Summary Cards (Total Alerts, Active, Resolved, Critical)                                               |
|   - Visual Analytics (Response Time Line Chart & Severity Distribution Donut)                                      |
|   - Filter Bar (Severity, Status, API Name search)                                                                 |
|   - Incident Alert Table with inline Quick Actions (Acknowledge, Resolve)                                          |
|   - Deep-dive Alert Detail Modal (AI explanation, root cause analysis, raw payload inspect)                        |
|   - Live Event Ingestion Panel (preloaded samples, custom JSON editor, file upload)                                 |
+--------------------------------------------------------------------------------------------------------------------+
```

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js (v18+), Express.js (ESM), Zod, Pino Logger, Mongoose |
| **Testing** | Jest (ESM native), Supertest (53/53 tests passing, 73% statement coverage) |
| **AI / LLM** | OpenAI API (`gpt-4o-mini` / `gpt-3.5-turbo`) with fallback generator |
| **Database** | MongoDB (with graceful in-memory degraded mode when DB is unavailable) |
| **Frontend** | React 19, Vite, Recharts, Lucide React, Tailwind CSS |

---

## Anomaly Detection Rules & Severity Matrix

The anomaly detector processes incoming API metrics deterministically:

| Anomaly Type | Condition | Severity |
|---|---|---|
| `CRITICAL_LATENCY` | `response_time_ms` > 5000ms | **Critical** |
| `HIGH_LATENCY` | `response_time_ms` > 2000ms | **High** |
| `SERVER_ERROR` | `status_code` >= 500 | **High** (or Critical if combined) |
| `CLIENT_ERROR` | `status_code` >= 400 and < 500 | **Medium** |
| `ZERO_RECORDS` | `records_returned === 0` on HTTP 200 (data endpoints) | **Medium** |
| `OVERSIZED_PAYLOAD` | `payload_size_kb` > 500KB | **Low** |
| `COMPOUND_FAILURE` | Multiple concurrent severe anomalies | **Critical** |

### Severity Escalation
When an event triggers both `SERVER_ERROR` and `HIGH_LATENCY`/`ZERO_RECORDS`, or multiple elevated anomalies simultaneously, the engine automatically escalates the incident severity to **Critical**.

---

## AI Alert Generation & Graceful Fallback

1. **When OpenAI API Key is configured:**
   - Sends the raw telemetry and detected anomalies to the LLM.
   - Constrained by a strict system prompt and Zod output schema enforcing concise summaries, probable root causes, and immediate mitigation steps.
   - `ai_generated` flag is set to `true`.
2. **When OpenAI API Key is missing or provider returns an error:**
   - System automatically falls back to deterministic rule-based alert generation.
   - Zero crash, zero client-facing error, zero credential leakage.
   - `ai_generated` flag is set to `false`.

---

## Project Structure

```
Ai Automation/
├── launch.sh                  # One-command Bash launch script (starts backend & frontend)
├── launch.bat                 # Windows one-click launcher script
├── package.json               # Root package script runner
├── README.md                  # Master documentation
├── backend/
│   ├── .env.example           # Example environment configuration
│   ├── .env                   # Local environment file
│   ├── package.json           # Dependencies and test scripts
│   ├── src/
│   │   ├── server.js          # HTTP server bootstrap & graceful shutdown
│   │   ├── app.js             # Express application & middleware assembly
│   │   ├── config/            # Environment & MongoDB configuration
│   │   ├── controllers/       # Route controllers (monitor, alert, health)
│   │   ├── middleware/        # Error handler & Pino request logger
│   │   ├── models/            # Mongoose Alert schema & indexes
│   │   ├── routes/            # API endpoints definition
│   │   ├── services/          # Core business logic:
│   │   │   ├── anomalyDetector.js   # Deterministic rule engine
│   │   │   ├── aiAlertService.js    # LLM integration & fallback builder
│   │   │   ├── alertService.js      # DB persistence & status transitions
│   │   │   ├── monitorService.js    # Batch orchestration
│   │   │   └── prompts.js           # Production system & user prompt templates
│   │   ├── utils/             # Pino logger setup
│   │   └── validators/        # Zod input schemas for single/batch events
│   └── tests/
│       ├── anomalyDetector.test.js  # 24 anomaly rule unit tests
│       ├── validator.test.js        # 7 validation unit tests
│       ├── aiAlertService.test.js   # 4 AI service & fallback tests
│       ├── api.test.js              # 18 integration tests via Supertest
│       └── helpers.js               # Mock data generators
└── frontend/
    ├── package.json           # Dependencies (React, Vite, Recharts, Lucide)
    ├── vite.config.js         # Vite configuration with /api backend proxy
    └── src/
        ├── main.jsx           # React DOM root
        ├── App.jsx            # Main dashboard orchestration & state
        ├── index.css          # Design system, glassmorphism & typography
        ├── api/
        │   └── client.js      # Axios/Fetch client with retry handling
        ├── components/
        │   ├── Header.jsx           # Dashboard banner & live health status
        │   ├── StatsCards.jsx       # Real-time KPI summary counters
        │   ├── Charts.jsx           # Latency chart & severity donut chart
        │   ├── AlertFilters.jsx     # Status, severity & search filter bar
        │   ├── AlertTable.jsx       # Alert data grid with action triggers
        │   ├── AlertDetailPanel.jsx # Comprehensive incident detail modal
        │   └── SubmitPanel.jsx      # Interactive event ingestion simulator
        └── utils/
            └── constants.js   # Severity badges, labels, formatters
```

---

## API Documentation

### 1. Ingest Telemetry Event(s)
`POST /api/monitor`

Accepts either a single event JSON object or an array of up to 100 events.

**Request Payload Example (Batch):**
```json
[
  {
    "api_name": "PatientDataAPI",
    "endpoint": "/v1/patients/query",
    "status_code": 200,
    "response_time_ms": 1150,
    "records_returned": 24,
    "payload_size_kb": 42.5
  },
  {
    "api_name": "BillingGateway",
    "endpoint": "/v2/charge",
    "status_code": 503,
    "response_time_ms": 6200,
    "records_returned": 0,
    "payload_size_kb": 1.2
  }
]
```

**Response Example (200 OK):**
```json
{
  "success": true,
  "summary": {
    "total_input": 2,
    "valid_input": 2,
    "invalid_input": 0,
    "processed": 2,
    "processing_failures": 0,
    "alerts_generated": 1,
    "healthy_responses": 1
  },
  "alerts": [
    {
      "id": "6716a1b2c3d4e5f6a7b8c9d0",
      "api_name": "BillingGateway",
      "severity": "critical",
      "status": "active",
      "is_new": true,
      "title": "Critical Latency & Service Outage on BillingGateway",
      "anomaly_count": 2
    }
  ],
  "validation_errors": [],
  "processing_errors": []
}
```

### 2. Query Alerts
`GET /api/alerts?status=active&severity=critical&api_name=BillingGateway&page=1&limit=20`

### 3. Get Alert Details
`GET /api/alerts/:id`

### 4. Acknowledge Alert
`PATCH /api/alerts/:id/acknowledge`

### 5. Resolve Alert
`PATCH /api/alerts/:id/resolve`

### 6. Health Check
`GET /health`

---

## Ingesting Static JSON Files (Interview Requirement 5.1)

You can feed telemetry responses into the monitoring system via static JSON files in two ways:

### 1. Via CLI Ingestion Script
Run the built-in ingester against any JSON file (or default to [`sample_input.json`](file:///c:/Users/Syeed%20Asif/Desktop/Ai%20Automation/sample_input.json)):
```bash
# Ingest the included sample_input.json
npm run ingest

# Or pass any custom static JSON file
npm run ingest path/to/your_telemetry.json
```

### 2. Via Frontend UI Upload
1. Open the dashboard at `http://localhost:5173`.
2. Expand the **Submit Monitoring Events** accordion.
3. Click **Upload JSON** and select any local `.json` file, or click **Load Sample Data** and click **Send Events**.

---

## Deliverables & Submission Assets

| Deliverable | Location | Description |
|---|---|---|
| **Video Presentation Script** | [`SCRIPT.md`](file:///c:/Users/Syeed%20Asif/Desktop/Ai%20Automation/SCRIPT.md) | Word-for-word 5–10 minute technical explanation & live demo script |
| **Automated Test Suite** | `backend/tests/` | 53 unit and integration tests passing (`npm test`) |

---

## Quick Launch (Recommended)

### 1. Single Command (PowerShell, CMD, or Terminal)
Run both the **Backend** and **Frontend** simultaneously from the project root with color-coded live logs:
```bash
npm run dev
```
- **Backend (Blue)**: Runs on `http://localhost:3001`
- **Frontend (Green)**: Runs on `http://localhost:5173`
- Press `Ctrl+C` to stop both servers at once.

---

### 2. Windows Batch Launcher
Double-click [`launch.bat`](file:///c:/Users/Syeed%20Asif/Desktop/Ai%20Automation/launch.bat) or run:
```cmd
launch.bat
```

---

### 3. Bash Launcher (Git Bash / Linux / macOS)
If using Git Bash or a Unix shell:
```bash
bash launch.sh
```
*(Note: If you run `bash launch.sh` in standard Windows PowerShell without WSL or Git Bash installed, Windows invokes `wsl.exe` which requires a Linux distribution. Use `npm run dev` or `launch.bat` in PowerShell/CMD instead).*

---

### 4. Streamlit Dashboard (Python UI)
To launch the interactive Python Streamlit dashboard:
```bash
streamlit run streamlit_app.py
# or
npm run streamlit
```
- **Streamlit UI**: Runs on `http://localhost:8501`
- Includes live incident telemetry, interactive root-cause expanders, event batch uploading, email dispatching, and Plotly analytics.

---

## Getting Started (Manual Setup)

### Prerequisites
- **Node.js** v18.0.0 or higher
- **npm** v9.0.0 or higher
- **MongoDB** (Local instance running at `mongodb://localhost:27017` or MongoDB Atlas URI). Note: If MongoDB is offline, the system seamlessly operates in built-in in-memory fallback mode.
- *(Optional)* **OpenAI API Key** for LLM alert descriptions.

---

### Step 1: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Copy or edit .env
```

`backend/.env`:
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/api_monitor
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
RATE_LIMIT_MAX=1000
```

Run tests to verify configuration:
```bash
npm test
```
*(All 53 unit and integration tests will execute and pass.)*

Start backend server:
```bash
npm run dev
# Server will listen on http://localhost:3001
```

---

### Step 2: Frontend Setup

Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at:
`http://localhost:5173`

The Vite dev server proxies `/api` and `/health` requests directly to `http://localhost:3001`.

---

## Running Backend Test Suite

To run all 53 automated unit and integration tests:
```bash
cd backend
npm test
```

To run test coverage report:
```bash
cd backend
npm run test:coverage
```

Test Results Breakdown:
- `tests/anomalyDetector.test.js`: 24 tests (latency thresholds, HTTP status errors, zero records, compound severity rules).
- `tests/validator.test.js`: 7 tests (Zod single and batch event validation, type enforcement).
- `tests/aiAlertService.test.js`: 4 tests (LLM response schema parsing, fallback generation without API key).
- `tests/api.test.js`: 18 tests (POST `/api/monitor`, GET `/api/alerts`, PATCH transitions, 404 handler, `/health`).

---
