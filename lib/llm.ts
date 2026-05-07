import Groq from 'groq-sdk';
import { OPENAI } from './constants';
import { CODE_REVIEW_PROMPT, LANGUAGE_DETECTION_PROMPT, CONTEXT_AWARE_REVIEW_PROMPT } from './prompt';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ReviewBug {
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggested_code: string;
  line_number: number;
  original_snippet?: string;
}

export interface ReviewResponse {
  language: string;
  ai_reviewed_code: string;
  bugs: ReviewBug[];
}

/**
 * Sends code to Groq for a full review.
 */
export async function reviewCode(
  code: string, 
  language: string = 'auto',
  githubContext?: {
    file_tree: string, package_json: string,
    filename: string, repo_name: string
  }
): Promise<ReviewResponse> {
  let prompt = '';
  
  if (githubContext) {
    prompt = CONTEXT_AWARE_REVIEW_PROMPT
      .replace('{repo_name}', githubContext.repo_name)
      .replace('{filename}', githubContext.filename)
      .replace('{package_json}', githubContext.package_json)
      .replace('{file_tree}', githubContext.file_tree)
      .replace('{code}', code);
  } else {
    prompt = CODE_REVIEW_PROMPT
      .replace('{language}', language)
      .replace('{code}', code);
  }

  const response = await groq.chat.completions.create({
    model: OPENAI.MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: OPENAI.MAX_TOKENS,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('No response from Groq');
  }

  // Robust JSON parsing safety
  const raw = content.trim();
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Invalid JSON response from Groq');
  }

  const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(jsonStr) as ReviewResponse;
  } catch (e) {
    console.error('Groq JSON Parse Error. Raw content snippet:', raw.slice(0, 500));
    // Attempt minor repair: replace literal newlines inside strings with \n
    // This is a common issue with LLMs returning raw blocks
    try {
      const repaired = jsonStr.replace(/\n/g, '\\n').replace(/\r/g, '\\r')
        .replace(/\\n(?=([^"]*"[^"]*")*[^"]*$)/g, '\n'); 
      return JSON.parse(repaired) as ReviewResponse;
    } catch (e2) {
      throw new Error('AI returned invalid JSON format. Please try again.');
    }
  }
}

/**
 * Detects the programming language of a code snippet using Groq.
 */
export async function detectLanguage(code: string): Promise<string> {
  const prompt = LANGUAGE_DETECTION_PROMPT.replace('{code}', code);

  const response = await groq.chat.completions.create({
    model: OPENAI.MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 50,
    temperature: 0,
  });

  const content = response.choices[0].message.content;
  return content?.trim().toLowerCase() || 'unknown';
}
