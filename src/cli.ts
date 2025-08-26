#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { createRequire } from 'module';
import { EvalRunner } from '../src/eval-runner.js';
import { ResultFormatter } from '../src/utils/result-formatter.js';
import { ProgressReporter, type ProgressLevel } from '../src/utils/progress-reporter.js';
import { TerminalProgressManager } from '../src/utils/terminal-progress-manager.js';
import { checkForUpdates } from '../src/utils/update-checker.js';

// Import package.json to get current version
const require = createRequire(import.meta.url);
const packageJson = require('../../package.json');

const program = new Command();

program
  .name('claude-eval')
  .description('Evaluation system for AI agent responses using LLM-as-a-judge methodology')
  .version(packageJson.version)
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

// Add update command
program
  .command('update')
  .description('Check for updates to claude-eval')
  .action(async () => {
    try {
      console.log(`Current version: ${packageJson.version}`);
      console.log('Checking for updates...');
      
      const updateInfo = await checkForUpdates('claude-eval', packageJson.version);
      
      if (updateInfo.isUpToDate) {
        console.log(`\x1b[32mClaude-eval is up to date (${updateInfo.currentVersion})\x1b[0m`);
      } else {
        console.log(`\x1b[33mUpdate available: ${updateInfo.latestVersion}\x1b[0m`);
        console.log(`\nTo update, run: \x1b[36mnpm update -g claude-eval\x1b[0m`);
        console.log(`Or with bun: \x1b[36mbun update -g claude-eval\x1b[0m`);
      }
    } catch (error) {
      console.error('Error checking for updates:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();