import * as fs from 'fs/promises';
import * as path from 'path';
import pLimit from 'p-limit';
import { parseEvalSpec } from './utils/yaml-parser.js';
import { ClaudeClient } from './claude-client.js';
import { JudgeEvaluator } from './judge-evaluator.js';
import { EvaluationResult, BatchResult } from './utils/result-formatter.js';
import { ProgressReporter } from './utils/progress-reporter.js';
import { TerminalProgressManager } from './utils/terminal-progress-manager.js';
import { IProgressReporter } from './utils/progress-reporter-interface.js';
import { formatErrorDetails, getErrorSuggestions, EvaluationError } from './utils/errors.js';

export interface RunnerOptions {
  concurrency?: number;
  progressReporter?: ProgressReporter;
  terminalProgressManager?: TerminalProgressManager;
}

export class EvalRunner {
  private claudeClient: ClaudeClient;
  private judgeEvaluator: JudgeEvaluator;
  
  constructor() {
    this.claudeClient = new ClaudeClient();
    this.judgeEvaluator = new JudgeEvaluator();
  }
  
  async runSingle(filePath: string, progressReporter?: IProgressReporter): Promise<EvaluationResult> {
    const startTime = Date.now();
    let evalSpec: any = null;
    
    try {
      if (progressReporter) {
        progressReporter.startEvaluation(filePath);
      }
      
      // Read and parse YAML
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      evalSpec = parseEvalSpec(yamlContent);
      
      if (progressReporter) {
        progressReporter.debug(`Found ${evalSpec.expected_behavior.length} criteria to evaluate`);
      }
      
      // Extract directory from eval file path to use as working directory
      const evalFileDir = path.dirname(path.resolve(filePath));
      
      // Execute prompt with Claude
      const response = await this.claudeClient.execute(evalSpec.prompt, { 
        progressReporter,
        cwd: evalFileDir
      });
      
      // Evaluate response with judge
      const result = await this.judgeEvaluator.evaluate(response, evalSpec.expected_behavior, progressReporter);
      
      if (progressReporter) {
        const totalDuration = Date.now() - startTime;
        progressReporter.evaluationCompleted(filePath, result, totalDuration);
      }
      
      return result;
    } catch (error) {
      // Wrap the error with evaluation context
      const evalError = error instanceof EvaluationError ? error : new EvaluationError(
        error instanceof Error ? error.message : 'Unknown error',
        filePath,
        evalSpec?.prompt,
        formatErrorDetails(error)
      );
      
      if (progressReporter) {
        const errorMessage = formatErrorDetails(evalError);
        progressReporter.stepFailed('Evaluation', errorMessage);
        
        // Show suggestions if available
        const suggestions = getErrorSuggestions(evalError);
        if (progressReporter.showSuggestions && suggestions.length > 0) {
          progressReporter.showSuggestions(suggestions);
        }
        
        const errorResult: EvaluationResult = {
          overall: false,
          criteria: [{
            criterion: 'File processing',
            passed: false,
            reason: errorMessage
          }]
        };
        progressReporter.evaluationCompleted(filePath, errorResult);
      }
      throw evalError;
    }
  }
  
  async runBatch(filePaths: string[], options: RunnerOptions = {}): Promise<BatchResult[]> {
    const concurrency = options.concurrency || 5;
    const terminalProgressManager = options.terminalProgressManager;
    
    // Start the batch with the terminal progress manager
    if (terminalProgressManager) {
      terminalProgressManager.startBatch(filePaths.length, concurrency);
      terminalProgressManager.debug(`Using concurrency limit of ${concurrency}`);
    }
    
    const limit = pLimit(concurrency);
    
    const promises = filePaths.map((filePath, index) => 
      limit(async () => {
        // Create a unique buffer ID for this evaluation
        const bufferId = `eval_${index}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        try {
          // Create a buffered progress reporter for this evaluation
          const bufferedReporter = terminalProgressManager?.createBufferedReporter(bufferId, index + 1);
          
          // Run the evaluation with the buffered reporter
          const result = await this.runSingle(filePath, bufferedReporter);
          
          // Mark the buffer as completed
          if (terminalProgressManager) {
            terminalProgressManager.markBufferCompleted(bufferId, result.overall);
          }
          
          return { file: filePath, result };
        } catch (error) {
          // Return failed result for individual file errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Mark buffer as failed and show error
          if (terminalProgressManager) {
            terminalProgressManager.error(`Failed to process ${filePath}: ${errorMessage}`);
            terminalProgressManager.markBufferCompleted(bufferId, false);
          }
          
          return {
            file: filePath,
            result: {
              overall: false,
              criteria: [{
                criterion: 'File processing',
                passed: false,
                reason: errorMessage
              }]
            }
          };
        }
      })
    );
    
    const results = await Promise.all(promises);
    
    return results;
  }
}