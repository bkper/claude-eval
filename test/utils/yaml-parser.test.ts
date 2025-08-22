import { parseEvalSpec, EvalSpec } from '../../src/utils/yaml-parser';

describe('yaml-parser', () => {
  describe('parseEvalSpec', () => {
    it('should parse valid YAML with prompt and expected_behavior fields', () => {
      const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should do something"
  - "Should do something else"
`;
      const result = parseEvalSpec(yamlContent);
      expect(result.prompt).toBe('Test prompt');
      expect(result.expected_behavior).toEqual(['Should do something', 'Should do something else']);
    });

    it('should throw error for missing prompt field', () => {
      const yamlContent = `
expected_behavior:
  - "Should do something"
`;
      expect(() => parseEvalSpec(yamlContent)).toThrow('prompt field is required');
    });

    it('should throw error for missing expected_behavior field', () => {
      const yamlContent = `
prompt: "Test prompt"
`;
      expect(() => parseEvalSpec(yamlContent)).toThrow('expected_behavior field is required');
    });

    it('should handle multiline prompts with > syntax', () => {
      const yamlContent = `
prompt: >
  This is a multiline
  prompt that should be
  combined into one string
expected_behavior:
  - "Should work"
`;
      const result = parseEvalSpec(yamlContent);
      expect(result.prompt).toBe('This is a multiline prompt that should be combined into one string\n');
    });

    it('should validate expected_behavior is an array', () => {
      const yamlContent = `
prompt: "Test prompt"
expected_behavior: "Not an array"
`;
      expect(() => parseEvalSpec(yamlContent)).toThrow('expected_behavior must be an array');
    });

    it('should handle optional metadata fields (description, category)', () => {
      const yamlContent = `
prompt: "Test prompt"
expected_behavior:
  - "Should work"
description: "Test description"
category: "unit-test"
`;
      const result = parseEvalSpec(yamlContent);
      expect(result.description).toBe('Test description');
      expect(result.category).toBe('unit-test');
    });
  });
});