# AICTE OneFlow 🏛️
### Smart Approval Workflow Orchestration & Institutional Compliance Monitoring Platform
**Smart India Hackathon 2026 | Problem Statement: SIH26262 | Theme: Smart Automation**  
**Regulatory Baseline:** AICTE Approval Process Handbook (APH 2026–2027)

---

## 📌 Executive Summary

An AICTE regulatory approval lifecycle does not terminate when an application is submitted or when an initial sanction is granted. Rather, it extends through multi-stage technical scrutiny, Expert Visit Committee (EVC) inspections, quasi-judicial Standing Appellate / Hearing Committees (SAC/SHC), conditional undertakings (e.g. 60-day faculty recruitment), continuous 30-year land lease surveillance, and post-approval validity monitoring.

**AICTE OneFlow** is an enterprise-grade digital platform engineered to unify and automate this entire lifecycle. Unlike generic CRUD portals with static dashboards, OneFlow operates on an **authoritative, rules-driven deterministic state machine** that:
1. Enforces strict statutory prerequisites before permitting stage transitions.
2. Dynamically calculates the **Next Best Administrative Action (NBAA)** with SLA countdowns and accountable owners.
3. Decouples document submission from regulatory verification (**Submission ≠ Compliance**).
4. Operates a real-time **Surveillance Radar** for land leases, municipal building stability, and fire safety NOCs.
5. Employs a **Cryptographic SHA-256 Tamper-Evident Audit Ledger** guaranteeing evidentiary integrity for the Central Vigilance Commission (CVC) and statutory auditors.

---

## 🎨 Enterprise Government UI & Visual Integrity

In accordance with official Indian Government digital portal guidelines (NIC / National Portal of India):
- **Strictly Non-"Vibecoded" Aesthetic:** Zero frivolous purple gradients, neon glows, or generic AI placeholders.
- **Authoritative Palette:** AICTE Deep Navy (`#0a2540`, `#0f3c6e`), Bureaucratic Slate (`#1e293b`), Crisp Institutional White (`#f8fafc`), Statutory Saffron/Amber (`#d97706`), Approval Emerald (`#047857`), and Escalation Crimson (`#b91c1c`).
- **High Information Density:** Form 15 Scrutiny Checklists, Form 17 Deficiency Memorandums, biometric faculty rosters, and geo-coordinate verification maps.
- **Multi-Persona Simulation:** Instant role-switching across Central Admin (Member Secretary), Regional Officer (RO), Bureau Scrutiny Officer, EVC Coordinator, Institutional Applicant, and Statutory Auditor.

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
│ APH 2026-27   │             │ Peer Panel    │             │ 7D / 30D / 90D│
│ State Machine │             │ Conflict Check│             │ OCR Extractor │
└───────┬───────┘             └───────┬───────┘             └───────┬───────┘
        │                             │                             │
        └─────────────────────────────┼─────────────────────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │ Deterministic NBAA Engine     │
                      │ (Statutory Owner & Deadlines) │
                      └───────────────┬───────────────┘
                                      ▼
                      ┌───────────────────────────────┐
                      │ Cryptographic Audit Chain     │
                      │ SHA-256 Merkle Block Sequence │
                      └───────────────────────────────┘
