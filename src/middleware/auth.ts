import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getProfileById, getProfileByUid } from '../db/repository.ts';

const TOKEN_SECRET = process.env.SESSION_SECRET || 'clinicos-production-hmac-secret-2026';

export interface SessionPayload {
  profileId: number;
  uid: string;
  role: 'patient' | 'doctor' | 'admin';
  exp: number;
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const data = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(data)
    .digest('base64url');
  return `cos.${data}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  if (!token.startsWith('cos.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, data, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(data)
    .digest('base64url');
  if (sig !== expectedSig) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as SessionPayload;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthRequest extends Request {
  authProfile?: {
    id: number;
    uid: string;
    fullName: string;
    email: string | null;
    mobileNumber: string;
    role: string;
    accountStatus: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing authentication token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  try {
    // 1. Check ClinicOS signed session token
    const session = verifySessionToken(token);
    if (session) {
      const profile = await getProfileById(session.profileId);
      if (!profile) {
        return res.status(401).json({ error: 'Unauthorized: Account no longer exists' });
      }
      if (profile.accountStatus !== 'Active') {
        return res.status(403).json({ error: 'Account has been deactivated by an administrator.' });
      }
      req.authProfile = profile;
      return next();
    }

    // 2. Fallback to Firebase ID Token verification
    const decoded = await adminAuth.verifyIdToken(token);
    const profile = await getProfileByUid(decoded.uid);
    if (!profile) {
      return res.status(401).json({ error: 'Unauthorized: Profile not registered' });
    }
    if (profile.accountStatus !== 'Active') {
      return res.status(403).json({ error: 'Account has been deactivated by an administrator.' });
    }
    req.authProfile = profile;
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired session token' });
  }
};

export const requireRole = (roles: Array<'patient' | 'doctor' | 'admin'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.authProfile) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.authProfile.role as 'patient' | 'doctor' | 'admin')) {
      return res.status(403).json({ error: 'Forbidden: Insufficient role permissions' });
    }
    next();
  };
};
