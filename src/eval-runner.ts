import * as fs from 'fs/promises';
import pLimit from 'p-limit';
import { parseEvalSpec } from './utils/yaml-parser.js';
import { ClaudeClient } from './claude-client.js';
import { JudgeEvaluator } from './judge-evaluator.js';
import { EvaluationResult, BatchResult } from './utils/result-formatter.js';
import { ProgressReporter } from './utils/progress-reporter.js';

export interface RunnerOptions {
  concurrency?: number;
  progressReporter?: ProgressReporter;
}

export class EvalRunner {
  private claudeClient: ClaudeClient;
  private judgeEvaluator: JudgeEvaluator;
  
  constructor() {
    this.claudeClient = new ClaudeClient();
    this.judgeEvaluator = new JudgeEvaluator();
  }
  
  async runSingle(filePath: string, progressReporter?: ProgressReporter): Promise<EvaluationResult> {
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
      
      // Execute prompt with Claude
      const response = await this.claudeClient.execute(evalSpec.prompt, { 
        progressReporter 
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
    const progressReporter = options.progressReporter;
    const batchStartTime = Date.now();
    
    if (progressReporter) {
      progressReporter.startBatch(filePaths.length);
      progressReporter.debug(`Using concurrency limit of ${concurrency}`);
    }
    
    const limit = pLimit(concurrency);
    
    const promises = filePaths.map(filePath => 
      limit(async () => {
        try {
          const result = await this.runSingle(filePath, progressReporter);
          return { file: filePath, result };
        } catch (error) {
          // Return failed result for individual file errors
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (progressReporter) {
            progressReporter.error(`Failed to process ${filePath}: ${errorMessage}`);
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
    
    if (progressReporter) {
      const batchDuration = Date.now() - batchStartTime;
      const passedCount = results.filter(r => r.result.overall).length;
      progressReporter.batchCompleted(passedCount, results.length, batchDuration);
    }
    
    return results;
  }
}