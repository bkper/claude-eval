import { BaseProgressReporter } from './utils/base-progress-reporter.js';
import { ClaudeProcessError, ClaudeTimeoutError, ClaudeAPIError } from './utils/errors.js';
import { ClaudeApiConnector } from './claude-api-connector.js';

export interface ClaudeOptions {
  timeout?: number;
  progressReporter?: BaseProgressReporter;
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
        // Pass progress reporter to the API connector for enhanced logging
        const queryOptions = { 
          cwd: options.cwd, 
          model: 'sonnet',
          progressReporter 
        };
        
        if (progressReporter) {
          progressReporter.debug(`Starting Claude Code query with working directory: ${options.cwd || process.cwd()}`);
          progressReporter.debug(`Query options: ${JSON.stringify({ cwd: queryOptions.cwd, model: queryOptions.model }, null, 2)}`);
        }
        
        for await (const message of this.apiConnector.queryRaw(prompt, queryOptions)) {
          messages.push(message);
          
          // Capture error messages (check for any error-like properties)
          if ((message as any).error || (message as any).exitCode) {
            errorDetails = message;
            if (progressReporter) {
              progressReporter.debug(`Claude Code error detected: ${JSON.stringify(message, null, 2)}`);
              progressReporter.debug(`Error context - Working directory: ${options.cwd || process.cwd()}`);
              progressReporter.debug(`Error context - Process ID: ${process.pid}`);
              progressReporter.debug(`Error context - Node version: ${process.version}`);
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
        // Enhanced error logging with full context
        if (progressReporter) {
          progressReporter.debug(`Query stream error caught: ${queryError.message || queryError}`);
          progressReporter.debug(`Error type: ${queryError.constructor?.name || typeof queryError}`);
          progressReporter.debug(`Error code: ${queryError.code}`);
          progressReporter.debug(`Error stack: ${queryError.stack}`);
          progressReporter.debug(`Error context - Working directory: ${options.cwd || process.cwd()}`);
          progressReporter.debug(`Error context - Process ID: ${process.pid}`);
          progressReporter.debug(`Error context - Environment PATH: ${process.env.PATH}`);
          
          if (queryError.stderr) {
            progressReporter.debug(`Process stderr: ${queryError.stderr}`);
          }
          if (queryError.stdout) {
            progressReporter.debug(`Process stdout: ${queryError.stdout}`);
          }
        }
        
        // Handle errors from the query stream itself
        if (queryError.message?.includes('process exited with code')) {
          const exitCodeMatch = queryError.message.match(/code (\d+)/);
          const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : undefined;
          
          const contextDetails = [
            `Working directory: ${options.cwd || process.cwd()}`,
            `Process ID: ${process.pid}`,
            `Node version: ${process.version}`,
            `Original error: ${queryError.message}`
          ].join('\n');
          
          throw new ClaudeProcessError(
            'Claude Code process failed',
            exitCode,
            queryError.stderr || '',
            queryError.stdout || '',
            contextDetails
          );
        } else if (queryError.code === 'ENOENT') {
          const contextDetails = [
            'Make sure @anthropic-ai/claude-code is installed globally or locally',
            `Working directory: ${options.cwd || process.cwd()}`,
            `PATH environment: ${process.env.PATH}`,
            `Node version: ${process.version}`
          ].join('\n');
          
          throw new ClaudeProcessError(
            'Claude Code CLI not found',
            undefined,
            'Command not found: claude',
            '',
            contextDetails
          );
        } else if (queryError.response?.status) {
          const contextDetails = [
            `Working directory: ${options.cwd || process.cwd()}`,
            `Response status: ${queryError.response.status}`,
            `Response data: ${JSON.stringify(queryError.response.data, null, 2)}`
          ].join('\n');
          
          throw new ClaudeAPIError(
            `Claude API error: ${queryError.message}`,
            queryError.response.status,
            queryError.response.data,
            contextDetails
          );
        } else {
          // Re-throw with enhanced context for verbose debugging
          if (progressReporter) {
            progressReporter.debug(`Rethrowing unhandled error: ${queryError}`);
          }
          throw queryError;
        }
      }
      
      // Check if we got an error in the messages
      if (errorDetails) {
        const contextDetails = [
          `Working directory: ${options.cwd || process.cwd()}`,
          `Process ID: ${process.pid}`,
          `Node version: ${process.version}`,
          `Error details: ${JSON.stringify(errorDetails, null, 2)}`
        ].join('\n');
        
        if (progressReporter) {
          progressReporter.debug(`Throwing error from message stream: ${JSON.stringify(errorDetails, null, 2)}`);
        }
        
        throw new ClaudeProcessError(
          errorDetails.error || 'Claude Code execution failed',
          errorDetails.exitCode,
          errorDetails.stderr || '',
          errorDetails.stdout || '',
          contextDetails
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
        
        // Enhanced error context logging
        progressReporter.debug(`Final error handler - Error type: ${error instanceof Error ? error.constructor.name : typeof error}`);
        if (error instanceof Error && error.stack) {
          progressReporter.debug(`Final error handler - Stack trace: ${error.stack}`);
        }
        progressReporter.debug(`Final error handler - Working directory: ${options.cwd || process.cwd()}`);
        progressReporter.debug(`Final error handler - Process environment: ${JSON.stringify({ 
          NODE_VERSION: process.version,
          PROCESS_PID: process.pid,
          CWD: process.cwd(),
          NODE_PATH: process.env.NODE_PATH,
          PATH: process.env.PATH?.split(':').slice(0, 5).join(':') + '...' // First 5 PATH entries
        }, null, 2)}`);
      }
      throw error;
    }
  }
}