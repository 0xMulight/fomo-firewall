#!/usr/bin/env bash
# Keep a localhost.run tunnel to localhost:3000 alive.
# Anonymous tunnels get dropped periodically; this loop re-establishes them.
# The current public URL is extracted to tunnel-url.txt after each connect.
cd "$(dirname "$0")"
while true; do
  echo "=== tunnel restart $(date) ===" >> tunnel.log
  ssh -o StrictHostKeyChecking=no \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ExitOnForwardFailure=yes \
      -R 80:localhost:3000 nokey@localhost.run >> tunnel.log 2>&1
  sleep 5
done
