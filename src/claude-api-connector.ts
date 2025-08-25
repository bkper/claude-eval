import { query } from '@anthropic-ai/claude-code';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

export interface ClaudeQueryOptions {
  permissionMode?: string;
  cwd?: string;
  model?: string;
  [key: string]: any;
}

export class ClaudeApiConnector {
  private claudeExecutablePath: string | undefined;

  private findClaudeExecutable(): string | undefined {
    if (this.claudeExecutablePath) {
      return this.claudeExecutablePath;
    }

    // Try to find claude executable using 'which' command
    try {
      const claudePath = execSync('which claude', { encoding: 'utf-8' }).trim();
      if (claudePath && existsSync(claudePath)) {
        // Follow symlinks to get the actual cli.js file
        const actualPath = execSync(`readlink -f "${claudePath}"`, { encoding: 'utf-8' }).trim();
        if (actualPath && existsSync(actualPath)) {
          this.claudeExecutablePath = actualPath;
          return actualPath;
        }
      }
    } catch (e) {
      // 'which' command failed, try other methods
    }

    // Try common locations
    const possiblePaths = [
      // Local node_modules
      join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
      // Parent directory node_modules
      join(process.cwd(), '..', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
      // Global npm
      join(process.env.HOME || '', '.npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
      // Global bun
      join(process.env.HOME || '', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        this.claudeExecutablePath = path;
        return path;
      }
    }

    return undefined;
  }

  queryRaw(prompt: string, queryOptions: ClaudeQueryOptions = {}) {
    const claudePath = this.findClaudeExecutable();
    
    // Prepare query options with the correct claude executable path
    const finalOptions: any = {
      permissionMode: 'default',
      model: 'sonnet',
      ...queryOptions
    };
    
    // Add the path to claude executable if found
    if (claudePath) {
      finalOptions.pathToClaudeCodeExecutable = claudePath;
    }
    
    return query({ prompt, options: finalOptions });
  }
}