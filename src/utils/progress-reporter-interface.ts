import type { EvaluationResult } from './result-formatter.js';

// Common interface for progress reporting
export interface IProgressReporter {
  startEvaluation(filename: string): void;
  stepCompleted(step: string, duration?: number): void;
  stepStarted(step: string): void;
  stepFailed(step: string, error?: string): void;
  partialResponse(response: string, maxLength?: number): void;
  evaluationStepCompleted(step: string, result: EvaluationResult, duration?: number): void;
  evaluationCompleted(filename: string, result: EvaluationResult, totalDuration?: number): void;
  error(message: string): void;
  info(message: string): void;
  debug(message: string): void;
  logPrompt(prompt: string): void;
  logResponse(response: string): void;
  logJudgePrompt(prompt: string): void;
  logJudgeResponse(response: string): void;
  showSuggestions?(suggestions: string[]): void;
}