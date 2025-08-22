import * as YAML from 'yaml';

export interface EvalSpec {
  prompt: string;
  expected_behavior: string[];
  description?: string;
  category?: string;
}

export function parseEvalSpec(yamlContent: string): EvalSpec {
  const parsed = YAML.parse(yamlContent);
  
  if (!parsed.prompt) {
    throw new Error('prompt field is required');
  }
  
  if (!parsed.expected_behavior) {
    throw new Error('expected_behavior field is required');
  }
  
  if (!Array.isArray(parsed.expected_behavior)) {
    throw new Error('expected_behavior must be an array');
  }
  
  return {
    prompt: parsed.prompt,
    expected_behavior: parsed.expected_behavior,
    description: parsed.description,
    category: parsed.category
  };
}