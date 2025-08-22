import { ClaudeClient } from '../src/claude-client';

// Mock the Claude Code SDK
jest.mock('@anthropic-ai/claude-code', () => ({
  Client: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
  })),
}));

describe('ClaudeClient', () => {
  let client: ClaudeClient;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    const { Client } = require('@anthropic-ai/claude-code');
    mockQuery = jest.fn();
    Client.mockImplementation(() => ({
      query: mockQuery,
    }));
    client = new ClaudeClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should execute prompt and return response', async () => {
    const mockResponse = 'Test response from Claude';
    mockQuery.mockResolvedValue([
      { type: 'result', content: mockResponse }
    ]);

    const result = await client.execute('Test prompt');
    expect(result).toBe(mockResponse);
    expect(mockQuery).toHaveBeenCalledWith('Test prompt', { planMode: true });
  });

  it('should pass planMode: true option to SDK', async () => {
    mockQuery.mockResolvedValue([
      { type: 'result', content: 'Response' }
    ]);

    await client.execute('Test prompt');
    expect(mockQuery).toHaveBeenCalledWith('Test prompt', { planMode: true });
  });

  it('should handle multiple message chunks and concatenate them', async () => {
    mockQuery.mockResolvedValue([
      { type: 'result', content: 'First part ' },
      { type: 'result', content: 'second part' }
    ]);

    const result = await client.execute('Test prompt');
    expect(result).toBe('First part second part');
  });

  it('should handle SDK errors gracefully (network, rate limits, auth)', async () => {
    mockQuery.mockRejectedValue(new Error('Network error'));

    await expect(client.execute('Test prompt')).rejects.toThrow('Network error');
  });

  it('should ignore non-result message types (status, progress)', async () => {
    mockQuery.mockResolvedValue([
      { type: 'status', content: 'Starting...' },
      { type: 'result', content: 'Actual response' },
      { type: 'progress', content: '50%' }
    ]);

    const result = await client.execute('Test prompt');
    expect(result).toBe('Actual response');
  });

  it('should timeout after configurable duration', async () => {
    mockQuery.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 2000)));

    await expect(client.execute('Test prompt', { timeout: 1000 })).rejects.toThrow('timeout');
  });
});