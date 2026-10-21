# AICTE OneFlow 🏛️
### Smart Approval Workflow Automation & Institutional Compliance Monitoring Platform
**Smart India Hackathon 2026 | Problem Statement: SIH26262 | Theme: Smart Automation**  
**Regulatory Baseline:** AICTE Approval Process Handbook (Published Baseline 2024–2027 / Extrapolated for 2026-27 Demonstration)

---

## 📌 Executive Summary & Core Positioning

> **"Every case has a next action. Every action has an owner. Every rule has a source. Every change has evidence."**

An AICTE regulatory approval lifecycle does not terminate when an application is submitted or when an initial sanction is granted. Rather, it extends through multi-stage technical scrutiny, Expert Visit Committee (EVC) inspections, quasi-judicial Standing Appellate / Hearing Committees (SAC/SHC), conditional undertakings (e.g. 60-day faculty recruitment), continuous 30-year land lease surveillance, and post-approval validity monitoring.

**AICTE OneFlow** is an enterprise-grade digital platform engineered to unify and automate this entire lifecycle. Unlike generic CRUD portals with static dashboards, OneFlow operates on an **authoritative, rules-driven deterministic state machine** that:
1. Enforces strict statutory prerequisites before permitting stage transitions.
2. Dynamically calculates the **Explainable Case Action Ledger** with SLA countdowns, accountable owners, and cited regulatory clauses.
3. Decouples document submission from regulatory verification (**Submission ≠ Compliance**).
4. Operates a real-time **Operational Surveillance Radar** for land leases, municipal building stability, and fire safety NOCs.
5. Employs a **Cryptographically Hash-Chained Audit Log** (SHA-256 with canonical payload serialization) with an isolated **Sandbox Tamper Demonstrator** guaranteeing evidentiary integrity for the Central Vigilance Commission (CVC) and statutory auditors.

---

## 🎨 Enterprise Government UI & Visual Integrity

In accordance with official Indian Government digital portal guidelines (NIC / National Portal of India):
- **Strictly Non-"Vibecoded" Aesthetic:** Zero frivolous purple gradients, neon glows, or generic AI placeholders.
- **Authoritative Palette:** AICTE Deep Navy (`#0a2540`, `#0f3c6e`), Bureaucratic Slate (`#1e293b`), Crisp Institutional White (`#f8fafc`), Statutory Saffron/Amber (`#d97706`), Approval Emerald (`#047857`), and Escalation Crimson (`#b91c1c`) with the official tricolor strip.
- **High Information Density & Accessibility:** Form 15 Scrutiny Checklists, Form 17 Deficiency Memorandums, biometric faculty rosters, and geo-coordinate verification maps. Full keyboard navigation and accessible ARIA attributes.
- **Multi-Persona Simulation:** Instant role-switching across Central Admin (Member Secretary), Regional Officer (RO), Bureau Scrutiny Officer, EVC Coordinator, Institutional Applicant, and Statutory Auditor.

---

## ⚖️ Regulatory Provenance & Rule Classification

AICTE OneFlow maintains strict regulatory honesty. Deadlines and handbook clauses are explicitly classified:

| Provenance Classification | Meaning & Scope | Examples in System |
|---|---|---|
| `VERIFIED_SOURCE` | Directly mapped to official clauses in published AICTE Approval Process Handbook (2024–2027). | APH Ch. II Cl. 2.3 (Scrutiny), Ch. II Cl. 2.4 (Deficiencies), Ch. II Cl. 2.5 (EVC), Ch. I Cl. 1.4(g) (30-Year Lease). |
| `INTERNAL_SERVICE_TARGET` | Administrative service-level targets established for desk officer throughput. | 14-day scrutiny desk processing target, 10-day EVC panel constitution window. |
| `STATUTORY_MANDATE` | Legally binding appeal or compliance windows under statutory handbook rules. | 15-day SAC appeal window, 60-day mandatory cadre rectification window. |
| `CONFIGURED_DEMO_RULE` | Operational parameters configured for the SIH 2026 hackathon demonstration scenario. | 48-hour pre-expiry reminder dispatch trigger, simulation notification channels. |

---

## 🚀 Core Architectural Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AICTE OneFlow Architecture                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ State Engine  │             │ EVC Inspector │             │ Expiry Radar  │
│ APH 2024-27   │             │ Peer Panel    │             │ Operational   │
│ State Machine │             │ Conflict Check│             │ 7D / 30D / 90D│
└───────┬───────┘             └───────┬───────┘             └───────┬───────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │ Explainable Case Action Ledger│
                      │ (Sourced Owner & Deadlines)   │
                      └───────────────┬───────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │ Hash-Chained Audit Log        │
                      │ SHA-256 Canonical Blocks      │
                      └───────────────────────────────┘
