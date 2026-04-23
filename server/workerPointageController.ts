import { Request, Response } from 'express';
import db from './db';

export const getPointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { from, to, workerId } = req.query as any;
    try {
        const clauses = ['owner_id = ?'];
        const params: any[] = [userId];
        if (workerId) { clauses.push('worker_id = ?'); params.push(workerId); }
        if (from) { clauses.push('date >= ?'); params.push(from); }
        if (to) { clauses.push('date <= ?'); params.push(to); }
        const sql = `SELECT * FROM worker_pointage WHERE ${clauses.join(' AND ')} ORDER BY date DESC, worker_id ASC`;
        const rows = db.prepare(sql).all(...params);
        res.json(rows);
    } catch (error) {
        console.error('Get pointage error:', error);
        res.status(500).json({ message: 'Error fetching pointage' });
    }
};

export const savePointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const p = req.body;

    if (!p?.id || !p?.worker_id || !p?.date) {
        return res.status(400).json({ message: 'id, worker_id, date required' });
    }

    try {
        db.prepare(`
            INSERT INTO worker_pointage
            (id, owner_id, worker_id, date, chaine, poste_assigned, status, heure_entree, heure_sortie, heures_travaillees, heures_supp_25, heures_supp_50, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(worker_id, date) DO UPDATE SET
              chaine=excluded.chaine, poste_assigned=excluded.poste_assigned, status=excluded.status,
              heure_entree=excluded.heure_entree, heure_sortie=excluded.heure_sortie,
              heures_travaillees=excluded.heures_travaillees,
              heures_supp_25=excluded.heures_supp_25, heures_supp_50=excluded.heures_supp_50,
              notes=excluded.notes
        `).run(
            p.id, userId, p.worker_id, p.date,
            p.chaine || null, p.poste_assigned || null,
            p.status || 'PRESENT',
            p.heure_entree || null, p.heure_sortie || null,
            p.heures_travaillees ?? null,
            p.heures_supp_25 || 0, p.heures_supp_50 || 0,
            p.notes || null
        );
        res.json({ message: 'Pointage saved', id: p.id });
    } catch (error) {
        console.error('Save pointage error:', error);
        res.status(500).json({ message: 'Error saving pointage' });
    }
};

export const bulkSavePointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { entries } = req.body;
    if (!Array.isArray(entries)) {
        return res.status(400).json({ message: 'entries array required' });
    }
    try {
        const stmt = db.prepare(`
            INSERT INTO worker_pointage
            (id, owner_id, worker_id, date, chaine, poste_assigned, status, heure_entree, heure_sortie, heures_travaillees, heures_supp_25, heures_supp_50, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(worker_id, date) DO UPDATE SET
              chaine=excluded.chaine, poste_assigned=excluded.poste_assigned, status=excluded.status,
              heure_entree=excluded.heure_entree, heure_sortie=excluded.heure_sortie,
              heures_travaillees=excluded.heures_travaillees,
              heures_supp_25=excluded.heures_supp_25, heures_supp_50=excluded.heures_supp_50,
              notes=excluded.notes
        `);
        const tx = db.transaction(() => {
            for (const p of entries) {
                if (!p.id || !p.worker_id || !p.date) continue;
                stmt.run(
                    p.id, userId, p.worker_id, p.date,
                    p.chaine || null, p.poste_assigned || null,
                    p.status || 'PRESENT',
                    p.heure_entree || null, p.heure_sortie || null,
                    p.heures_travaillees ?? null,
                    p.heures_supp_25 || 0, p.heures_supp_50 || 0,
                    p.notes || null
                );
            }
        });
        tx();
        res.json({ message: 'Bulk pointage saved', count: entries.length });
    } catch (error) {
        console.error('Bulk pointage error:', error);
        res.status(500).json({ message: 'Error bulk saving pointage' });
    }
};

export const deletePointage = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { id } = req.params;
    try {
        db.prepare('DELETE FROM worker_pointage WHERE id = ? AND owner_id = ?').run(id, userId);
        res.json({ message: 'Pointage deleted' });
    } catch (error) {
        console.error('Delete pointage error:', error);
        res.status(500).json({ message: 'Error deleting pointage' });
    }
};

/**
 * Summary: presence stats for a worker over N days.
 * Query: ?workerId=xxx&days=30
 */
export const getWorkerActivity = (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { workerId, days } = req.query as any;
    if (!workerId) return res.status(400).json({ message: 'workerId required' });

    const n = Math.min(parseInt(days || '30', 10) || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - n);
    const sinceIso = since.toISOString().slice(0, 10);

    try {
        const stats = db.prepare(`
            SELECT
              SUM(CASE WHEN status='PRESENT' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN status='ABSENT' THEN 1 ELSE 0 END) as absent,
              SUM(CASE WHEN status='CONGE' THEN 1 ELSE 0 END) as conge,
              SUM(CASE WHEN status='MALADIE' THEN 1 ELSE 0 END) as maladie,
              SUM(CASE WHEN status='RETARD' THEN 1 ELSE 0 END) as retard,
              SUM(COALESCE(heures_travaillees,0)) as total_hours,
              SUM(COALESCE(heures_supp_25,0)) as hs_25,
              SUM(COALESCE(heures_supp_50,0)) as hs_50
            FROM worker_pointage
            WHERE owner_id = ? AND worker_id = ? AND date >= ?
        `).get(userId, workerId, sinceIso);
        res.json({ days: n, since: sinceIso, ...(stats as any) });
    } catch (error) {
        console.error('Activity error:', error);
        res.status(500).json({ message: 'Error computing activity' });
    }
};
