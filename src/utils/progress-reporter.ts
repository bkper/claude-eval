import chalk from 'chalk';
import { BaseProgressReporter, ProgressLevel } from './base-progress-reporter.js';

export interface ProgressOptions {
  level: ProgressLevel;
}

export { ProgressLevel } from './base-progress-reporter.js';

export class ProgressReporter extends BaseProgressReporter {
  private currentBatchIndex: number = 0;
  private totalBatchCount: number = 0;
  private startTime: number = 0;

  constructor(options: ProgressOptions = { level: 'normal' }) {
    super(options.level);
  }

  protected output(message: string): void {
    console.log(message);
  }

  // Override startEvaluation to add batch-specific logic
  startEvaluation(filename: string): void {
    if (this.level === 'quiet') return;
    
    this.currentBatchIndex++;
    this.startTime = Date.now();
    
    if (this.totalBatchCount > 1) {
      this.output(chalk.yellow(`\n📋 Running evaluation ${this.currentBatchIndex} of ${this.totalBatchCount}: ${chalk.cyan(filename)}`));
    } else {
      this.output(chalk.yellow(`📋 Evaluating: ${chalk.cyan(filename)}`));
    }
  }

  // Override evaluationCompleted to use stored start time
  evaluationCompleted(_filename: string, result: any, totalDuration?: number): void {
    if (this.level === 'quiet') return;
    
    const duration = totalDuration || (Date.now() - this.startTime);
    const durationText = chalk.gray(` (${(duration / 1000).toFixed(1)}s)`);
    const icon = result.overall ? chalk.green('✅') : chalk.red('❌');
    const status = result.overall ? 'PASSED' : 'FAILED';
    
    this.output(`  ${icon} ${status}${durationText}\n`);
  }



}