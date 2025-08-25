import { IProgressReporter } from './utils/progress-reporter-interface.js';
import { ClaudeProcessError, ClaudeTimeoutError, ClaudeAPIError } from './utils/errors.js';
import { ClaudeApiConnector } from './claude-api-connector.js';

export interface ClaudeOptions {
  timeout?: number;
  progressReporter?: IProgressReporter;
  cwd?: string;
}


export class ClaudeClient {
  private apiConnector: ClaudeApiConnector;
  
  constructor() {
    this.apiConnector = new ClaudeApiConnector();
  }

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
      setTimeout(() => reject(new ClaudeTimeoutError(timeout, `Working directory: ${options.cwd || process.cwd()}`)), timeout);
    });

    prompt = `Respond to the following prompt with text only. Do NOT use any tools, create/modify/delete files, or execute commands. Just provide a direct text response.

User prompt: ${prompt}

REMEMBER: Text response only, no file operations or tool usage.`
    
    const queryPromise = (async () => {
      const messages = [];
      let responseText = '';
      let errorDetails: any = null;
      
      try {
        for await (const message of this.apiConnector.queryRaw(prompt, { cwd: options.cwd, model: 'sonnet' })) {
          messages.push(message);
          
          // Capture error messages (check for any error-like properties)
          if ((message as any).error || (message as any).exitCode) {
            errorDetails = message;
            if (progressReporter) {
              progressReporter.debug(`Claude Code error: ${JSON.stringify(message)}`);
            }
          }
          
          // Show partial responses in verbose mode
          if (message.type === 'result' && progressReporter) {
            const newContent = (message as any).result || '';
            if (newContent && newContent.length > 0) {
              responseText += newContent;
              progressReporter.partialResponse(responseText, 200);
            }
          }
        }
      } catch (queryError: any) {
        // Handle errors from the query stream itself
        if (queryError.message?.includes('process exited with code')) {
          const exitCodeMatch = queryError.message.match(/code (\d+)/);
          const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : undefined;
          
          throw new ClaudeProcessError(
            'Claude Code process failed',
            exitCode,
            queryError.stderr || '',
            queryError.stdout || '',
            `Working directory: ${options.cwd || process.cwd()}\nOriginal error: ${queryError.message}`
          );
        } else if (queryError.code === 'ENOENT') {
          throw new ClaudeProcessError(
            'Claude Code CLI not found',
            undefined,
            'Command not found: claude',
            '',
            'Make sure @anthropic-ai/claude-code is installed globally or locally'
          );
        } else if (queryError.response?.status) {
          throw new ClaudeAPIError(
            `Claude API error: ${queryError.message}`,
            queryError.response.status,
            queryError.response.data,
            `Working directory: ${options.cwd || process.cwd()}`
          );
        } else {
          throw queryError;
        }
      }
      
      // Check if we got an error in the messages
      if (errorDetails) {
        throw new ClaudeProcessError(
          errorDetails.error || 'Claude Code execution failed',
          errorDetails.exitCode,
          errorDetails.stderr || '',
          errorDetails.stdout || '',
          `Working directory: ${options.cwd || process.cwd()}`
        );
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