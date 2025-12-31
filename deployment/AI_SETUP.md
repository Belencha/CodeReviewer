# Self-Hosted AI Setup Guide

This guide explains how to set up and use self-hosted AI models for code review in a private VPN environment.

## Why Self-Hosted AI?

Since your corporate VPN doesn't have internet access, we use **Ollama** to run open-source LLM models locally. Ollama is easy to deploy, supports multiple models, and runs entirely within your network.

## Recommended Models

### For Code Review (Best Options):

1. **CodeLlama 13B** (`codellama:13b`) - **Recommended**
   - Specialized for code
   - Good balance of quality and performance
   - ~7GB RAM required
   - Best for code review tasks

2. **Mistral 7B** (`mistral:7b`)
   - Smaller, faster
   - ~4GB RAM required
   - Good general performance

3. **DeepSeek Coder 6.7B** (`deepseek-coder:6.7b`)
   - Code-specialized
   - ~4GB RAM required
   - Good alternative to CodeLlama

4. **Llama 2 13B** (`llama2:13b`)
   - General purpose
   - ~7GB RAM required
   - Good fallback option

### Model Selection Guide:

- **Limited RAM (< 8GB)**: Use `mistral:7b` or `deepseek-coder:6.7b`
- **8-16GB RAM**: Use `codellama:13b` (recommended)
- **16GB+ RAM**: Can use larger models like `codellama:34b` or `llama2:70b`

## Setup Instructions

### Option 1: Using Docker Compose (Easiest)

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Wait for Ollama to start** (about 30 seconds)

3. **Pull your chosen model:**
   ```bash
   # Using the setup script
   chmod +x scripts/setup-ollama.sh
   ./scripts/setup-ollama.sh
   
   # Or manually
   docker exec ollama ollama pull codellama:13b
   ```

4. **Verify the model is available:**
   ```bash
   docker exec ollama ollama list
   ```

5. **Configure your `.env` file:**
   ```env
   AI_PROVIDER=ollama
   OLLAMA_URL=http://ollama:11434
   OLLAMA_MODEL=codellama:13b
   ```

6. **Restart the code-reviewer service:**
   ```bash
   docker-compose restart code-reviewer
   ```

### Option 2: Manual Ollama Installation

If you prefer to run Ollama separately:

1. **Install Ollama on your Ubuntu VM:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Start Ollama service:**
   ```bash
   ollama serve
   ```

3. **Pull a model:**
   ```bash
   ollama pull codellama:13b
   ```

4. **Update `.env`:**
   ```env
   AI_PROVIDER=ollama
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=codellama:13b
   ```

## GPU Support (Optional but Recommended)

For better performance, you can use GPU acceleration:

1. **Install NVIDIA drivers and nvidia-docker2:**
   ```bash
   # Install NVIDIA drivers (if not already installed)
   sudo apt-get update
   sudo apt-get install -y nvidia-driver-535  # Adjust version as needed
   
   # Install nvidia-docker2
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   sudo apt-get update
   sudo apt-get install -y nvidia-docker2
   sudo systemctl restart docker
   ```

2. **Uncomment GPU support in `docker-compose.yml`:**
   ```yaml
   ollama:
     # ... existing config ...
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: 1
               capabilities: [gpu]
   ```

3. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Testing the AI Service

1. **Test Ollama directly:**
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "codellama:13b",
     "prompt": "Review this code: function add(a, b) { return a + b; }",
     "stream": false
   }'
   ```

2. **Test the code-reviewer health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Check logs:**
   ```bash
   docker-compose logs -f code-reviewer
   ```

## Performance Considerations

### CPU-Only Mode:
- **CodeLlama 13B**: ~10-30 seconds per review (depending on diff size)
- **Mistral 7B**: ~5-15 seconds per review
- Suitable for small to medium teams

### GPU Mode:
- **CodeLlama 13B**: ~2-5 seconds per review
- **Mistral 7B**: ~1-3 seconds per review
- Recommended for production use

### Resource Requirements:

| Model | RAM (CPU) | VRAM (GPU) | Speed (CPU) | Speed (GPU) |
|-------|-----------|------------|-------------|-------------|
| Mistral 7B | 4GB | 4GB | Medium | Fast |
| CodeLlama 13B | 7GB | 7GB | Slow | Medium |
| DeepSeek Coder 6.7B | 4GB | 4GB | Medium | Fast |

## Troubleshooting

### Model not found:
```bash
# List available models
docker exec ollama ollama list

# Pull the model again
docker exec ollama ollama pull codellama:13b
```

### Out of memory:
- Use a smaller model (e.g., `mistral:7b` instead of `codellama:13b`)
- Increase VM RAM allocation
- Enable swap space

### Slow responses:
- Enable GPU support if available
- Use a smaller model
- Check system resources: `docker stats`

### Connection refused:
- Verify Ollama is running: `docker ps | grep ollama`
- Check OLLAMA_URL in `.env` matches your setup
- For Docker Compose, use `http://ollama:11434`
- For manual install, use `http://localhost:11434`

## Switching Between Models

To switch models:

1. **Pull the new model:**
   ```bash
   docker exec ollama ollama pull mistral:7b
   ```

2. **Update `.env`:**
   ```env
   OLLAMA_MODEL=mistral:7b
   ```

3. **Restart the service:**
   ```bash
   docker-compose restart code-reviewer
   ```

## Model Updates

To update a model to the latest version:

```bash
docker exec ollama ollama pull codellama:13b
```

Ollama will automatically use the latest version.

