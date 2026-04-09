import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT, REACT_INSTRUCTIONS } from './prompt';
import { RAGTool } from './tools/ragTool';
import { WebSearchTool } from './tools/webSearchTool';
import { RegistryLookupTool } from './tools/registryLookupTool';
import { ComponentGenTool } from './tools/componentGenTool';
import type { Env, ChatMessage, ReActStep, AgentResult } from '../types';

export async function reactAgent(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env
): Promise<AgentResult> {

  const ragTool = new RAGTool(env.VECTORIZE, env.LLM_API_KEY, userId);
  const webSearchTool = new WebSearchTool(env.SEARCH_API_KEY);
  const registryTool = new RegistryLookupTool(env.DB, env.R2, userId);
  const componentGenTool = new ComponentGenTool(env.DB, env.R2, userId);

  const tools = [ragTool, webSearchTool, registryTool, componentGenTool];

  const llm = new ChatOpenAI({
    openAIApiKey: env.LLM_API_KEY,
    configuration: { baseURL: env.LLM_BASE_URL },
    temperature: 0.3,
    modelName: 'gpt-4o'
  });

  const systemMsg = new SystemMessage(
    SYSTEM_PROMPT + '\n\n' + REACT_INSTRUCTIONS + '\n\n' +
    `USER ID: ${userId}\n` +
    `AVAILABLE TOOLS: ${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
  );

  const messages = [
    systemMsg,
    ...chatHistory.slice(-10).map(msg =>
      msg.role === 'user' ? new HumanMessage(msg.content) : new AIMessage(msg.content)
    ),
    new HumanMessage(userMessage)
  ];

  const steps: ReActStep[] = [];
  const maxIterations = 8;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const response = await llm.invoke(messages);
    const content = response.content as string;

    const toolCall = parseToolCall(content);

    if (!toolCall) {
      return { steps, finalResponse: content };
    }

    const tool = tools.find(t => t.name === toolCall.name);
    if (!tool) {
      messages.push(new AIMessage(`Error: Tool "${toolCall.name}" not found.`));
      continue;
    }

    const observation = await tool.call(toolCall.input);

    steps.push({
      thought: extractThought(content),
      action: toolCall.name,
      actionInput: toolCall.input,
      observation: observation.slice(0, 500)
    });

    messages.push(new AIMessage(content));
    messages.push(new ToolMessage(observation, { tool_call_id: '' }));
  }

  messages.push(new HumanMessage('You have used many tools. Now provide your final response in the required JSON format.'));
  const finalResponse = await llm.invoke(messages);

  return {
    steps,
    finalResponse: finalResponse.content as string
  };
}

function parseToolCall(content: string): { name: string; input: string; id?: string } | null {
  const match = content.match(/Action:\s*(\w+)\s*Action Input:\s*(.*)/s);
  if (!match) return null;
  return { name: match[1].trim(), input: match[2].trim() };
}

function extractThought(content: string): string {
  const match = content.match(/Thought:\s*(.*?)(?=Action:|$)/s);
  return match ? match[1].trim().slice(0, 200) : 'Thinking...';
}
