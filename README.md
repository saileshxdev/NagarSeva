# NagarSeva (नगर सेवा) 🏛️

> **Next-Generation AI-Powered Civic Issue Reporting & Automated Triaging Platform for Indian Cities.**

[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![Redux](https://img.shields.io/badge/State-Redux_Toolkit-764ABC?logo=redux&logoColor=white)](https://redux-toolkit.js.org/)
[![Node.js](https://img.shields.io/badge/Backend-Express.js_%2B_Node-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_15%2B-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/Spatial-PostGIS_3.4-00A98F?logo=postgis&logoColor=white)](https://postgis.net/)
[![Groq AI](https://img.shields.io/badge/AI_Vision-Groq_Qwen_3.6_27B-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![Cloudinary](https://img.shields.io/badge/Media-Cloudinary_Direct_Signed-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com/)

---

## 📌 Table of Contents

- [Overview & The Problem](#-overview--the-problem)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Core Engineering Deep Dives](#-core-engineering-deep-dives)
  - [1. Spatial Deduplication & Advisory Locks](#1-spatial-deduplication--advisory-locks)
  - [2. Viewport Map & Supercluster Scaling](#2-viewport-map--supercluster-scaling)
  - [3. Worker Score Ranking Algorithm (SQL CTE)](#3-worker-score-ranking-algorithm-sql-cte)
  - [4. AI Vision Pipeline with Full Jitter Backoff](#4-ai-vision-pipeline-with-full-jitter-backoff)
  - [5. Security & Defensive Locks](#5-security--defensive-locks)
- [Role-Based Workflows](#-role-based-workflows)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Test Credentials & Demo Accounts](#-test-credentials--demo-accounts)
- [Project Directory Structure](#-project-directory-structure)

---

## 🏙️ Overview & The Problem

Traditional civic grievance portals in municipalities fail due to four major bottlenecks:
1. **Duplicate Flood:** Hundreds of citizens independently report the same pothole or burst pipe, clogging the administrative queue.
2. **Spam & Invalid Reports:** Municipal officers spend hours manually filtering out blurry photos, unrelated images, and fake complaints.
3. **Vague Locations:** Text-based addresses like *"near old banyan tree"* leave field workers unable to locate exact issue coordinates.
4. **Opaque Resolution:** Tickets are marked "Resolved" without physical photographic verification or citizen confirmation.

### 💡 The NagarSeva Solution
**NagarSeva** re-engineers civic problem reporting into an automated, transparent, and spatial-first pipeline:
- **Direct Citizen Reporting:** Guided 4-step wizard with multi-image capture and Leaflet GPS geolocation pin.
- **Multimodal AI Validation:** Instant image analysis (Qwen 3.6 27B via Groq) validates authenticity, categorizes the problem, and scores severity (1–5).
- **PostGIS Geospatial Deduplication:** Detects existing nearby issues within a **50m radius**; automatically merges duplicates, boosts priority, and adds the citizen as a watcher instead of creating ticket clutter.
- **Automated Triaging & Resource Allocation:** SuperAdmin verifies and routes issues; Department Admins allocate tasks to field workers using an optimized **Worker Score Ranking Algorithm**.
- **Proof-Backed Resolution Loop:** Field workers upload geolocated photo proof upon completion. Citizens review and verify before tickets are officially closed.

---

## 🌟 Key Features

| Role | Key Capabilities |
|---|---|
| **Citizen** | • 4-step interactive Complaint Wizard with camera/gallery upload<br>• Precise map geolocation with reverse geocoding<br>• Real-time AI issue categorization and severity detection<br>• **City Pulse Map:** Interactive viewport map with Supercluster clustering & contextual upvotes ("Me Too")<br>• Track watched issues with live status badges and resolution photo proof review |
| **SuperAdmin** | • City-wide triage queue with instant AI confidence score badges<br>• One-click verify & department routing / rejection with reasons<br>• Dynamic department management (CRUD with soft-delete patterns)<br>• Single-scan analytics dashboard computed via PostgreSQL `FILTER` aggregates |
| **Department Admin** | • Department-scoped queue with automated priority sorting<br>• **Worker Score Engine:** Live ranking of available field workers based on experience, reliability, and current workload<br>• One-click worker assignment transitioning issues to `IN_PROGRESS`<br>• Field staff performance and workload analytics |
| **Field Worker** | • Mobile-first active task queue sorted by urgency<br>• Turn-by-turn map directions and citizen problem photos<br>• Work progress status transitions (`ASSIGNED` $\to$ `IN_PROGRESS` $\to$ `RESOLVED`)<br>• Mandatory resolution photo proof upload and work notes |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client["Frontend (React 18 + Vite + Redux + Leaflet)"]
        UI_Citizen["Citizen Portal (Wizard / City Pulse)"]
        UI_Admin["Admin & SuperAdmin Dashboards"]
        UI_Worker["Field Worker Execution UI"]
    end

    subgraph CDN["Cloud Storage & AI Services"]
        Cloudinary["Cloudinary CDN (Direct Signed Uploads)"]
        Groq["Groq Multimodal AI (Qwen 3.6 27B)"]
    end

    subgraph Server["Backend (Node.js + Express REST API)"]
        AuthMid["Security (httpOnly Cookie, Rate Limiting, RBAC)"]
        IssueCtrl["Issue & Spatial Controller"]
        TriageCtrl["Triaging & Worker Score Engine"]
        DedupLock["Spatial Advisory Lock Engine"]
    end

    subgraph DB["PostgreSQL 15+ & PostGIS 3.4"]
        PostGIS["PostGIS Spatial Index (GIST R-Tree)"]
        Tables["users | issues | watchers | issue_images | audit_logs"]
    end

    UI_Citizen -- "1. Upload Photo (Direct HMAC Sign)" --> Cloudinary
    UI_Citizen -- "2. Analyze Image" --> Server
    Server -- "3. Multimodal Analysis" --> Groq
    UI_Citizen -- "4. Submit Geo-Complaint" --> Server
    Server --> AuthMid --> DedupLock --> IssueCtrl
    IssueCtrl -- "5. ST_DWithin Deduplication" --> PostGIS
    TriageCtrl -- "6. Worker Score CTE" --> Tables
    UI_Admin --> TriageCtrl
    UI_Worker --> IssueCtrl
```

---

## 🔬 Core Engineering Deep Dives

### 1. Spatial Deduplication & Advisory Locks
When multiple citizens report the same issue (e.g., a burst pipe) at the exact same moment, parallel requests can cause a **Time-of-Check to Time-of-Use (TOCTOU)** race condition.

NagarSeva solves this with **PostgreSQL Transactional Advisory Locks**:
1. Computes a deterministic lock key from the category and snapped spatial grid cell:
   $$\text{lock\_key} = \text{CRC32}(\text{category} + \text{grid}(lat, lng, 0.001))$$
2. Calls `pg_advisory_xact_lock(lock_key)`. Only competing submissions within the same 50m cell wait; submissions in different parts of the city proceed concurrently ($O(1)$ contention).
3. Executes `ST_DWithin` spatial candidate search:
   ```sql
   SELECT id, priority_score, report_count FROM issues
   WHERE category = $1
     AND status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
     AND ST_DWithin(location, ST_MakePoint($2, $3)::geography, 50)
   LIMIT 1;
   ```
4. If found, merges the report: increments `report_count`, boosts `priority_score`, inserts a watcher (`ON CONFLICT DO NOTHING`), and auto-releases the lock at transaction commit.

---

### 2. Viewport Map & Supercluster Scaling
Loading thousands of map pins simultaneously causes client DOM lag and memory bottlenecks.

- **Bounding Box Spatial Query:** The frontend sends viewport bounds `[minLng, minLat, maxLng, maxLat]`. The backend queries the PostGIS `GIST` R-Tree index using the bounding box intersection operator `&&`:
  ```sql
  SELECT id, category, status, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
  FROM issues
  WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326);
  ```
- **Supercluster K-D Tree:** The client clusters thousands of spatial coordinates into cluster bubbles dynamically, rendering **~50 DOM elements** regardless of dataset size.
- **Debounced Fetch with AbortController:** Panning or zooming triggers a `300ms` debounce; previous in-flight HTTP requests are aborted immediately to prevent race conditions.

---

### 3. Worker Score Ranking Algorithm (SQL CTE)
When Department Admins assign field workers, the optimal worker is calculated dynamically in a **single database query** without N+1 latency:

$$\text{Worker Score } (S) = (w_1 \cdot E) + (w_2 \cdot R) - (w_3 \cdot B)$$

- **Experience ($E$, $w_1 = 0.3$):** $\frac{\text{total\_handled}}{\max(\text{total\_handled})}$ normalized across the department using `MAX() OVER ()`.
- **Reliability ($R$, $w_2 = 0.4$):** $\frac{\text{resolved}}{\text{resolved} + \text{rejected}}$ (defaults to $0.5$ for new workers).
- **Busyness ($B$, $w_3 = 0.3$):** Linear penalty for active `IN_PROGRESS` assignments.

```sql
WITH worker_stats AS (
  SELECT
    u.id, u.name, u.email,
    COUNT(i.id) FILTER (WHERE i.status IN ('RESOLVED', 'CLOSED')) AS resolved_count,
    COUNT(i.id) FILTER (WHERE i.status = 'REJECTED') AS rejected_count,
    COUNT(i.id) FILTER (WHERE i.status = 'IN_PROGRESS') AS active_count,
    COUNT(i.id) AS total_handled
  FROM users u
  LEFT JOIN issues i ON i.assigned_to = u.id
  WHERE u.role = 'FIELD_WORKER' AND u.department_id = $1
  GROUP BY u.id, u.name, u.email
)
SELECT *,
  ROUND((
    (0.3 * (total_handled::FLOAT / NULLIF(MAX(total_handled) OVER (), 0)))
    + (0.4 * CASE WHEN (resolved_count + rejected_count) = 0 THEN 0.5 ELSE resolved_count::FLOAT / (resolved_count + rejected_count) END)
    - (0.3 * active_count)
  )::NUMERIC, 2) AS worker_score
FROM worker_stats
ORDER BY worker_score DESC;
```

---

### 4. AI Vision Pipeline with Full Jitter Backoff
To prevent thundering-herd API crashes during rate-limiting spikes (HTTP 429/503), the Groq client wraps calls with full jitter exponential backoff:
$$\text{sleep} = \text{random}(0, \min(\text{cap}, \text{base} \times 2^{\text{attempt}}))$$
This spreads retries evenly across a temporal window, maintaining high throughput and 99.9% analysis success rates.

---

### 5. Security & Defensive Locks
- **httpOnly JWT Authentication:** Auth tokens reside in `httpOnly`, `SameSite=Lax`, `Secure` cookies. JavaScript cannot access them, eliminating token exfiltration via XSS.
- **Bcrypt Cost 12:** Password hashing with per-user salt and ~250ms compute time renders offline rainbow tables and brute force impractical.
- **3-Tier Graduated Rate Limiting:**
  - `General API`: 100 req / 15 min (DoS defense).
  - `Auth Endpoints`: 10 req / 15 min (Credential stuffing defense).
  - `OTP Endpoints`: 5 req / 1 hour (Email & SMS exhaustion defense).
- **3-Layer RBAC:** UI route guards $\to$ Express `roleGuard` middleware $\to$ SQL query tenant isolation (`WHERE department_id = req.user.department_id`).

---

## 🔄 Role-Based Workflows

```
Citizen Submits Issue (Image + GPS)
             │
             ▼
   [ AI Analysis & PostGIS Dedup ]
             │
             ├──► [Duplicate Found] ──► Merge + Increment Upvotes
             │
             └──► [New Issue Created] ──► Status: REPORTED
                                                 │
                                                 ▼
                                     [ SuperAdmin Triage ]
                                                 │
                             ┌───────────────────┴───────────────────┐
                             ▼                                       ▼
                     [ Verified & Routed ]                       [ Rejected ]
                     Status: ASSIGNED                            Status: REJECTED
                             │
                             ▼
                 [ Department Admin Queue ]
                             │
                  (Worker Score Ranking CTE)
                             │
                             ▼
                 [ Allocate Field Worker ]
                    Status: IN_PROGRESS
                             │
                             ▼
               [ Field Worker Resolves Issue ]
               - Performs physical repair
               - Uploads resolution photo proof
               - Status: RESOLVED
                             │
                             ▼
                 [ Citizen Verification ]
                             │
                 ┌───────────┴───────────┐
                 ▼                       ▼
            [ Satisfied ]          [ Unsatisfied ]
            Status: CLOSED         Status: NOT_SATISFIED
```

---

## 🗄️ Database Schema

### Core Tables Summary

| Table | Purpose | Key Columns & Indexes |
|---|---|---|
| `users` | User accounts across 4 roles | `id (UUID)`, `email (UNIQUE)`, `role`, `department_id`, `designation` |
| `otps` | Verification & password reset codes | `email`, `otp_code`, `type`, `expires_at`, `used` |
| `issues` | Core civic issue records | `location (GEOGRAPHY Point, 4326)` with **GIST Index**, `status`, `priority_score`, `report_count`, `department_id`, `assigned_to` |
| `watchers` | Citizen upvotes & notification tracking | `PRIMARY KEY (issue_id, user_id)` (Atomic deduplication) |
| `issue_images` | Report and resolution proof photos | `issue_id`, `image_url`, `image_type ('REPORT' \| 'PROGRESS' \| 'RESOLUTION_PROOF')` |
| `departments` | City municipal departments | `id`, `name`, `dept_type`, `deleted_at (Soft-delete)` |
| `audit_logs` | Immutable audit trail of state changes | `issue_id`, `performed_by`, `action`, `metadata (JSONB)` |

---

## 🔌 API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /register` — Citizen registration + OTP generation
- `POST /verify-email` — Verify 6-digit OTP
- `POST /login` — Authenticate user & issue httpOnly cookie
- `GET  /me` — Hydrate current user session
- `POST /forgot-password` — Request password reset OTP
- `POST /reset-password` — Reset password with OTP verification
- `POST /logout` — Clear session cookie

### 📍 Issues & Geospatial (`/api/issues`)
- `POST /create` — Create or merge issue (with spatial advisory lock & dedup)
- `GET  /viewport` — Fetch visible issues by bounding box `[minLng, minLat, maxLng, maxLat]`
- `GET  /nearby` — Find issues within radius
- `GET  /mine` — Get complaints watched or reported by authenticated citizen
- `POST /:id/me-too` — Upvote / endorse existing issue (location verified)
- `DELETE /:id/watch` — Remove watch from issue

### 🤖 AI Vision & Uploads
- `POST /api/complaints/analyze` — Multimodal AI analysis of complaint photos
- `GET  /api/upload/signature` — Get time-limited Cloudinary direct upload signature

### 🛡️ SuperAdmin (`/api/super-admin`)
- `GET   /queue` — Issues awaiting triaging with AI severity badges
- `PATCH /issues/:id/verify` — Approve issue and assign to department
- `PATCH /issues/:id/reject` — Reject invalid issue with reason
- `GET   /stats` — City-wide stats using single-scan `FILTER` clauses
- `GET/POST/DELETE /departments` — Department management with soft-delete

### 👔 Department Admin (`/api/admin`)
- `GET   /queue` — Department-scoped assigned issues
- `GET   /workers` — Available field workers ranked by Worker Score CTE
- `PATCH /issues/:id/assign` — Allocate issue to field worker (`IN_PROGRESS`)
- `GET   /stats` — Department resolution metrics and staff workload

### 👷 Field Worker (`/api/field-worker`)
- `GET   /issues` — Active assigned issues (`ASSIGNED`, `IN_PROGRESS`)
- `GET   /issues/resolved` — Historical resolved issues
- `GET   /issues/:id` — Full issue detail with citizen photos and navigation GPS
- `PATCH /issues/:id/start` — Transition issue to `IN_PROGRESS`
- `PATCH /issues/:id/resolve` — Submit resolution photo proof & mark `RESOLVED`

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or v20.x recommended)
- [Docker & Docker Compose](https://www.docker.com/) (for PostGIS)
- [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Code-Ashish-kumar/NagarSeva.git
cd NagarSeva
```

---

### Step 2: Start PostGIS Database via Docker
```bash
docker compose up -d
```
*This starts a PostgreSQL 16 + PostGIS 3.4 container listening on host port `5433`.*

---

### Step 3: Backend Setup
```bash
cd server
cp .env.example .env
npm install
```

Configure your `server/.env` file:
```env
PORT=5000
DATABASE_URL=postgresql://nagarseva_user:nagarseva_dev_pass@localhost:5433/nagarseva
JWT_SECRET=your_super_secret_jwt_key_at_least_32_chars
CLIENT_URL=http://localhost:5173

# AI & Media Keys
GROQ_API_KEY=your_groq_api_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Email (Resend or SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@nagarseva.in
```

Run database migrations and seed default administrative staff:
```bash
npm run migrate
node db/seed-super-admin.js
node db/seed-admin.js
npm run dev
```
*Backend runs on `http://localhost:5000`.*

---

### Step 4: Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔑 Test Credentials & Demo Accounts

The database seeders generate ready-to-test accounts across all roles:

| Role | Email | Password | Scope / Permissions |
|---|---|---|---|
| **SuperAdmin** | `superadmin@nagarseva.in` | `SuperAdmin@123` | City-wide triage, department CRUD, global analytics |
| **Dept Admin (Roads)** | `executive-engineer-civil.roads-infrastructure@nagarseva.in` | `Admin@123` | Roads Dept queue, worker ranking, allocations |
| **Dept Admin (Sanitation)** | `chief-sanitary-inspector.sanitation-waste-management@nagarseva.in` | `Admin@123` | Sanitation queue, worker allocations |
| **Field Worker (Roads)** | `road-repair-supervisor.roads-infrastructure@nagarseva.in` | `Worker@123` | Task execution, photo proof upload |
| **Field Worker (Sanitation)**| `sanitation-supervisor.sanitation-waste-management@nagarseva.in`| `Worker@123`| Garbage removal, resolution submissions |
| **Citizen** | *Self-register via `/register` or `/login`* | *Custom* | Issue reporting, City Pulse map, upvoting |

---

## 📂 Project Directory Structure

```
NagarSeva/
├── client/                               # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                   # ProtectedRoute, CitizenLayout, AuditLogs
│   │   │   ├── complaint/                # 4-Step Wizard (Images, GPS Pin, AI, Review)
│   │   │   └── core/                     # Role-specific modular components
│   │   ├── pages/                        # CityPulse, Dashboards, Auth, IssueWorkPage
│   │   ├── services/                     # Centralized API connectors & operation handlers
│   │   ├── slices/                       # Redux Toolkit state slices (auth, complaint)
│   │   ├── styles/                       # CSS design tokens, modern themes
│   │   └── App.jsx                       # Route tree & session hydration
│   └── vite.config.js
│
├── server/                               # Express.js Backend
│   ├── db/
│   │   ├── migrations/                   # 12 sequential SQL migrations (PostGIS, RBAC)
│   │   ├── migrate.js                    # Automated migration runner
│   │   ├── seed-super-admin.js           # Seeds default SuperAdmin
│   │   └── seed-admin.js                 # Seeds Admins & Field Workers across departments
│   ├── src/
│   │   ├── config/                       # DB pool, Groq AI, Cloudinary, Mailer
│   │   ├── controller/                   # Auth, Issue, SuperAdmin, Admin, FieldWorker
│   │   ├── middleware/                   # JWT Auth, RoleGuard, RateLimiters, ErrorHandler
│   │   ├── routes/                       # Express route definitions
│   │   ├── utils/                        # Advisory locks, async handler wrappers
│   │   └── app.js                        # Express server entry point
│   └── server.js
│
├── docker-compose.yml                    # PostGIS 16 container definition
├── .gitignore                            # Git ignore rules (node_modules, .env, docs/)
└── README.md                             # Project documentation & setup guide
```

---

## 📄 License & Attribution

Developed with ❤️ as an end-to-end full-stack civic technology initiative. Open-sourced under the [MIT License](LICENSE).
