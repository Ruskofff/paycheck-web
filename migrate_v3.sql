-- PayCheck Web — Migration v3
-- Ajout du montant réel versé sur le compte bancaire
-- mysql -u root -p paycheck < migrate_v3.sql

USE paycheck;

ALTER TABLE payslips
  ADD COLUMN actual_received DECIMAL(10,2) NULL
    COMMENT 'Montant réellement versé sur le compte bancaire (€) — inclut trajet, ONSS étudiant, etc.'
    AFTER net_salary;
