-- PayCheck Web — Migration v2
-- Renommage des jobs + Adventure Valley Durbuy en saisie manuelle
-- mysql -u root -p paycheck < migrate_v2.sql

USE paycheck;

UPDATE jobs SET name = 'Multiwex'               WHERE id = 1;
UPDATE jobs SET name = 'Adventure Valley Durbuy' WHERE id = 2;

-- Job B : reçoit l'argent directement, pas de fiche PDF → saisie manuelle
UPDATE jobs SET is_manual = 1 WHERE id = 2;
