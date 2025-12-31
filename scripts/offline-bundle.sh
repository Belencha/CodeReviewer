#!/bin/bash
# offline-bundle.sh - Creates complete offline deployment package for CodeReviewer
# Run this on a machine with internet access

set -e

BUNDLE_DIR="code-reviewer-offline"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "Creating offline deployment bundle for CodeReviewer..."
echo ""

# Clean up old bundle if exists
if [ -d "$BUNDLE_DIR" ]; then
    echo "Removing old bundle directory..."
    rm -rf "$BUNDLE_DIR"
fi

mkdir -p "$BUNDLE_DIR"

echo "1. Creating Git bundle..."
if [ -d .git ]; then
    git bundle create "$BUNDLE_DIR/code-reviewer.bundle" --all
    echo "   ✓ Git bundle created"
else
    echo "   ⚠ Not a git repository, skipping bundle"
fi

echo ""
echo "2. Installing npm dependencies..."
if [ ! -d node_modules ]; then
    npm install
fi
echo "   ✓ Dependencies installed"

echo ""
echo "3. Building TypeScript..."
npm run build
echo "   ✓ TypeScript compiled"

echo ""
echo "4. Creating node_modules and dist archive..."
tar -czf "$BUNDLE_DIR/dependencies.tar.gz" node_modules/ dist/ package.json package-lock.json
echo "   ✓ Dependencies archived"

echo ""
echo "5. Pulling Docker images..."
echo "   Pulling ollama/ollama:latest..."
docker pull ollama/ollama:latest || echo "   ⚠ Failed to pull Ollama image"
echo "   Pulling node:18-alpine..."
docker pull node:18-alpine || echo "   ⚠ Failed to pull Node image"

echo ""
echo "6. Saving Docker images..."
if docker images | grep -q "ollama/ollama"; then
    docker save ollama/ollama:latest -o "$BUNDLE_DIR/ollama-image.tar"
    echo "   ✓ Ollama image saved"
else
    echo "   ⚠ Ollama image not found, skipping"
fi

if docker images | grep -q "node.*18-alpine"; then
    docker save node:18-alpine -o "$BUNDLE_DIR/node-image.tar"
    echo "   ✓ Node image saved"
else
    echo "   ⚠ Node image not found, skipping"
fi

echo ""
echo "7. Creating deployment script..."
cat > "$BUNDLE_DIR/deploy.sh" << 'DEPLOY_EOF'
#!/bin/bash
# deploy.sh - Offline deployment script for CodeReviewer
# Run this on the target VM

set -e

DEPLOY_DIR="/opt/code-reviewer"
BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "CodeReviewer Offline Deployment"
echo "========================================="
echo ""

# Check if running as root for system operations
if [ "$EUID" -ne 0 ]; then
    echo "⚠ Some operations may require sudo privileges"
fi

# Extract repository
echo "1. Extracting repository..."
if [ -f "$BUNDLE_DIR/code-reviewer.bundle" ]; then
    if [ -d "$DEPLOY_DIR" ]; then
        echo "   Directory $DEPLOY_DIR exists. Remove it first or choose a different location."
        exit 1
    fi
    git clone "$BUNDLE_DIR/code-reviewer.bundle" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    echo "   ✓ Repository extracted to $DEPLOY_DIR"
else
    echo "   ⚠ Git bundle not found, skipping repository extraction"
    echo "   You may need to extract files manually"
    exit 1
fi

# Extract dependencies
echo ""
echo "2. Extracting dependencies..."
if [ -f "$BUNDLE_DIR/dependencies.tar.gz" ]; then
    tar -xzf "$BUNDLE_DIR/dependencies.tar.gz"
    echo "   ✓ Dependencies extracted"
else
    echo "   ⚠ Dependencies archive not found"
fi

# Load Docker images
echo ""
echo "3. Loading Docker images..."
if [ -f "$BUNDLE_DIR/ollama-image.tar" ]; then
    echo "   Loading Ollama image..."
    docker load -i "$BUNDLE_DIR/ollama-image.tar" || echo "   ⚠ Failed to load Ollama image"
