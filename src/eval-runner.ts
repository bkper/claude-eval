import * as fs from 'fs/promises';
import pLimit from 'p-limit';
import { parseEvalSpec } from './utils/yaml-parser.js';
import { ClaudeClient } from './claude-client.js';
import { JudgeEvaluator } from './judge-evaluator.js';
import { EvaluationResult, BatchResult } from './utils/result-formatter.js';

export interface RunnerOptions {
  concurrency?: number;
}

export class EvalRunner {
  private claudeClient: ClaudeClient;
  private judgeEvaluator: JudgeEvaluator;
  
  constructor() {
    this.claudeClient = new ClaudeClient();
    this.judgeEvaluator = new JudgeEvaluator();
  }
  
  async runSingle(filePath: string): Promise<EvaluationResult> {
    try {
      // Read and parse YAML
      const yamlContent = await fs.readFile(filePath, 'utf-8');
      const evalSpec = parseEvalSpec(yamlContent);
      
      // Execute prompt with Claude
      const response = await this.claudeClient.execute(evalSpec.prompt);
      
      // Evaluate response with judge
      const result = await this.judgeEvaluator.evaluate(response, evalSpec.expected_behavior);
      
      return result;
    } catch (error) {
      throw error;
    }
  }
  
  async runBatch(filePaths: string[], options: RunnerOptions = {}): Promise<BatchResult[]> {
    const concurrency = options.concurrency || 5;
    const limit = pLimit(concurrency);
    
    const promises = filePaths.map(filePath => 
      limit(async () => {
        try {
          const result = await this.runSingle(filePath);
          return { file: filePath, result };
        } catch (error) {
          // Return failed result for individual file errors
          return {
            file: filePath,
            result: {
              overall: false,
              criteria: [{
                criterion: 'File processing',
                passed: false,
                reason: error instanceof Error ? error.message : 'Unknown error'
              }]
            }
          };
        }
      })
    );
    
    return await Promise.all(promises);
  }
}