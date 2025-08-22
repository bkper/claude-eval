import { EvalRunner } from '../../src/eval-runner';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock dependencies
jest.mock('../../src/claude-client');
jest.mock('../../src/judge-evaluator');
jest.mock('fs/promises');

describe('EvalRunner', () => {
  let runner: EvalRunner;
  let mockReadFile: jest.Mock;

  beforeEach(() => {
    runner = new EvalRunner();
    mockReadFile = fs.readFile as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run complete evaluation pipeline end-to-end', async () => {
    const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`;
    mockReadFile.mockResolvedValue(yamlContent);

    const { ClaudeClient } = require('../../src/claude-client');
    const { JudgeEvaluator } = require('../../src/judge-evaluator');

    ClaudeClient.prototype.execute = jest.fn().mockResolvedValue('Test response');
    JudgeEvaluator.prototype.evaluate = jest.fn().mockResolvedValue({
      overall: true,
      criteria: [{ criterion: 'Should work', passed: true, reason: 'Good' }]
    });

    const result = await runner.runSingle('test.yaml');

    expect(result.overall).toBe(true);
    expect(ClaudeClient.prototype.execute).toHaveBeenCalledWith('Test prompt');
    expect(JudgeEvaluator.prototype.evaluate).toHaveBeenCalledWith('Test response', ['Should work']);
  });

  it('should handle evaluation failures correctly', async () => {
    const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`;
    mockReadFile.mockResolvedValue(yamlContent);

    const { ClaudeClient } = require('../../src/claude-client');
    ClaudeClient.prototype.execute = jest.fn().mockRejectedValue(new Error('Claude error'));

    await expect(runner.runSingle('test.yaml')).rejects.toThrow('Claude error');
  });

  it('should support batch evaluations of multiple files in parallel', async () => {
    const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`;
    mockReadFile.mockResolvedValue(yamlContent);

    const { ClaudeClient } = require('../../src/claude-client');
    const { JudgeEvaluator } = require('../../src/judge-evaluator');

    ClaudeClient.prototype.execute = jest.fn().mockResolvedValue('Test response');
    JudgeEvaluator.prototype.evaluate = jest.fn().mockResolvedValue({
      overall: true,
      criteria: [{ criterion: 'Should work', passed: true, reason: 'Good' }]
    });

    const results = await runner.runBatch(['test1.yaml', 'test2.yaml']);

    expect(results).toHaveLength(2);
    expect(ClaudeClient.prototype.execute).toHaveBeenCalledTimes(2);
  });

  it('should aggregate results from parallel batch runs', async () => {
    const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`;
    mockReadFile.mockResolvedValue(yamlContent);

    const { ClaudeClient } = require('../../src/claude-client');
    const { JudgeEvaluator } = require('../../src/judge-evaluator');

    ClaudeClient.prototype.execute = jest.fn().mockResolvedValue('Test response');
    JudgeEvaluator.prototype.evaluate = jest.fn()
      .mockResolvedValueOnce({
        overall: true,
        criteria: [{ criterion: 'Should work', passed: true, reason: 'Good' }]
      })
      .mockResolvedValueOnce({
        overall: false,
        criteria: [{ criterion: 'Should work', passed: false, reason: 'Bad' }]
      });

    const results = await runner.runBatch(['test1.yaml', 'test2.yaml']);

    expect(results[0].result.overall).toBe(true);
    expect(results[1].result.overall).toBe(false);
  });

  it('should handle file reading errors', async () => {
    mockReadFile.mockRejectedValue(new Error('File not found'));

    await expect(runner.runSingle('nonexistent.yaml')).rejects.toThrow('File not found');
  });

  it('should validate YAML before execution', async () => {
    const invalidYaml = 'invalid: yaml: content: [unclosed';
    mockReadFile.mockResolvedValue(invalidYaml);

    await expect(runner.runSingle('invalid.yaml')).rejects.toThrow();
  });

  it('should limit concurrent evaluations to avoid rate limits', async () => {
    const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`;
    mockReadFile.mockResolvedValue(yamlContent);

    const { ClaudeClient } = require('../../src/claude-client');
    const { JudgeEvaluator } = require('../../src/judge-evaluator');

    let concurrentCalls = 0;
    let maxConcurrentCalls = 0;

    ClaudeClient.prototype.execute = jest.fn().mockImplementation(async () => {
      concurrentCalls++;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
      await new Promise(resolve => setTimeout(resolve, 100));
      concurrentCalls--;
      return 'Test response';
    });

    JudgeEvaluator.prototype.evaluate = jest.fn().mockResolvedValue({
      overall: true,
      criteria: [{ criterion: 'Should work', passed: true, reason: 'Good' }]
    });

    // Create 10 files to test concurrency limit
    const files = Array.from({ length: 10 }, (_, i) => `test${i}.yaml`);
    
    await runner.runBatch(files, { concurrency: 3 });

    expect(maxConcurrentCalls).toBeLessThanOrEqual(3);
  });
});