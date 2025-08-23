# claude-eval

[![npm version](https://badge.fury.io/js/claude-eval.svg)](https://badge.fury.io/js/claude-eval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

An evaluation tool for [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) using a [LLM-as-a-judge](https://towardsdatascience.com/llm-as-a-judge-a-practical-guide/) simplified approach. 

Problems faced when changing Claude Code contexts and models:

- How can you know if the change is working as expected?
- How can you know it was a good or bad change?
- How can you know if the change is NOT breaking something else?

This tool solves those problems by enabling Eval-driven development for Claude Code. 

![Claude Code Eval Demo](https://github.com/bkper/claude-eval/blob/main/imgs/claude-eval.gif?raw=1)

No complex scoring or ranking — just clear PASSED ✅ / FAILED ❌ results for your evaluation criteria.

It's like TDD for your Claude Code setup.

## Installation

### Quick Start (Recommended)
No installation required. Run directly with npm or bun:

```bash
# Using npm
npx claude-eval evals/your-eval.yaml

# Using bun  
bunx claude-eval evals/your-eval.yaml
```

### Prerequisites
- Node.js 18+ or Bun
- Claude Code installed and configured in your project
For Claude Code setup and configuration, see: [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code/overview)


## Usage

```bash
# Single evaluation
npx claude-eval evals/say-dont-know-clear-way.yaml

# Multiple evaluations (batch)
npx claude-eval evals/*.yaml

# Custom concurrency
npx claude-eval evals/*.yaml --concurrency=3
```

## Evaluation File Format

Evaluation files are YAML documents with the following structure:

```yaml

# Evaluate if Claude just says it doesn't know the answer clearly

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
2. **Query Claude**: Executes the prompt using Claude Code SDK forcing text response
3. **Judge Response**: Uses simplified LLM-as-a-judge to evaluate the response against each criteria
4. **Format Results**: Displays results with ✅/❌ indicators and summary

## Contributing

We welcome contributions! Please:

1. **Open an issue** to discuss major changes before starting
2. **Follow existing code style** and patterns in the codebase
3. **Add tests** for new features and bug fixes
4. **Update documentation** as needed
5. **Keep it simple** - this tool is intentionally minimal and focused

For bug reports and feature requests, please use the [GitHub Issues](https://github.com/bkper/claude-eval/issues) page.

## Limitations & Known Issues

- **Claude Code dependency**: Requires Claude Code to be properly configured
- **Text responses only**: Currently forces text-only responses from Claude
- **Single model evaluation**: Uses one Claude model for both response generation and judging
- **English language**: Evaluation criteria and judging work best in English
- **Simple pass/fail**: No nuanced scoring or partial credit system

