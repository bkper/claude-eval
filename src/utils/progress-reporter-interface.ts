// Common interface for progress reporting
export interface IProgressReporter {
  startEvaluation(filename: string): void;
  stepCompleted(step: string, duration?: number): void;
  stepStarted(step: string): void;
  stepFailed(step: string, error?: string): void;
  partialResponse(response: string, maxLength?: number): void;
  evaluationCompleted(filename: string, success: boolean, totalDuration?: number): void;
  error(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}