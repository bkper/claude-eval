import type { EvaluationResult, CriterionResult } from './utils/result-formatter.js';
import { IProgressReporter } from './utils/progress-reporter-interface.js';
import { ClaudeApiConnector } from './claude-api-connector.js';

export type { EvaluationResult, CriterionResult };

export class JudgeEvaluator {
  private apiConnector = new ClaudeApiConnector();

  async evaluate(response: string, criteria: string[], progressReporter?: IProgressReporter): Promise<EvaluationResult> {
    const startTime = Date.now();
    
    if (progressReporter) {
      progressReporter.stepStarted(`Evaluating response against ${criteria.length} criteria`);
      progressReporter.debug(`Response length: ${response.length} characters`);
    }
    
    const judgePrompt = this.constructJudgePrompt(response, criteria);
    
    if (progressReporter) {
      progressReporter.logJudgePrompt(judgePrompt);
    }
    
    try {
      const messages = [];
      let judgeResponseText = '';
      
      for await (const message of this.apiConnector.queryRaw(judgePrompt, { permissionMode: 'default', model: 'haiku' })) {
        messages.push(message);
        
        // Show partial judge responses in verbose mode
        if (message.type === 'result' && progressReporter) {
          const newContent = (message as any).result || '';
          if (newContent && newContent.length > 0) {
            judgeResponseText += newContent;
            progressReporter.partialResponse(judgeResponseText, 150);
          }
        }
      }
      
      const judgeResponse = messages
        .filter((msg: any) => msg.type === 'result')
        .map((msg: any) => msg.result)
        .join('');
      
      if (progressReporter) {
        progressReporter.logJudgeResponse(judgeResponse);
      }
      
      const evaluatedCriteria = this.parseJudgeResponse(judgeResponse, criteria);
      const overall = evaluatedCriteria.every(c => c.passed);
      
      if (progressReporter) {
        const duration = Date.now() - startTime;
        const passedCount = evaluatedCriteria.filter(c => c.passed).length;
        const result = {
          overall,
          criteria: evaluatedCriteria
        };
        progressReporter.evaluationStepCompleted(`Evaluation complete (${passedCount}/${criteria.length} criteria passed)`, result, duration);
      }
      
      return {
        overall,
        criteria: evaluatedCriteria
      };
    } catch (error) {
      if (progressReporter) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        progressReporter.stepFailed('Judge evaluation', errorMessage);
      }
      
      // If evaluation fails, mark all criteria as failed
      const failedCriteria = criteria.map(criterion => ({
        criterion,
        passed: false,
        reason: 'Evaluation error'
      }));
      
      return {
        overall: false,
        criteria: failedCriteria
      };
    }
  }
  
  private constructJudgePrompt(response: string, criteria: string[]): string {
    return `You are an evaluation judge. Evaluate the following response against the given criteria.

Response to evaluate:
${response}

Criteria to evaluate against:
${criteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each criterion, respond with either:
- ✅ [Brief reason why it passes]
- ❌ [Brief reason why it fails]

Format your response clearly with one line per criterion.`;
  }
  
  private parseJudgeResponse(judgeResponse: string, criteria: string[]): CriterionResult[] {
    const lines = judgeResponse.split('\n').filter(line => line.trim());
    
    return criteria.map((criterion, index) => {
      // Look for ✅ or ❌ indicators in the judge response
      const relevantLines = lines.filter(line => 
        line.includes('✅') || line.includes('❌') || 
        line.toLowerCase().includes('pass') || line.toLowerCase().includes('fail')
      );
      
      // Try to find a line that corresponds to this criterion
      let passed = false;
      let reason = 'No clear evaluation found';
      
      if (relevantLines.length > index) {
        const line = relevantLines[index];
        if (line.includes('✅') || line.toLowerCase().includes('pass')) {
          passed = true;
          reason = line.replace(/✅/g, '').trim();
        } else if (line.includes('❌') || line.toLowerCase().includes('fail')) {
          passed = false;
          reason = line.replace(/❌/g, '').trim();
        }
      }
      
      return {
        criterion,
        passed,
        reason
      };
    });
  }
}