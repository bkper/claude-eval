// Minimal error handling - keep it simple
export class ClaudeEvalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaudeEvalError';
  }
}

export class EvaluationError extends ClaudeEvalError {
  constructor(
    message: string,
    public readonly filePath?: string
  ) {
    super(message);
    this.name = 'EvaluationError';
  }
}

// Simple error formatting - no complex logic
export function formatErrorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// No suggestions - keep it clean
export function getErrorSuggestions(_error: unknown): string[] {
  return [];
}