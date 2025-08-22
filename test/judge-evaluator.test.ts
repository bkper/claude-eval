import { JudgeEvaluator, EvaluationResult } from '../src/judge-evaluator';

// Mock the Claude Code SDK
jest.mock('@anthropic-ai/claude-code', () => ({
  Client: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
  })),
}));

describe('JudgeEvaluator', () => {
  let evaluator: JudgeEvaluator;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    const { Client } = require('@anthropic-ai/claude-code');
    mockQuery = jest.fn();
    Client.mockImplementation(() => ({
      query: mockQuery,
    }));
    evaluator = new JudgeEvaluator();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should evaluate all criteria and return structured results', async () => {
    const mockJudgeResponse = `
Criterion 1: ✅ PASS - The response recommends TypeScript
Criterion 2: ❌ FAIL - No tsconfig.json was mentioned
`;
    mockQuery.mockResolvedValue([
      { type: 'result', content: mockJudgeResponse }
    ]);

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
    mockQuery.mockResolvedValue([
      { type: 'result', content: mockJudgeResponse }
    ]);

    const result = await evaluator.evaluate('response', ['criteria1', 'criteria2']);
    
    expect(result.criteria[0].passed).toBe(true);
    expect(result.criteria[1].passed).toBe(false);
  });

  it('should handle ambiguous or unclear evaluations as failures', async () => {
    const mockJudgeResponse = `
Criterion 1: Maybe passes
Criterion 2: Unclear result
`;
    mockQuery.mockResolvedValue([
      { type: 'result', content: mockJudgeResponse }
    ]);

    const result = await evaluator.evaluate('response', ['criteria1', 'criteria2']);
    
    expect(result.criteria[0].passed).toBe(false);
    expect(result.criteria[1].passed).toBe(false);
    expect(result.overall).toBe(false);
  });

  it('should construct proper judge prompt with response and criteria', async () => {
    mockQuery.mockResolvedValue([
      { type: 'result', content: '✅ All good' }
    ]);

    const response = 'Test response';
    const criteria = ['Should work'];

    await evaluator.evaluate(response, criteria);

    const calledPrompt = mockQuery.mock.calls[0][0];
    expect(calledPrompt).toContain(response);
    expect(calledPrompt).toContain('Should work');
    expect(calledPrompt).toContain('✅');
    expect(calledPrompt).toContain('❌');
  });

  it('should handle empty responses', async () => {
    mockQuery.mockResolvedValue([
      { type: 'result', content: '❌ Empty response fails all criteria' }
    ]);

    const result = await evaluator.evaluate('', ['Should not be empty']);
    
    expect(result.overall).toBe(false);
  });

  it('should handle malformed judge responses gracefully', async () => {
    mockQuery.mockResolvedValue([
      { type: 'result', content: 'Completely malformed response with no indicators' }
    ]);

    const result = await evaluator.evaluate('response', ['criteria']);
    
    expect(result.overall).toBe(false);
    expect(result.criteria[0].passed).toBe(false);
  });
});