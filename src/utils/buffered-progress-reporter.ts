import chalk from 'chalk';
import { BaseProgressReporter, ProgressLevel } from './base-progress-reporter.js';
import { OutputBuffer, TerminalFormatter } from './terminal-utils.js';
import type { EvaluationResult } from './result-formatter.js';

export class BufferedProgressReporter extends BaseProgressReporter {
  private buffer: OutputBuffer;
  private bufferId: string;
  private filename: string = '';
  private startTime: number = 0;
  private evaluationIndex: number;
  private totalEvaluations: number;

  constructor(
    bufferId: string,
    level: ProgressLevel,
    evaluationIndex: number,
    totalEvaluations: number
  ) {
    super(level);
    this.buffer = new OutputBuffer();
    this.bufferId = bufferId;
    this.evaluationIndex = evaluationIndex;
    this.totalEvaluations = totalEvaluations;
  }

  protected output(message: string): void {
    this.buffer.add(message);
  }

  // Buffer-specific getters
  getBufferId(): string {
    return this.bufferId;
  }

  getBuffer(): OutputBuffer {
    return this.buffer;
  }

  getFilename(): string {
    return this.filename;
  }

  // Override startEvaluation to store filename and add batch context
  startEvaluation(filename: string): void {
    if (this.level === 'quiet') return;
    
    this.filename = filename;
    this.startTime = Date.now();
    
    if (this.totalEvaluations > 1) {
      this.output(TerminalFormatter.formatHeader(
        `Running evaluation ${this.evaluationIndex} of ${this.totalEvaluations}: ${filename}`, 
        'section'
      ));
    } else {
      this.output(TerminalFormatter.formatHeader(`Evaluating: ${filename}`, 'section'));
    }
  }

  // Override stepCompleted to use TerminalFormatter
  stepCompleted(step: string, duration?: number): void {
    if (this.level === 'quiet') return;
    this.output(TerminalFormatter.formatStep(step, 'success', duration));
  }

  // Override evaluationStepCompleted to use TerminalFormatter
  evaluationStepCompleted(step: string, result: EvaluationResult, duration?: number): void {
    if (this.level === 'quiet') return;
    
    this.output(TerminalFormatter.formatStep(step, 'success', duration));
    
    // Add detailed per-criteria results
    for (const criterion of result.criteria) {
      const icon = criterion.passed ? chalk.green('✓') : chalk.red('✗');
      const reasonText = criterion.reason ? `: ${criterion.reason}` : '';
      this.output(`    ${icon} ${criterion.criterion}${reasonText}`);
    }
  }

  // Override stepStarted to use TerminalFormatter
  stepStarted(step: string): void {
    if (this.level === 'quiet') return;
    this.output(TerminalFormatter.formatStep(step, 'progress'));
  }

  // Override stepFailed to use TerminalFormatter
  stepFailed(step: string, error?: string): void {
    if (this.level === 'quiet') return;
    const errorText = error ? `: ${error}` : '';
    this.output(TerminalFormatter.formatStep(`${step} failed${errorText}`, 'error'));
  }

  // Override partialResponse to use TerminalFormatter
  partialResponse(response: string, maxLength: number = 100): void {
    if (this.level !== 'verbose') return;
    this.output(TerminalFormatter.formatPartialResponse(response, maxLength));
  }

  // Override evaluationCompleted to use stored start time and add empty line
  evaluationCompleted(_filename: string, result: EvaluationResult, totalDuration?: number): void {
    if (this.level === 'quiet') return;
    
    const duration = totalDuration || (Date.now() - this.startTime);
    const status = result.overall ? 'PASSED' : 'FAILED';
    
    this.output(TerminalFormatter.formatStep(status, result.overall ? 'success' : 'error', duration));
    this.buffer.addEmpty();
  }
}