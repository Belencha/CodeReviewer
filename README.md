# CodeReviewer

An AI-powered code review agent for GitLab merge requests. This service automatically analyzes merge requests and posts constructive comments on code that could be improved, contains potential bugs, or is missing tests.

## Architecture

This is a **server-only** application that works as follows:

1. **GitLab Webhook** → Receives webhook events when merge requests are created or updated
2. **Code Analysis** → Fetches the diff and analyzes it using AI (OpenAI)
3. **Comment Posting** → Posts review comments directly to the GitLab merge request

No client-side application is needed. The service runs as a background process that listens for webhook events.

## Features

- 🤖 Automatic code review using AI
- 🔍 Detects bugs, security issues, and code quality problems
- 💬 Posts inline comments on specific lines of code
- 🚀 Asynchronous processing (responds immediately to webhooks)
- 📝 Supports multiple file changes in a single MR

## Setup

### Prerequisites

- Node.js 18+ and npm
- GitLab account with a Personal Access Token
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
   - `GITLAB_HOST`: Your GitLab instance URL (default: `https://gitlab.com`)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OPENAI_MODEL`: Model to use (default: `gpt-4-turbo-preview`)

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

## GitLab Webhook Configuration

1. Go to your GitLab project → Settings → Webhooks
2. Add a new webhook with:
   - **URL**: `https://your-server.com/webhook/gitlab`
   - **Trigger**: Select "Merge request events"
   - **Secret token** (optional): Set `WEBHOOK_SECRET` in your `.env`

3. Save the webhook

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

- **Webhook not received**: Check that your server is publicly accessible and the webhook URL is correct
- **No comments posted**: Verify your GitLab token has the correct permissions (`api` scope)
- **AI errors**: Check your OpenAI API key and account credits

## License

MIT
