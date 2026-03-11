-- PayCheck Web — Schema MySQL
-- Exécuter ce fichier une seule fois pour initialiser la base de données.
-- mysql -u root -p paycheck < schema.sql

CREATE DATABASE IF NOT EXISTS paycheck CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE paycheck;

-- ── Jobs (emplois étudiants) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id            INT           NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  employer_name VARCHAR(150)      NULL,
  hourly_rate   DECIMAL(8,4)      NULL COMMENT 'Taux horaire de référence (€/h)',
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Données initiales : 2 jobs par défaut
INSERT INTO jobs (name, employer_name) VALUES
  ('Job A', NULL),
  ('Job B', NULL);

-- ── Fiches de paie ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payslips (
  id               INT            NOT NULL AUTO_INCREMENT,
  job_id           INT            NOT NULL,
  pdf_filename     VARCHAR(255)   NOT NULL,
  period_start     DATE           NOT NULL,
  period_end       DATE           NOT NULL,
  hours_declared   DECIMAL(6,2)       NULL COMMENT 'Heures sur la fiche',
  hourly_rate      DECIMAL(8,4)       NULL COMMENT 'Taux horaire extrait du PDF',
  net_salary       DECIMAL(10,2)  NOT NULL COMMENT 'Net à payer (€)',
  travel_allowance DECIMAL(8,2)       NULL COMMENT 'Indemnité de déplacement (€)',
  imported_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_job_period (job_id, period_start, period_end)
) ENGINE=InnoDB;

-- ── Journal des heures (saisie manuelle) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id           INT           NOT NULL AUTO_INCREMENT,
  job_id       INT           NOT NULL,
  work_date    DATE          NOT NULL,
  hours_worked DECIMAL(4,2)  NOT NULL,
  note         VARCHAR(255)      NULL,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_job_date (job_id, work_date)
) ENGINE=InnoDB;
