# claude-eval

[![npm version](https://img.shields.io/npm/v/claude-eval.svg)](https://www.npmjs.com/package/claude-eval)
[![npm downloads](https://img.shields.io/npm/dm/claude-eval.svg)](https://www.npmjs.com/package/claude-eval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

An evaluation tool for [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), using a [LLM-as-a-judge](https://towardsdatascience.com/llm-as-a-judge-a-practical-guide/) simplified approach. 

When changing Claude Code memories, commands, agents and models:

- How can you know if the change work as expected?
- How can you know if the change will NOT break something else?

This tool solves those problems by enabling Eval-driven development for Claude Code. 

![Claude Code Eval Demo](https://github.com/bkper/claude-eval/blob/main/imgs/claude-eval.gif?raw=1)

No complex scoring or ranking — just clear PASSED ✅ / FAILED ❌ results for your evaluation criteria.

It's like TDD for AI.


### Prerequisites
- Node.js 18+ or Bun
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) installed and configured in your project

## Installation

### Global Installation (Recommended)

For regular use, install claude-eval globally:

```bash
# Using npm
npm install -g claude-eval

# Using bun
bun install -g claude-eval
```

After global installation, you can use the `claude-eval` command directly and access the update functionality:

```bash
claude-eval --version
claude-eval update
```

### One-time Usage

If you prefer not to install globally, you can run evaluations directly with npx:

```bash
npx claude-eval evals/*.yaml
```

## Usage

```bash
# Single evaluation
claude-eval evals/say-dont-know-clear-way.yaml

# Multiple evaluations (batch)
claude-eval evals/*.yaml

# Custom concurrency
claude-eval evals/*.yaml --concurrency=3

# Check for updates
claude-eval update

# Show help
claude-eval --help
```

## Evaluation File Format

Evaluation files are YAML documents with the following structure:

```yaml

prompt: >
  What is the weather for today?

expected_behavior:
  - Just say you don't know in a clear way.
  - Don't give user alternatives.
  - Don't recommend user to research for the answer elsewhere.

```
- `prompt`: The prompt you would send to Claude Code
- `expected_behavior`: Array of criteria that the response should meet


## How It Works

1. **Parse YAML**: Loads and validates the evaluation specification
2. **Query Claude**: Executes the prompt on **Sonnet** model, on plan mode
3. **Judge Response**: Evaluate the response with **Haiku** model
4. **Format Results**: Displays results with ✅/❌ indicators and summary

## Contributing

We welcome contributions! Please:

1. **Open an issue** to discuss major changes before starting
2. **Follow existing code style** and patterns in the codebase
3. **Add tests** for new features and bug fixes
4. **Update documentation** as needed
5. **Keep it simple** - this tool is intentionally minimal and focused

For bug reports and feature requests, please use the [GitHub Issues](https://github.com/bkper/claude-eval/issues) page.