fi

if [ -f "$BUNDLE_DIR/node-image.tar" ]; then
    echo "   Loading Node image..."
    docker load -i "$BUNDLE_DIR/node-image.tar" || echo "   ⚠ Failed to load Node image"
fi

# Create .env from example
echo ""
echo "4. Setting up configuration..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "   ✓ Created .env from .env.example"
        echo "   ⚠ IMPORTANT: Edit .env with your configuration before starting services"
    else
        echo "   ⚠ .env.example not found"
    fi
else
    echo "   .env already exists, skipping"
fi

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Edit configuration:"
echo "   cd $DEPLOY_DIR"
echo "   nano .env"
echo ""
echo "2. Start services:"
echo "   docker-compose up -d"
echo ""
echo "3. Wait for Ollama to start (~30 seconds), then pull model:"
echo "   docker exec ollama ollama pull codellama:13b"
echo ""
echo "4. Verify services:"
echo "   docker-compose ps"
echo "   curl http://localhost:3000/health"
echo ""
DEPLOY_EOF

chmod +x "$BUNDLE_DIR/deploy.sh"

echo ""
echo "8. Creating README..."
cat > "$BUNDLE_DIR/README.md" << 'README_EOF'
# CodeReviewer Offline Deployment Package

This package contains everything needed to deploy CodeReviewer on a VM without internet access.

## Contents

- `code-reviewer.bundle` - Complete Git repository bundle
- `dependencies.tar.gz` - npm dependencies and compiled code
- `ollama-image.tar` - Ollama Docker image
- `node-image.tar` - Node.js Docker image  
- `deploy.sh` - Automated deployment script
- `README.md` - This file

## Transfer to VM

Transfer this entire directory to your VM:

```bash
# From your local machine
scp -r code-reviewer-offline user@vm-ip:/tmp/
```

Or use a USB drive, network share, or any other transfer method.

## Deployment

SSH into your VM and run:

```bash
cd /tmp/code-reviewer-offline
./deploy.sh
```

The script will:
1. Extract the repository to `/opt/code-reviewer`
2. Extract npm dependencies
3. Load Docker images
4. Create `.env` configuration file

## Configuration

After deployment, edit the configuration:

```bash
cd /opt/code-reviewer
nano .env
```

Required settings:
- `GITLAB_HOST` - Your private GitLab URL
- `GITLAB_TOKEN` - Your GitLab Personal Access Token
- `AI_PROVIDER=ollama` - Use self-hosted AI
- `OLLAMA_MODEL` - Model to use (default: codellama:13b)

## Starting Services

```bash
cd /opt/code-reviewer
docker-compose up -d
```

## Downloading AI Model

The Ollama model needs to be downloaded. If you have a way to get it onto the VM:

```bash
# Wait for Ollama to start
sleep 30

# Pull the model (this requires the model files to be available)
docker exec ollama ollama pull codellama:13b
```

Alternatively, you can manually copy the model files into the Ollama container.

## Verification

Check that everything is running:

```bash
# Check services
docker-compose ps

# Check Ollama
docker exec ollama ollama list

# Test health endpoint
curl http://localhost:3000/health

# View logs
docker-compose logs -f
```

## Troubleshooting

See `deployment/OFFLINE_DEPLOYMENT.md` for detailed troubleshooting.

## File Sizes

Approximate sizes:
- Git bundle: ~1-5 MB
- Dependencies: ~200-300 MB
- Ollama image: ~500 MB
- Node image: ~50 MB
- **Total: ~1 GB** (before model download)

The AI model (codellama:13b) is ~7GB and needs to be downloaded separately.
README_EOF

echo ""
echo "========================================="
echo "✅ Offline bundle created successfully!"
echo "========================================="
echo ""
echo "Bundle location: $PROJECT_DIR/$BUNDLE_DIR"
echo ""
echo "To transfer to VM:"
echo "  scp -r $BUNDLE_DIR user@vm-ip:/tmp/"
echo ""
echo "Then on the VM:"
echo "  cd /tmp/$BUNDLE_DIR"
echo "  ./deploy.sh"
echo ""

