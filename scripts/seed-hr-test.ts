/**
 * Seed script: 100 test HR workers + pointage + production + avances
 * Target account: soulaimaneberraadi@gmail.com
 * Run: npm run seed:hr
 */

import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'database.sqlite'));
db.pragma('foreign_keys = ON');

const uid = () => `hr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[rand(0, arr.length - 1)];
const round2 = (n: number) => Math.round(n * 100) / 100;

// ─── DATA POOLS ──────────────────────────────────────────────────────────────
const MALE_NAMES = ['Mohamed', 'Ahmed', 'Youssef', 'Khalid', 'Rachid', 'Hamid', 'Said',
    'Abdelkrim', 'Hassan', 'Mustapha', 'Abdellah', 'Omar', 'Driss', 'Mounir', 'Brahim',
    'Lahcen', 'Aziz', 'Hicham', 'Jamal', 'Karim', 'Mehdi', 'Walid', 'Soufiane', 'Amine',
    'Nabil', 'Redouane', 'Tarik', 'Younes', 'Samir', 'Fouad', 'Noureddine', 'Badr'];

const FEMALE_NAMES = ['Fatima', 'Aicha', 'Khadija', 'Meryem', 'Zineb', 'Latifa', 'Najat',
    'Halima', 'Saadia', 'Jamila', 'Amina', 'Nadia', 'Siham', 'Houda', 'Soukaina',
    'Loubna', 'Sanaa', 'Malak', 'Sara', 'Wafa', 'Imane', 'Hanae'];

const LAST_NAMES = ['Alaoui', 'Benali', 'Filali', 'Tazi', 'Berrada', 'El Harti', 'Chebbak',
    'Benhaddou', 'Lahlou', 'El Mrabet', 'Tahiri', 'Rhazali', 'Slimani', 'Moumni',
    'Benchekroun', 'Hajji', 'Bennis', 'Sefrioui', 'El Fassi', 'Kettani', 'El Guerrouj',
    'Zniber', 'El Ouazzani', 'Benkirane', 'Oulad Ali', 'Chraibi', 'Sqalli'];

const POSTES = ['Surjeteuse', 'Piqueuse Plate', 'Colleteuse', 'Contrôleuse', 'Repasseuse',
    'Boutonnière', 'Pose Bouton', 'Finition', 'Double Aiguille', 'Empaquetage'];

const SPECIALITES = ['Tricot Fin', 'Denim', 'Tissu Léger', 'Polyester', 'Coton', 'Laine'];

// ─── ROLE CONFIG ─────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { count: number; salMin: number; salMax: number }> = {
    OPERATOR:    { count: 58, salMin: 2800, salMax: 3500 },
    SUPERVISOR:  { count: 10, salMin: 5000, salMax: 8000 },
    MECHANIC:    { count: 10, salMin: 4000, salMax: 6000 },
    QUALITY:     { count: 12, salMin: 3500, salMax: 5000 },
    MAINTENANCE: { count: 5,  salMin: 3500, salMax: 5500 },
    LOGISTICS:   { count: 5,  salMin: 3000, salMax: 4000 },
};

const CONTRATS = ['CDI', 'CDI', 'CDI', 'CDI', 'CDI', 'CDI', 'CDI', 'CDD', 'CDD', 'INTERIM'];
const CHAINS = Array.from({ length: 12 }, (_, i) => `CHAINE ${i + 1}`);

// ─── ENSURE USER EXISTS ───────────────────────────────────────────────────────
const TARGET_EMAIL = 'soulaimaneberraadi@gmail.com';
const TARGET_PASSWORD = 'Bera2024!';

let targetUser = db.prepare('SELECT id FROM users WHERE email = ?').get(TARGET_EMAIL) as any;
if (!targetUser) {
    const hashed = bcryptjs.hashSync(TARGET_PASSWORD, 10);
    const result = db.prepare(
        `INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, 'admin')`
    ).run(TARGET_EMAIL, hashed, 'Soulaimane Berraadi');
    targetUser = { id: result.lastInsertRowid };
    console.log(`✅ Utilisateur créé: ${TARGET_EMAIL} | Mot de passe: ${TARGET_PASSWORD}`);
} else {
    console.log(`✅ Utilisateur trouvé: ${TARGET_EMAIL} | ID: ${targetUser.id}`);
}

const OWNER_ID = targetUser.id as number;

// ─── CLEAR EXISTING TEST DATA ─────────────────────────────────────────────────
console.log('🧹 Nettoyage des anciennes données de test...');
const existingWorkers = db.prepare('SELECT id FROM hr_workers WHERE owner_id = ?').all(OWNER_ID) as any[];
if (existingWorkers.length > 0) {
    const workerIds = existingWorkers.map(w => w.id);
    const placeholders = workerIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM hr_avances WHERE worker_id IN (${placeholders})`).run(...workerIds);
    db.prepare(`DELETE FROM hr_production WHERE worker_id IN (${placeholders})`).run(...workerIds);
    db.prepare(`DELETE FROM hr_pointage WHERE worker_id IN (${placeholders})`).run(...workerIds);
    db.prepare('DELETE FROM hr_workers WHERE owner_id = ?').run(OWNER_ID);
    console.log(`   → ${existingWorkers.length} ouvriers précédents supprimés`);
}

