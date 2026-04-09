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
  db: D1Database
): Promise<void> {
  await db.prepare(
    'INSERT INTO components (id, user_id, name, description, render_type, code, props_schema, use_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), userId, name, description, renderType, code, JSON.stringify(propsSchema), 0, Date.now(), Date.now()).run();
}

export async function getComponentCode(
  db: D1Database,
  userId: string,
  componentName: string
): Promise<{ code: string | null; renderType: string | null }> {
  const component = await db.prepare(
    'SELECT code, render_type FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).first();

  if (!component) return { code: null, renderType: null };

  return { code: (component as any).code, renderType: (component as any).render_type };
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
  db: D1Database
): Promise<boolean> {
  const result = await db.prepare(
    'DELETE FROM components WHERE user_id = ? AND name = ?'
  ).bind(userId, componentName).run();

  return (result as any).changes > 0;
}
