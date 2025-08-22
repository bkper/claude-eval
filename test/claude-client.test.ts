import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the Claude Code SDK
const mockQuery = jest.fn();
jest.mock('@anthropic-ai/claude-code', () => ({
  query: mockQuery,
}));

import { ClaudeClient } from '../src/claude-client';

describe('ClaudeClient', () => {
  let client: ClaudeClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new ClaudeClient();
  });

  it('should execute prompt and return response', async () => {
    const mockResponse = 'Test response from Claude';
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: mockResponse };
    });

    const result = await client.execute('Test prompt');
    expect(result).toBe(mockResponse);
    expect(mockQuery).toHaveBeenCalledWith({ prompt: 'Test prompt - give the most detailed plan possible', options: { permissionMode: 'plan' } });
  });

  it('should pass permissionMode: plan option to SDK', async () => {
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: 'Response' };
    });

    await client.execute('Test prompt');
    expect(mockQuery).toHaveBeenCalledWith({ prompt: 'Test prompt - give the most detailed plan possible', options: { permissionMode: 'plan' } });
  });

  it('should handle multiple message chunks and concatenate them', async () => {
    mockQuery.mockImplementation(async function* () {
      yield { type: 'result', result: 'First part ' };
      yield { type: 'result', result: 'second part' };
    });

    const result = await client.execute('Test prompt');
    expect(result).toBe('First part second part');
  });

  it('should handle SDK errors gracefully (network, rate limits, auth)', async () => {
    mockQuery.mockImplementation(async function* () {
      throw new Error('Network error');
    });

    await expect(client.execute('Test prompt')).rejects.toThrow('Network error');
  });

  it('should ignore non-result message types (status, progress)', async () => {
    mockQuery.mockImplementation(async function* () {
      yield { type: 'status', content: 'Starting...' };
      yield { type: 'result', result: 'Actual response' };
      yield { type: 'progress', content: '50%' };
    });

    const result = await client.execute('Test prompt');
    expect(result).toBe('Actual response');
  });

  it('should timeout after configurable duration', async () => {
    mockQuery.mockImplementation(async function* () {
      await new Promise(resolve => setTimeout(resolve, 2000));
      yield { type: 'result', result: 'Response' };
    });

    await expect(client.execute('Test prompt', { timeout: 1000 })).rejects.toThrow('timeout');
  });
});