// ─── CREATE 100 WORKERS ──────────────────────────────────────────────────────
console.log('👷 Création de 100 ouvriers...');
const insertWorker = db.prepare(`
    INSERT INTO hr_workers (
        id, matricule, full_name, cin, cnss, phone, date_naissance, adresse,
        sexe, role, chaine_id, poste, specialite, date_embauche, type_contrat,
        date_fin_contrat, is_active, salaire_base, taux_horaire, prime_assiduite,
        prime_transport, mode_paiement, owner_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
`);

const workers: string[] = [];
let matCounter = 1;

const seedWorkers = db.transaction(() => {
    for (const [role, cfg] of Object.entries(ROLE_CONFIG)) {
        for (let i = 0; i < cfg.count; i++) {
            const isFemale = (role === 'OPERATOR' || role === 'QUALITY') && Math.random() < 0.6;
            const firstName = isFemale ? pick(FEMALE_NAMES) : pick(MALE_NAMES);
            const lastName = pick(LAST_NAMES);
            const fullName = `${firstName} ${lastName}`;
            const sexe = isFemale ? 'F' : 'M';
            const mat = `BRM${String(matCounter++).padStart(4, '0')}`;
            const cin = `${pick(['A', 'B', 'C', 'D', 'E', 'G', 'H', 'J', 'K'])}${rand(100000, 999999)}`;
            const cnss = rand(100000000, 999999999).toString();
            const phone = `0${pick(['6', '7'])}${rand(10000000, 99999999)}`;
            const yob = rand(1975, 2001);
            const dob = `${yob}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`;
            const yearHire = rand(2015, 2024);
            const dateHire = `${yearHire}-${String(rand(1,12)).padStart(2,'0')}-${String(rand(1,28)).padStart(2,'0')}`;
            const contrat = pick(CONTRATS);
            const dateFin = contrat !== 'CDI' ? `${yearHire + rand(1,2)}-12-31` : null;
            const salaire = rand(cfg.salMin, cfg.salMax);
            const tauxH = round2(salaire / 191); // standard 191h/month Morocco
            const primeA = role === 'OPERATOR' ? rand(0, 200) : rand(100, 400);
            const primeT = rand(0, 300);
            const chaine = role === 'OPERATOR' || role === 'QUALITY' ? pick(CHAINS) : null;
            const poste = role === 'OPERATOR' ? pick(POSTES) : role;
            const specialite = role === 'OPERATOR' ? pick(SPECIALITES) : null;
            const adresse = `${rand(1, 200)} Rue ${pick(['Hassan II', 'Mohamed V', 'Allal Al Fassi', 'Ibn Battuta', 'Al Massira'])}, ${pick(['Casablanca', 'Rabat', 'Fès', 'Meknès', 'Marrakech', 'Tanger', 'Salé'])}`;
            const paiement = pick(['VIREMENT', 'VIREMENT', 'VIREMENT', 'ESPECES', 'CHEQUE']);
            const wid = uid();
            workers.push(wid);
            insertWorker.run(wid, mat, fullName, cin, cnss, phone, dob, adresse, sexe, role, chaine, poste, specialite, dateHire, contrat, dateFin, salaire, tauxH, primeA, primeT, paiement, OWNER_ID);
        }
    }
});
seedWorkers();
console.log(`   → ${workers.length} ouvriers créés`);

