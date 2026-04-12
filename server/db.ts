import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert default guest user (password: guest2024, hashed with bcrypt)
try {
  db.prepare(`INSERT OR IGNORE INTO users (id, email, password, name, role) VALUES (1, 'guest@local', '$2b$10$Hy3NBUoxXyUym1dtrms.sus.Lb5CnxM6kOXJzn17qawn.5oCixj2K', 'Guest', 'admin')`).run();
} catch(e) {}

// Create models table
db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create verification_codes table
db.exec(`
  CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create Magasin Tables (Centralized Inventory)
db.exec(`
  CREATE TABLE IF NOT EXISTS magasin_products (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    reference TEXT NOT NULL,
    designation TEXT NOT NULL,
    categorie TEXT NOT NULL,
    unite TEXT NOT NULL,
    photo TEXT,
    fournisseurNom TEXT,
    fournisseurTel TEXT,
    fournisseurEmail TEXT,
    chaineExclusive TEXT,
    emplacement TEXT,
    prixUnitaire REAL DEFAULT 0,
    cump REAL DEFAULT 0,
    stockAlerte INTEGER DEFAULT 0,
    fournisseurAdresse TEXT,
    fournisseurIce TEXT,
    fournisseurRc TEXT,
    fournisseurConditionsPaiement TEXT,
    fournisseurDelaiLivraisonJours INTEGER,
    fournisseurMoq REAL,
    fournisseurDevise TEXT,
    fournisseurContact TEXT,
    fournisseurNotes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS magasin_lots (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    quantiteRestante REAL NOT NULL,
    quantiteInitiale REAL NOT NULL,
    prixUnitaire REAL NOT NULL,
    dateEntree TEXT NOT NULL,
    fournisseur TEXT,
    numBain TEXT,
    dateExpiration TEXT,
    variante TEXT,
    etat TEXT DEFAULT 'disponible',
    FOREIGN KEY (productId) REFERENCES magasin_products (id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS magasin_mouvements (
    id TEXT PRIMARY KEY,
    productId TEXT NOT NULL,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    quantite REAL NOT NULL,
    prixUnitaire REAL,
    fournisseurId TEXT,
    chaineId TEXT,
    modeleRef TEXT,
    date TEXT NOT NULL,
    operateurNom TEXT,
    notes TEXT,
    lotId TEXT,
    bain TEXT,
    documentRef TEXT,
    pieceJointe TEXT,
    FOREIGN KEY (productId) REFERENCES magasin_products (id) ON DELETE CASCADE
  )
`);

// MIGRATIONS
try { db.prepare("ALTER TABLE magasin_mouvements ADD COLUMN documentRef TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_mouvements ADD COLUMN pieceJointe TEXT").run(); } catch(e) {}

try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurAdresse TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurIce TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurRc TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurConditionsPaiement TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurDelaiLivraisonJours INTEGER").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurMoq REAL").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurDevise TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurContact TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurNotes TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_products ADD COLUMN fournisseurLogo TEXT").run(); } catch(e) {}
try { db.prepare("ALTER TABLE magasin_lots ADD COLUMN quantiteReservee REAL DEFAULT 0").run(); } catch(e) {}

// CREATE SETTINGS TABLE (Invoice generation config etc.)
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    owner_id INTEGER DEFAULT 1
  )
`);

// Create Magasin: Bons de Commande Table
db.exec(`
  CREATE TABLE IF NOT EXISTS magasin_commandes (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    numero TEXT NOT NULL,
    fournisseurNom TEXT NOT NULL,
    dateCreation TEXT NOT NULL,
    dateLivraisonPrevue TEXT,
    total REAL,
    statut TEXT NOT NULL,
    lignes TEXT, -- JSON array of items
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Magasin: Demandes Atelier Table
db.exec(`
  CREATE TABLE IF NOT EXISTS magasin_demandes (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    modelId TEXT NOT NULL,
    chaineId TEXT,
    produitDesignation TEXT NOT NULL,
    quantiteDemandee REAL NOT NULL,
    notes TEXT,
    dateDemande TEXT NOT NULL,
    demandeur TEXT NOT NULL,
    statut TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);

// Create Magasin: Déchets Table
db.exec(`
  CREATE TABLE IF NOT EXISTS magasin_dechets (
    id TEXT PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    type_dechet TEXT NOT NULL,
    quantite REAL NOT NULL,
    unite TEXT NOT NULL,
    source TEXT NOT NULL,
    date_declaration TEXT NOT NULL,
    valeur_estimee REAL NOT NULL,
    notes TEXT,
    statut TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE
  )
`);


// Create Production Tables for SuiviLive and Analysis
db.exec(`
  CREATE TABLE IF NOT EXISTS production_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'stop',
    progress INTEGER DEFAULT 0,
    efficiency INTEGER DEFAULT 0,
    model TEXT DEFAULT '---',
    operator INTEGER DEFAULT 0,
    alert BOOLEAN DEFAULT 0,
    alertMsg TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS production_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    name TEXT NOT NULL, 
    output INTEGER DEFAULT 0,
    target INTEGER DEFAULT 0,
    efficiency INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Insert default lines if empty
try {
  const lineCount = db.prepare('SELECT COUNT(*) as count FROM production_lines').get() as { count: number };
  if (lineCount.count === 0) {
    db.prepare("INSERT INTO production_lines (name, status, progress, efficiency, model, operator, alert, alertMsg) VALUES ('CHAINE A', 'prod', 78, 94, 'POLO M/C', 12, 0, '')").run();
    db.prepare("INSERT INTO production_lines (name, status, progress, efficiency, model, operator, alert, alertMsg) VALUES ('CHAINE B', 'prod', 45, 88, 'VESTE SLIM', 18, 1, 'Rupture Fil')").run();
    db.prepare("INSERT INTO production_lines (name, status, progress, efficiency, model, operator, alert, alertMsg) VALUES ('CHAINE C', 'prod', 92, 97, 'CHEMISE CL', 10, 0, '')").run();
    db.prepare("INSERT INTO production_lines (name, status, progress, efficiency, model, operator, alert, alertMsg) VALUES ('CHAINE D', 'stop', 0, 0, '---', 0, 0, '')").run();
    db.prepare("INSERT INTO production_lines (name, status, progress, efficiency, model, operator, alert, alertMsg) VALUES ('CHAINE E', 'setup', 15, 55, 'JUPE MIDI', 8, 0, '')").run();
    db.prepare("INSERT INTO production_lines (name, status, progress, efficiency, model, operator, alert, alertMsg) VALUES ('CHAINE F', 'prod', 62, 91, 'VESTE JEAN', 15, 0, '')").run();
    
    // Seed some daily data
    db.prepare("INSERT INTO production_daily (date, name, output, target, efficiency) VALUES ('2026-04-06', 'Lun', 400, 500, 80)").run();
    db.prepare("INSERT INTO production_daily (date, name, output, target, efficiency) VALUES ('2026-04-07', 'Mar', 520, 500, 104)").run();
    db.prepare("INSERT INTO production_daily (date, name, output, target, efficiency) VALUES ('2026-04-08', 'Mer', 480, 500, 96)").run();
    db.prepare("INSERT INTO production_daily (date, name, output, target, efficiency) VALUES ('2026-04-09', 'Jeu', 610, 500, 122)").run();
    db.prepare("INSERT INTO production_daily (date, name, output, target, efficiency) VALUES ('2026-04-10', 'Ven', 550, 500, 110)").run();
    db.prepare("INSERT INTO production_daily (date, name, output, target, efficiency) VALUES ('2026-04-11', 'Sam', 300, 400, 75)").run();
  }
} catch(e) {}

export default db;
