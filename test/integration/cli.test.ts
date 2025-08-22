import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';

// Mock filesystem for test files
jest.mock('fs/promises');

describe('CLI Integration', () => {
  const cliPath = path.join(__dirname, '../../bin/claude-eval.ts');
  
  const runCLI = (args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
    return new Promise((resolve) => {
      const child = spawn('bun', ['run', cliPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute single evaluation from command line', async () => {
    const mockReadFile = fs.readFile as jest.Mock;
    mockReadFile.mockResolvedValue(`
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`);

    // Mock the dependencies to return successful results
    jest.doMock('../../src/claude-client', () => ({
      ClaudeClient: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue('Test response')
      }))
    }));

    jest.doMock('../../src/judge-evaluator', () => ({
      JudgeEvaluator: jest.fn().mockImplementation(() => ({
        evaluate: jest.fn().mockResolvedValue({
          overall: true,
          criteria: [{ criterion: 'Should work', passed: true, reason: 'Good' }]
        })
      }))
    }));

    const result = await runCLI(['test.yaml']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✅');
  });

  it('should support JSON output format via --format flag', async () => {
    const mockReadFile = fs.readFile as jest.Mock;
    mockReadFile.mockResolvedValue(`
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`);

    const result = await runCLI(['test.yaml', '--format=json']);
    
    expect(result.exitCode).toBe(0);
    
    // Should be valid JSON
    expect(() => JSON.parse(result.stdout)).not.toThrow();
    
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('overall');
    expect(parsed).toHaveProperty('criteria');
  });

  it('should handle missing files with clear error message', async () => {
    const mockReadFile = fs.readFile as jest.Mock;
    mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

    const result = await runCLI(['nonexistent.yaml']);
    
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('file not found');
  });

  it('should support glob patterns for batch evaluation', async () => {
    const mockReadFile = fs.readFile as jest.Mock;
    mockReadFile.mockResolvedValue(`
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`);

    // Mock glob to return multiple files
    jest.doMock('glob', () => ({
      glob: jest.fn().mockResolvedValue(['test1.yaml', 'test2.yaml'])
    }));

    const result = await runCLI(['*.yaml']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test1.yaml');
    expect(result.stdout).toContain('test2.yaml');
  });

  it('should exit with non-zero code on evaluation failure', async () => {
    const mockReadFile = fs.readFile as jest.Mock;
    mockReadFile.mockResolvedValue(`
prompt: "Test prompt"
expected_behavior:
  - "Should work"
`);

    // Mock evaluation to fail
    jest.doMock('../../src/judge-evaluator', () => ({
      JudgeEvaluator: jest.fn().mockImplementation(() => ({
        evaluate: jest.fn().mockResolvedValue({
          overall: false,
          criteria: [{ criterion: 'Should work', passed: false, reason: 'Bad' }]
        })
      }))
    }));

    const result = await runCLI(['test.yaml']);
    
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('❌');
  });

  it('should show help text with --help flag', async () => {
    const result = await runCLI(['--help']);
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('claude-eval');
    expect(result.stdout).toContain('Usage:');
    expect(result.stdout).toContain('--format');
  });
});