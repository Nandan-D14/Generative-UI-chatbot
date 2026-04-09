export class RegistryLookupTool {
  name = 'registry_lookup';
  description = 'Search the component registry for existing UI components. Use this to find reusable components before generating new ones. Input should be a component type like "chart", "table", "dashboard".';

  constructor(
    private db: D1Database,
    private userId: string
  ) {}

  async call(query: string): Promise<string> {
    const components = await this.db.prepare(
      'SELECT name, description, render_type, props_schema, code FROM components WHERE user_id = ? AND (name LIKE ? OR description LIKE ?) ORDER BY use_count DESC LIMIT 5'
    ).bind(this.userId, `%${query}%`, `%${query}%`).all();

    if (!components.results.length) {
      return 'No matching components found. You will need to generate new code.';
    }

    return components.results.map((c: any) =>
      `Component: ${c.name}\nType: ${c.render_type}\nDescription: ${c.description}\nProps Schema: ${c.props_schema}\nCode: ${c.code}`
    ).join('\n\n---\n\n');
  }
}
