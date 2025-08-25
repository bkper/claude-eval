#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { EvalRunner } from '../src/eval-runner.js';
import { ResultFormatter } from '../src/utils/result-formatter.js';
import { ProgressReporter, type ProgressLevel } from '../src/utils/progress-reporter.js';
import { TerminalProgressManager } from '../src/utils/terminal-progress-manager.js';

const program = new Command();

program
  .name('claude-eval')
  .description('Evaluation system for AI agent responses using LLM-as-a-judge methodology')
  .version('1.0.0')
  .argument('<files...>', 'YAML evaluation files or glob patterns')
  .option('--concurrency <number>', 'Number of concurrent evaluations', '5')
  .option('--verbose', 'Show detailed progress including partial responses')
  .option('--quiet', 'Suppress progress output')
  .action(async (files: string[], options: { concurrency: string; verbose?: boolean; quiet?: boolean }) => {
    // Determine progress level
    let progressLevel: ProgressLevel = 'normal';
    if (options.quiet) {
      progressLevel = 'quiet';
    } else if (options.verbose) {
      progressLevel = 'verbose';
    }
    
    try {
      const runner = new EvalRunner();
      const formatter = new ResultFormatter();
      
      const progressReporter = new ProgressReporter({ level: progressLevel });
      
      // Expand glob patterns
      const expandedFiles: string[] = [];
      for (const filePattern of files) {
        if (filePattern.includes('*')) {
          const matches = await glob(filePattern);
          expandedFiles.push(...matches);
        } else {
          expandedFiles.push(filePattern);
        }
      }
      
      if (expandedFiles.length === 0) {
        console.error('No evaluation files found');
        process.exit(1);
      }
      
      // Run evaluations
      if (expandedFiles.length === 1) {
        // Single evaluation
        const result = await runner.runSingle(expandedFiles[0], progressReporter);
        
        // The progress reporter already shows the detailed output
        
        // Exit with appropriate code based on evaluation result
        process.exit(result.overall ? 0 : 1);
      } else {
        // Batch evaluation - use TerminalProgressManager for coordinated output
        const concurrency = parseInt(options.concurrency, 10);
        const terminalProgressManager = new TerminalProgressManager(progressLevel);
        
        const batchResults = await runner.runBatch(expandedFiles, { 
          concurrency, 
          terminalProgressManager 
        });
        
        // For console format, the TerminalProgressManager already showed detailed output
        // Only show summary if it was quiet mode
        if (progressLevel === 'quiet') {
          console.log(formatter.formatBatchResults(batchResults));
        }
        
        // Check if any evaluation failed
        const hasFailures = batchResults.some(batch => !batch.result.overall);
        
        // Exit with appropriate code based on evaluation results
        process.exit(hasFailures ? 1 : 0);
      }
    } catch (error) {
      // Simple error display
      if (error instanceof Error) {
        console.error(`\nError: ${error.message}`);
        
        // In verbose mode, show stack trace
        if (progressLevel === 'verbose' && error.stack) {
          console.error('\nStack trace:');
          console.error(error.stack);
        }
      } else {
        console.error('\nUnknown error occurred');
      }

      process.exit(1);
    }
  });

program.parse();