```

### 1. Rules-Driven Workflow Engine
- **Statutory Route Routing:** 
  - `ROUTE_EOA`: Extension of Approval (Scrutiny + Undertakings)
  - `ROUTE_NEW_INSTITUTION`: New Technical Institution (Scrutiny -> EVC -> SAC -> Executive Council)
  - `ROUTE_INCREASE_INTAKE`: Intake Expansion (Scrutiny + EVC)
- **Deterministic State Transition Guard:** Prevents unauthorized jumps or skipping mandatory scrutiny observations before EVC committee constitution.
- **Deficiency Tracking:** Clause-wise deficiency logging (Form 17 Memorandum) with institutional rectification cycles.

### 2. Next Best Administrative Action (NBAA) Engine
Every active docket deterministically computes:
- Exact statutory owner role (`SCRUTINY_OFFICER`, `REGIONAL_OFFICER`, `EVC_COORDINATOR`, `CENTRAL_ADMIN`, `INSTITUTION_REP`).
- Statutory SLA deadline with live days-remaining countdown.
- Blocker list (e.g. *"Waiting for State Fire NOC re-scrutiny verification"*).
- Automatic SLA breach notice generation.

### 3. EVC Committee Dispatch & Peer Conflict Filtering
- Automated verification of empanelled peer committee experts to guarantee **zero conflict of interest** (experts selected strictly from non-adjacent states and without prior trust affiliation).
- Mandatory pre-inspection readiness check (biometric faculty roster, land geo-tagging, PWD building completion, fire NOC).
- Geo-tagged inspection outcome recording (`RECOMMENDED_FULL`, `RECOMMENDED_WITH_CONDITIONS`, `REJECTED_DEFICIENT`).

### 4. Time-Bound Undertaking & Compliance Tracker
- Manages conditional sanctions requiring institutional fulfillment within 30 to 60 days.
- **Submission ≠ Compliance:** Document upload flags status as `SUBMITTED_UNDER_REVIEW`. Statutory clearance only occurs when an authorized bureau officer completes verification against source ledgers.

### 5. Document Expiry Radar & Assisted OCR Intelligence
- Automated radar windows (< 7 Days, < 30 Days, < 60 Days, < 90 Days) tracking registered 30-year land leases, fire NOCs, and building stability certificates.
- **Assisted Document Intelligence:** Candidate metadata extraction (Lessor, Expiry, Plot Survey No.) with an enforced **Human-In-The-Loop** validation requirement.

### 6. Autonomous Escalation Matrix & Idempotent Alert Service
- **Tier 1:** Assigned Desk Officer (T-48h to SLA deadline)
- **Tier 2:** Regional Director (Day 1-5 SLA Breach)
- **Tier 3:** AICTE Member Secretary & Central Vigilance (Day 6+ Statutory Default)
- Enforces unique idempotency hashing (`idemp_...`) preventing duplicate alert spamming across SMS and email gateways.

### 7. Tamper-Evident SHA-256 Audit Ledger
- NIST FIPS 180-4 SHA-256 cryptographic chain.
- Every block links `blockHeight`, `timestamp`, `actorId`, `actionType`, `docketNumber`, `previousStage`, `newStage`, and `previousHash`.
- In-app **Verify Cryptographic Integrity** tool that recalculates all blocks on demand.
- **SIH Judge Demonstrator:** Includes a *"Simulate Malicious Tamper"* trigger to prove real-time detection of database modifications to the jury.

---

## 🏆 SIH Judging 6-Scene Demonstration Guide

Click the **"Interactive SIH Judging Tour"** button in the header bar to launch the presentation guide:

| Scene | Module | Target Docket | Persona | Key Demonstration Highlight |
|---|---|---|---|---|
| **Scene 1** | Workflow Engine | `RO-N/10942` | Scrutiny Officer | Docket intake, APH 2026-27 rule binding, and deterministic Next Best Action computation. |
| **Scene 2** | Scrutiny Desk | `RO-N/10942` | Scrutiny Officer | Form 15 checklist inspection, Form 17 Deficiency Note issuance, and prerequisite blocking. |
| **Scene 3** | EVC Dispatch | `RO-SW/11029` | EVC Coordinator | Peer conflict-of-interest validation, pre-inspection readiness checklist, and visit scheduling. |
| **Scene 4** | Undertakings | `RO-W/08831` | Regional Officer | Evidence submission review. Proving that *"Submission ≠ Compliance"* without officer sign-off. |
| **Scene 5** | Expiry Radar | `RO-W/08831` | Regional Officer | 30-year lease expiry radar (< 7 days) and OCR metadata extraction with human confirmation. |
| **Scene 6** | Audit Ledger | `RO-N/10942` | Statutory Auditor | Cryptographic SHA-256 hash verification and demonstration of unauthorized tamper detection. |

---

## 💻 Tech Stack & Engineering Specifications

- **Framework:** React 19 + TypeScript (Strict Type Safety)
- **Build Tool:** Vite 8.3 (Instant hot reload & optimized production tree-shaking)
- **Styling:** Tailwind CSS (Custom enterprise Gov-theme, responsive data grids)
- **State Management:** Client-Side State Machine with persistent `localStorage` synchronization
- **Cryptography:** Native Web Crypto API (`crypto.subtle.digest` SHA-256)
- **Icons:** Lucide React

---

## ⚙️ Quickstart & Local Installation

### Prerequisites
- Node.js (v18.0 or higher)
- npm (v9.0 or higher)

### Installation
```bash
# Clone the repository
git clone https://github.com/ayush-srivastava/aicte-oneflow.git
cd aicte-oneflow

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173/` in your browser.

### Build Production Bundle
```bash
npm run build
```
Creates an optimized, production-ready bundle in `dist/`.

---

## 🛡️ Statutory Disclaimer

*AICTE OneFlow is an independent prototype engineered for Smart India Hackathon 2026. Official institutional approvals, regulatory amendments, and statutory sanctions remain within the sole legal purview of the All India Council for Technical Education (AICTE), Ministry of Education, Government of India, under the All India Council for Technical Education Act, 1987.*
