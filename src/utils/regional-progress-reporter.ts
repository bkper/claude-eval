import chalk from 'chalk';
import { ProgressLevel } from './progress-reporter.js';
import { IProgressReporter } from './progress-reporter-interface.js';
import { OutputBuffer, TerminalFormatter } from './terminal-utils.js';
import type { EvaluationResult } from './result-formatter.js';

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

  evaluationStepCompleted(step: string, result: EvaluationResult, duration?: number): void {
    if (this.level === 'quiet') return;
    
    this.buffer.add(TerminalFormatter.formatStep(step, 'success', duration));
    
    // Add detailed per-criteria results
    for (const criterion of result.criteria) {
      const icon = criterion.passed ? chalk.green('✓') : chalk.red('✗');
      const reasonText = criterion.reason ? `: ${criterion.reason}` : '';
      this.buffer.add(`    ${icon} ${criterion.criterion}${reasonText}`);
    }
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

  evaluationCompleted(filename: string, result: EvaluationResult, totalDuration?: number): void {
    if (this.level === 'quiet') return;
    
    const duration = totalDuration || (Date.now() - this.startTime);
    const status = result.overall ? 'PASSED' : 'FAILED';
    
    this.buffer.add(TerminalFormatter.formatStep(status, result.overall ? 'success' : 'error', duration));
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

  logPrompt(prompt: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(prompt, 500);
    this.buffer.add(`📝 Prompt sent to Claude:`);
    this.buffer.add(TerminalFormatter.formatContent(truncated));
    if (prompt.length > 500) {
      this.buffer.add(TerminalFormatter.formatContent(`    ... (${prompt.length} total characters)`));
    }
  }

  logResponse(response: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(response, 500);
    this.buffer.add(`📄 Response received:`);
    this.buffer.add(TerminalFormatter.formatContent(truncated));
    if (response.length > 500) {
      this.buffer.add(TerminalFormatter.formatContent(`    ... (${response.length} total characters)`));
    }
  }

  logJudgePrompt(prompt: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(prompt, 500);
    this.buffer.add(`⚖️  Judge evaluation prompt:`);
    this.buffer.add(TerminalFormatter.formatContent(truncated));
    if (prompt.length > 500) {
      this.buffer.add(TerminalFormatter.formatContent(`    ... (${prompt.length} total characters)`));
    }
  }

  logJudgeResponse(response: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(response, 500);
    this.buffer.add(`🔍 Judge response:`);
    this.buffer.add(TerminalFormatter.formatContent(truncated));
    if (response.length > 500) {
      this.buffer.add(TerminalFormatter.formatContent(`    ... (${response.length} total characters)`));
    }
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Try to truncate at a natural break point (newline, sentence end, word boundary)
    const truncated = content.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n');
    const lastSentence = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
    const lastSpace = truncated.lastIndexOf(' ');
    
    // Use the best break point, preferring newline > sentence > word boundary
    let breakPoint = maxLength;
    if (lastNewline > maxLength * 0.7) {
      breakPoint = lastNewline;
    } else if (lastSentence > maxLength * 0.7) {
      breakPoint = lastSentence + 1;
    } else if (lastSpace > maxLength * 0.8) {
      breakPoint = lastSpace;
    }
    
    return content.substring(0, breakPoint) + (breakPoint < content.length ? '...' : '');
  }
}