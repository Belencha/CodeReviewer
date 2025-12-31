import OpenAI from 'openai';
import axios from 'axios';
import { Diff } from '../types/gitlab';
import { CommentPosition, ReviewComment } from './gitlabService';
import { logger } from '../utils/logger';

type AIProvider = 'openai' | 'ollama';

interface AIResponse {
  comments: Array<{
    line: number;
    comment: string;
  }>;
}

export class AIService {
  private provider: AIProvider;
  private openaiClient?: OpenAI;
  private ollamaUrl: string;

  constructor() {
    this.provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase() as AIProvider;
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://ollama:11434';

    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required when using OpenAI provider');
      }
      this.openaiClient = new OpenAI({ apiKey });
    } else if (this.provider === 'ollama') {
      logger.info(`Using Ollama provider at ${this.ollamaUrl}`);
    } else {
      throw new Error(`Unsupported AI provider: ${this.provider}. Use 'openai' or 'ollama'`);
    }
  }

  async analyzeDiff(
    diff: Diff,
    mrTitle: string,
    mrDescription: string,
    baseSha: string,
    startSha: string,
    headSha: string
  ): Promise<ReviewComment[]> {
    try {
      const prompt = this.buildReviewPrompt(diff, mrTitle, mrDescription);

      let responseContent: string;

      if (this.provider === 'openai') {
        responseContent = await this.analyzeWithOpenAI(prompt);
      } else {
        responseContent = await this.analyzeWithOllama(prompt);
      }

      if (!responseContent) {
        logger.warn('No content in AI response');
        return [];
      }

      // Parse JSON response
      const parsed = this.parseAIResponse(responseContent);
      const comments = parsed.comments || [];

      // Convert to ReviewComment format
      return comments.map((comment: any) => ({
        body: comment.comment,
        position: {
          base_sha: baseSha,
          start_sha: startSha,
          head_sha: headSha,
          new_path: diff.new_path,
          old_path: diff.old_path !== diff.new_path ? diff.old_path : undefined,
          position_type: 'text' as const,
          new_line: comment.line,
        },
      }));
    } catch (error) {
      logger.error('Error analyzing diff with AI:', error);
      return [];
    }
  }

  private async analyzeWithOpenAI(prompt: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    const response = await this.openaiClient.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || '';
  }

  private async analyzeWithOllama(prompt: string): Promise<string> {
    const model = process.env.OLLAMA_MODEL || 'codellama:13b';

    try {
      const response = await axios.post(
        `${this.ollamaUrl}/api/generate`,
        {
          model,
          prompt: `${this.getSystemPrompt()}\n\n${prompt}\n\nRemember to respond with valid JSON only.`,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 2000,
          },
        },
        {
          timeout: 120000, // 2 minutes timeout
        }
      );

      return response.data.response || '';
    } catch (error: any) {
      logger.error(`Error calling Ollama API: ${error.message}`);
      if (error.code === 'ECONNREFUSED') {
        logger.error(`Cannot connect to Ollama at ${this.ollamaUrl}. Is Ollama running?`);
      }
      throw error;
    }
  }

  private parseAIResponse(content: string): AIResponse {
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to find JSON object in the response
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }

      // Fallback: try parsing the entire content
      return JSON.parse(content);
    } catch (error) {
      logger.error('Error parsing AI response as JSON:', error);
      logger.debug('Response content:', content);
      // Return empty comments if parsing fails
      return { comments: [] };
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert code reviewer. Analyze the provided code diff and identify:
1. Potential bugs or errors
2. Code quality improvements
3. Security vulnerabilities
4. Performance issues
5. Missing tests
6. Best practices violations
7. Code style inconsistencies

For each issue found, provide:
- The line number where the issue occurs
- A clear, constructive comment explaining the issue
- A suggestion for improvement if applicable

Return your analysis as a JSON object with this structure:
{
  "comments": [
    {
      "line": <line_number>,
      "comment": "<your review comment>"
    }
  ]
}

Only comment on significant issues. Don't comment on every minor style preference.`;
  }

  private buildReviewPrompt(diff: Diff, mrTitle: string, mrDescription: string): string {
    return `Review this code change:

Merge Request Title: ${mrTitle}
Merge Request Description: ${mrDescription}

File: ${diff.new_path}
${diff.old_path !== diff.new_path ? `(renamed from ${diff.old_path})` : ''}

Diff:
\`\`\`
${diff.diff}
\`\`\`

Please analyze this code change and provide your review comments as a JSON object with this structure:
{
  "comments": [
    {
      "line": <line_number>,
      "comment": "<your review comment>"
    }
  ]
}`;
  }
}
