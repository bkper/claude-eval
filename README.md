# claude-eval

Simple evaluation tool for Claude Code AI agent responses using LLM-as-a-judge methodology. 

Some problems faced as scale Claude Code usage:

- When you change a project, user or company CLAUDE.md file:
  - How can you know it was a good or bad change?
  - How can you know if the change is working as expected?
  - How can you know if the change is breaking something for other users?
- As the SONNET-next, OPUS-next, etc. models released, how can you know if the current setup is still working as expected?

Built on Claude SDK, this tool helps test and validate Claude Code responses against defined criteria, creating a eval-driven development loop for a sustainable Claude Code usage.


## Usage

No installation required. Run directly with npm or bun:

```bash
# Using npm
npx claude-eval evals/simple-hello-world.yaml

# Using bun  
bunx claude-eval evals/simple-hello-world.yaml
```

### Examples

```bash
# Single evaluation
npx claude-eval evals/simple-hello-world.yaml

# Multiple evaluations (batch)
npx claude-eval evals/*.yaml

# Custom concurrency
npx claude-eval evals/*.yaml --concurrency=3

# JSON output
npx claude-eval evals/simple-hello-world.yaml --format=json
```

## Evaluation File Format

Evaluation files are YAML documents with the following structure:

```yaml

# Evaluate if Claude suggests TypeScript for new projects

prompt: >
  Create a simple hello world web application 
  to show a message "Hello World" in the browser.

expected_behavior:
  - Recommends TypeScript for the new project
  - Sets up TypeScript configuration (tsconfig.json)
  - Uses .ts file extensions
  - Do NOT recommend .js javascript files

```

## Configuration

**Required:**
- `prompt`: The prompt to send to Claude Code SDK (in plan mode)
- `expected_behavior`: Array of criteria that the response should meet

## How It Works

1. **Parse YAML**: Loads and validates the evaluation specification
2. **Query Claude**: Executes the prompt using Claude Code SDK in plan mode
3. **Judge Response**: Uses LLM-as-a-judge to evaluate the response against criteria
4. **Format Results**: Displays results with ✅/❌ indicators and summary

