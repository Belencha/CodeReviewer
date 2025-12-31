# CodeReviewer

An AI-powered code review agent for GitLab merge requests. This service automatically analyzes merge requests and posts constructive comments on code that could be improved, contains potential bugs, or is missing tests.

## Architecture

This is a **server-only** application designed for deployment in private corporate VPNs. It works as follows:

1. **GitLab Webhook** → Receives webhook events when merge requests are created or updated
2. **Code Analysis** → Fetches the diff and analyzes it using AI (OpenAI)
3. **Comment Posting** → Posts review comments directly to the GitLab merge request

No client-side application is needed. The service runs as a background process on an Ubuntu VM inside your corporate VPN, listening for webhook events from your private GitLab instance.

## Features

- 🤖 Automatic code review using AI
- 🔍 Detects bugs, security issues, and code quality problems
- 💬 Posts inline comments on specific lines of code
- 🚀 Asynchronous processing (responds immediately to webhooks)
- 📝 Supports multiple file changes in a single MR

## Setup

### Prerequisites

- **Deployment Environment**: Ubuntu VM inside your corporate VPN with:
  - Network access to your private GitLab instance
  - Internet access (for OpenAI API)
- Node.js 18+ and npm (or Docker)
- GitLab Personal Access Token with `api` scope
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd CodeReviewer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the example:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
   - `GITLAB_TOKEN`: Your GitLab Personal Access Token (needs `api` scope)
   - `GITLAB_HOST`: Your **private** GitLab instance URL (e.g., `https://gitlab.company.internal`)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_MODEL`: Model to use (default: `gpt-4-turbo-preview`)
   - `PORT`: Port for the service (default: 3000)

### Running the Service

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

The service will run on `http://localhost:3000` by default.

## Deployment

### Quick Start with Docker (Recommended)

1. **On your Ubuntu VM inside the VPN:**
   ```bash
   git clone <repository-url>
   cd CodeReviewer
   cp .env.example .env
   # Edit .env with your configuration
   docker-compose up -d
   ```

2. **Verify it's running:**
   ```bash
   curl http://localhost:3000/health
   docker-compose logs -f
   ```

See [deployment/README.md](deployment/README.md) for detailed deployment instructions including:
- Docker deployment
- Direct Node.js deployment with systemd
- Network configuration for private VPNs
- Troubleshooting guide

## GitLab Webhook Configuration

1. **Determine your webhook URL:**
   - If service runs on VM accessible from GitLab: `http://<vm-ip>:3000/webhook/gitlab`
   - If using internal domain: `http://code-reviewer.company.internal:3000/webhook/gitlab`
   - The URL must be reachable from your GitLab instance within the VPN

2. **Configure webhook in GitLab:**
   - Go to your GitLab project → Settings → Webhooks
   - **URL**: Your internal webhook URL (see above)
   - **Trigger**: Select "Merge request events"
   - **Secret token** (optional): Set `WEBHOOK_SECRET` in your `.env`
   - **Enable SSL verification**: Disable if using HTTP (use HTTPS in production)

3. **Test the webhook:**
   - Create a test merge request
   - Check service logs to verify webhook was received
   - Verify comments appear on the merge request

## How It Works

1. When a merge request is created or updated, GitLab sends a webhook to your server
2. The server fetches the merge request diff using the GitLab API
3. Each changed file is analyzed by the AI service
4. Review comments are posted as inline comments on specific lines
5. Team members can review and act on the AI's suggestions

## Project Structure

```
CodeReviewer/
├── src/
│   ├── index.ts                 # Main server entry point
│   ├── webhook/
│   │   └── handler.ts          # Webhook request handler
│   ├── services/
│   │   ├── reviewService.ts    # Main review orchestration
│   │   ├── gitlabService.ts    # GitLab API integration
│   │   └── aiService.ts        # AI code analysis
│   ├── types/
│   │   └── gitlab.ts           # TypeScript types for GitLab
│   └── utils/
│       └── logger.ts           # Logging utility
├── deployment/
│   ├── README.md               # Detailed deployment guide
│   └── systemd/
│       └── code-reviewer.service  # systemd service file
├── Dockerfile                  # Docker container definition
├── docker-compose.yml          # Docker Compose configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Customization

### Adjusting AI Review Behavior

Edit `src/services/aiService.ts` to modify the system prompt and change what the AI looks for in code reviews.

### Filtering Files

Modify `src/services/reviewService.ts` to skip certain file types or paths:
```typescript
// Skip certain file types
if (diff.new_path.endsWith('.lock') || diff.new_path.endsWith('.min.js')) {
  continue;
}
```

### Rate Limiting

Consider adding rate limiting to avoid overwhelming GitLab or OpenAI APIs when processing many merge requests.

## Troubleshooting

- **Webhook not received**: 
  - Verify the service is running: `docker-compose ps` or `systemctl status code-reviewer`
  - Check if webhook URL is accessible from GitLab: `curl http://<vm-ip>:3000/health`
  - Verify firewall rules allow traffic on the configured port
  - Check service logs for errors
  
- **Cannot connect to GitLab**:
  - Verify `GITLAB_HOST` uses your internal GitLab URL (not gitlab.com)
  - Test connectivity: `curl -H "PRIVATE-TOKEN: <token>" https://<gitlab-host>/api/v4/user`
  - Ensure VPN network routing is correct
  
- **No comments posted**: Verify your GitLab token has the correct permissions (`api` scope)

- **AI errors**: Check your OpenAI API key, account credits, and internet connectivity from the VM

See [deployment/README.md](deployment/README.md) for more detailed troubleshooting.

## License

MIT
