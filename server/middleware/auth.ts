import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '../../src/types';

export const JWT_SECRET = process.env.JWT_SECRET || 'aicte_oneflow_sec_jwt_key_sih2026_dev_only';

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

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      regionScope: user.regionScope,
      institutionId: user.institutionId,
    },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const simulatedRoleHeader = req.headers['x-simulated-role'] as string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = decoded;
      return next();
    } catch (_err) {
      res.status(401).json({ error: 'Invalid or expired authorization token' });
      return;
    }
  }

  // Developer / Demo role simulation header fallback
  if (simulatedRoleHeader) {
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
