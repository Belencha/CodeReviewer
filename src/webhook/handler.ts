import { Request, Response } from 'express';
import { GitLabWebhookEvent } from '../types/gitlab';
import { processMergeRequest } from '../services/reviewService';
import { logger } from '../utils/logger';

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  try {
    const event: GitLabWebhookEvent = req.body;
    
    // Only process merge request events
    if (event.object_kind !== 'merge_request') {
      logger.info(`Ignoring event type: ${event.object_kind}`);
      res.status(200).json({ message: 'Event ignored' });
      return;
    }

    const mergeRequest = event.object_attributes;
    
    // Only process when MR is opened or updated (not closed/merged)
    if (mergeRequest.state !== 'opened' && mergeRequest.action !== 'update') {
      logger.info(`Ignoring MR ${mergeRequest.iid} with state: ${mergeRequest.state}`);
      res.status(200).json({ message: 'MR state ignored' });
      return;
    }

    logger.info(`Processing merge request #${mergeRequest.iid}: ${mergeRequest.title}`);

    // Process the merge request asynchronously
    processMergeRequest(event).catch((error) => {
      logger.error(`Error processing MR #${mergeRequest.iid}:`, error);
    });

    // Respond immediately to GitLab
    res.status(200).json({ message: 'Webhook received, processing...' });
  } catch (error) {
    logger.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

