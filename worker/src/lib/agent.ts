import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT, REACT_INSTRUCTIONS } from './prompt';
import { createChatModel } from './llm';
import { RAGTool } from './tools/ragTool';
import { WebSearchTool } from './tools/webSearchTool';
import { RegistryLookupTool } from './tools/registryLookupTool';
import { ComponentGenTool } from './tools/componentGenTool';
import { normalizeLLMResponse } from './response';
import type { Env, ChatMessage, ReActStep, AgentResult } from '../types';

type AgentTool = {
  name: string;
  description: string;
  call(input: string): Promise<string>;
};

type AgentCallbacks = {
  onStep?: (step: ReActStep) => Promise<void> | void;
};

export async function reactAgent(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env,
  callbacks: AgentCallbacks = {}
): Promise<AgentResult> {

  const ragTool = new RAGTool(env.VECTORIZE, env, userId);
  const registryTool = new RegistryLookupTool(env.DB, userId);
  const componentGenTool = new ComponentGenTool(env.DB, userId);

  const tools: AgentTool[] = [ragTool, registryTool, componentGenTool];
  if (env.SEARCH_API_KEY) {
    tools.push(new WebSearchTool(env.SEARCH_API_KEY));
  }

  const llm = createChatModel(env);

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
  const maxIterations = 3;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;

    const response = await llm.invoke(messages);
    const content = response.content as string;

    const toolCall = parseToolCall(content);

    if (!toolCall) {
      return { steps, finalResponse: normalizeLLMResponse(content) };
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

    if (callbacks.onStep) {
      await callbacks.onStep(steps[steps.length - 1]);
    }

    messages.push(new AIMessage(content));
    messages.push(new ToolMessage({
      content: observation,
      tool_call_id: toolCall.id || `${toolCall.name}-${iteration}`
    }));
  }

  messages.push(new HumanMessage('You have used many tools. Now provide your final response in the required JSON format.'));
  const finalResponse = await llm.invoke(messages);

  return {
    steps,
    finalResponse: normalizeLLMResponse(finalResponse.content as string)
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
