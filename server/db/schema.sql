-- AICTE OneFlow Relational Schema (PostgreSQL/SQLite Compatible)
-- Authoritative State Machine & Compliance Tracking Ledger

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  state TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  region_scope TEXT, -- NULL for CENTRAL_ADMIN / STATUTORY_AUDITOR, specific region for REGIONAL_OFFICER
  institution_id TEXT, -- NULL for government officials, set for INSTITUTION_REP
  created_at TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  docket_number TEXT UNIQUE NOT NULL,
  institution_id TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  application_type TEXT NOT NULL,
  route TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  rule_provenance TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  sla_deadline TEXT NOT NULL,
  deadline_type TEXT NOT NULL,
  deadline_calculation_basis TEXT NOT NULL,
  assigned_officer TEXT NOT NULL,
  assigned_role TEXT NOT NULL,
  land_area_acres REAL NOT NULL,
  carpet_area_sqm REAL NOT NULL,
  cadre_ratio TEXT NOT NULL,
  trust_deed_valid INTEGER NOT NULL DEFAULT 1,
  fire_noc_valid INTEGER NOT NULL DEFAULT 1,
  building_plan_valid INTEGER NOT NULL DEFAULT 1,
  has_pending_undertakings INTEGER NOT NULL DEFAULT 0,
  last_action TEXT NOT NULL,
  last_action_timestamp TEXT NOT NULL,
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS deficiencies (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  clause TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL, -- CRITICAL, MODERATE, MINOR
  raised_by TEXT NOT NULL,
  raised_at TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  resolution_note TEXT,
  FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE TABLE IF NOT EXISTS evc_records (
  id TEXT PRIMARY KEY,
  application_id TEXT UNIQUE NOT NULL,
  scheduled_date TEXT,
  coordinator_name TEXT NOT NULL,
  conflict_check_status TEXT NOT NULL,
  conflict_check_scope TEXT NOT NULL,
  conflict_check_notes TEXT,
  readiness_json TEXT NOT NULL,
  status TEXT NOT NULL, -- PENDING_SCHEDULE, SCHEDULED, VISIT_IN_PROGRESS, REPORT_SUBMITTED, CLOSED
  recommendation TEXT,
  remarks TEXT,
  geo_latitude REAL,
  geo_longitude REAL,
  FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE TABLE IF NOT EXISTS evc_experts (
  id TEXT PRIMARY KEY,
  evc_id TEXT NOT NULL,
  name TEXT NOT NULL,
  designation TEXT NOT NULL,
  institution TEXT NOT NULL,
  state TEXT NOT NULL,
  specialization TEXT NOT NULL,
  has_affiliation_with_trust INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (evc_id) REFERENCES evc_records(id)
);

CREATE TABLE IF NOT EXISTS undertakings (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  institution_id TEXT NOT NULL,
  title TEXT NOT NULL,
  statutory_condition TEXT NOT NULL,
  aph_clause TEXT NOT NULL,
  provenance TEXT NOT NULL,
  issued_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  deadline_type TEXT NOT NULL,
  status TEXT NOT NULL, -- PENDING_SUBMISSION, SUBMITTED_UNDER_REVIEW, RETURNED_FOR_CORRECTION, VERIFIED_COMPLIANT, OVERDUE_ESCALATED
  evidence_doc_name TEXT,
  evidence_doc_size TEXT,
  submitted_at TEXT,
  verified_by TEXT,
  verified_at TEXT,
  verification_notes TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS prescribed_documents (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  issued_by_authority TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  days_remaining INTEGER NOT NULL,
  status TEXT NOT NULL, -- VALID, EXPIRING_SOON, CRITICALLY_EXPIRED, RENEWAL_SUBMITTED, RENEWAL_VERIFIED
  ocr_json TEXT NOT NULL,
  file_size TEXT NOT NULL,
  last_renewed_date TEXT,
  FOREIGN KEY (institution_id) REFERENCES institutions(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  docket_number TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT NOT NULL,
  channel TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  status TEXT NOT NULL, -- QUEUED, SENT_SIMULATED, DELIVERED_SIMULATED, ACKNOWLEDGED, ESCALATED, SUPPRESSED_RESOLVED
  escalation_level TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt_at TEXT,
  obligation_still_open INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  block_height INTEGER UNIQUE NOT NULL,
  timestamp TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  docket_number TEXT NOT NULL,
  previous_stage TEXT NOT NULL,
  new_stage TEXT NOT NULL,
  rule_version TEXT NOT NULL,
  reason_or_observations TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  canonical_payload TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL
);

-- Essential Performance Indexes
CREATE INDEX IF NOT EXISTS idx_apps_docket ON applications(docket_number);
CREATE INDEX IF NOT EXISTS idx_apps_stage ON applications(current_stage);
CREATE INDEX IF NOT EXISTS idx_apps_institution ON applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_def_app ON deficiencies(application_id);
CREATE INDEX IF NOT EXISTS idx_undertakings_app ON undertakings(application_id);
CREATE INDEX IF NOT EXISTS idx_notifs_idemp ON notifications(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_audit_height ON audit_events(block_height);
