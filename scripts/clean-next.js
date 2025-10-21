#!/usr/bin/env node

const { existsSync, rmSync } = require('node:fs');
const { join } = require('node:path');

const nextDir = join(process.cwd(), '.next');

try {
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
    console.log('[dev] Removed stale .next directory to prevent manifest conflicts.');
  }
} catch (error) {
  console.error('[dev] Failed to clean .next directory:', error);
  process.exit(1);
}
