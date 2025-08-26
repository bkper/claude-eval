import { query, Options } from '@anthropic-ai/claude-code';
import { BaseProgressReporter } from './utils/base-progress-reporter.js';

export interface ClaudeOptions {
  timeout?: number;
  progressReporter?: BaseProgressReporter;
  cwd?: string;
}


export class ClaudeClient {
  constructor() {
    // Direct SDK usage - no wrapper needed
  }

  async execute(prompt: string, options: ClaudeOptions = {}): Promise<string> {
    const timeout = options.timeout || 180000; // 2 minutes default
    const progressReporter = options.progressReporter;
    const startTime = Date.now();
    
    if (progressReporter) {
      progressReporter.stepStarted('Executing prompt with Claude Code');
    }
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout);
    });

    if (!prompt.startsWith("/")) {
      prompt = `FRESH EVALUATION SESSION: Ignore any previous context or conversation history. This is a completely independent evaluation.
      ${prompt} 
      - IMPORTANT: Output the plan text here.
      - If you don't know how to build a plan, just interpret the prompt and output the reponse text here.
      `
    }
    
    const queryPromise = (async () => {
      const messages = [];
      let responseText = '';
      
      try {
        const queryOptions: Options = { 
          cwd: options.cwd, 
          model: 'sonnet',
          permissionMode: 'plan'
        };
        
        if (progressReporter) {
          progressReporter.debug(`Starting Claude Code query with working directory: ${options.cwd || process.cwd()}`);
          progressReporter.debug(`Query options: ${JSON.stringify({ cwd: queryOptions.cwd, model: queryOptions.model }, null, 2)}`);
          progressReporter.logPrompt(prompt);
        }
        
        for await (const message of query({ prompt, options: queryOptions })) {
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
      } catch (error: any) {
        // Log to debug for troubleshooting
        if (progressReporter) {
          progressReporter.debug(`Query failed: ${error.message || error}`);
        }
        
        // Simple error output to console
        if (error.code === 'ENOENT') {
          console.error('Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code');
        } else if (error.message?.includes('process exited')) {
          console.error('Claude Code process failed:', error.message);
        } else {
          console.error('Error:', error.message || error);
        }
        
        throw error;
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