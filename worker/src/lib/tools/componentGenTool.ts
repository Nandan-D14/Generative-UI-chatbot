export class ComponentGenTool {
  name = 'generate_component';
  description = 'Generate a new UI component when no existing component in the registry matches the need. Input should describe the component type, data, and interactivity.';

  constructor(
    private db: D1Database,
    private r2: R2Bucket,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    return `Component generation requested for: "${query}". The LLM will generate HTML or React code based on the system prompt rules.`;
  }

  async saveComponent(name: string, code: string, renderType: string, propsSchema: object): Promise<string> {
    const id = crypto.randomUUID();
    const r2Key = `components/${this.userId}/${id}.txt`;
    await this.r2.put(r2Key, code);

    await this.db.prepare(
      'INSERT INTO components (id, user_id, name, description, render_type, r2_key, props_schema, use_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, this.userId, name, '', renderType, r2Key, JSON.stringify(propsSchema), 0, Date.now(), Date.now()).run();

    return id;
  }
}
