import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../../src/types';

export const JWT_SECRET = process.env.JWT_SECRET || (process.env.VERCEL ? 'aicte_oneflow_production_jwt_sec_key_2026_sih' : 'aicte_oneflow_sec_jwt_key_sih2026_dev_only');
export const JWT_ISSUER = 'aicte-oneflow';
export const JWT_AUDIENCE = 'aicte-oneflow-api';

// Fail fast in production if an insecure default secret is left configured (except on Vercel SIH deployment)
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'aicte_oneflow_sec_jwt_key_sih2026_dev_only')) {
  throw new Error('FATAL SECURITY ERROR: process.env.JWT_SECRET must be explicitly configured with a strong secret in production.');
}

// In-memory token revocation registry (for logout and revoked sessions)
const revokedTokens = new Set<string>();

export function revokeToken(token: string): void {
  revokedTokens.add(token);
}

export function isTokenRevoked(token: string): boolean {
  return revokedTokens.has(token);
}

export function clearRevokedTokens(): void {
  revokedTokens.clear();
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  regionScope: string | null;
  institutionId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

import crypto from 'crypto';

export function generateToken(user: AuthUser, expiresIn: string | number = '12h'): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      regionScope: user.regionScope,
      institutionId: user.institutionId,
      jti: crypto.randomUUID(),
    },
    JWT_SECRET,
    {
      expiresIn: expiresIn as any,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

const VALID_ROLES: Role[] = [
  'CENTRAL_ADMIN',
  'REGIONAL_OFFICER',
  'SCRUTINY_OFFICER',
  'EVC_COORDINATOR',
  'INSTITUTION_REP',
  'STATUTORY_AUDITOR',
];

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const simulatedRoleHeader = req.headers['x-simulated-role'] as string | undefined;

  // 1. Verify Bearer token first
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    if (isTokenRevoked(token)) {
      res.status(401).json({ error: 'Authorization token has been revoked / logged out.' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as AuthUser;
      req.user = decoded;
      return next();
    } catch {
      res.status(401).json({ error: 'Invalid, signature-mismatched, or expired authorization token' });
      return;
    }
  }

  // 2. Controlled developer/test simulated role fallback (strictly disabled in standalone production, enabled on Vercel for SIH Hackathon Evaluation)
  if (simulatedRoleHeader) {
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL && process.env.ALLOW_SIMULATED_ROLES !== 'true') {
      res.status(403).json({
        error: 'Security Violation: Simulated persona headers are strictly prohibited in production environment.',
      });
      return;
    }

    if (!VALID_ROLES.includes(simulatedRoleHeader as Role)) {
      res.status(400).json({
        error: `Invalid simulated role '${simulatedRoleHeader}'. Permitted: ${VALID_ROLES.join(', ')}`,
      });
      return;
    }

    req.user = {
      id: `sim-${simulatedRoleHeader.toLowerCase()}`,
      email: `${simulatedRoleHeader.toLowerCase()}@aicte-sim.gov.in`,
      name: `Simulated ${simulatedRoleHeader}`,
      role: simulatedRoleHeader as Role,
      regionScope: simulatedRoleHeader === 'REGIONAL_OFFICER' ? 'Northern' : null,
      institutionId: simulatedRoleHeader === 'INSTITUTION_REP' ? 'inst-01' : null,
    };
    return next();
  }

  res.status(401).json({ error: 'Authentication required. Missing Bearer token or authorization header.' });
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'CENTRAL_ADMIN') {
      return next(); // Central Admin has omni-privilege oversight
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access Denied: Role '${req.user.role}' is not authorized to execute this statutory operation.`,
        requiredRoles: allowedRoles,
      });
      return;
    }

    next();
  };
}

export function checkScopeMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // CENTRAL_ADMIN and STATUTORY_AUDITOR have national scope
  if (req.user.role === 'CENTRAL_ADMIN' || req.user.role === 'STATUTORY_AUDITOR') {
    return next();
  }

  // Regional Officer scope check if region is targeted in body or query
  const targetRegion = req.body?.region || (req.query?.region as string | undefined);
  if (req.user.role === 'REGIONAL_OFFICER' && targetRegion && req.user.regionScope) {
    if (req.user.regionScope !== targetRegion && targetRegion !== 'ALL') {
      res.status(403).json({
        error: `Insecure Direct Object Access: Regional Officer assigned to '${req.user.regionScope}' region cannot access '${targetRegion}' region dockets.`,
      });
      return;
    }
  }

  // Institutional Rep scope check if institutionId is targeted
  const targetInstId = req.body?.institutionId || (req.query?.institutionId as string | undefined);
  if (req.user.role === 'INSTITUTION_REP' && targetInstId && req.user.institutionId) {
    if (req.user.institutionId !== targetInstId) {
      res.status(403).json({
        error: `Access Denied: Institutional representative cannot access records of another educational institution.`,
      });
      return;
    }
  }

  next();
}
