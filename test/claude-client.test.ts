import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the ClaudeApiConnector
const mockQueryRaw = jest.fn();
jest.mock('../src/claude-api-connector', () => ({
  ClaudeApiConnector: jest.fn().mockImplementation(() => ({
    queryRaw: mockQueryRaw,
  })),
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
    mockQueryRaw.mockImplementation(async function* () {
      yield { type: 'result', result: mockResponse };
    });

    const result = await client.execute('Test prompt');
    expect(result).toBe(mockResponse);
    const expectedPrompt = `Respond to the following prompt with text only. Do NOT use any tools, create/modify/delete files, or execute commands. Just provide a direct text response.

User prompt: Test prompt

REMEMBER: Text response only, no file operations or tool usage.`;
    expect(mockQueryRaw).toHaveBeenCalledWith(expectedPrompt, expect.objectContaining({
      cwd: undefined,
      model: 'sonnet'
    }));
  });

  it('should pass permissionMode: default option to SDK', async () => {
    mockQueryRaw.mockImplementation(async function* () {
      yield { type: 'result', result: 'Response' };
    });

    await client.execute('Test prompt');
    const expectedPrompt = `Respond to the following prompt with text only. Do NOT use any tools, create/modify/delete files, or execute commands. Just provide a direct text response.

User prompt: Test prompt

REMEMBER: Text response only, no file operations or tool usage.`;
    expect(mockQueryRaw).toHaveBeenCalledWith(expectedPrompt, expect.objectContaining({
      cwd: undefined,
      model: 'sonnet'
    }));
  });

  it('should handle multiple message chunks and concatenate them', async () => {
    mockQueryRaw.mockImplementation(async function* () {
      yield { type: 'result', result: 'First part ' };
      yield { type: 'result', result: 'second part' };
    });

    const result = await client.execute('Test prompt');
    expect(result).toBe('First part second part');
  });

  it('should handle SDK errors gracefully (network, rate limits, auth)', async () => {
    mockQueryRaw.mockImplementation(async function* () {
      throw new Error('Network error');
    });

    await expect(client.execute('Test prompt')).rejects.toThrow('Network error');
  });

  it('should ignore non-result message types (status, progress)', async () => {
    mockQueryRaw.mockImplementation(async function* () {
      yield { type: 'status', content: 'Starting...' };
      yield { type: 'result', result: 'Actual response' };
      yield { type: 'progress', content: '50%' };
    });

    const result = await client.execute('Test prompt');
    expect(result).toBe('Actual response');
  });

  it('should timeout after configurable duration', async () => {
    mockQueryRaw.mockImplementation(async function* () {
      await new Promise(resolve => setTimeout(resolve, 2000));
      yield { type: 'result', result: 'Response' };
    });

    await expect(client.execute('Test prompt', { timeout: 1000 })).rejects.toThrow('Claude Code process timed out');
  });
});