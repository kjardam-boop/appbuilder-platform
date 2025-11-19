/**
 * AI Client
 * Call AI provider with proper error handling
 */

import type { AIProviderConfig } from '../aiTypes.ts';

export async function callAI(
  config: AIProviderConfig,
  messages: any[],
  tools: any[],
  toolChoice: any = 'auto'
): Promise<any> {
  const requestBody: any = {
    model: config.model,
    messages,
    tools,
    tool_choice: toolChoice
  };

  // Handle temperature (not supported by GPT-5+)
  const isGPT5Plus = config.model.includes('gpt-5') ||
                     config.model.includes('o3') ||
                     config.model.includes('o4');

  if (!isGPT5Plus && config.temperature !== undefined) {
    requestBody.temperature = config.temperature;
  }

  // Handle token limits
  if (isGPT5Plus && config.maxCompletionTokens) {
    requestBody.max_completion_tokens = config.maxCompletionTokens;
  } else if (!isGPT5Plus && config.maxTokens) {
    requestBody.max_tokens = config.maxTokens;
  }

  // Log request size
  const requestSize = JSON.stringify(requestBody).length;
  console.log('[AI Request]', {
    model: config.model,
    provider: config.provider,
    messageCount: messages.length,
    toolCount: tools.length,
    requestSize: `${requestSize} bytes`,
    timestamp: new Date().toISOString()
  });

  if (requestSize > 100000) {
    console.warn('⚠️ [Large Request]', `${requestSize} bytes - may cause timeout`);
  }

  try {
    const response = await fetch(config.baseUrl || 'https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Error Response]', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    console.log('[AI Response]', {
      tokensUsed: data.usage?.total_tokens || 0,
      finishReason: data.choices?.[0]?.finish_reason,
      hasToolCalls: !!data.choices?.[0]?.message?.tool_calls,
      toolCallCount: data.choices?.[0]?.message?.tool_calls?.length || 0
    });

    return data;

  } catch (error) {
    console.error('[AI Call Error]', {
      message: error instanceof Error ? error.message : 'Unknown error',
      requestSize,
      provider: config.provider,
      model: config.model
    });
    throw error;
  }
}
