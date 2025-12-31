# Offline Deployment Guide

This guide explains how to deploy CodeReviewer to a VM that has no internet access.

## Overview

Since your VM has no internet connection, you'll need to:
1. Bundle the repository on a machine with internet
2. Transfer it to the VM (via SCP, USB, or network share)
3. Install dependencies offline
4. Set up Docker images offline

## Method 1: Git Bundle (Recommended)

This creates a complete Git repository bundle that can be cloned offline.

### On Your Local Machine (with internet):

1. **Create a Git bundle:**
   ```bash
   # In your CodeReviewer directory
   git bundle create code-reviewer.bundle --all
   ```

2. **Transfer the bundle to your VM:**
   ```bash
   scp code-reviewer.bundle user@vm-ip:/tmp/
   ```

3. **On the VM (via SSH):**
   ```bash
   # Clone from the bundle
   cd /opt
   git clone /tmp/code-reviewer.bundle code-reviewer
   cd code-reviewer
   ```

## Method 2: Direct File Transfer (Simpler)

If you don't need Git history on the VM:

### On Your Local Machine:

1. **Create a tarball (excluding node_modules and .git):**
   ```bash
   # In your CodeReviewer directory
   tar -czf code-reviewer.tar.gz \
     --exclude='node_modules' \
     --exclude='.git' \
     --exclude='dist' \
     --exclude='.env' \
     .
   ```

2. **Transfer to VM:**
   ```bash
   scp code-reviewer.tar.gz user@vm-ip:/tmp/
   ```

3. **On the VM:**
   ```bash
   cd /opt
   tar -xzf /tmp/code-reviewer.tar.gz -C code-reviewer
   cd code-reviewer
   ```

## Installing Dependencies Offline

### Option A: Transfer node_modules (Easiest)

1. **On your local machine (same OS/architecture as VM):**
   ```bash
   # Install dependencies
   npm install
   
   # Create tarball of node_modules
   tar -czf node_modules.tar.gz node_modules/
   ```

2. **Transfer to VM:**
   ```bash
   scp node_modules.tar.gz user@vm-ip:/opt/code-reviewer/
   ```

3. **On the VM:**
   ```bash
   cd /opt/code-reviewer
   tar -xzf node_modules.tar.gz
   ```

### Option B: Use npm offline mirror (More reliable)

1. **On your local machine:**
   ```bash
   # Create offline npm registry mirror
   npm install -g local-npm
   local-npm
   # In another terminal:
   npm install --registry http://localhost:5080
   
   # Copy the .npm directory
   tar -czf npm-cache.tar.gz ~/.npm/
   ```

2. **Transfer and use on VM:**
   ```bash
   scp npm-cache.tar.gz user@vm-ip:/tmp/
   # On VM:
   tar -xzf /tmp/npm-cache.tar.gz -C ~/
   npm install --offline --cache ~/.npm
   ```

## Docker Images Offline

### Step 1: Save Docker Images (on machine with internet)

1. **Pull required images:**
   ```bash
   docker pull ollama/ollama:latest
   docker pull node:18-alpine
   ```

2. **Save images to files:**
   ```bash
   docker save ollama/ollama:latest -o ollama-image.tar
   docker save node:18-alpine -o node-image.tar
   ```

3. **Transfer to VM:**
   ```bash
   scp ollama-image.tar node-image.tar user@vm-ip:/tmp/
   ```

### Step 2: Load Docker Images (on VM)

1. **Load the images:**
   ```bash
   docker load -i /tmp/ollama-image.tar
   docker load -i /tmp/node-image.tar
   ```

2. **Verify:**
   ```bash
   docker images
   ```

## Complete Offline Deployment Script

Create this script on your local machine:

