import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  // Explicitly include Request properties for TypeScript
  headers: Request['headers'];
  query: Request['query'];
  params: Request['params'];
  body: Request['body'];
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (error: any) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

