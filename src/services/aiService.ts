import OpenAI from 'openai';
import { Diff } from '../types/gitlab';
import { CommentPosition, ReviewComment } from './gitlabService';
import { logger } from '../utils/logger';

export class AIService {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
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
      
      const response = await this.client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert code reviewer. Analyze the provided code diff and identify:
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

Return your analysis as a JSON array of comments, each with:
- line: the line number in the new file
- comment: the review comment text

Only comment on significant issues. Don't comment on every minor style preference.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        logger.warn('No content in AI response');
        return [];
      }

      const parsed = JSON.parse(content);
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

