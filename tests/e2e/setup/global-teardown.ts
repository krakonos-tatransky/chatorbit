import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execFileAsync = promisify(execFile);

/**
 * Jest global teardown - runs once after all tests
 *
 * Responsibilities:
 * 1. Stop Docker backend container
 * 2. Save Docker logs to output directory
 * 3. Clean up test resources
 */
export default async function globalTeardown() {
  console.log('\n🧹 Cleaning up test environment...\n');

  const infraDir = path.join(__dirname, '../../../infra');
  const testRunDir = process.env.TEST_RUN_DIR;

  try {
    // Save Docker logs before stopping
    if (testRunDir) {
      console.log('📝 Saving Docker logs...');
      try {
        const { stdout } = await execFileAsync('docker-compose', ['-f', 'docker-compose.yml', 'logs', 'backend', 'frontend'], {
          cwd: infraDir,
        });
        const fs = require('fs');
        fs.writeFileSync(path.join(testRunDir, 'logs', 'backend-docker.log'), stdout);
        console.log('✅ Docker logs saved');
      } catch (e) {
        console.warn('⚠️  Could not save Docker logs:', e);
      }
    }

    // Stop Docker containers
    console.log('🐳 Stopping Docker containers...');
    await execFileAsync('docker-compose', ['-f', 'docker-compose.yml', 'down'], {
      cwd: infraDir,
    });
    console.log('✅ Docker containers stopped');

  } catch (error) {
    console.error('❌ Error during teardown:', error);
    // Don't throw - allow tests to complete even if teardown fails
  }

  console.log('\n✨ Cleanup complete!\n');
}
