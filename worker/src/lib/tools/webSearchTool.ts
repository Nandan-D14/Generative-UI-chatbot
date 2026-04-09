export class WebSearchTool {
  name = 'web_search';
  description = "Search the web for current information. Use this when the user asks about current events, recent data, or information not in the knowledge base.";

  constructor(private apiKey: string) {}

  async call(query: string): Promise<string> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, max_results: 5 })
    });
    const data = await response.json();

    return data.results.map((r: any) =>
      `[${r.title}](${r.url})\n${r.content.slice(0, 300)}`
    ).join('\n\n---\n\n');
  }
}
