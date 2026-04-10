import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { SYSTEM_PROMPT, REACT_INSTRUCTIONS } from './prompt';
import { createChatModel } from './llm';
import { RAGTool } from './tools/ragTool';
import { WebSearchTool } from './tools/webSearchTool';
import { RegistryLookupTool } from './tools/registryLookupTool';
import { ComponentGenTool } from './tools/componentGenTool';
import { normalizeLLMResponse } from './response';
import { parseStructuredLLMResponse } from '../../../shared/llm-response';
import type { Env, ChatMessage, ReActStep, AgentResult } from '../types';

type AgentTool = {
  name: string;
  description: string;
  call(input: string): Promise<string>;
};

type AgentCallbacks = {
  onStepStart?: (step: ReActStep) => Promise<void> | void;
  onStepComplete?: (step: ReActStep) => Promise<void> | void;
};

type AgentOptions = {
  useWebSearch?: boolean;
};

const MIN_RESPONSE_TEXT_LENGTH = 700;

export async function reactAgent(
  userMessage: string,
  chatHistory: ChatMessage[],
  userId: string,
  env: Env,
  callbacks: AgentCallbacks = {},
  options: AgentOptions = {}
): Promise<AgentResult> {
  const ragTool = new RAGTool(env.VECTORIZE, env, userId);
  const registryTool = new RegistryLookupTool(env.DB, userId);
  const componentGenTool = new ComponentGenTool(env.DB, userId);
  const allowWebSearch = Boolean(options.useWebSearch && env.SEARCH_API_KEY);
  const webSearchTool = allowWebSearch ? new WebSearchTool(env.SEARCH_API_KEY as string) : null;

  const tools: AgentTool[] = [ragTool, registryTool, componentGenTool];
  if (webSearchTool) {
    tools.push(webSearchTool);
  }

  const llm = createChatModel(env);

  const systemMsg = new SystemMessage(
    [
      SYSTEM_PROMPT,
      REACT_INSTRUCTIONS,
      buildRuntimeInstructions(userMessage, {
        allowWebSearch,
        webSearchRequested: Boolean(options.useWebSearch),
        hasSearchKey: Boolean(env.SEARCH_API_KEY)
      }),
      `USER ID: ${userId}`,
      `AVAILABLE TOOLS: ${tools.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n')}`
    ].filter(Boolean).join('\n\n')
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

  if (webSearchTool && shouldPrefetchWebSearch(userMessage)) {
    await runPrefetchStep({
      tool: webSearchTool,
      stepId: 'web-search-prefetch',
      thought: 'The user enabled web search and the request needs current or external information, so I should fetch live context first.',
      input: userMessage,
      messages,
      steps,
      callbacks
    });
  }

  while (iteration < maxIterations) {
    iteration++;

    const response = await llm.invoke(messages);
    const content = response.content as string;

    const toolCall = parseToolCall(content);

    if (!toolCall) {
      return {
        steps,
        finalResponse: await finalizeAgentResponse(content, llm, messages, userMessage)
      };
    }

    const tool = tools.find(t => t.name === toolCall.name);
    if (!tool) {
      messages.push(new AIMessage(`Error: Tool "${toolCall.name}" not found.`));
      continue;
    }

    const stepId = `${toolCall.name}-${iteration}`;
    const pendingStep: ReActStep = {
      id: stepId,
      thought: extractThought(content),
      action: toolCall.name,
      actionInput: toolCall.input,
      status: 'running'
    };

    if (callbacks.onStepStart) {
      await callbacks.onStepStart(pendingStep);
    }

    const observation = await tool.call(toolCall.input);

    const completedStep: ReActStep = {
      ...pendingStep,
      observation: observation.slice(0, 500),
      status: 'completed'
    };

    steps.push(completedStep);

    if (callbacks.onStepComplete) {
      await callbacks.onStepComplete(completedStep);
    }

    messages.push(new AIMessage(content));
    messages.push(new ToolMessage({
      content: observation,
      tool_call_id: toolCall.id || stepId
    }));
  }

  messages.push(new HumanMessage('You have used many tools. Now provide your final response in the required JSON format.'));
  const finalResponse = await llm.invoke(messages);

  return {
    steps,
    finalResponse: await finalizeAgentResponse(finalResponse.content as string, llm, messages, userMessage)
  };
}

async function finalizeAgentResponse(
  rawResponse: string,
  llm: ReturnType<typeof createChatModel>,
  messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage>,
  userMessage: string
): Promise<string> {
  let candidate = normalizeLLMResponse(rawResponse);
  let parsed = parseStructuredLLMResponse(candidate);

  if (needsTextOnlyRecovery(userMessage, parsed)) {
    const repaired = await llm.invoke([
      ...messages,
      new AIMessage(rawResponse),
      new HumanMessage(buildTextOnlyRecoveryPrompt(userMessage))
    ]);

    candidate = normalizeLLMResponse(repaired.content as string);
    parsed = parseStructuredLLMResponse(candidate);
  }

  if (!needsVisualRecovery(userMessage, parsed)) {
    if (!needsLongTextRecovery(parsed)) {
      return candidate;
    }
  } else {
    const preferredRenderType = prefersReact(userMessage) ? 'react' : 'html';
    const repaired = await llm.invoke([
      ...messages,
      new AIMessage(rawResponse),
      new HumanMessage(buildVisualRecoveryPrompt(userMessage, preferredRenderType))
    ]);

    candidate = normalizeLLMResponse(repaired.content as string);
    parsed = parseStructuredLLMResponse(candidate);
  }

  if (needsLongTextRecovery(parsed)) {
    const repaired = await llm.invoke([
      ...messages,
      new AIMessage(candidate),
      new HumanMessage(buildLongTextRecoveryPrompt(userMessage))
    ]);

    candidate = normalizeLLMResponse(repaired.content as string);
  }

  return candidate;
}

async function runPrefetchStep({
  tool,
  stepId,
  thought,
  input,
  messages,
  steps,
  callbacks
}: {
  tool: AgentTool;
  stepId: string;
  thought: string;
  input: string;
  messages: Array<SystemMessage | HumanMessage | AIMessage | ToolMessage>;
  steps: ReActStep[];
  callbacks: AgentCallbacks;
}) {
  const pendingStep: ReActStep = {
    id: stepId,
    thought,
    action: tool.name,
    actionInput: input,
    status: 'running'
  };

  if (callbacks.onStepStart) {
    await callbacks.onStepStart(pendingStep);
  }

  const observation = await tool.call(input);
  const completedStep: ReActStep = {
    ...pendingStep,
    observation: observation.slice(0, 500),
    status: 'completed'
  };

  steps.push(completedStep);

  if (callbacks.onStepComplete) {
    await callbacks.onStepComplete(completedStep);
  }

  messages.push(new AIMessage(`Thought: ${thought}\nAction: ${tool.name}\nAction Input: ${input}`));
  messages.push(new ToolMessage({
    content: observation,
    tool_call_id: stepId
  }));
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

function buildRuntimeInstructions(
  userMessage: string,
  options: {
    allowWebSearch: boolean;
    webSearchRequested: boolean;
    hasSearchKey: boolean;
  }
): string {
  const instructions: string[] = [];

  if (isVisualBuildRequest(userMessage)) {
    instructions.push(
      'USER INTENT: The user asked you to build or design a visual/UI. Do not merely describe it. Return a real renderable artifact with renderType "html" or "react" and complete code unless the request is impossible.'
    );
  }

  if (prefersReact(userMessage)) {
    instructions.push(
      'VISUAL CHOICE: This request involves interaction or UI behavior. Prefer renderType "react" with a complete App component, unless a static html visual is clearly better.'
    );
  }

  if (options.webSearchRequested && options.allowWebSearch) {
    instructions.push(
      'USER SETTING: Web search is enabled for this message. Use web_search for live, current, recent, market, weather, news, or otherwise external facts. Do not guess current information.'
    );
  } else if (options.webSearchRequested && !options.hasSearchKey) {
    instructions.push(
      'USER SETTING: Web search was requested but no search API key is configured. Do not invent live facts. Explain briefly that web search is unavailable if current information is required.'
    );
  } else {
    instructions.push(
      'USER SETTING: Web search is off for this message. Do not use live web data unless the user explicitly turns it on in the UI.'
    );
  }

  if (isLiveFactRequest(userMessage) && !isExplicitVisualRequest(userMessage)) {
    instructions.push(
      'RESPONSE SHAPE: This is primarily a live fact lookup, not a UI-building request. Prefer renderType "none" with a terse answer grounded in the web results. Only return html/react if the user explicitly asked for a visual format like a chart, table, dashboard, card, or form.'
    );
  }

  return instructions.join('\n');
}

function needsVisualRecovery(userMessage: string, parsed: ReturnType<typeof parseStructuredLLMResponse>): boolean {
  if (!isVisualBuildRequest(userMessage)) {
    return false;
  }

  if (!parsed) {
    return true;
  }

  if (parsed.renderType === 'none') {
    return true;
  }

  const code = parsed.code?.trim() || '';
  if (!code) {
    return true;
  }

  if (parsed.renderType === 'react') {
    return !/function\s+App\s*\(|const\s+App\s*=|=>\s*\{[\s\S]*return/i.test(code);
  }

  return !/(<html|<div|<svg|new\s+Chart\(|<section|<main)/i.test(code);
}

function needsTextOnlyRecovery(userMessage: string, parsed: ReturnType<typeof parseStructuredLLMResponse>): boolean {
  if (!isLiveFactRequest(userMessage) || isExplicitVisualRequest(userMessage)) {
    return false;
  }

  if (!parsed) {
    return false;
  }

  return parsed.renderType !== 'none';
}

function needsLongTextRecovery(parsed: ReturnType<typeof parseStructuredLLMResponse>): boolean {
  if (!parsed) {
    return false;
  }

  return parsed.text.trim().length < MIN_RESPONSE_TEXT_LENGTH;
}

function buildVisualRecoveryPrompt(userMessage: string, preferredRenderType: 'html' | 'react'): string {
  return [
    'Your previous answer did not provide a usable visual, but the user explicitly asked for one.',
    `User request: ${userMessage}`,
    `You must now return a complete visual response with renderType "${preferredRenderType}" unless the other visual type is clearly a better fit.`,
    'If the request involves forms, buttons, click actions, animations, tabs, filters, popups, modals, or other interaction, use renderType "react".',
    'If the request is static like a chart, dashboard, table, KPI layout, or SVG illustration, use renderType "html".',
    'Return ONLY the required outer JSON object. Keep text to one short sentence or two short bullets. Provide complete working code.'
  ].join('\n');
}

function buildTextOnlyRecoveryPrompt(userMessage: string): string {
  return [
    'Your previous answer over-produced a decorative visual for a live factual lookup.',
    `User request: ${userMessage}`,
    'Return ONLY the required outer JSON object.',
    'Set renderType to "none".',
    'Give a terse factual answer grounded in the tool results and keep text to one short paragraph or at most 2 bullets.',
    'Do not include html or react code unless the user explicitly asked for a chart, card, table, dashboard, or other visual.'
  ].join('\n');
}

function buildLongTextRecoveryPrompt(userMessage: string): string {
  return [
    'Your previous answer was too short.',
    `User request: ${userMessage}`,
    `Keep the existing structured response shape and preserve renderType, code, componentName, props, saveAsComponent, saveAsArtifact, and sources unless a correction is absolutely necessary.`,
    `Rewrite the text field so it is polished, relevant, and at least ${MIN_RESPONSE_TEXT_LENGTH} characters long.`,
    'Return ONLY the required outer JSON object.'
  ].join('\n');
}

function shouldPrefetchWebSearch(message: string): boolean {
  const normalized = message.toLowerCase();

  return (
    normalized.includes('web search') ||
    normalized.includes('websearch') ||
    /\b(current|latest|today|now|recent|live|market|stock|stocks|share price|price|pricing|weather|forecast|news|headline|trend|trending|sports|score|election)\b/.test(normalized)
  );
}

function isLiveFactRequest(message: string): boolean {
  return /\b(current|latest|today|now|recent|live|exchange rate|forex|currency|usd|inr|dollar|rupee|stock|stocks|share price|price|pricing|weather|forecast|news|headline|trending|market|score|sports)\b/i.test(message);
}

function isExplicitVisualRequest(message: string): boolean {
  return /\b(chart|graph|plot|dashboard|table|card|visual|diagram|timeline|form|modal|popup|ui|interface|component|layout|screen|widget)\b/i.test(message);
}

function isVisualBuildRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const buildIntent = /\b(create|build|design|generate|make|show|craft|draw|render|visualize|prototype|give me)\b/.test(normalized);
  const visualTarget = /\b(form|input|dashboard|chart|graph|table|card|popup|modal|hero|banner|landing page|page|ui|interface|component|widget|screen|layout|diagram|flow|timeline|illustration|visual)\b/.test(normalized);

  return visualTarget && (buildIntent || /\bwith\b/.test(normalized));
}

function prefersReact(message: string): boolean {
  return /\b(form|input|button|click|toggle|tab|filter|select|dropdown|date picker|datepicker|modal|popup|wizard|stepper|interactive|animation|animated|celebrate|birthday|state)\b/i.test(message);
}
