import { query } from '@anthropic-ai/claude-code';
import { ProgressReporter } from './utils/progress-reporter.js';

export interface ClaudeOptions {
  timeout?: number;
  progressReporter?: ProgressReporter;
}

export class ClaudeClient {
  async execute(prompt: string, options: ClaudeOptions = {}): Promise<string> {
    const timeout = options.timeout || 120000; // 2 minutes default
    const progressReporter = options.progressReporter;
    const startTime = Date.now();
    
    if (progressReporter) {
      progressReporter.stepStarted('Executing prompt with Claude Code');
      progressReporter.debug(`Prompt length: ${prompt.length} characters`);
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), timeout);
    });

    prompt = `${prompt} - give the most detailed plan possible`
    
    const queryPromise = (async () => {
      const messages = [];
      let responseText = '';
      
      for await (const message of query({ prompt, options: { permissionMode: 'plan' } })) {
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