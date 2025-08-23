import { ProgressLevel } from './progress-reporter.js';
import { BufferedRegionalReporter, RegionalProgressReporter } from './regional-progress-reporter.js';
import { SimpleProgressIndicator, TerminalFormatter } from './terminal-utils.js';

export interface EvaluationRegion {
  reporter: BufferedRegionalReporter;
  completed: boolean;
  success?: boolean;
  completionTime?: number;
}

export class TerminalProgressManager {
  private level: ProgressLevel;
  private regions: Map<string, EvaluationRegion> = new Map();
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
    this.regions.clear();
    
    // Start progress indicator for all evaluations
    this.isShowingProgress = true;
    this.progressIndicator.start();
    this.updateProgressIndicator();
  }

  createRegionalReporter(regionId: string, evaluationIndex: number): BufferedRegionalReporter {
    const reporter = new BufferedRegionalReporter(
      regionId,
      this.level,
      evaluationIndex,
      this.totalEvaluations
    );
    
    this.regions.set(regionId, {
      reporter,
      completed: false
    });
    
    return reporter;
  }

  markRegionCompleted(regionId: string, success: boolean): void {
    const region = this.regions.get(regionId);
    if (!region) return;
    
    region.completed = true;
    region.success = success;
    region.completionTime = Date.now();
    this.completedCount++;
    
    // Update progress indicator
    if (this.isShowingProgress) {
      this.updateProgressIndicator();
    }
    
    // Display completed region immediately
    this.displayCompletedRegion(region);
    
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

  private displayCompletedRegion(region: EvaluationRegion): void {
    if (this.level === 'quiet') return;
    
    // Stop progress indicator temporarily to display output cleanly
    if (this.isShowingProgress) {
      this.progressIndicator.stop();
    }
    
    // Display the buffered output for this completed region
    const buffer = region.reporter.getBuffer();
    if (!buffer.isEmpty()) {
      console.log(buffer.toString());
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
    const passedCount = Array.from(this.regions.values())
      .filter(region => region.success === true).length;
    
    // Show final summary
    console.log(TerminalFormatter.formatBatchSummary(passedCount, this.totalEvaluations, batchDuration));
    
    // Show individual file results for quick reference
    if (this.totalEvaluations > 1) {
      console.log('\n📊 Results summary:');
      
      // Sort regions by completion time for consistent display
      const sortedRegions = Array.from(this.regions.values())
        .sort((a, b) => (a.completionTime || 0) - (b.completionTime || 0));
      
      for (const region of sortedRegions) {
        const filename = region.reporter.getFilename();
        if (region.success === true) {
          console.log(TerminalFormatter.formatSuccess(filename));
        } else {
          console.log(TerminalFormatter.formatError(filename));
        }
      }
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