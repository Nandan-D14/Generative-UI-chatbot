import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { clerkMiddleware } from './middleware/clerk';
import { dbMiddleware } from './middleware/db';
import { webhookRoutes } from './routes/webhook';
import { chatRoutes } from './routes/chat';
import { kbRoutes } from './routes/kb';
import { artifactRoutes } from './routes/artifacts';
import { registryRoutes } from './routes/registry';
import type { AppEnv } from './types';

const app = new Hono<AppEnv>();

app.use('*', dbMiddleware);

app.use('*', cors({
  origin: (_origin, c) => c.env.FRONTEND_URL,
  credentials: true
}));

// Webhooks bypass auth middleware — they use Clerk/Svix signature verification
webhookRoutes(app);

app.use('/api/*', clerkMiddleware);

chatRoutes(app);
kbRoutes(app);
artifactRoutes(app);
registryRoutes(app);

export default app;
