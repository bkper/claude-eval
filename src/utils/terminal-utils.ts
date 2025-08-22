import chalk from 'chalk';

export interface ProgressIndicator {
  start(): void;
  stop(): void;
  update(message: string): void;
}

export class SimpleProgressIndicator implements ProgressIndicator {
  private intervalId: NodeJS.Timeout | null = null;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private currentFrame = 0;
  private message = '';

  start(): void {
    if (this.intervalId) return;
    
    process.stdout.write('\n');
    this.intervalId = setInterval(() => {
      process.stdout.write(`\r${chalk.blue(this.frames[this.currentFrame])} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 100);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 80) + '\r');
    }
  }

  update(message: string): void {
    this.message = message;
  }
}

export class TerminalFormatter {
  static formatHeader(text: string, level: 'main' | 'section' = 'section'): string {
    if (level === 'main') {
      return chalk.blue.bold(`\n🚀 ${text}\n`);
    }
    return chalk.yellow(`\n📋 ${text}`);
  }

  static formatSuccess(text: string, duration?: number): string {
    const durationText = duration ? chalk.gray(` (${(duration / 1000).toFixed(1)}s)`) : '';
    return `${chalk.green('✅')} ${text}${durationText}`;
  }

  static formatError(text: string): string {
    return `${chalk.red('❌')} ${text}`;
  }

  static formatStep(text: string, status: 'pending' | 'progress' | 'success' | 'error', duration?: number): string {
    const durationText = duration ? chalk.gray(` (${(duration / 1000).toFixed(1)}s)`) : '';
    
    switch (status) {
      case 'pending':
        return `  ${chalk.gray('⏳')} ${text}...`;
      case 'progress':
        return `  ${chalk.yellow('⏳')} ${text}...`;
      case 'success':
        return `  ${chalk.green('✓')} ${text}${durationText}`;
      case 'error':
        return `  ${chalk.red('❌')} ${text}${durationText}`;
      default:
        return `  ${text}`;
    }
  }

  static formatDebug(text: string): string {
    return chalk.gray(`🔍 ${text}`);
  }

  static formatPartialResponse(response: string, maxLength: number = 100): string {
    const truncated = response.length > maxLength 
      ? response.substring(0, maxLength) + '...' 
      : response;
    
    return chalk.gray(`    → ${truncated.replace(/\n/g, ' ')}`);
  }

  static formatBatchSummary(passedCount: number, totalCount: number, duration: number): string {
    const durationText = chalk.gray(` (${(duration / 1000).toFixed(1)}s total)`);
    const summary = `${passedCount}/${totalCount} evaluations passed`;
    
    if (passedCount === totalCount) {
      return chalk.green(`🎉 All evaluations completed! ${summary}${durationText}`);
    } else {
      return chalk.yellow(`⚠️  Batch completed: ${summary}${durationText}`);
    }
  }
}

export class OutputBuffer {
  private lines: string[] = [];

  add(line: string): void {
    this.lines.push(line);
  }

  addEmpty(): void {
    this.lines.push('');
  }

  getLines(): string[] {
    return [...this.lines];
  }

  clear(): void {
    this.lines = [];
  }

  isEmpty(): boolean {
    return this.lines.length === 0;
  }

  toString(): string {
    return this.lines.join('\n');
  }
}