import { Hono } from 'hono';
import type { Env } from '../types';

export function webhookRoutes(app: Hono<{ Bindings: Env }>) {
  const router = new Hono<{ Bindings: Env }>();

  // Clerk webhook — NO auth middleware (Clerk sends its own signature)
  router.post('/clerk', async (c) => {
    const svixId = c.req.header('svix-id');
    const svixTimestamp = c.req.header('svix-timestamp');
    const svixSignature = c.req.header('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return c.json({ error: 'Missing Svix headers' }, 400);
    }

    const body = await c.req.text();

    // Verify webhook signature
    const verified = await verifyWebhook(body, svixId, svixTimestamp, svixSignature, c.env);
    if (!verified) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(body);
    const eventType = event.type;

    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, created_at } = event.data;
        const email = email_addresses?.[0]?.email_address || '';

        await c.env.DB.prepare(
          'INSERT OR IGNORE INTO users (id, email, created_at) VALUES (?, ?, ?)'
        ).bind(id, email, Math.floor(new Date(created_at).getTime() / 1000)).run();

        break;
      }

      case 'user.updated': {
        const { id, email_addresses } = event.data;
        const email = email_addresses?.[0]?.email_address || '';

        await c.env.DB.prepare(
          'UPDATE users SET email = ? WHERE id = ?'
        ).bind(email, id).run();

        break;
      }

      case 'user.deleted': {
        const { id } = event.data;

        await c.env.DB.prepare(
          'DELETE FROM users WHERE id = ?'
        ).bind(id).run();

        break;
      }
    }

    return c.json({ success: true });
  });

  app.route('/api/webhook', router);
}

async function verifyWebhook(
  body: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  env: Env
): Promise<boolean> {
  // Clerk uses Svix for webhook signing
  // For now, we verify using the raw signing secret
  // In production, use the svix npm package
  try {
    const signingSecret = env.CLERK_WEBHOOK_SECRET || env.CLERK_SECRET_KEY;
    if (!signingSecret) return false;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(signingSecret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signedContent = `${svixId}.${svixTimestamp}.${body}`;
    const signatures = svixSignature.split(' ');

    for (const sig of signatures) {
      const [, sigBase64] = sig.split(',');
      const sigBytes = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));

      const isValid = await crypto.subtle.verify(
        'HMAC',
        cryptoKey,
        sigBytes,
        encoder.encode(signedContent)
      );

      if (isValid) return true;
    }

    return false;
  } catch {
    return false;
  }
}
