#!/usr/bin/env node

import { Command } from 'commander';
import { glob } from 'glob';
import { EvalRunner } from '../src/eval-runner.js';
import { ResultFormatter } from '../src/utils/result-formatter.js';

const program = new Command();

program
  .name('claude-code-eval')
  .description('Evaluation system for AI agent responses using LLM-as-a-judge methodology')
  .version('1.0.0')
  .argument('<files...>', 'YAML evaluation files or glob patterns')
  .option('--format <format>', 'Output format (console|json)', 'console')
  .option('--concurrency <number>', 'Number of concurrent evaluations', '5')
  .action(async (files: string[], options: { format: string; concurrency: string }) => {
    try {
      const runner = new EvalRunner();
      const formatter = new ResultFormatter();
      
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
        const result = await runner.runSingle(expandedFiles[0]);
        
        if (options.format === 'json') {
          console.log(formatter.formatJSON(result));
        } else {
          console.log(formatter.formatConsole(result));
        }
        
        // Exit with non-zero code if evaluation failed
        if (!result.overall) {
          process.exit(1);
        }
      } else {
        // Batch evaluation
        const concurrency = parseInt(options.concurrency, 10);
        const batchResults = await runner.runBatch(expandedFiles, { concurrency });
        
        if (options.format === 'json') {
          console.log(JSON.stringify(batchResults, null, 2));
        } else {
          console.log(formatter.formatBatchResults(batchResults));
        }
        
        // Exit with non-zero code if any evaluation failed
        const hasFailures = batchResults.some(b => !b.result.overall);
        if (hasFailures) {
          process.exit(1);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
          console.error('Error: file not found');
        } else {
          console.error(`Error: ${error.message}`);
        }
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });

program.parse();