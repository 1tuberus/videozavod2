#!/usr/bin/env bash
# Deploy / update VIDEOZAVOD2 on Poland (82.22.41.18) at /opt/videozavod2
# Usage: ./deploy.sh
set -euo pipefail
SSH="ssh -i $HOME/.ssh/id_ed25519 root@82.22.41.18"
$SSH "cd /opt/videozavod2 && git pull --ff-only && npm ci --no-audit --no-fund && npm run build"
echo "✅ deployed → https://videozavod2.evotop.pro"