```

### 1. Rules-Driven Workflow Engine
- **Statutory Routes:** 
  - `ROUTE_EOA`: Extension of Approval (Scrutiny + Undertakings)
  - `ROUTE_NEW_INSTITUTION`: New Technical Institution (Scrutiny -> EVC -> SAC -> Executive Council)
  - `ROUTE_INCREASE_INTAKE`: Intake Expansion (Scrutiny + EVC)
- **Deterministic State Transition Guard:** Prevents unauthorized jumps or skipping mandatory scrutiny observations before EVC committee constitution.
- **Deficiency Tracking:** Clause-wise deficiency logging (Form 17 Memorandum) with institutional rectification cycles.

### 2. Explainable Case Action Ledger
For every active docket, the platform deterministically computes:
1. Current workflow state.
2. Next required administrative action.
3. Statutory rationale explaining *why* that action is required.
4. Responsible role & assigned officer.
5. Applicable deadline and calculation provenance (distinguishing statutory vs internal service targets).
6. Prerequisites checklist and active blockers.
7. Supporting documents and evidence verification status.
8. Relevant regulatory clause and provenance status badge.
9. Permitted transitions and role access guards.

### 3. EVC Committee Dispatch & Objective Conflict Checking
- Automated verification of empanelled peer committee experts to evaluate conflict of interest without making unsubstantiated "guaranteed conflict-free" claims:
  - `NO_KNOWN_CONFLICT_DETECTED` (Explicit scope: evaluated empanelled academic affiliation, home state, and declared trust relationships)
  - `POTENTIAL_CONFLICT_REQUIRES_REVIEW` (Flagged when an expert originates from the same state or district as the applicant)
  - `CONFLICT_CONFIRMED` (Flagged when an expert has declared prior trust or governance ties)
- Mandatory pre-inspection readiness check (biometric faculty roster, land geo-tagging, PWD building completion, fire NOC).
- Geo-tagged inspection outcome recording (`RECOMMENDED_FULL`, `RECOMMENDED_WITH_CONDITIONS`, `REJECTED_DEFICIENT`).

### 4. Time-Bound Undertaking & Compliance Tracker
- Manages conditional sanctions requiring institutional fulfillment within 30 to 60 days.
- **Submission ≠ Compliance:** Document upload flags status as `SUBMITTED_UNDER_REVIEW`. Statutory clearance only occurs when an authorized bureau officer completes verification against source ledgers.

### 5. Document Expiry Radar & Assisted OCR Intelligence
- Automated operational surveillance windows (< 7 Days, < 30 Days, < 60 Days, < 90 Days) tracking registered 30-year land leases, fire NOCs, and building stability certificates.
- **Assisted Document Intelligence:** Candidate metadata extraction (Lessor, Expiry, Plot Survey No.) with an enforced **Human-In-The-Loop** validation requirement to prevent OCR errors.

### 6. Escalation Matrix & Idempotent Alert Service (Simulated Adapters)
- **Tier 1:** Assigned Desk Officer (T-48h to SLA deadline)
- **Tier 2:** Regional Director (Day 1-5 SLA Breach)
- **Tier 3:** AICTE Member Secretary & Central Vigilance (Day 6+ Statutory Default)
- Pre-dispatch check suppresses alerts if an obligation has already been certified resolved.
- Enforces unique idempotency hashing (`idemp_...`) preventing duplicate alert spamming across SMS and email simulated channels.

### 7. Cryptographically Hash-Chained Audit Log
- NIST FIPS 180-4 SHA-256 cryptographic chain.
- Deterministic canonical payload serialization guarantees key-order consistency prior to hashing.
- In-app **Verify Live Ledger Integrity** tool recalculates all blocks on demand.
- **Safe Sandbox Tamper Demonstrator:** Operates on an isolated sandbox copy (`[SANDBOX SIMULATION ONLY]`), allowing judges to simulate database tampering and witness real-time mismatch detection without corrupting live application records!

---

## 🏆 SIH Judging 6-Scene Demonstration Guide

Click the **"SIH Judging Tour"** button in the header bar to launch the presentation guide:

| Scene | Module | Target Docket | Persona | Key Demonstration Highlight |
|---|---|---|---|---|
| **Scene 1** | Workflow Engine | `RO-N/10942` | Scrutiny Officer | Docket intake, APH 2024–27 rule binding, and Explainable Case Action Ledger computation. |
| **Scene 2** | Scrutiny Desk | `RO-N/10942` | Scrutiny Officer | Form 15 checklist inspection, Form 17 Deficiency Note issuance, and prerequisite blocking. |
| **Scene 3** | EVC Dispatch | `RO-SW/11029` | EVC Coordinator | Objective conflict-of-interest review (qualified status & scope), readiness checks, and visit scheduling. |
| **Scene 4** | Undertakings | `RO-W/08831` | Regional Officer | Evidence submission review. Proving that *"Submission ≠ Compliance"* without officer sign-off. |
| **Scene 5** | Expiry Radar | `RO-W/08831` | Regional Officer | 30-year lease operational expiry radar (< 7 days) and OCR metadata extraction with human confirmation. |
| **Scene 6** | Audit Ledger | `RO-N/10942` | Statutory Auditor | Cryptographic SHA-256 hash verification and safe isolated sandbox tamper detection demonstration. |

---

## 💻 Tech Stack & Engineering Architecture

### Frontend Architecture
- **Framework:** React 19 + TypeScript (Strict Type Safety)
- **Build Tool:** Vite 8.3 (Instant hot reload & tree-shaking)
- **Styling:** Tailwind CSS (Official Government of India NIC palette: Deep Navy `#0a2540`, Slate `#1e293b`, White `#f8fafc`)
- **Icons:** Lucide React
- **API Client:** Typed `apiClient` communicating with Express backend via `/api/*` proxy, with offline resilient caching.

