import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const execFileAsync = promisify(execFile);

/**
 * Jest global setup - runs once before all tests
 *
 * Responsibilities:
 * 1. Load test environment variables
 * 2. Create output directories
 * 3. Start Docker backend container
 * 4. Wait for backend to be ready
 */
export default async function globalSetup() {
  console.log('🚀 Starting ChatOrbit E2E test environment...\n');

  // Load test environment
  const envPath = path.join(__dirname, '../.env.test');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('✅ Loaded test environment from .env.test');
  } else {
    console.log('⚠️  No .env.test found, using .env.test.example as reference');
    dotenv.config({ path: `${envPath}.example` });
  }

  // Create output directories
  const outputDir = path.join(__dirname, '../output');
  const testRunDir = path.join(outputDir, `test-run-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  const dirs = [
    outputDir,
    testRunDir,
    path.join(testRunDir, 'screenshots'),
    path.join(testRunDir, 'videos'),
    path.join(testRunDir, 'logs'),
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  console.log(`✅ Created output directories in ${testRunDir}`);

  // Store test run directory for later use
  process.env.TEST_RUN_DIR = testRunDir;

  // Start Docker backend
  try {
    console.log('\n🐳 Starting Docker containers (backend + frontend)...');
    const infraDir = path.join(__dirname, '../../../infra');

    // Stop any existing containers
    try {
      await execFileAsync('docker-compose', ['-f', 'docker-compose.yml', 'down'], {
        cwd: infraDir,
      });
    } catch (e) {
      // Ignore if nothing to stop
    }

    // Start backend and frontend
    await execFileAsync('docker-compose', ['-f', 'docker-compose.yml', 'up', '-d', 'backend', 'frontend'], {
      cwd: infraDir,
    });
    console.log('✅ Docker containers started');

    // Wait for backend to be ready
    console.log('\n⏳ Waiting for backend to be ready...');
    const apiBaseUrl = process.env.TEST_API_BASE_URL || 'http://localhost:50003';
    console.log(`Checking health at ${apiBaseUrl}/api/health`);
    await waitForBackend(apiBaseUrl, 20000);
    console.log('✅ Backend is ready');

    // Wait for frontend to be ready
    console.log('\n⏳ Waiting for frontend to be ready...');
    const frontendUrl = process.env.TEST_FRONTEND_URL || 'http://localhost:3003';
    console.log(`Checking frontend at ${frontendUrl}`);
    await waitForFrontend(frontendUrl, 20000);
    console.log('✅ Frontend is ready');

  } catch (error) {
    console.error('❌ Failed to start Docker backend:', error);
    throw error;
  }

  console.log('\n✨ Test environment ready!\n');
}

/**
 * Wait for backend to respond to health check
 */
async function waitForBackend(baseUrl: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  const healthUrl = `${baseUrl}/docs`;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch (e) {
      // Backend not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Backend did not become ready within ${timeout}ms`);
}

async function waitForFrontend(baseUrl: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch (e) {
      // Frontend not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Frontend did not become ready within ${timeout}ms`);
}
