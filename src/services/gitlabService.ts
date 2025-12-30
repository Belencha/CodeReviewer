import { Gitlab } from '@gitbeaker/node';
import { Diff, DiscussionNote } from '../types/gitlab';
import { logger } from '../utils/logger';

export interface CommentPosition {
  base_sha: string;
  start_sha: string;
  head_sha: string;
  old_path?: string;
  new_path: string;
  position_type: 'text' | 'file';
  new_line: number;
}

export interface ReviewComment {
  body: string;
  position: CommentPosition;
}

export class GitLabService {
  private api: InstanceType<typeof Gitlab>;

  constructor() {
    const token = process.env.GITLAB_TOKEN;
    const host = process.env.GITLAB_HOST || 'https://gitlab.com';

    if (!token) {
      throw new Error('GITLAB_TOKEN environment variable is required');
    }

    this.api = new Gitlab({
      host,
      token,
    });
  }

  async getMergeRequestDiff(
    projectId: number,
    mergeRequestIid: number
  ): Promise<Diff[]> {
    try {
      const diffs = await this.api.MergeRequests.allDiffs(projectId, mergeRequestIid);
      return diffs as Diff[];
    } catch (error) {
      logger.error(`Error fetching MR diff:`, error);
      throw error;
    }
  }

  async getMergeRequestInfo(projectId: number, mergeRequestIid: number) {
    try {
      const mr = await this.api.MergeRequests.show(projectId, mergeRequestIid);
      return mr;
    } catch (error) {
      logger.error(`Error fetching MR info:`, error);
      throw error;
    }
  }

  async postComment(
    projectId: number,
    mergeRequestIid: number,
    body: string,
    position?: CommentPosition
  ): Promise<void> {
    try {
      if (position) {
        // Post as a review comment on a specific line
        await this.api.MergeRequestDiscussions.create(projectId, mergeRequestIid, {
          body,
          position: {
            base_sha: position.base_sha,
            start_sha: position.start_sha,
            head_sha: position.head_sha,
            old_path: position.old_path,
            new_path: position.new_path,
            position_type: position.position_type,
            new_line: position.new_line,
          },
        });
      } else {
        // Post as a general note
        await this.api.MergeRequestNotes.create(projectId, mergeRequestIid, {
          body,
        });
      }
    } catch (error) {
      logger.error(`Error posting comment:`, error);
      throw error;
    }
  }
}

