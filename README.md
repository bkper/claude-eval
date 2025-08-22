# claude-code-eval

An evaluation system for AI agent responses using LLM-as-a-judge methodology. This tool helps test and validate Claude Code SDK responses against defined criteria.

## Installation

```bash
bun install
```

## Usage

### Single Evaluation

```bash
bun run claude-code-eval evals/developer-suggest-strong-type.yaml
```

### Multiple Evaluations (Batch)

```bash
bun run claude-code-eval evals/*.yaml
```

### JSON Output

```bash
bun run claude-code-eval evals/test.yaml --format=json
```

### Custom Concurrency

```bash
bun run claude-code-eval evals/*.yaml --concurrency=3
```

## Evaluation File Format

Evaluation files are YAML documents with the following structure:

```yaml
prompt: >
  Create a simple hello world web application 
  to show a message "Hello World" in the browser.

expected_behavior:
  - Recommends TypeScript for the new project
  - Sets up TypeScript configuration (tsconfig.json)
  - Uses .ts file extensions
  - Do NOT recommend .js javascript files

# Optional fields
description: "Tests if Claude suggests TypeScript for new projects"
category: "development-suggestions"
```

## Required Fields

- `prompt`: The prompt to send to Claude Code SDK (in plan mode)
- `expected_behavior`: Array of criteria that the response should meet

## Optional Fields

- `description`: Human-readable description of what this evaluation tests
- `category`: Category for organizing evaluations

## How It Works

1. **Parse YAML**: Loads and validates the evaluation specification
2. **Query Claude**: Executes the prompt using Claude Code SDK in plan mode
3. **Judge Response**: Uses LLM-as-a-judge to evaluate the response against criteria
4. **Format Results**: Displays results with ✅/❌ indicators and summary

## Exit Codes

- `0`: All evaluations passed
- `1`: One or more evaluations failed or error occurred

## Development

### Running Tests

```bash
bun test
```

### Test Coverage

```bash
bun run test:coverage
```

### Watch Mode

```bash
bun run test:watch
```

## Architecture

- **yaml-parser**: Parses and validates YAML evaluation specs
- **claude-client**: Wrapper around Claude Code SDK
- **judge-evaluator**: LLM-as-a-judge evaluation logic
- **eval-runner**: Orchestrates single and batch evaluations
- **result-formatter**: Formats output for console and JSON
- **CLI**: Command-line interface with glob pattern support
