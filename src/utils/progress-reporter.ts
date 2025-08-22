import chalk from 'chalk';
import { IProgressReporter } from './progress-reporter-interface.js';

export type ProgressLevel = 'quiet' | 'normal' | 'verbose';

export interface ProgressOptions {
  level: ProgressLevel;
}

export class ProgressReporter implements IProgressReporter {
  private level: ProgressLevel;
  private currentBatchIndex: number = 0;
  private totalBatchCount: number = 0;
  private startTime: number = 0;

  constructor(options: ProgressOptions = { level: 'normal' }) {
    this.level = options.level;
  }

  startBatch(totalCount: number): void {
    if (this.level === 'quiet') return;
    
    this.totalBatchCount = totalCount;
    this.currentBatchIndex = 0;
    
    if (totalCount === 1) {
      console.log(chalk.blue('🚀 Running evaluation...'));
    } else {
      console.log(chalk.blue(`🚀 Running ${totalCount} evaluations...`));
    }
  }

  startEvaluation(filename: string): void {
    if (this.level === 'quiet') return;
    
    this.currentBatchIndex++;
    this.startTime = Date.now();
    
    if (this.totalBatchCount > 1) {
      console.log(chalk.yellow(`\n📋 Running evaluation ${this.currentBatchIndex} of ${this.totalBatchCount}: ${chalk.cyan(filename)}`));
    } else {
      console.log(chalk.yellow(`📋 Evaluating: ${chalk.cyan(filename)}`));
    }
  }

  stepCompleted(step: string, duration?: number): void {
    if (this.level === 'quiet') return;
    
    const durationText = duration ? chalk.gray(` (${(duration / 1000).toFixed(1)}s)`) : '';
    console.log(`  ${chalk.green('✓')} ${step}${durationText}`);
  }

  stepStarted(step: string): void {
    if (this.level === 'quiet') return;
    
    console.log(`  ${chalk.yellow('⏳')} ${step}...`);
  }

  stepFailed(step: string, error?: string): void {
    if (this.level === 'quiet') return;
    
    console.log(`  ${chalk.red('❌')} ${step} failed${error ? ': ' + chalk.red(error) : ''}`);
  }

  partialResponse(response: string, maxLength: number = 100): void {
    if (this.level !== 'verbose') return;
    
    const truncated = response.length > maxLength 
      ? response.substring(0, maxLength) + '...' 
      : response;
    
    console.log(chalk.gray(`    → ${truncated.replace(/\n/g, ' ')}`));
  }

  evaluationCompleted(filename: string, success: boolean, totalDuration?: number): void {
    if (this.level === 'quiet') return;
    
    const duration = totalDuration || (Date.now() - this.startTime);
    const durationText = chalk.gray(` (${(duration / 1000).toFixed(1)}s)`);
    const icon = success ? chalk.green('✅') : chalk.red('❌');
    const status = success ? 'PASSED' : 'FAILED';
    
    console.log(`  ${icon} ${status}${durationText}\n`);
  }

  batchCompleted(passedCount: number, totalCount: number, totalDuration: number): void {
    if (this.level === 'quiet') return;
    
    const durationText = chalk.gray(` (${(totalDuration / 1000).toFixed(1)}s total)`);
    const summary = `${passedCount}/${totalCount} evaluations passed`;
    
    if (passedCount === totalCount) {
      console.log(chalk.green(`🎉 All evaluations completed! ${summary}${durationText}`));
    } else {
      console.log(chalk.yellow(`⚠️  Batch completed: ${summary}${durationText}`));
    }
  }

  error(message: string): void {
    if (this.level === 'quiet') return;
    
    console.error(chalk.red(`❌ Error: ${message}`));
  }

  info(message: string): void {
    if (this.level === 'quiet') return;
    
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  debug(message: string): void {
    if (this.level === 'verbose') {
      console.log(chalk.gray(`🔍 ${message}`));
    }
  }

  logPrompt(prompt: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(prompt, 500);
    console.log(chalk.blue(`📝 Prompt sent to Claude:`));
    console.log(chalk.gray(`${truncated}`));
    if (prompt.length > 500) {
      console.log(chalk.gray(`    ... (${prompt.length} total characters)`));
    }
  }

  logResponse(response: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(response, 500);
    console.log(chalk.green(`📄 Response received:`));
    console.log(chalk.gray(`${truncated}`));
    if (response.length > 500) {
      console.log(chalk.gray(`    ... (${response.length} total characters)`));
    }
  }

  logJudgePrompt(prompt: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(prompt, 500);
    console.log(chalk.yellow(`⚖️  Judge evaluation prompt:`));
    console.log(chalk.gray(`${truncated}`));
    if (prompt.length > 500) {
      console.log(chalk.gray(`    ... (${prompt.length} total characters)`));
    }
  }

  logJudgeResponse(response: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(response, 500);
    console.log(chalk.cyan(`🔍 Judge response:`));
    console.log(chalk.gray(`${truncated}`));
    if (response.length > 500) {
      console.log(chalk.gray(`    ... (${response.length} total characters)`));
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