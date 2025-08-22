import { ProgressLevel } from './progress-reporter.js';
import { IProgressReporter } from './progress-reporter-interface.js';
import { OutputBuffer, TerminalFormatter } from './terminal-utils.js';

export interface RegionalProgressReporter extends IProgressReporter {
  // Additional methods specific to regional reporters if needed
}

export class BufferedRegionalReporter implements RegionalProgressReporter {
  private level: ProgressLevel;
  private buffer: OutputBuffer;
  private regionId: string;
  private filename: string = '';
  private startTime: number = 0;
  private evaluationIndex: number;
  private totalEvaluations: number;

  constructor(
    regionId: string,
    level: ProgressLevel,
    evaluationIndex: number,
    totalEvaluations: number
  ) {
    this.level = level;
    this.buffer = new OutputBuffer();
    this.regionId = regionId;
    this.evaluationIndex = evaluationIndex;
    this.totalEvaluations = totalEvaluations;
  }

  getRegionId(): string {
    return this.regionId;
  }

  getBuffer(): OutputBuffer {
    return this.buffer;
  }

  getFilename(): string {
    return this.filename;
  }

  startEvaluation(filename: string): void {
    if (this.level === 'quiet') return;
    
    this.filename = filename;
    this.startTime = Date.now();
    
    if (this.totalEvaluations > 1) {
      this.buffer.add(TerminalFormatter.formatHeader(
        `Running evaluation ${this.evaluationIndex} of ${this.totalEvaluations}: ${filename}`, 
        'section'
      ));
    } else {
      this.buffer.add(TerminalFormatter.formatHeader(`Evaluating: ${filename}`, 'section'));
    }
  }

  stepCompleted(step: string, duration?: number): void {
    if (this.level === 'quiet') return;
    
    this.buffer.add(TerminalFormatter.formatStep(step, 'success', duration));
  }

  stepStarted(step: string): void {
    if (this.level === 'quiet') return;
    
    this.buffer.add(TerminalFormatter.formatStep(step, 'progress'));
  }

  stepFailed(step: string, error?: string): void {
    if (this.level === 'quiet') return;
    
    const errorText = error ? `: ${error}` : '';
    this.buffer.add(TerminalFormatter.formatStep(`${step} failed${errorText}`, 'error'));
  }

  partialResponse(response: string, maxLength: number = 100): void {
    if (this.level !== 'verbose') return;
    
    this.buffer.add(TerminalFormatter.formatPartialResponse(response, maxLength));
  }

  evaluationCompleted(filename: string, success: boolean, totalDuration?: number): void {
    if (this.level === 'quiet') return;
    
    const duration = totalDuration || (Date.now() - this.startTime);
    const status = success ? 'PASSED' : 'FAILED';
    
    this.buffer.add(TerminalFormatter.formatStep(status, success ? 'success' : 'error', duration));
    this.buffer.addEmpty();
  }

  error(message: string): void {
    if (this.level === 'quiet') return;
    
    this.buffer.add(TerminalFormatter.formatError(`Error: ${message}`));
  }

  info(message: string): void {
    if (this.level === 'quiet') return;
    
    this.buffer.add(`ℹ️  ${message}`);
  }

  debug(message: string): void {
    if (this.level === 'verbose') {
      this.buffer.add(TerminalFormatter.formatDebug(message));
    }
  }
}