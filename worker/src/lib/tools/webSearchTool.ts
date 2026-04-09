export class WebSearchTool {
  name = 'web_search';
  description = "Search the web for current information. Use this when the user asks about current events, recent data, or information not in the knowledge base.";

  async call(query: string): Promise<string> {
    try {
      const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const html = await response.text();

      const results: Array<{ title: string; url: string; content: string }> = [];
      const resultRegex = html.match(/<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
      
      if (resultRegex) {
        for (const match of resultRegex.slice(0, 5)) {
          const urlMatch = match.match(/href="([^"]+)"/);
          const titleMatch = match.match(/>([^<]+)</);
          if (urlMatch && titleMatch) {
            results.push({
              title: titleMatch[1],
              url: urlMatch[1],
              content: ''
            });
          }
        }
      }

      if (!results.length) return 'No results found.';

      return results.map((r, i) =>
        `[${i + 1}] ${r.title}\n${r.url}`
      ).join('\n\n---\n\n');
    } catch (err) {
      return `Web search failed: ${(err as Error).message}`;
    }
  }
}
