type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
};

type TavilyResponse = {
  answer?: string;
  results?: TavilyResult[];
  error?: string;
};

export class WebSearchTool {
  name = 'web_search';
  description = "Search the web for current information. Use this when the user asks about current events, recent data, or information not in the knowledge base.";

  constructor(private apiKey: string) {}

  async call(query: string): Promise<string> {
    try {
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          topic: chooseTopic(query),
          search_depth: 'advanced',
          max_results: 6,
          include_answer: true,
          include_raw_content: false
        })
      });

      const data = await response.json() as TavilyResponse;

      if (!response.ok || !Array.isArray(data.results)) {
        return data.error?.trim() || 'Web search is currently unavailable.';
      }

      const answer = typeof data.answer === 'string' && data.answer.trim()
        ? `Summary: ${data.answer.trim()}`
        : null;

      const sources = data.results.slice(0, 5).map((result, index) => {
        const title = result.title?.trim() || `Result ${index + 1}`;
        const url = result.url?.trim() || '#';
        const snippet = (result.content || '').trim().slice(0, 260);
        return `${index + 1}. ${title}\nURL: ${url}\nSnippet: ${snippet || 'No snippet available.'}`;
      });

      return [answer, 'Sources:', ...sources].filter(Boolean).join('\n\n');
    } catch {
      return 'Web search is currently unavailable.';
    }
  }
}

function chooseTopic(query: string): 'general' | 'news' {
  return /\b(today|latest|recent|headline|news|market|stock|stocks|price|weather|forecast|sports|score|election|trending)\b/i.test(query)
    ? 'news'
    : 'general';
}