// ─── CREATE POINTAGE (last 21 days) ─────────────────────────────────────────
console.log('🕐 Création du pointage des 21 derniers jours...');
const insertPointage = db.prepare(`
    INSERT OR IGNORE INTO hr_pointage (
        id, worker_id, date, heure_entree, heure_sortie,
        heures_travaillees, heures_normales, heures_supp_25, heures_supp_50, statut
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const STATUTS_WEIGHTS = [
    ...Array(80).fill('PRESENT'),
    ...Array(7).fill('ABSENT'),
    ...Array(7).fill('RETARD'),
    ...Array(3).fill('CONGE'),
    ...Array(3).fill('MALADIE'),
];

let totalPointage = 0;
const seedPointage = db.transaction(() => {
    for (let d = 21; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends
        const dateStr = date.toISOString().split('T')[0];

        for (const wid of workers) {
            const statut = pick(STATUTS_WEIGHTS);
            let heureEntree = null, heureSortie = null, travaillees = 0, normales = 0, supp25 = 0, supp50 = 0;

            if (statut === 'PRESENT' || statut === 'RETARD') {
                const entreeH = statut === 'RETARD' ? rand(8, 10) : 8;
                const entreeM = statut === 'RETARD' ? rand(10, 59) : rand(0, 15);
                const sortieH = rand(16, 19);
                const sortieM = rand(0, 59);
                heureEntree = `${String(entreeH).padStart(2,'0')}:${String(entreeM).padStart(2,'0')}`;
                heureSortie = `${String(sortieH).padStart(2,'0')}:${String(sortieM).padStart(2,'0')}`;

                travaillees = round2((sortieH + sortieM/60) - (entreeH + entreeM/60) - 1); // -1h pause
                normales = Math.min(8, travaillees);
                const rem = Math.max(0, travaillees - 8);
                supp25 = round2(Math.min(2, rem));
                supp50 = round2(Math.max(0, rem - 2));
            }

            insertPointage.run(uid(), wid, dateStr, heureEntree, heureSortie, travaillees, normales, supp25, supp50, statut);
            totalPointage++;
        }
    }
});
seedPointage();
console.log(`   → ${totalPointage} enregistrements de pointage créés`);

// ─── CREATE PRODUCTION (last 14 working days) ────────────────────────────────
console.log('📦 Création des données de production (14 derniers jours ouvrés)...');
const insertProd = db.prepare(`
    INSERT OR IGNORE INTO hr_production (id, worker_id, date, pieces_produites, pieces_defaut, taux_qualite)
    VALUES (?, ?, ?, ?, ?, ?)
`);

// Only for operators and quality workers
const prodWorkers = workers.slice(0, 70); // First 70 are operators and quality
let totalProd = 0;
const seedProd = db.transaction(() => {
    for (let d = 14; d >= 0; d--) {
        const date = new Date();
        date.setDate(date.getDate() - d);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        const dateStr = date.toISOString().split('T')[0];

        for (const wid of prodWorkers) {
            const pieces = rand(40, 120);
            const defauts = rand(0, Math.floor(pieces * 0.08)); // max 8% defects
            const taux = round2(((pieces - defauts) / pieces) * 100);
            insertProd.run(uid(), wid, dateStr, pieces, defauts, taux);
            totalProd++;
        }
    }
});
seedProd();
console.log(`   → ${totalProd} enregistrements de production créés`);

// ─── CREATE AVANCES ───────────────────────────────────────────────────────────
console.log('💰 Création des avances...');
const insertAvance = db.prepare(`
    INSERT INTO hr_avances (id, worker_id, date_demande, montant, statut, motif)
    VALUES (?, ?, ?, ?, ?, ?)
`);

const MOTIFS = ['Frais médicaux', 'Dépenses scolaires', 'Loyer', 'Achat équipement', 'Urgence familiale', null, null];
const STATUTS_AVANCES = ['APPROUVEE', 'APPROUVEE', 'APPROUVEE', 'REJETEE', 'DEMANDE', 'DEMANDE'];

const avanceWorkers = [...workers].sort(() => Math.random() - 0.5).slice(0, 30);
const seedAvances = db.transaction(() => {
    for (const wid of avanceWorkers) {
        const d = rand(1, 60);
        const date = new Date();
        date.setDate(date.getDate() - d);
        const dateStr = date.toISOString().split('T')[0];
        const montant = pick([300, 500, 750, 1000, 1500, 2000]);
        const statut = pick(STATUTS_AVANCES);
        const motif = pick(MOTIFS);
        insertAvance.run(uid(), wid, dateStr, montant, statut, motif);
    }
});
seedAvances();
console.log(`   → 30 demandes d'avances créées`);

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
const workerCount = (db.prepare('SELECT COUNT(*) as c FROM hr_workers WHERE owner_id = ?').get(OWNER_ID) as any).c;
const pointageCount = (db.prepare('SELECT COUNT(*) as c FROM hr_pointage').get() as any).c;
const prodCount = (db.prepare('SELECT COUNT(*) as c FROM hr_production').get() as any).c;
const avanceCount = (db.prepare('SELECT COUNT(*) as c FROM hr_avances').get() as any).c;

console.log('\n' + '─'.repeat(55));
console.log('✅  SEED TERMINÉ AVEC SUCCÈS');
console.log('─'.repeat(55));
console.log(`📧  Compte cible : ${TARGET_EMAIL}`);
console.log(`🔑  Mot de passe  : ${TARGET_PASSWORD}`);
console.log(`👷  Ouvriers      : ${workerCount}`);
console.log(`🕐  Pointage      : ${pointageCount} enregistrements`);
console.log(`📦  Production    : ${prodCount} enregistrements`);
console.log(`💰  Avances       : ${avanceCount} demandes`);
console.log('─'.repeat(55));
console.log('🌐  App disponible sur: http://localhost:8000');

db.close();
