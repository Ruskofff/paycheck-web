# PayCheck Web

Application web locale de suivi des fiches de paie étudiantes.
Gère les emplois, les fiches de paie (PDF), les feuilles de temps et les quotas d'heures.

## Fonctionnalités

- **Dashboard** — vue d'ensemble des emplois et fiches de paie récentes
- **Emplois** — ajout et gestion des employeurs
- **Fiches de paie** — upload et consultation des PDF de paie
- **Feuilles de temps** — saisie des heures travaillées
- **Quotas** — suivi des heures autorisées par contrat

## Stack technique

- **Backend** : Node.js + Express
- **Base de données** : MySQL
- **Frontend** : HTML / CSS / JS (vanilla)
- **PDF** : pdf.js

## Installation

### Prérequis

- Node.js >= 18
- MySQL >= 8

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/TON_USERNAME/paycheck-web.git
cd paycheck-web

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec tes informations MySQL

# 4. Créer la base de données
mysql -u root -p < schema.sql

# 5. Lancer l'application
npm start
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

## Configuration

Copie `.env.example` en `.env` et renseigne les valeurs :

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=ton_mot_de_passe
DB_NAME=paycheck
PORT=3000
```

## Structure du projet

```
paycheck-web/
├── app.js                  # Point d'entrée
├── schema.sql              # Schéma de la base de données
├── public/                 # Frontend statique
│   ├── pages/              # Pages HTML
│   ├── css/
│   └── js/
└── src/
    ├── config/             # Connexion MySQL
    ├── controllers/        # Logique métier
    ├── routes/             # Routes Express
    ├── services/           # Services (PDF, etc.)
    └── middleware/         # Gestion des erreurs
```
