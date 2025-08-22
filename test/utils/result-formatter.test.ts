import { ResultFormatter, EvaluationResult, CriterionResult } from '../../src/utils/result-formatter';

describe('ResultFormatter', () => {
  let formatter: ResultFormatter;

  beforeEach(() => {
    formatter = new ResultFormatter();
  });

  describe('formatConsole', () => {
    it('should format console output with colored ✅/❌ indicators', () => {
      const result: EvaluationResult = {
        overall: true,
        criteria: [
          { criterion: 'Should work', passed: true, reason: 'It works' },
          { criterion: 'Should be fast', passed: false, reason: 'Too slow' }
        ]
      };

      const output = formatter.formatConsole(result);
      
      expect(output).toContain('✅');
      expect(output).toContain('❌');
      expect(output).toContain('Should work');
      expect(output).toContain('Should be fast');
    });

    it('should show overall PASSED/FAILED status', () => {
      const passedResult: EvaluationResult = {
        overall: true,
        criteria: [{ criterion: 'test', passed: true, reason: 'good' }]
      };

      const failedResult: EvaluationResult = {
        overall: false,
        criteria: [{ criterion: 'test', passed: false, reason: 'bad' }]
      };

      const passedOutput = formatter.formatConsole(passedResult);
      const failedOutput = formatter.formatConsole(failedResult);

      expect(passedOutput).toContain('PASSED');
      expect(failedOutput).toContain('FAILED');
    });

    it('should display summary statistics (X/Y passed)', () => {
      const result: EvaluationResult = {
        overall: false,
        criteria: [
          { criterion: 'test1', passed: true, reason: 'good' },
          { criterion: 'test2', passed: false, reason: 'bad' },
          { criterion: 'test3', passed: true, reason: 'good' }
        ]
      };

      const output = formatter.formatConsole(result);
      expect(output).toContain('2/3');
    });

    it('should handle empty results array', () => {
      const result: EvaluationResult = {
        overall: true,
        criteria: []
      };

      const output = formatter.formatConsole(result);
      expect(output).toContain('0/0');
    });
  });

  describe('formatJSON', () => {
    it('should produce valid JSON structure for --format=json', () => {
      const result: EvaluationResult = {
        overall: true,
        criteria: [
          { criterion: 'Should work', passed: true, reason: 'It works' }
        ]
      };

      const jsonOutput = formatter.formatJSON(result);
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.overall).toBe(true);
      expect(parsed.criteria).toHaveLength(1);
      expect(parsed.criteria[0].criterion).toBe('Should work');
      expect(parsed.criteria[0].passed).toBe(true);
    });
  });

  describe('formatBatchResults', () => {
    it('should format batch evaluation results', () => {
      const batchResults = [
        {
          file: 'test1.yaml',
          result: {
            overall: true,
            criteria: [{ criterion: 'test', passed: true, reason: 'good' }]
          }
        },
        {
          file: 'test2.yaml',
          result: {
            overall: false,
            criteria: [{ criterion: 'test', passed: false, reason: 'bad' }]
          }
        }
      ];

      const output = formatter.formatBatchResults(batchResults);
      
      expect(output).toContain('test1.yaml');
      expect(output).toContain('test2.yaml');
      expect(output).toContain('1/2 evaluations passed');
    });
  });
});