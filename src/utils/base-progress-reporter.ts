import chalk from 'chalk';
import type { EvaluationResult } from './result-formatter.js';

export type ProgressLevel = 'quiet' | 'normal' | 'verbose';

export abstract class BaseProgressReporter {
  protected level: ProgressLevel;

  constructor(level: ProgressLevel) {
    this.level = level;
  }

  protected abstract output(message: string): void;

  startEvaluation(filename: string): void {
    if (this.level === 'quiet') return;
    this.output(chalk.yellow(`📋 Evaluating: ${chalk.cyan(filename)}`));
  }

  stepCompleted(step: string, duration?: number): void {
    if (this.level === 'quiet') return;
    const durationText = duration ? chalk.gray(` (${(duration / 1000).toFixed(1)}s)`) : '';
    this.output(`  ${chalk.green('✓')} ${step}${durationText}`);
  }

  evaluationStepCompleted(step: string, result: EvaluationResult, duration?: number): void {
    if (this.level === 'quiet') return;
    const durationText = duration ? chalk.gray(` (${(duration / 1000).toFixed(1)}s)`) : '';
    this.output(`  ${chalk.green('✓')} ${step}${durationText}`);
    
    // Show detailed per-criteria results
    for (const criterion of result.criteria) {
      const icon = criterion.passed ? chalk.green('✓') : chalk.red('✗');
      this.output(`    ${icon} ${criterion.reason || criterion.criterion}`);
    }
  }

  stepStarted(step: string): void {
    if (this.level === 'quiet') return;
    this.output(`  ${chalk.yellow('⏳')} ${step}...`);
  }

  stepFailed(step: string, error?: string): void {
    if (this.level === 'quiet') return;
    
    if (error && error.includes('\n')) {
      this.output(`  ${chalk.red('❌')} ${step} failed:`);
      const lines = error.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          this.output(`     ${chalk.red(line)}`);
        }
      });
    } else {
      this.output(`  ${chalk.red('❌')} ${step} failed${error ? ': ' + chalk.red(error) : ''}`);
    }
  }

  partialResponse(response: string, maxLength: number = 100): void {
    if (this.level !== 'verbose') return;
    
    const truncated = response.length > maxLength 
      ? response.substring(0, maxLength) + '...' 
      : response;
    
    this.output(chalk.gray(`    → ${truncated.replace(/\n/g, ' ')}`));
  }

  evaluationCompleted(_filename: string, result: EvaluationResult, totalDuration?: number): void {
    if (this.level === 'quiet') return;
    
    const durationText = totalDuration ? chalk.gray(` (${(totalDuration / 1000).toFixed(1)}s)`) : '';
    const icon = result.overall ? chalk.green('✅') : chalk.red('❌');
    const status = result.overall ? 'PASSED' : 'FAILED';
    
    this.output(`  ${icon} ${status}${durationText}\n`);
  }

  error(message: string): void {
    if (this.level === 'quiet') return;
    
    // Split error message by newlines for better formatting
    if (message.includes('\n')) {
      const lines = message.split('\n');
      this.output(chalk.red(`❌ Error: ${lines[0]}`));
      lines.slice(1).forEach(line => {
        if (line.trim()) {
          this.output(chalk.red(`   ${line}`));
        }
      });
    } else {
      this.output(chalk.red(`❌ Error: ${message}`));
    }
  }

  info(message: string): void {
    if (this.level === 'quiet') return;
    
    this.output(chalk.blue(`ℹ️  ${message}`));
  }

  debug(message: string): void {
    if (this.level === 'verbose') {
      this.output(chalk.gray(`🔍 ${message}`));
    }
  }

  logPrompt(prompt: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(prompt, 500);
    this.output(chalk.blue(`📝 Prompt sent to Claude:`));
    this.output(chalk.gray(`${truncated}`));
    if (prompt.length > 500) {
      this.output(chalk.gray(`    ... (${prompt.length} total characters)`));
    }
  }

  logResponse(response: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(response, 500);
    this.output(chalk.green(`📄 Response received:`));
    this.output(chalk.gray(`${truncated}`));
    if (response.length > 500) {
      this.output(chalk.gray(`    ... (${response.length} total characters)`));
    }
  }

  logJudgePrompt(prompt: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(prompt, 500);
    this.output(chalk.yellow(`⚖️  Judge evaluation prompt:`));
    this.output(chalk.gray(`${truncated}`));
    if (prompt.length > 500) {
      this.output(chalk.gray(`    ... (${prompt.length} total characters)`));
    }
  }

  logJudgeResponse(response: string): void {
    if (this.level !== 'verbose') return;
    
    const truncated = this.truncateContent(response, 500);
    this.output(chalk.cyan(`🔍 Judge response:`));
    this.output(chalk.gray(`${truncated}`));
    if (response.length > 500) {
      this.output(chalk.gray(`    ... (${response.length} total characters)`));
    }
  }

  showSuggestions(suggestions: string[]): void {
    if (this.level === 'quiet' || suggestions.length === 0) return;
    
    this.output(chalk.yellow('\n💡 Suggestions:'));
    suggestions.forEach(suggestion => {
      this.output(chalk.yellow(`   • ${suggestion}`));
    });
  }

  logBinaryInfo(binaryPath: string, version?: string, workingDir?: string): void {
    if (this.level !== 'verbose') return;
    
    this.output(chalk.blue('🔧 Claude Code Binary Information:'));
    this.output(chalk.gray(`   Path: ${binaryPath}`));
    if (version) {
      this.output(chalk.gray(`   Version: ${version}`));
    }
    if (workingDir) {
      this.output(chalk.gray(`   Working Directory: ${workingDir}`));
    }
  }

  logEnvironmentContext(envVars: Record<string, string | undefined>): void {
    if (this.level !== 'verbose') return;
    
    this.output(chalk.blue('🌍 Environment Context:'));
    Object.entries(envVars).forEach(([key, value]) => {
      if (value !== undefined) {
        // Truncate very long environment values (like PATH) for readability
        const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
        this.output(chalk.gray(`   ${key}: ${displayValue}`));
      } else {
        this.output(chalk.gray(`   ${key}: <not set>`));
      }
    });
  }

  logExecutionCommand(command: string, args?: string[], pid?: number): void {
    if (this.level !== 'verbose') return;
    
    this.output(chalk.blue('⚡ Execution Command:'));
    const fullCommand = args ? `${command} ${args.join(' ')}` : command;
    this.output(chalk.gray(`   Command: ${fullCommand}`));
    if (pid) {
      this.output(chalk.gray(`   Process ID: ${pid}`));
    }
    this.output(chalk.gray(`   Timestamp: ${new Date().toISOString()}`));
  }

  protected truncateContent(content: string, maxLength: number): string {
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