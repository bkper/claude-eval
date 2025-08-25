import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the Claude SDK
const mockQuery = jest.fn();
jest.mock('@anthropic-ai/claude-code', () => ({
  query: mockQuery,
}));

import { JudgeEvaluator } from '../src/judge-evaluator';

describe('JudgeEvaluator', () => {
  let evaluator: JudgeEvaluator;

  beforeEach(() => {
    jest.clearAllMocks();
    evaluator = new JudgeEvaluator();
  });

  it('should evaluate all criteria and return structured results', async () => {
    const mockJudgeResponse = `
Criterion 1: ✅ PASS - The response recommends TypeScript
Criterion 2: ❌ FAIL - No tsconfig.json was mentioned
`;
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: mockJudgeResponse };
    });

    const response = 'Use JavaScript for your project';
    const criteria = [
      'Should recommend TypeScript',
      'Should mention tsconfig.json'
    ];

    const result = await evaluator.evaluate(response, criteria);
    
    expect(result.overall).toBe(false);
    expect(result.criteria).toHaveLength(2);
    expect(result.criteria[0].passed).toBe(true);
    expect(result.criteria[1].passed).toBe(false);
  });

  it('should parse ✅/❌ indicators correctly', async () => {
    const mockJudgeResponse = `
✅ Criterion 1: PASS
❌ Criterion 2: FAIL
`;
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: mockJudgeResponse };
    });

    const result = await evaluator.evaluate('response', ['criteria1', 'criteria2']);
    
    expect(result.criteria[0].passed).toBe(true);
    expect(result.criteria[1].passed).toBe(false);
  });

  it('should handle ambiguous or unclear evaluations as failures', async () => {
    const mockJudgeResponse = `
Criterion 1: Somewhat unclear
Criterion 2: Ambiguous result
`;
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: mockJudgeResponse };
    });

    const result = await evaluator.evaluate('response', ['criteria1', 'criteria2']);
    
    expect(result.criteria[0].passed).toBe(false);
    expect(result.criteria[1].passed).toBe(false);
    expect(result.overall).toBe(false);
  });

  it('should construct proper judge prompt with response and criteria', async () => {
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: '✅ All good' };
    });

    const response = 'Test response';
    const criteria = ['Should work'];

    await evaluator.evaluate(response, criteria);

    const calledArgs = (mockQuery as jest.MockedFunction<any>).mock.calls[0][0];
    const calledPrompt = calledArgs.prompt;
    expect(calledPrompt).toContain(response);
    expect(calledPrompt).toContain('Should work');
    expect(calledPrompt).toContain('✅');
    expect(calledPrompt).toContain('❌');
  });

  it('should handle empty responses', async () => {
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: '❌ Empty response fails all criteria' };
    });

    const result = await evaluator.evaluate('', ['Should not be empty']);
    
    expect(result.overall).toBe(false);
  });

  it('should handle malformed judge responses gracefully', async () => {
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: 'Completely malformed response with no indicators' };
    });

    const result = await evaluator.evaluate('response', ['criteria']);
    
    expect(result.overall).toBe(false);
    expect(result.criteria[0].passed).toBe(false);
  });
});