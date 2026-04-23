import { Request, Response } from 'express';
import db from './db';
import crypto from 'crypto';

export const getSageExports = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const exports = db.prepare('SELECT * FROM hr_sage_exports WHERE owner_id = ? ORDER BY mois DESC').all(userId);
        res.json(exports);
    } catch(e) {
        res.status(500).json({message: 'Erreur'});
    }
};

export const previewSageExport = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const mois = req.params.mois;
    
    try {
        const workers = db.prepare(`SELECT * FROM hr_workers WHERE owner_id = ? AND is_active = 1`).all(userId);
        const results = [];
        
        for (const w of workers as any[]) {
            const pts = db.prepare(`SELECT sum(heures_travaillees) as ht, sum(heures_normales) as hn, sum(heures_supp_25) as hs25, sum(heures_supp_50) as hs50, count(id) as jours FROM hr_pointage WHERE worker_id = ? AND date LIKE ? AND statut = 'PRESENT'`).get(w.id, `${mois}-%`) as any;
            const brut = ((pts?.hn || 0) * w.taux_horaire) + ((pts?.hs25 || 0) * w.taux_horaire * 1.25) + ((pts?.hs50 || 0) * w.taux_horaire * 1.5) + w.prime_assiduite + w.prime_transport;
            results.push({
                matricule: w.matricule,
                nom: w.full_name,
                cin: w.cin,
                nb_jours: pts?.jours || 0,
                total_brut: brut,
                net_a_payer: brut
            });
        }
        
        res.json({ mois, rows: results });
    } catch (error) {
        res.status(500).json({ message: 'Erreur' });
    }
};

export const generateSageExport = (req: Request, res: Response) => {
    // Generate actual file info and save it
    const userId = (req as any).user.id;
    const mois = req.params.mois;
    try {
        db.prepare('INSERT INTO hr_sage_exports (id, mois, date_export, owner_id) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), mois, new Date().toISOString(), userId);
        res.json({ message: 'Export généré' });
    } catch(e) {
        res.status(500).json({message: 'Erreur'});
    }
};
