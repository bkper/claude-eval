import { query } from '@anthropic-ai/claude-code';

export interface ClaudeOptions {
  timeout?: number;
}

export class ClaudeClient {
  async execute(prompt: string, options: ClaudeOptions = {}): Promise<string> {
    const timeout = options.timeout || 120000; // 2 minutes default
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), timeout);
    });

    prompt = `${prompt} - give the most detailed plan possible`
    
    const queryPromise = (async () => {
      const messages = [];
      for await (const message of query({ prompt, options: { permissionMode: 'plan' } })) {
        messages.push(message);
      }
      return messages;
    })();
    
    try {
      const messages = await Promise.race([queryPromise, timeoutPromise]);
      
      // Filter and concatenate result messages
      const resultMessages = messages.filter((msg: any) => msg.type === 'result');
      return resultMessages.map((msg: any) => msg.result).join('');
    } catch (error) {
      throw error;
    }
  }
}