import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db/database';
import { generateToken, requireAuth, AuthenticatedRequest, revokeToken } from '../middleware/auth';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      name: string;
      role: string;
      region_scope: string | null;
      institution_id: string | null;
    }>('SELECT * FROM users WHERE email = ?;', [email]);

    if (!user) {
      res.status(401).json({ error: 'Invalid institutional or administrative credentials' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid institutional or administrative credentials' });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
      regionScope: user.region_scope,
      institutionId: user.institution_id,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        regionScope: user.region_scope,
        institutionId: user.institution_id,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error during authentication', details: err.message });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// POST /api/auth/logout
authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    revokeToken(token);
  }
  res.json({ success: true, message: 'Session logged out and token revoked successfully.' });
});

// GET /api/auth/users (for demo role switching)
authRouter.get('/users', async (_req, res: Response) => {
  if (process.env.NODE_ENV === 'production' && !process.env.VERCEL && process.env.ALLOW_SIMULATED_ROLES !== 'true') {
    res.status(403).json({ error: 'Demo user listing and role switching is disabled in production.' });
    return;
  }
  try {
    const users = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      region_scope: string | null;
      institution_id: string | null;
    }>('SELECT id, email, name, role, region_scope, institution_id FROM users;');
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: err.message });
  }
});
