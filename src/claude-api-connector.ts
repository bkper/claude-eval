import { query } from '@anthropic-ai/claude-code';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { BaseProgressReporter } from './utils/base-progress-reporter.js';

export interface ClaudeQueryOptions {
  permissionMode?: string;
  cwd?: string;
  model?: string;
  progressReporter?: BaseProgressReporter;
  [key: string]: any;
}

export class ClaudeApiConnector {
  private claudeExecutablePath: string | undefined;

  private findClaudeExecutable(progressReporter?: BaseProgressReporter): string | undefined {
    if (this.claudeExecutablePath) {
      if (progressReporter) {
        progressReporter.debug(`Using cached Claude binary: ${this.claudeExecutablePath}`);
      }
      return this.claudeExecutablePath;
    }

    if (progressReporter) {
      progressReporter.debug('Searching for Claude Code binary...');
    }

    // Try to find claude executable using 'which' command
    try {
      if (progressReporter) {
        progressReporter.debug('Attempting to locate Claude Code binary with "which claude" command');
      }
      
      const claudePath = execSync('which claude', { encoding: 'utf-8' }).trim();
      if (progressReporter) {
        progressReporter.debug(`Found claude at: ${claudePath}`);
      }
      
      if (claudePath && existsSync(claudePath)) {
        // Follow symlinks to get the actual cli.js file
        const actualPath = execSync(`readlink -f "${claudePath}"`, { encoding: 'utf-8' }).trim();
        if (progressReporter) {
          progressReporter.debug(`Resolved symlink to actual path: ${actualPath}`);
        }
        
        if (actualPath && existsSync(actualPath)) {
          this.claudeExecutablePath = actualPath;
          
          if (progressReporter) {
            progressReporter.debug(`✅ Found Claude Code binary: ${actualPath}`);
          }
          
          return actualPath;
        }
      }
    } catch (e: any) {
      if (progressReporter) {
        progressReporter.debug(`"which claude" command failed: ${e.message || e}`);
        progressReporter.debug('Falling back to checking common installation paths...');
      }
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

    if (progressReporter) {
      progressReporter.debug(`Checking ${possiblePaths.length} common installation paths...`);
    }

    for (const path of possiblePaths) {
      if (progressReporter) {
        progressReporter.debug(`Checking: ${path}`);
      }
      
      if (existsSync(path)) {
        this.claudeExecutablePath = path;
        
        if (progressReporter) {
          progressReporter.debug(`✅ Found Claude Code binary: ${path}`);
        }
        
        return path;
      }
    }

    if (progressReporter) {
      progressReporter.debug('❌ No Claude Code binary found in any searched location');
      progressReporter.debug('Searched paths:');
      possiblePaths.forEach(path => progressReporter!.debug(`  - ${path}`));
    }

    return undefined;
  }

  private getClaudeVersion(binaryPath: string): string | undefined {
    try {
      const versionOutput = execSync(`node "${binaryPath}" --version`, { encoding: 'utf-8', timeout: 5000 });
      return versionOutput.trim();
    } catch (e) {
      // Version check failed, but that's not critical
      return undefined;
    }
  }

  queryRaw(prompt: string, queryOptions: ClaudeQueryOptions = {}) {
    const { progressReporter, ...otherOptions } = queryOptions;
    const claudePath = this.findClaudeExecutable(progressReporter);
    
    if (progressReporter) {
      if (claudePath) {
        progressReporter.debug(`Using Claude Code binary: ${claudePath}`);
      } else {
        progressReporter.debug('⚠️  No Claude Code binary found - query may fail');
      }
    }
    
    // Prepare query options with the correct claude executable path
    const finalOptions: any = {
      permissionMode: 'default',
      model: 'sonnet',
      ...otherOptions
    };
    
    // Add the path to claude executable if found
    if (claudePath) {
      finalOptions.pathToClaudeCodeExecutable = claudePath;
    }
    
    if (progressReporter) {
      progressReporter.debug('Final query options: ' + JSON.stringify({
        ...finalOptions,
        pathToClaudeCodeExecutable: finalOptions.pathToClaudeCodeExecutable ? '[REDACTED_PATH]' : undefined
      }, null, 2));
    }
    
    return query({ prompt, options: finalOptions });
  }
}