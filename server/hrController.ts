import { Request, Response } from 'express';
import db from './db';

const uid = () => `hr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const uuidv4 = uid; // alias — no uuid package needed

// ==========================================
// WORKERS CRUD
// ==========================================

export const getHRWorkers = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const stmt = db.prepare('SELECT * FROM hr_workers WHERE owner_id = ? ORDER BY full_name ASC');
        const workers = stmt.all(userId);
        res.json(workers);
    } catch (error) {
        console.error('getHRWorkers Error:', error);
        res.status(500).json({ message: 'Erreur' });
    }
};

export const getHRWorkerById = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const worker = db.prepare('SELECT * FROM hr_workers WHERE id = ? AND owner_id = ?').get(req.params.id, userId);
        res.json(worker);
    } catch(e) {
        res.status(500).json({message: 'Erreur'});
    }
};

export const saveHRWorker = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const data = req.body;
    try {
        const workerId = data.id || uuidv4();
        db.prepare(`
            INSERT INTO hr_workers (
                id, matricule, full_name, cin, cnss, phone, date_naissance, adresse, photo,
                sexe, role, chaine_id, poste, specialite, date_embauche, type_contrat, date_fin_contrat,
                date_renouvellement, is_active, contact_urgence_nom, contact_urgence_tel, contact_urgence_lien,
                salaire_base, taux_horaire, taux_piece, prime_assiduite, prime_transport, mode_paiement, owner_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                matricule = excluded.matricule, full_name = excluded.full_name, cin = excluded.cin, cnss = excluded.cnss,
                phone = excluded.phone, date_naissance = excluded.date_naissance, adresse = excluded.adresse, photo = excluded.photo,
                sexe = excluded.sexe, role = excluded.role, chaine_id = excluded.chaine_id, poste = excluded.poste, specialite = excluded.specialite,
                date_embauche = excluded.date_embauche, type_contrat = excluded.type_contrat, date_fin_contrat = excluded.date_fin_contrat,
                date_renouvellement = excluded.date_renouvellement, is_active = excluded.is_active,
                contact_urgence_nom = excluded.contact_urgence_nom, contact_urgence_tel = excluded.contact_urgence_tel, contact_urgence_lien = excluded.contact_urgence_lien,
                salaire_base = excluded.salaire_base, taux_horaire = excluded.taux_horaire, taux_piece = excluded.taux_piece,
                prime_assiduite = excluded.prime_assiduite, prime_transport = excluded.prime_transport, mode_paiement = excluded.mode_paiement
        `).run(
            workerId, data.matricule, data.full_name, data.cin || null, data.cnss || null, data.phone || null,
            data.date_naissance || null, data.adresse || null, data.photo || null, data.sexe || 'M', data.role || 'OPERATOR',
            data.chaine_id || null, data.poste || null, data.specialite || null, data.date_embauche || new Date().toISOString(), data.type_contrat || 'CDI',
            data.date_fin_contrat || null, data.date_renouvellement || null, data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
            data.contact_urgence_nom || null, data.contact_urgence_tel || null, data.contact_urgence_lien || null,
            data.salaire_base || 0, data.taux_horaire || 0, data.taux_piece || 0, data.prime_assiduite || 0, data.prime_transport || 0,
            data.mode_paiement || 'VIREMENT', userId
        );
        res.json({ message: 'Enregistré', id: workerId });
    } catch (e) {
        res.status(500).json({ message: 'Erreur' });
    }
};

export const deleteHRWorker = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        db.prepare('DELETE FROM hr_workers WHERE id = ? AND owner_id = ?').run(req.params.id, userId);
        res.json({ message: 'Supprimé' });
    } catch (e) {
        res.status(500).json({ message: 'Erreur' });
    }
};

// ==========================================
// POINTAGE
// ==========================================

export const getHRPointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const records = db.prepare(`
            SELECT p.*, w.full_name, w.matricule, w.role 
            FROM hr_pointage p JOIN hr_workers w ON p.worker_id = w.id
            WHERE w.owner_id = ? ${req.query.date ? 'AND p.date = ?' : ''}
        `).all(req.query.date ? [userId, req.query.date] : [userId]);
        res.json(records);
    } catch (e) { res.status(500).json({message: 'Erreur'}); }
};

export interface HeuresResult {
    normales: number;
    supp25: number;
    supp50: number;
    travaillees: number;
}

export function calculerHeures(entree: string | null, sortie: string | null, pauseDebut: string | null, pauseFin: string | null, dateStr: string): HeuresResult {
    if (!entree || !sortie) {
        return { normales: 0, supp25: 0, supp50: 0, travaillees: 0 };
    }

    const parseTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        return h + (m / 60);
    };

    let tEnt = parseTime(entree);
    let tSor = parseTime(sortie);
    if (tSor < tEnt) tSor += 24;

    const calcOverlap = (start: number, end: number, intervals: number[][]) => {
        let overlap = 0;
        for (const [iStart, iEnd] of intervals) {
            const s = Math.max(start, iStart);
            const e = Math.min(end, iEnd);
            if (e > s) overlap += (e - s);
        }
        return overlap;
    };

    const nightIntervals = [[0, 6], [21, 30], [45, 54]];
    let totalNight = calcOverlap(tEnt, tSor, nightIntervals);
    let totalTime = tSor - tEnt;

    if (pauseDebut && pauseFin) {
        let pEnt = parseTime(pauseDebut);
        let pSor = parseTime(pauseFin);
        if (pSor < pEnt) pSor += 24;

        if (pEnt < tEnt && pEnt + 24 <= tSor) {
            pEnt += 24;
            pSor += 24;
        }

        const pauseNight = calcOverlap(pEnt, pSor, nightIntervals);
        const pauseTotal = Math.max(0, pSor - pEnt);

        totalNight = Math.max(0, totalNight - pauseNight);
        totalTime = Math.max(0, totalTime - pauseTotal);
    }

    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let normales = 0;
    let supp25 = 0;
    let supp50 = 0;

    if (isWeekend) {
        supp50 = totalTime;
    } else {
        const actualNight = totalNight;
        const actualDay = Math.max(0, totalTime - actualNight);

        supp50 += actualNight;

        let remaining = actualDay;
        
        normales = Math.min(8, remaining);
        remaining -= normales;

        const possible25 = Math.min(2, remaining);
        supp25 += possible25;
        remaining -= possible25;

        supp50 += remaining;
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;
    return {
        normales: round2(normales),
        supp25: round2(supp25),
        supp50: round2(supp50),
        travaillees: round2(totalTime)
    };
}

export const saveHRPointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const records = Array.isArray(req.body) ? req.body : [req.body];
    
    let autoOvertime = true; // Actif par défaut
    try {
        const setting = db.prepare("SELECT value FROM app_settings WHERE key = 'hr_auto_overtime' AND owner_id = ?").get(userId) as any;
        if (setting && setting.value === 'false') {
            autoOvertime = false;
        }
    } catch (e) {
        // Assume default if table/column missing or not configured
    }

    try {
        const transaction = db.transaction(() => {
            const stmt = db.prepare(`
                INSERT INTO hr_pointage (
                    id, worker_id, date, heure_entree, heure_sortie, pause_debut, pause_fin, 
                    heures_travaillees, heures_normales, heures_supp_25, heures_supp_50, statut, motif_absence
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(worker_id, date) DO UPDATE SET 
                    heure_entree=excluded.heure_entree, 
                    heure_sortie=excluded.heure_sortie, 
                    pause_debut=excluded.pause_debut,
                    pause_fin=excluded.pause_fin,
                    heures_travaillees=excluded.heures_travaillees, 
                    heures_normales=excluded.heures_normales,
                    heures_supp_25=excluded.heures_supp_25,
                    heures_supp_50=excluded.heures_supp_50,
                    statut=excluded.statut,
                    motif_absence=excluded.motif_absence
            `);
            for (const r of records) {
                const w = db.prepare('SELECT id FROM hr_workers WHERE id = ? AND owner_id = ?').get(r.worker_id, userId);
                if (w) {
                    const hEntree = r.heureEntree || r.heure_entree || null;
                    const hSortie = r.heureSortie || r.heure_sortie || null;
                    const pDebut = r.pauseDebut || r.pause_debut || null;
                    const pFin = r.pauseFin || r.pause_fin || null;

                    let travail = Number(r.heuresTravaillees || r.heures_travaillees || 0);
                    let norm = Number(r.heuresNormales || r.heures_normales || 0);
                    let s25 = Number(r.heuresSupp25 || r.heures_supp_25 || 0);
                    let s50 = Number(r.heuresSupp50 || r.heures_supp_50 || 0);

                    const calc = calculerHeures(hEntree, hSortie, pDebut, pFin, r.date);

                    if (autoOvertime) {
                        travail = calc.travaillees;
                        norm = calc.normales;
                        s25 = calc.supp25;
                        s50 = calc.supp50;
                    } else {
                        // Si désactivé, on recalcule quand même le "travail" si l'utilisateur ne l'a pas fourni, 
                        // mais on respecte input client pour les heures normales et sup
                        if (!travail && (hEntree && hSortie)) {
                            travail = calc.travaillees;
                            norm = travail; // par defaut tout en normal
                        }
                    }

                    stmt.run(
                        r.id || uuidv4(), 
                        r.worker_id, 
                        r.date, 
                        hEntree, 
                        hSortie, 
                        pDebut,
                        pFin,
                        travail, 
                        norm, 
                        s25, 
                        s50, 
                        r.statut, 
                        r.motif_absence || null
                    );
                }
            }
        });
        transaction();
        res.json({message: 'Sauvegardé'});
    } catch (e) { 
        console.error('saveHRPointage Error:', e);
        res.status(500).json({message: 'Erreur'}); 
    }
};

export const validateHRPointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        db.prepare(`UPDATE hr_pointage SET is_validated = 1 WHERE worker_id IN (SELECT id FROM hr_workers WHERE owner_id = ?) AND date = ?`).run(userId, req.body.date);
        res.json({message: 'Validé'});
    } catch(e) { res.status(500).json({message: 'Erreur'}); }
};

// ==========================================
// PRODUCTION
// ==========================================

export const getHRProduction = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        let q = `SELECT prod.*, w.full_name FROM hr_production prod JOIN hr_workers w ON prod.worker_id = w.id WHERE w.owner_id=?`;
        if (req.query.date) q += ` AND prod.date = '${req.query.date}'`;
        res.json(db.prepare(q).all(userId));
    } catch(e) { res.status(500).json({message:'Erreur'}); }
};

export const saveHRProduction = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const p = req.body;
    try {
        const w = db.prepare('SELECT id FROM hr_workers WHERE id = ? AND owner_id = ?').get(p.worker_id, userId);
        if(!w) return res.status(403).json({});
        db.prepare(`INSERT INTO hr_production (id, worker_id, date, pieces_produites) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET pieces_produites=excluded.pieces_produites`).run(p.id||uuidv4(), p.worker_id, p.date, p.pieces_produites);
        res.json({message: 'Saved'});
    } catch(e) { res.status(500).json({}); }
};

// ==========================================
// AVANCES
// ==========================================

export const getHRAvances = (req: Request, res: Response) => {
    res.json(db.prepare(`SELECT a.*, w.full_name, w.salaire_base FROM hr_avances a JOIN hr_workers w ON a.worker_id = w.id WHERE w.owner_id = ?`).all((req as any).user.id));
};
export const saveHRAvance = (req: Request, res: Response) => {
    const a = req.body;
    db.prepare(`INSERT INTO hr_avances (id, worker_id, date_demande, montant) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET montant=excluded.montant`).run(a.id||uuidv4(), a.worker_id, a.date_demande, a.montant);
    res.json({message: 'Saved'});
};
export const updateHRAvanceStatut = (req: Request, res: Response) => {
    db.prepare(`UPDATE hr_avances SET statut=? WHERE id=?`).run(req.body.statut, req.params.id);
    res.json({message: 'Updated'});
};

// ==========================================
// WORKERS APP (READ-ONLY)
// ==========================================

export const getWorkerByCin = (req: Request, res: Response) => {
    try {
        const worker = db.prepare('SELECT id, full_name, role, chaine_id FROM hr_workers WHERE cin = ?').get(req.params.cin);
        res.json(worker || null);
    } catch(e) { res.status(500).json({}); }
};

export const getWorkerPointageToday = (req: Request, res: Response) => {
    res.json(db.prepare('SELECT * FROM hr_pointage WHERE worker_id = (SELECT id FROM hr_workers WHERE cin = ?) AND date = date("now")').get(req.params.cin) || null);
};

export const getWorkerProductionToday = (req: Request, res: Response) => {
    res.json(db.prepare('SELECT sum(pieces_produites) as total FROM hr_production WHERE worker_id = (SELECT id FROM hr_workers WHERE cin = ?) AND date = date("now")').get(req.params.cin) || null);
};
