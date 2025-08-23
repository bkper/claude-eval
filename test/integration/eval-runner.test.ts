import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock only the Claude Code SDK at the lowest level
const mockQuery = jest.fn();
jest.mock('@anthropic-ai/claude-code', () => ({
  query: mockQuery,
}));

// Mock p-limit for concurrency control testing
jest.mock('p-limit', () => {
  return (concurrency: number) => {
    let running = 0;
    const queue: any[] = [];

    const tryNext = () => {
      if (running < concurrency && queue.length > 0) {
        const { fn, resolve, reject } = queue.shift();
        running++;
        Promise.resolve()
          .then(() => fn())
          .then(resolve, reject)
          .finally(() => {
            running--;
            tryNext();
          });
      }
    };

    return (fn: () => any) => {
      return new Promise((resolve, reject) => {
        queue.push({ fn, resolve, reject });
        tryNext();
      });
    };
  };
});

import { EvalRunner } from '../../src/eval-runner';

describe('EvalRunner Integration', () => {
  let runner: EvalRunner;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    runner = new EvalRunner();
    
    // Create temp directory for test files
    tempDir = path.join(process.cwd(), 'test', 'temp');
    try {
      await fs.mkdir(tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  it('should run complete evaluation pipeline end-to-end', async () => {
    // Create test YAML file
    const yamlContent = `
prompt: "Write a function that adds two numbers"
expected_behavior:
  - "Should define a function"
  - "Should take two parameters"
  - "Should return the sum"
description: "Basic addition function test"
`;
    const testFile = path.join(tempDir, 'test-eval.yaml');
    await fs.writeFile(testFile, yamlContent);

    // Mock Claude response
    const mockClaudeResponse = 'function add(a, b) { return a + b; }';
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: mockClaudeResponse };
    });

    // Mock judge response
    mockQuery
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: mockClaudeResponse };
      })
      .mockImplementationOnce(async function* () {
        yield { 
          type: 'result', 
          result: `
✅ Should define a function - PASS - The response defines a function named 'add'
✅ Should take two parameters - PASS - The function takes parameters 'a' and 'b'
✅ Should return the sum - PASS - Returns a + b which is the sum
` 
        };
      });

    const result = await runner.runSingle(testFile);

    expect(result.overall).toBe(true);
    expect(result.criteria).toHaveLength(3);
    expect(result.criteria[0].passed).toBe(true);
    expect(result.criteria[1].passed).toBe(true);
    expect(result.criteria[2].passed).toBe(true);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('should handle YAML parsing and validation', async () => {
    // Test with invalid YAML structure
    const invalidYaml = `
prompt: "Test"
# Missing expected_behavior
description: "Invalid test"
`;
    const testFile = path.join(tempDir, 'invalid.yaml');
    await fs.writeFile(testFile, invalidYaml);

    await expect(runner.runSingle(testFile)).rejects.toThrow('expected_behavior field is required');
  });

  it('should handle file reading errors gracefully', async () => {
    const nonexistentFile = path.join(tempDir, 'does-not-exist.yaml');
    
    await expect(runner.runSingle(nonexistentFile)).rejects.toThrow();
  });

  it('should process batch evaluations with concurrency control', async () => {
    // Create multiple test files
    const files: string[] = [];
    for (let i = 0; i < 5; i++) {
      const yamlContent = `
prompt: "Test prompt ${i}"
expected_behavior:
  - "Should work ${i}"
`;
      const testFile = path.join(tempDir, `test-${i}.yaml`);
      await fs.writeFile(testFile, yamlContent);
      files.push(testFile);
    }

    // Mock responses for all calls
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: 'Test response' };
    });

    let concurrentCalls = 0;
    let maxConcurrentCalls = 0;
    
    mockQuery.mockImplementation(async function* () {
      concurrentCalls++;
      maxConcurrentCalls = Math.max(maxConcurrentCalls, concurrentCalls);
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Always return successful responses for this test
      yield { type: 'result', result: '✅ Should work - PASS' };
      
      concurrentCalls--;
    });

    const results = await runner.runBatch(files, { concurrency: 2 });

    expect(results).toHaveLength(5);
    expect(results.every(r => r.result.overall === true)).toBe(true);
    expect(maxConcurrentCalls).toBeLessThanOrEqual(4); // 2 concurrency * 2 calls per eval
  });

  it('should handle mixed success/failure results in batch', async () => {
    const files: string[] = [];
    
    // Create successful test file
    const successYaml = `
prompt: "Good prompt"
expected_behavior:
  - "Should succeed"
`;
    const successFile = path.join(tempDir, 'success.yaml');
    await fs.writeFile(successFile, successYaml);
    files.push(successFile);

    // Create file that will cause evaluation failure
    const failYaml = `
prompt: "Bad prompt"
expected_behavior:
  - "Should fail"
`;
    const failFile = path.join(tempDir, 'fail.yaml');
    await fs.writeFile(failFile, failYaml);
    files.push(failFile);

    // Mock responses - first call succeeds, second fails
    mockQuery
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: 'Good response' };
      })
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: '✅ Should succeed - PASS' };
      })
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: 'Bad response' };
      })
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: '❌ Should fail - FAIL - Response is bad' };
      });

    const results = await runner.runBatch(files);

    expect(results).toHaveLength(2);
    expect(results[0].result.overall).toBe(true);
    expect(results[1].result.overall).toBe(false);
    expect(results[0].file).toBe(successFile);
    expect(results[1].file).toBe(failFile);
  });

  it('should handle individual file errors in batch without failing entire batch', async () => {
    const files: string[] = [];
    
    // Create valid file
    const validYaml = `
prompt: "Valid prompt"
expected_behavior:
  - "Should work"
`;
    const validFile = path.join(tempDir, 'valid.yaml');
    await fs.writeFile(validFile, validYaml);
    files.push(validFile);

    // Add non-existent file
    const invalidFile = path.join(tempDir, 'nonexistent.yaml');
    files.push(invalidFile);

    // Mock response for valid file
    mockQuery
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: 'Good response' };
      })
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: '✅ Should work - PASS' };
      });

    const results = await runner.runBatch(files);

    expect(results).toHaveLength(2);
    expect(results[0].result.overall).toBe(true);
    expect(results[1].result.overall).toBe(false);
    expect(results[1].result.criteria[0].criterion).toBe('File processing');
    expect(results[1].result.criteria[0].reason).toMatch(/ENOENT|no such file|Unknown error/);
  });

  it('should pass correct prompts to Claude and Judge', async () => {
    const yamlContent = `
prompt: "Create a hello world function"
expected_behavior:
  - "Should print hello world"
  - "Should be a function"
`;
    const testFile = path.join(tempDir, 'prompt-test.yaml');
    await fs.writeFile(testFile, yamlContent);

    mockQuery
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: 'console.log("Hello World")' };
      })
      .mockImplementationOnce(async function* () {
        yield { type: 'result', result: '✅ All criteria passed' };
      });

    await runner.runSingle(testFile);

    // Check Claude call
    const expectedPrompt = `Respond to the following prompt with text only. Do NOT use any tools, create/modify/delete files, or execute commands. Just provide a direct text response.

User prompt: Create a hello world function

REMEMBER: Text response only, no file operations or tool usage.`;
    expect(mockQuery).toHaveBeenNthCalledWith(1, {
      prompt: expectedPrompt,
      options: { 
        permissionMode: 'default',
        cwd: expect.stringContaining('test/temp'),
        model: 'sonnet'
      }
    });

    // Check Judge call
    const judgeCall = mockQuery.mock.calls[1][0] as { prompt: string };
    expect(judgeCall.prompt).toContain('console.log("Hello World")');
    expect(judgeCall.prompt).toContain('Should print hello world');
    expect(judgeCall.prompt).toContain('Should be a function');
    expect(judgeCall.prompt).toContain('✅');
    expect(judgeCall.prompt).toContain('❌');
  });
});