export class ComponentGenTool {
  name = 'generate_component';
  description = 'Generate a new UI component when no existing component in the registry matches the need. Input should describe the component type, data, and interactivity.';

  constructor(
    private db: D1Database,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    return `Component generation requested for: "${query}". The LLM will generate HTML or React code based on the system prompt rules.`;
  }

  async saveComponent(name: string, code: string, renderType: string, propsSchema: object): Promise<string> {
    await this.db.prepare(
      'INSERT INTO components (id, user_id, name, description, render_type, code, props_schema, use_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), this.userId, name, '', renderType, code, JSON.stringify(propsSchema), 0, Date.now(), Date.now()).run();

    return name;
  }
}
