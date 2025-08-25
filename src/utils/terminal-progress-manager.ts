import { ProgressLevel } from './progress-reporter.js';
import { BufferedProgressReporter } from './buffered-progress-reporter.js';
import { SimpleProgressIndicator, TerminalFormatter } from './terminal-utils.js';

export interface EvaluationBuffer {
  reporter: BufferedProgressReporter;
  completed: boolean;
  success?: boolean;
  completionTime?: number;
}

export class TerminalProgressManager {
  private level: ProgressLevel;
  private buffers: Map<string, EvaluationBuffer> = new Map();
  private totalEvaluations: number = 0;
  private completedCount: number = 0;
  private batchStartTime: number = 0;
  private progressIndicator: SimpleProgressIndicator;
  private isShowingProgress: boolean = false;
  private concurrency: number = 5;

  constructor(level: ProgressLevel = 'normal') {
    this.level = level;
    this.progressIndicator = new SimpleProgressIndicator();
  }

  startBatch(totalCount: number, concurrency: number = 5): void {
    if (this.level === 'quiet') return;
    
    this.totalEvaluations = totalCount;
    this.completedCount = 0;
    this.batchStartTime = Date.now();
    this.concurrency = concurrency;
    this.buffers.clear();
    
    // Start progress indicator for all evaluations
    this.isShowingProgress = true;
    this.progressIndicator.start();
    this.updateProgressIndicator();
  }

  createBufferedReporter(bufferId: string, evaluationIndex: number): BufferedProgressReporter {
    const reporter = new BufferedProgressReporter(
      bufferId,
      this.level,
      evaluationIndex,
      this.totalEvaluations
    );
    
    this.buffers.set(bufferId, {
      reporter,
      completed: false
    });
    
    return reporter;
  }

  markBufferCompleted(bufferId: string, success: boolean): void {
    const buffer = this.buffers.get(bufferId);
    if (!buffer) return;
    
    buffer.completed = true;
    buffer.success = success;
    buffer.completionTime = Date.now();
    this.completedCount++;
    
    // Update progress indicator
    if (this.isShowingProgress) {
      this.updateProgressIndicator();
    }
    
    // Display completed buffer immediately
    this.displayCompletedBuffer(buffer);
    
    // Check if batch is complete
    if (this.completedCount === this.totalEvaluations) {
      this.completeBatch();
    }
  }

  private updateProgressIndicator(): void {
    if (!this.isShowingProgress) return;
    
    const remaining = this.totalEvaluations - this.completedCount;
    const actualRunning = Math.min(this.concurrency, remaining);
    const message = `Running ${actualRunning} evaluation${actualRunning !== 1 ? 's' : ''}`;
    this.progressIndicator.update(message);
  }

  private displayCompletedBuffer(buffer: EvaluationBuffer): void {
    if (this.level === 'quiet') return;
    
    // Stop progress indicator temporarily to display output cleanly
    if (this.isShowingProgress) {
      this.progressIndicator.stop();
    }
    
    // Display the buffered output for this completed buffer
    const outputBuffer = buffer.reporter.getBuffer();
    if (!outputBuffer.isEmpty()) {
      console.log(outputBuffer.toString());
    }
    
    // Restart progress indicator if batch isn't complete
    if (this.isShowingProgress && this.completedCount < this.totalEvaluations) {
      this.progressIndicator.start();
      this.updateProgressIndicator();
    }
  }

  private completeBatch(): void {
    if (this.level === 'quiet') return;
    
    // Stop progress indicator
    if (this.isShowingProgress) {
      this.progressIndicator.stop();
      this.isShowingProgress = false;
    }
    
    // Calculate final statistics
    const batchDuration = Date.now() - this.batchStartTime;
    const passedCount = Array.from(this.buffers.values())
      .filter(buffer => buffer.success === true).length;
    
    // Show final summary
    console.log(TerminalFormatter.formatBatchSummary(passedCount, this.totalEvaluations, batchDuration));
    
    // Show individual file results for quick reference
    if (this.totalEvaluations > 1) {
      console.log('\n📊 Results summary:');
      
      // Sort buffers by completion time for consistent display
      const sortedBuffers = Array.from(this.buffers.values())
        .sort((a, b) => (a.completionTime || 0) - (b.completionTime || 0));
      
      for (const buffer of sortedBuffers) {
        const filename = buffer.reporter.getFilename();
        if (buffer.success === true) {
          console.log(TerminalFormatter.formatSuccess(filename));
        } else {
          console.log(TerminalFormatter.formatError(filename));
        }
      }
      console.log(); // Add spacing before command prompt
    }
  }

  // For single evaluations - direct pass-through mode
  displaySingleEvaluation(output: string): void {
    if (this.level === 'quiet') return;
    console.log(output);
  }

  error(message: string): void {
    if (this.level === 'quiet') return;
    
    // Stop progress indicator for error display
    if (this.isShowingProgress) {
      this.progressIndicator.stop();
    }
    
    console.error(TerminalFormatter.formatError(message));
    
    // Restart progress indicator if needed
    if (this.isShowingProgress && this.completedCount < this.totalEvaluations) {
      this.progressIndicator.start();
      this.updateProgressIndicator();
    }
  }

  info(message: string): void {
    if (this.level === 'quiet') return;
    console.log(`ℹ️  ${message}`);
  }

  debug(message: string): void {
    if (this.level === 'verbose') {
      console.log(TerminalFormatter.formatDebug(message));
    }
  }
}