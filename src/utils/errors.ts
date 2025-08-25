export class ClaudeEvalError extends Error {
  constructor(message: string, public readonly details?: string) {
    super(message);
    this.name = 'ClaudeEvalError';
  }
}

export class ClaudeAPIError extends ClaudeEvalError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly apiError?: any,
    details?: string
  ) {
    super(message, details);
    this.name = 'ClaudeAPIError';
  }
}

export class ClaudeProcessError extends ClaudeEvalError {
  constructor(
    message: string,
    public readonly exitCode?: number,
    public readonly stderr?: string,
    public readonly stdout?: string,
    details?: string
  ) {
    super(message, details);
    this.name = 'ClaudeProcessError';
  }
}

export class ClaudeTimeoutError extends ClaudeEvalError {
  constructor(public readonly timeout: number, details?: string) {
    super(`Claude Code process timed out after ${timeout}ms`, details);
    this.name = 'ClaudeTimeoutError';
  }
}

export class EvaluationError extends ClaudeEvalError {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly prompt?: string,
    details?: string
  ) {
    super(message, details);
    this.name = 'EvaluationError';
  }
}

export function formatErrorDetails(error: unknown): string {
  if (error instanceof ClaudeProcessError) {
    const parts: string[] = [error.message];
    
    if (error.exitCode !== undefined) {
      parts.push(`Exit code: ${error.exitCode}`);
    }
    
    if (error.stderr && error.stderr.trim()) {
      parts.push(`Error output: ${error.stderr.trim()}`);
    }
    
    if (error.stdout && error.stdout.trim()) {
      parts.push(`Output: ${error.stdout.trim()}`);
    }
    
    if (error.details) {
      parts.push(`Details: ${error.details}`);
    }
    
    return parts.join('\n');
  }
  
  if (error instanceof ClaudeAPIError) {
    const parts: string[] = [error.message];
    
    if (error.statusCode) {
      parts.push(`Status code: ${error.statusCode}`);
    }
    
    if (error.apiError) {
      parts.push(`API error: ${JSON.stringify(error.apiError, null, 2)}`);
    }
    
    if (error.details) {
      parts.push(`Details: ${error.details}`);
    }
    
    return parts.join('\n');
  }
  
  if (error instanceof ClaudeTimeoutError) {
    return `${error.message}${error.details ? `\nDetails: ${error.details}` : ''}`;
  }
  
  if (error instanceof EvaluationError) {
    const parts: string[] = [];
    
    // Don't repeat the message if it's just a generic file error
    if (!error.message.includes('ENOENT') && !error.message.includes('no such file')) {
      parts.push(error.message);
    } else {
      // For file errors, provide a cleaner message
      if (error.filePath) {
        parts.push(`File not found: ${error.filePath}`);
      } else {
        parts.push(error.message);
      }
    }
    
    if (error.prompt && !error.message.includes('ENOENT')) {
      const truncatedPrompt = error.prompt.length > 200 
        ? error.prompt.substring(0, 200) + '...'
        : error.prompt;
      parts.push(`Prompt: ${truncatedPrompt}`);
    }
    
    // Avoid duplicate details if already in the message
    if (error.details && !parts.some(p => p.includes(error.details!))) {
      // Skip redundant ENOENT details
      if (!error.details.includes('ENOENT') || !error.message.includes('ENOENT')) {
        parts.push(`Details: ${error.details}`);
      }
    }
    
    return parts.join('\n');
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}

export function getErrorSuggestions(error: unknown): string[] {
  const suggestions: string[] = [];
  
  if (error instanceof ClaudeProcessError) {
    if (error.exitCode === 1) {
      suggestions.push('Check if Claude Code CLI is properly installed');
      suggestions.push('Ensure you have the correct permissions');
      suggestions.push('Try running with --verbose flag for more details');
    }
    
    if (error.stderr?.includes('ENOENT')) {
      suggestions.push('Claude Code CLI might not be installed or not in PATH');
      suggestions.push('Run: npm install -g @anthropic-ai/claude-code');
    }
    
    if (error.stderr?.includes('permission denied')) {
      suggestions.push('Check file/directory permissions');
      suggestions.push('You may need to run with appropriate permissions');
    }
  }
  
  if (error instanceof ClaudeAPIError) {
    if (error.statusCode === 401) {
      suggestions.push('Check your API credentials');
      suggestions.push('Ensure your API key is valid and properly configured');
    }
    
    if (error.statusCode === 429) {
      suggestions.push('You have hit the rate limit');
      suggestions.push('Wait a moment before retrying');
      suggestions.push('Consider reducing concurrency with --concurrency flag');
    }
    
    if (error.statusCode === 500 || error.statusCode === 503) {
      suggestions.push('The Claude API service might be experiencing issues');
      suggestions.push('Try again in a few moments');
    }
  }
  
  if (error instanceof ClaudeTimeoutError) {
    suggestions.push('The operation took longer than expected');
    suggestions.push('Try increasing the timeout');
    suggestions.push('Check your network connection');
    suggestions.push('The prompt might be too complex - consider simplifying it');
  }
  
  return suggestions;
}