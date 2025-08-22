# claude-code-eval - Evaluation System for Claude Code Agent

## Executive Summary
A Test-Driven Development (TDD) approach to build a Node.js CLI application that evaluates AI agent responses using Claude Code SDK and LLM-as-a-judge methodology. The system will test whether changes to bkper-os context definitions improve or degrade response quality.

## Goals
- Automated evaluation of context definition changes
- Reliable pass/fail criteria using LLM-as-a-judge
- CLI tool for both single and batch evaluations
- JSON output support for CI/CD integration

## Architecture

### 1. CLI Interface (`bin/claude-code-eval.ts`)
```bash
# Run evaluation - SDK handles context automatically
claude-code-eval evals/developer-suggest-strong-type.yaml
```

### 2. Core Components

**Eval Runner (`src/eval-runner.ts`)**
- Load YAML eval specifications
- Execute prompts via Claude Code SDK
- Coordinate evaluation pipeline
- Support parallel execution for batch evaluations
- Implement concurrency limits to avoid rate limiting

**Claude Client (`src/claude-client.ts`)**
- Simple wrapper around `@anthropic-ai/claude-code` SDK
- Execute query in plan mode
- Return Claude's response

**Judge Evaluator (`src/judge-evaluator.ts`)**
- Use Claude SDK to evaluate response against expected_behavior
- Apply LLM-as-a-judge methodology
- Return structured pass/fail results per criteria

### 3. File Structure
```
claude-code-eval/
├── package.json
├── bin/
│   └── claude-code-eval.ts       # CLI entry point
└── src/
    ├── eval-runner.ts            # Main orchestrator
    ├── claude-client.ts          # Claude SDK wrapper
    ├── judge-evaluator.ts        # LLM-as-judge evaluation
    └── utils/
        ├── yaml-parser.ts        # YAML parsing
        └── result-formatter.ts   # Output formatting
```

### 4. Implementation Flow

#### Single Evaluation
1. **Parse YAML spec** with prompt and expected_behavior
2. **Query Claude** using SDK with the prompt (in plan mode)
3. **Evaluate response** using judge with expected_behavior criteria
4. **Display results** with ✅/❌ for each criterion

#### Batch Evaluation (Parallel)
1. **Glob pattern matching** to find all eval files
2. **Parse all YAML specs** concurrently
3. **Execute evaluations in parallel** with concurrency limit (e.g., 5 concurrent)
4. **Aggregate results** as evaluations complete
5. **Display summary** with overall pass/fail statistics



## Usage
```bash
# Single evaluation
cc-eval evals/developer-suggest-strong-type.yaml

# Multiple evaluations
cc-eval evals/*.yaml

# JSON output
cc-eval evals/test.yaml --format=json
```

## TDD Implementation Phases

### Phase 0: Project Setup
- Initialize new Node.js project with TypeScript using bun
- Install development dependencies (Jest, TypeScript, types) using bun
- Configure Jest for TypeScript
- Set up test directory structure
- Create empty source files matching architecture

### Phase 1: Write Tests (Red Phase)

#### 1.1 Unit Test Specifications

**test/utils/yaml-parser.test.ts**
- Should parse valid YAML with prompt and expected_behavior fields
- Should throw error for missing prompt field
- Should throw error for missing expected_behavior field
- Should handle multiline prompts with > syntax
- Should validate expected_behavior is an array
- Should handle optional metadata fields (description, category)

**test/claude-client.test.ts**
- Should execute prompt and return response
- Should pass planMode: true option to SDK
- Should handle multiple message chunks and concatenate them
- Should handle SDK errors gracefully (network, rate limits, auth)
- Should ignore non-result message types (status, progress)
- Should timeout after configurable duration

**test/judge-evaluator.test.ts**
- Should evaluate all criteria and return structured results
- Should parse ✅/❌ indicators correctly
- Should handle ambiguous or unclear evaluations as failures
- Should construct proper judge prompt with response and criteria
- Should handle empty responses
- Should handle malformed judge responses gracefully

**test/utils/result-formatter.test.ts**
- Should format console output with colored ✅/❌ indicators
- Should show overall PASSED/FAILED status
- Should display summary statistics (X/Y passed)
- Should produce valid JSON structure for --format=json
- Should handle empty results array
- Should format batch evaluation results

#### 1.2 Integration Test Specifications

**test/integration/eval-runner.test.ts**
- Should run complete evaluation pipeline end-to-end
- Should handle evaluation failures correctly
- Should support batch evaluations of multiple files in parallel
- Should aggregate results from parallel batch runs
- Should handle file reading errors
- Should validate YAML before execution
- Should limit concurrent evaluations to avoid rate limits

**test/integration/cli.test.ts**
- Should execute single evaluation from command line
- Should support JSON output format via --format flag
- Should handle missing files with clear error message
- Should support glob patterns for batch evaluation
- Should exit with non-zero code on evaluation failure
- Should show help text with --help flag

### Phase 2: Verify Tests Fail (Red Verification)
- Run `bun test` to verify all tests fail
- Ensure failures are for the right reasons (missing implementation, not test errors)
- Fix any test setup issues before proceeding

### Phase 3: Implement Minimal Code (Green Phase)

#### 3.1 Implementation Order
1. **yaml-parser.ts** - Basic YAML parsing and validation
2. **result-formatter.ts** - Output formatting utilities
3. **claude-client.ts** - Claude SDK integration
4. **judge-evaluator.ts** - Evaluation logic
5. **eval-runner.ts** - Orchestration logic with parallel execution support
6. **CLI entry point** - Command-line interface

#### 3.2 Implementation Strategy
- Write only enough code to make each test pass
- Don't add features not required by tests
- Run tests after each component implementation
- Commit when a test suite turns green

### Phase 4: Refactor (Clean Code Phase)
- Extract common code into shared utilities
- Improve error messages and logging
- Optimize performance where needed
- Ensure consistent code style
- Add JSDoc comments for public APIs
- Keep tests green throughout refactoring

### Phase 5: Integration Testing
- Run end-to-end tests with real YAML files
- Test CLI with various command-line arguments
- Verify error handling and edge cases
- Ensure exit codes are correct

### Phase 6: Documentation & Release
- Update README with usage instructions
- Add example evaluation specs
- Document expected_behavior format
- Create bun scripts for common tasks
- Tag release version

## Test Strategy

### Mocking Strategy
- Mock `@anthropic-ai/claude-code` SDK for predictable testing
- Mock file system for error condition testing
- Use real YAML parsing to catch actual parsing issues

### Coverage Goals
- Unit tests: >90% coverage
- Integration tests: >80% coverage
- Edge cases: All identified edge cases covered

### CI/CD Integration
- Run tests on every commit
- Block merge if tests fail
- Generate coverage reports

## Dependencies
- **Production:**
  - `@anthropic-ai/claude-code` - Claude Code SDK
  - `yaml` - Parse YAML specs
  - `commander` - CLI arguments
  - `chalk` - Colored output
  - `glob` - Pattern matching
  - `p-limit` - Concurrency control for parallel execution

- **Development:**
  - `jest` - Testing framework
  - `typescript` - TypeScript compiler
  - `@types/jest` - TypeScript definitions
  - `@types/node` - Node.js types