```bash
#!/bin/bash
# offline-bundle.sh - Creates complete offline deployment package

set -e

BUNDLE_DIR="code-reviewer-offline"
mkdir -p "$BUNDLE_DIR"

echo "1. Creating Git bundle..."
git bundle create "$BUNDLE_DIR/code-reviewer.bundle" --all

echo "2. Installing npm dependencies..."
npm install

echo "3. Building TypeScript..."
npm run build

echo "4. Creating node_modules archive..."
tar -czf "$BUNDLE_DIR/node_modules.tar.gz" node_modules/

echo "5. Pulling Docker images..."
docker pull ollama/ollama:latest
docker pull node:18-alpine

echo "6. Saving Docker images..."
docker save ollama/ollama:latest -o "$BUNDLE_DIR/ollama-image.tar"
docker save node:18-alpine -o "$BUNDLE_DIR/node-image.tar"

echo "7. Creating deployment script..."
cat > "$BUNDLE_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "Deploying CodeReviewer offline..."

# Extract repository
if [ -f code-reviewer.bundle ]; then
    git clone code-reviewer.bundle code-reviewer
    cd code-reviewer
else
    echo "Repository bundle not found"
    exit 1
fi

# Extract node_modules
if [ -f ../node_modules.tar.gz ]; then
    echo "Extracting node_modules..."
    tar -xzf ../node_modules.tar.gz
fi

# Load Docker images
if [ -f ../ollama-image.tar ]; then
    echo "Loading Ollama image..."
    docker load -i ../ollama-image.tar
fi

if [ -f ../node-image.tar ]; then
    echo "Loading Node image..."
    docker load -i ../node-image.tar
fi

# Create .env from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please edit it with your configuration."
fi

echo "Deployment complete!"
echo "Next steps:"
echo "1. Edit .env with your configuration"
echo "2. Run: docker-compose up -d"
echo "3. Pull Ollama model: docker exec ollama ollama pull codellama:13b"
EOF

chmod +x "$BUNDLE_DIR/deploy.sh"

echo "8. Creating README..."
cat > "$BUNDLE_DIR/README.md" << 'EOF'
# CodeReviewer Offline Deployment Package

## Contents:
- code-reviewer.bundle: Git repository bundle
- node_modules.tar.gz: npm dependencies
- ollama-image.tar: Ollama Docker image
- node-image.tar: Node.js Docker image
- deploy.sh: Automated deployment script

## Deployment Instructions:

1. Transfer this entire directory to your VM:
   ```bash
   scp -r code-reviewer-offline user@vm-ip:/tmp/
   ```

2. On the VM, run:
   ```bash
   cd /tmp/code-reviewer-offline
   ./deploy.sh
   ```

3. Configure and start:
   ```bash
   cd code-reviewer
   nano .env  # Edit configuration
   docker-compose up -d
   docker exec ollama ollama pull codellama:13b
   ```
EOF

echo ""
echo "✅ Offline bundle created in: $BUNDLE_DIR"
echo "Transfer this directory to your VM using:"
echo "  scp -r $BUNDLE_DIR user@vm-ip:/tmp/"
```

## Step-by-Step Manual Deployment

### On Your Local Machine:

```bash
# 1. Create bundle
git bundle create code-reviewer.bundle --all

# 2. Install dependencies
npm install
npm run build

# 3. Archive node_modules
tar -czf node_modules.tar.gz node_modules/ dist/

# 4. Pull and save Docker images
docker pull ollama/ollama:latest
docker pull node:18-alpine
docker save ollama/ollama:latest -o ollama-image.tar
docker save node:18-alpine -o node-image.tar

# 5. Transfer everything
scp code-reviewer.bundle user@vm-ip:/tmp/
scp node_modules.tar.gz user@vm-ip:/tmp/
scp ollama-image.tar user@vm-ip:/tmp/
scp node-image.tar user@vm-ip:/tmp/
```

### On the VM (via SSH):

```bash
# 1. Clone repository
cd /opt
git clone /tmp/code-reviewer.bundle code-reviewer
cd code-reviewer

# 2. Extract dependencies
tar -xzf /tmp/node_modules.tar.gz

# 3. Load Docker images
docker load -i /tmp/ollama-image.tar
docker load -i /tmp/node-image.tar

# 4. Configure
cp .env.example .env
nano .env  # Edit with your settings

# 5. Start services
docker-compose up -d

# 6. Wait for Ollama to start, then pull model
sleep 30
docker exec ollama ollama pull codellama:13b
```

## Important Notes

### Architecture Compatibility
- Ensure your local machine and VM have the same CPU architecture (x86_64/amd64)
- Docker images are architecture-specific
- If architectures differ, build on the VM or use multi-arch images

### Ollama Model Download
The Ollama model (`codellama:13b`) is ~7GB and needs to be downloaded. Options:

1. **Pre-download on local machine:**
   ```bash
   # Run Ollama locally
   docker run -d -p 11434:11434 --name ollama ollama/ollama
   docker exec ollama ollama pull codellama:13b
   
   # Export the model
   docker exec ollama ollama show codellama:13b --modelfile > /dev/null
   # Copy the model data from container
   docker cp ollama:/root/.ollama/models /tmp/ollama-models
   tar -czf ollama-models.tar.gz /tmp/ollama-models
   scp ollama-models.tar.gz user@vm-ip:/tmp/
   ```

2. **Or download model files separately** and transfer them

### Alternative: Use Smaller Model
If transferring large files is difficult, use a smaller model:
- `mistral:7b` (~4GB)
- `deepseek-coder:6.7b` (~4GB)

## Verification

After deployment, verify everything works:

```bash
# Check services are running
docker-compose ps

# Check Ollama
docker exec ollama ollama list

# Test health endpoint
curl http://localhost:3000/health

# Check logs
docker-compose logs -f
```

## Troubleshooting

### Docker images won't load:
- Verify architecture compatibility
- Check disk space: `df -h`
- Try loading individually: `docker load -i <image>.tar`

### npm dependencies missing:
- Verify node_modules.tar.gz extracted correctly
- Check Node.js version matches: `node --version`
- May need to rebuild: `npm rebuild` (if native modules)

### Ollama model not found:
- Verify model was pulled: `docker exec ollama ollama list`
- Check Ollama logs: `docker logs ollama`
- Manually pull: `docker exec ollama ollama pull codellama:13b`

