import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.cookies?.access_token;

    if(!accessToken) {
        res.status(401).json({
            message: 'Unauthorized',
        });
        return;
    }

    try {
        const payload = verifyToken(accessToken);
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({
            message: 'Unauthorized',
        });
    }
}