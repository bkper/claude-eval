import * as fs from 'fs/promises';
import * as path from 'path';
import pLimit from 'p-limit';
import { parseEvalSpec } from './utils/yaml-parser.js';
import { ClaudeClient } from './claude-client.js';
import { JudgeEvaluator } from './judge-evaluator.js';
import { EvaluationResult, BatchResult } from './utils/result-formatter.js';
import { ProgressReporter } from './utils/progress-reporter.js';
import { TerminalProgressManager } from './utils/terminal-progress-manager.js';
import { RegionalProgressReporter } from './utils/regional-progress-reporter.js';
import { IProgressReporter } from './utils/progress-reporter-interface.js';

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
    
    try {
      if (progressReporter) {
        progressReporter.startEvaluation(filePath);
      }
      
      // Read and parse YAML
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      const evalSpec = parseEvalSpec(yamlContent);
      
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
        progressReporter.evaluationCompleted(filePath, result.overall, totalDuration);
      }
      
      return result;
    } catch (error) {
      if (progressReporter) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        progressReporter.stepFailed('Evaluation', errorMessage);
        progressReporter.evaluationCompleted(filePath, false);
      }
      throw error;
    }
  }
  
  async runBatch(filePaths: string[], options: RunnerOptions = {}): Promise<BatchResult[]> {
    const concurrency = options.concurrency || 5;
    const terminalProgressManager = options.terminalProgressManager;
    
    // Start the batch with the terminal progress manager
    if (terminalProgressManager) {
      terminalProgressManager.startBatch(filePaths.length);
      terminalProgressManager.debug(`Using concurrency limit of ${concurrency}`);
    }
    
    const limit = pLimit(concurrency);
    
    const promises = filePaths.map((filePath, index) => 
      limit(async () => {
        // Create a unique region ID for this evaluation
        const regionId = `eval_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          // Create a regional progress reporter for this evaluation
          const regionalReporter = terminalProgressManager?.createRegionalReporter(regionId, index + 1);
          
          // Run the evaluation with the regional reporter
          const result = await this.runSingle(filePath, regionalReporter);
          
          // Mark the region as completed
          if (terminalProgressManager) {
            terminalProgressManager.markRegionCompleted(regionId, result.overall);
          }
          
          return { file: filePath, result };
        } catch (error) {
          // Return failed result for individual file errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Mark region as failed and show error
          if (terminalProgressManager) {
            terminalProgressManager.error(`Failed to process ${filePath}: ${errorMessage}`);
            terminalProgressManager.markRegionCompleted(regionId, false);
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