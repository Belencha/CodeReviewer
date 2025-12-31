# Deployment Guide

This guide covers deploying CodeReviewer in a private corporate VPN environment.

## Prerequisites

- Ubuntu VM inside the corporate VPN with network access to:
  - Private GitLab instance
  - Internet (for OpenAI API access)
- Node.js 18+ or Docker installed
- GitLab Personal Access Token with `api` scope

## Deployment Options

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository on your Ubuntu VM:**
   ```bash
   git clone <repository-url>
   cd CodeReviewer
   ```

2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   Configure:
   - `GITLAB_HOST`: Your private GitLab URL (e.g., `https://gitlab.company.internal`)
   - `GITLAB_TOKEN`: Your GitLab Personal Access Token
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `PORT`: Port for the service (default: 3000)

3. **Build and run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

4. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

5. **Verify the service is running:**
   ```bash
   curl http://localhost:3000/health
   ```

### Option 2: Direct Node.js Deployment

1. **Install Node.js 18+ on the Ubuntu VM:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd CodeReviewer
   npm install
   npm run build
   ```

3. **Create `.env` file** (same as Docker option)

4. **Run with systemd service:**
   ```bash
   # Create user for the service
   sudo useradd -r -s /bin/false code-reviewer
   
   # Copy files to /opt/code-reviewer
   sudo mkdir -p /opt/code-reviewer
   sudo cp -r dist package.json node_modules /opt/code-reviewer/
   sudo cp .env /opt/code-reviewer/
   sudo cp deployment/systemd/code-reviewer.service /etc/systemd/system/
   sudo chown -R code-reviewer:code-reviewer /opt/code-reviewer
   
   # Enable and start the service
   sudo systemctl daemon-reload
   sudo systemctl enable code-reviewer
   sudo systemctl start code-reviewer
   
   # Check status
   sudo systemctl status code-reviewer
   ```

## GitLab Webhook Configuration

1. **Determine the webhook URL:**
   - If the service runs on a VM accessible from GitLab: `http://<vm-ip>:3000/webhook/gitlab`
   - If using a reverse proxy: `https://code-reviewer.company.internal/webhook/gitlab`
   - The URL must be reachable from your GitLab instance

2. **Configure webhook in GitLab:**
   - Go to your GitLab project → Settings → Webhooks
   - URL: `http://<your-vm-ip>:3000/webhook/gitlab` (or your internal domain)
   - Trigger: Select "Merge request events"
   - Secret token (optional): Set `WEBHOOK_SECRET` in `.env` and use the same value here
   - Enable SSL verification: **Disable** if using HTTP (recommended to use HTTPS in production)

3. **Test the webhook:**
   - Create a test merge request
   - Check the service logs to see if the webhook was received
   - Verify comments appear on the merge request

## Network Considerations

### Internal Network Access
- The service must be reachable from GitLab's network
- If GitLab and the service are on different subnets, ensure routing is configured
- Consider using an internal load balancer or reverse proxy for production

### Firewall Rules
Ensure the following ports are open:
- Port 3000 (or your configured PORT) - for webhook endpoint
- Outbound HTTPS (443) - for OpenAI API and GitLab API calls

### DNS Resolution
- If using hostnames, ensure DNS resolution works from the VM
- Consider adding entries to `/etc/hosts` if needed

## Troubleshooting

### Service not receiving webhooks
1. Check if the service is running: `docker-compose ps` or `systemctl status code-reviewer`
2. Verify the webhook URL is accessible from GitLab: `curl http://<vm-ip>:3000/health`
3. Check firewall rules
4. Review service logs for errors

### Cannot connect to GitLab
1. Verify `GITLAB_HOST` is correct (use internal URL, not external)
2. Test connectivity: `curl -H "PRIVATE-TOKEN: <token>" https://<gitlab-host>/api/v4/user`
3. Check if VPN/proxy settings are needed

### AI service errors
1. Verify `OPENAI_API_KEY` is set correctly
2. Check internet connectivity from the VM
3. Review OpenAI API quotas and limits

## Monitoring

### View logs (Docker):
```bash
docker-compose logs -f code-reviewer
```

### View logs (systemd):
```bash
sudo journalctl -u code-reviewer -f
```

### Health check:
```bash
curl http://localhost:3000/health
```

## Updating the Service

### Docker:
```bash
git pull
docker-compose build
docker-compose up -d
```

### systemd:
```bash
git pull
npm install
npm run build
sudo systemctl restart code-reviewer
```

