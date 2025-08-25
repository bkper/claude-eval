import { query } from '@anthropic-ai/claude-code';
import { BaseProgressReporter } from './utils/base-progress-reporter.js';

export interface ClaudeQueryOptions {
  permissionMode?: string;
  cwd?: string;
  model?: string;
  progressReporter?: BaseProgressReporter;
  [key: string]: any;
}

export class ClaudeApiConnector {
  queryRaw(prompt: string, queryOptions: ClaudeQueryOptions = {}) {
    const { progressReporter, ...otherOptions } = queryOptions;
    
    if (progressReporter) {
      progressReporter.debug('Starting Claude Code query...');
    }
    
    const finalOptions: any = {
      permissionMode: 'default',
      model: 'sonnet',
      ...otherOptions
    };
    
    if (progressReporter) {
      progressReporter.debug('Query options: ' + JSON.stringify(finalOptions, null, 2));
    }
    
    return query({ prompt, options: finalOptions });
  }
}