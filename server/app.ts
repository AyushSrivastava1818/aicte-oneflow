import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { applicationsRouter } from './routes/applications';
import { evcRouter } from './routes/evc';
import { undertakingsRouter } from './routes/undertakings';
import { documentsRouter } from './routes/documents';
import { notificationsRouter } from './routes/notifications';
import { auditRouter } from './routes/audit';
import { adminRouter } from './routes/admin';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Routes
  app.use('/api', adminRouter); // /api/health and /api/reset-demo
  app.use('/api/auth', authRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/evc', evcRouter);
  app.use('/api/undertakings', undertakingsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/audit', auditRouter);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
    });
  });

  return app;
}
