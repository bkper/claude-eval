# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude-eval is a TypeScript-based CLI tool that provides evaluation capabilities for Claude Code using LLM-as-a-judge methodology. It enables PASS/FAIL testing of Claude Code responses against defined criteria in YAML evaluation files.

**Core Architecture:**
- `ClaudeClient`: Executes prompts using the Claude Code SDK with Haiku model in plan mode
- `JudgeEvaluator`: Evaluates responses against criteria using Haiku model as a judge
- `EvalRunner`: Orchestrates single and batch evaluations with concurrency control
- `ProgressReporter` system: Provides detailed feedback during evaluation execution

## Development Commands

**Building and Testing:**
```bash
# Build TypeScript to dist/
npm run build

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Development with auto-rebuild
npm run dev

# Run CLI locally (after build)
npm run dev:run
```

**Clean and Release:**
```bash
# Clean build artifacts
npm run clean

# Version bumps (includes build and git operations)
npm run patch
npm run minor
npm run major
```

## Key Implementation Details

**Module System:**
- Uses ES modules with `.js` extensions in imports (TypeScript outputs to CommonJS)
- Jest configured with ESM support and module mapping for `.js` imports
- All source files use `.ts` extensions but import with `.js` for dist compatibility

**Claude Code Integration:**
- Uses `@anthropic-ai/claude-code` SDK with `query()` function
- Always uses Haiku model for both prompt execution and evaluation
- Sets `permissionMode: 'plan'` for user prompts, `'default'` for judge evaluation
- Passes working directory context from evaluation file location

**Evaluation Flow:**
1. Parse YAML evaluation specs with `parseEvalSpec()`
2. Execute user prompt via `ClaudeClient` with file's directory as cwd
3. Evaluate response via `JudgeEvaluator` against expected behaviors
4. Format results with clear PASS/FAIL indicators

**Progress Reporting System:**
- `BaseProgressReporter`: Abstract interface for progress callbacks
- `ProgressReporter`: Console output for single evaluations
- `TerminalProgressManager`: Coordinates output for batch evaluations
- `BufferedProgressReporter`: Buffers output until evaluation completes

**Error Handling:**
- `EvaluationError` for wrapped evaluation failures
- Timeout protection (180s default) for Claude API calls
- Graceful degradation - failed evaluations return structured error results

## Testing Structure

Tests are organized in `test/` directory:
- Unit tests for individual components (`claude-client.test.ts`, `judge-evaluator.test.ts`)
- Integration tests in `test/integration/`
- Utility tests in `test/utils/`

## File Extensions and Imports

When adding new files, remember:
- Source files use `.ts` extension
- Import statements use `.js` extension (e.g., `import './utils/parser.js'`)
- This allows TypeScript compilation to work with the ES module output structure