### Backend & Authoritative Persistence
- **Runtime:** Node.js v24 + Express 5
- **Database:** Relational SQLite Database engine with ACID transactions and foreign keys, persisted to `data/aicte_oneflow.sqlite`.
- **Database Schema:** 8 indexed relational tables (`institutions`, `users`, `applications`, `deficiencies`, `evc_records`, `evc_experts`, `undertakings`, `prescribed_documents`, `notifications`, `audit_events`).
- **Security & Authorization:** JWT tokens, bcrypt hashed passwords (`Password@123`), role-based access control, regional data scoping (e.g. Northern RO restricted to Northern dockets), and IDOR guards.
- **Workflow State Machine:** Server-side statutory transition guards enforcing prerequisite verification (zero unresolved deficiencies, valid fire NOC, building approval, cadre compliance).
- **Cryptographic Audit Service:** Canonical JSON payload serialization with SHA-256 block commitment on every state change and transition.

---

## 📊 Measured Performance Benchmarks

Measured on Node.js environment under 100 consecutive local requests:

| Endpoint | Iterations | Average Latency | p50 Latency | p95 Latency | SLA Target | Status |
|---|---|---|---|---|---|---|
| `GET /api/applications` | 100 | **6.80 ms** | 5.69 ms | **9.21 ms** | < 300 ms | **PASSED (32x faster)** |
| `GET /api/audit/verify` | 100 | **5.33 ms** | 4.51 ms | **7.87 ms** | < 300 ms | **PASSED (38x faster)** |
| Frontend Non-Network Interactivity | - | **< 15 ms** | < 10 ms | **< 20 ms** | < 100 ms | **PASSED** |

---

## ⚙️ Quickstart & Local Installation

### Prerequisites
- Node.js (v18.0 or higher, tested on v24)
- npm (v9.0 or higher)

### Installation & Execution
```bash
# Clone the repository
git clone https://github.com/ayush-srivastava/aicte-oneflow.git
cd "SIH SUBMISSION 2"

# Install all frontend and backend dependencies
npm install

# Run database seed (initializes data/aicte_oneflow.sqlite)
npm run seed

# Run all automated tests (unit + integration API tests)
npm test

# Run linter
npm run lint

# Start the Relational Backend Server (Port 3001)
npm run server

# In a separate terminal, start Vite Frontend Dev Server (Port 5173)
npm run dev
```

Visit **`http://localhost:5173/`** in your browser. All API requests route seamlessly through the Vite proxy to `http://localhost:3001/api`.

### Production Build
```bash
npm run build
```
Compiles TypeScript and bundles production client assets to `dist/`.

---

## 🛡️ Statutory Disclaimer

*AICTE OneFlow is an independent digital prototype engineered for Smart India Hackathon 2026. Official institutional approvals, regulatory amendments, and statutory sanctions remain within the sole legal purview of the All India Council for Technical Education (AICTE), Ministry of Education, Government of India, under the All India Council for Technical Education Act, 1987.*
