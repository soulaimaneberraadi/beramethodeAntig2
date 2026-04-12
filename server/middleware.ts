import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from './db';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-this';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};
