export async function getRegistryContext(userId: string, db: D1Database): Promise<string> {
  const components = await db.prepare(
    'SELECT name, description, props_schema FROM components WHERE user_id = ? ORDER BY use_count DESC LIMIT 20'
  ).bind(userId).all();

  if (!components.results.length) return 'No components in registry yet.';

  return components.results.map((c: any) =>
    `- ${c.name}: ${c.description} | props: ${c.props_schema}`
  ).join('\n');
}

export async function saveComponent(
  userId: string,
  name: string,
  description: string,
  renderType: string,
  code: string,
  propsSchema: object,
  db: D1Database,
  r2: R2Bucket
): Promise<void> {
  const id = crypto.randomUUID();
  const r2Key = `components/${userId}/${id}.txt`;
  await r2.put(r2Key, code);
  await db.prepare(
    'INSERT INTO components (id, user_id, name, description, render_type, r2_key, props_schema, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, name, description, renderType, r2Key, JSON.stringify(propsSchema), Date.now(), Date.now()).run();
}

export async function getComponentCode(
  db: D1Database,
  r2: R2Bucket,
  userId: string,
  componentName: string
): Promise<{ code: string | null; renderType: string | null }> {
  const component = await db.prepare(
    'SELECT r2_key, render_type FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).first();

  if (!component) return { code: null, renderType: null };

  const obj = await r2.get((component as any).r2_key);
  return { code: await obj?.text() ?? null, renderType: (component as any).render_type };
}

export async function incrementComponentUseCount(
  userId: string,
  componentName: string,
  db: D1Database
): Promise<void> {
  await db.prepare(
    'UPDATE components SET use_count = use_count + 1, updated_at = ? WHERE user_id = ? AND name = ?'
  ).bind(Date.now(), userId, componentName).run();
}

export async function deleteComponent(
  userId: string,
  componentName: string,
  db: D1Database,
  r2: R2Bucket
): Promise<boolean> {
  const component = await db.prepare(
    'SELECT r2_key FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).first();

  if (!component) return false;

  await r2.delete((component as any).r2_key);
  await db.prepare(
    'DELETE FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).run();

  return true;
}
