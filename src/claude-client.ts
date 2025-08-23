import { query } from '@anthropic-ai/claude-code';
import { IProgressReporter } from './utils/progress-reporter-interface.js';

export interface ClaudeOptions {
  timeout?: number;
  progressReporter?: IProgressReporter;
  cwd?: string;
}

export class ClaudeClient {
  async execute(prompt: string, options: ClaudeOptions = {}): Promise<string> {
    const timeout = options.timeout || 180000; // 2 minutes default
    const progressReporter = options.progressReporter;
    const startTime = Date.now();
    
    if (progressReporter) {
      progressReporter.stepStarted('Executing prompt with Claude Code');
      progressReporter.debug(`Prompt length: ${prompt.length} characters`);
      progressReporter.logPrompt(prompt);
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), timeout);
    });

    prompt = `Please respond to the following prompt with text only. Do not use any tools, create/modify/delete files, or execute commands. Just provide a direct text response.

User prompt: ${prompt}

Remember: Text response only, no file operations or tool usage.`
    
    const queryPromise = (async () => {
      const messages = [];
      let responseText = '';
      
      for await (const message of query({ prompt, options: { permissionMode: 'default', cwd: options.cwd, model: 'sonnet' } })) {
        messages.push(message);
        
        // Show partial responses in verbose mode
        if (message.type === 'result' && progressReporter) {
          const newContent = (message as any).result || '';
          if (newContent && newContent.length > 0) {
            responseText += newContent;
            progressReporter.partialResponse(responseText, 200);
          }
        }
      }
      return messages;
    })();
    
    try {
      const messages = await Promise.race([queryPromise, timeoutPromise]);
      
      // Filter and concatenate result messages
      const resultMessages = messages.filter((msg: any) => msg.type === 'result');
      const finalResponse = resultMessages.map((msg: any) => msg.result).join('');
      
      if (progressReporter) {
        const duration = Date.now() - startTime;
        progressReporter.stepCompleted('Received response from Claude', duration);
        progressReporter.debug(`Response length: ${finalResponse.length} characters`);
        progressReporter.logResponse(finalResponse);
      }
      
      return finalResponse;
    } catch (error) {
      if (progressReporter) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        progressReporter.stepFailed('Claude API call', errorMessage);
      }
      throw error;
    }
  }
}