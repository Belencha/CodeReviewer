import { GitLabWebhookEvent, Diff } from '../types/gitlab';
import { GitLabService } from './gitlabService';
import { AIService } from './aiService';
import { logger } from '../utils/logger';

export async function processMergeRequest(event: GitLabWebhookEvent): Promise<void> {
  const { project, object_attributes: mr } = event;
  const projectId = project.id;
  const mergeRequestIid = mr.iid;

  logger.info(`Starting review for MR #${mergeRequestIid} in project ${projectId}`);

  try {
    // Initialize services
    const gitlabService = new GitLabService();
    const aiService = new AIService();

    // Fetch the merge request info to get SHA references
    const mrInfo = await gitlabService.getMergeRequestInfo(projectId, mergeRequestIid);
    const baseSha = mr.diff_refs?.base_sha || mrInfo.diff_refs?.base_sha || '';
    const startSha = mr.diff_refs?.start_sha || mrInfo.diff_refs?.start_sha || '';
    const headSha = mr.diff_refs?.head_sha || mrInfo.diff_refs?.head_sha || '';

    // Fetch the merge request diff
    const diffs = await gitlabService.getMergeRequestDiff(projectId, mergeRequestIid);
    
    if (!diffs || diffs.length === 0) {
      logger.info(`No diffs found for MR #${mergeRequestIid}`);
      return;
    }

    logger.info(`Found ${diffs.length} file(s) changed in MR #${mergeRequestIid}`);

    // Process each changed file
    for (const diff of diffs) {
      // Skip deleted files
      if (diff.deleted_file) {
        continue;
      }

      // Analyze the diff with AI
      const reviewComments = await aiService.analyzeDiff(
        diff,
        mr.title,
        mr.description,
        baseSha,
        startSha,
        headSha
      );

      // Post comments to GitLab
      if (reviewComments.length > 0) {
        for (const comment of reviewComments) {
          await gitlabService.postComment(
            projectId,
            mergeRequestIid,
            comment.body,
            comment.position
          );
          logger.info(`Posted comment on ${diff.new_path} at line ${comment.position?.new_line}`);
        }
      }
    }

    logger.info(`Completed review for MR #${mergeRequestIid}`);
  } catch (error) {
    logger.error(`Error processing MR #${mergeRequestIid}:`, error);
    throw error;
  }
}

