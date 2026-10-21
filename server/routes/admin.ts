import { Router, Response } from 'express';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth';
import { seedDatabase } from '../db/seed';
import { queryOne } from '../db/database';

export const adminRouter = Router();

// GET /api/health
adminRouter.get('/health', async (_req, res: Response) => {
  try {
    const check = await queryOne<{ count: number }>('SELECT count(*) as count FROM applications;');
    res.json({
      status: 'UP',
      database: 'CONNECTED',
      applicationsCount: check?.count ?? 0,
      timestamp: new Date().toISOString(),
      version: '1.0.0-SIH2026',
      environment: 'DEMONSTRATION_SYNTHETIC',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// POST /api/admin/reset-demo (Transactional reset to initial pristine seed data)
adminRouter.post('/reset-demo', requireAuth, requireRoles('CENTRAL_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'CONFIRM_RESET_DEMO_STATE') {
      res.status(400).json({
        error: "Safety confirmation required. Provide { confirmation: 'CONFIRM_RESET_DEMO_STATE' } in request body.",
      });
      return;
    }

    await seedDatabase();

    res.json({
      success: true,
      message: 'Demo dataset successfully reset to pristine baseline state.',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reset demo dataset', details: err.message });
  }
});
