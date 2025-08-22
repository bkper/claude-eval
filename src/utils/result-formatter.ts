import chalk from 'chalk';

export interface CriterionResult {
  criterion: string;
  passed: boolean;
  reason: string;
}

export interface EvaluationResult {
  overall: boolean;
  criteria: CriterionResult[];
}

export interface BatchResult {
  file: string;
  result: EvaluationResult;
}

export class ResultFormatter {
  formatConsole(result: EvaluationResult): string {
    const lines: string[] = [];
    
    // Format each criterion
    for (const criterion of result.criteria) {
      const icon = criterion.passed ? chalk.green('✅') : chalk.red('❌');
      lines.push(`${icon} ${criterion.criterion}`);
      if (criterion.reason) {
        lines.push(`   ${criterion.reason}`);
      }
    }
    
    // Add summary
    const passedCount = result.criteria.filter(c => c.passed).length;
    const totalCount = result.criteria.length;
    const summary = `${passedCount}/${totalCount} passed`;
    
    lines.push('');
    if (result.overall) {
      lines.push(chalk.green(`✅ PASSED (${summary})`));
    } else {
      lines.push(chalk.red(`❌ FAILED (${summary})`));
    }
    
    return lines.join('\n');
  }
  
  formatJSON(result: EvaluationResult): string {
    return JSON.stringify(result, null, 2);
  }
  
  formatBatchResults(batchResults: BatchResult[]): string {
    const lines: string[] = [];
    
    for (const batch of batchResults) {
      const icon = batch.result.overall ? chalk.green('✅') : chalk.red('❌');
      lines.push(`${icon} ${batch.file}`);
    }
    
    const passedCount = batchResults.filter(b => b.result.overall).length;
    const totalCount = batchResults.length;
    
    lines.push('');
    lines.push(`${passedCount}/${totalCount} evaluations passed`);
    
    return lines.join('\n');
  }
}