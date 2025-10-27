#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const [, , command = 'dev', ...forwardedArgs] = process.argv;
const allowedCommands = new Set(['dev', 'start']);

if (!allowedCommands.has(command)) {
  console.error(`Unsupported Next.js command "${command}". Use \"dev\" or \"start\".`);
  process.exit(1);
}

const repoRoot = resolve(process.cwd(), '..');
const runtimeDir = resolve(repoRoot, 'runtime');
mkdirSync(runtimeDir, { recursive: true });
const logFile = resolve(runtimeDir, `frontend-${command}.log`);

const logStream = createWriteStream(logFile, { flags: 'a' });
console.log(`Logging Next.js ${command} output to ${logFile}`);

const env = { ...process.env };

let spawnCommand = 'pnpm';
let spawnArgs = ['exec', 'next', command];
let passthroughArgs = forwardedArgs;

if (command === 'start') {
  spawnCommand = 'node';
  spawnArgs = ['.next/standalone/server.js'];
  passthroughArgs = [];
  for (let index = 0; index < forwardedArgs.length; index += 1) {
    const arg = forwardedArgs[index];
    if (arg === '--') {
      continue;
    }
    if (arg === '--port') {
      const value = forwardedArgs[index + 1];
      if (value) {
        env.PORT = value;
        index += 1;
        continue;
      }
    }
    if (arg === '--hostname') {
      const value = forwardedArgs[index + 1];
      if (value) {
        env.HOSTNAME = value;
        index += 1;
        continue;
      }
    }
    passthroughArgs.push(arg);
  }
}

const child = spawn(spawnCommand, [...spawnArgs, ...passthroughArgs], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env,
});

const forward = (chunk, stream) => {
  if (chunk) {
    const text = chunk.toString();
    stream.write(text);
    logStream.write(text);
  }
};

child.stdout.on('data', (chunk) => forward(chunk, process.stdout));
child.stderr.on('data', (chunk) => forward(chunk, process.stderr));

let logClosing = false;
const closeLog = () => {
  if (logClosing) {
    return Promise.resolve();
  }
  logClosing = true;
  return new Promise((resolvePromise) => {
    logStream.end(resolvePromise);
  });
};

let requestedSignal = null;

child.on('close', async (code, signal) => {
  await closeLog();
  if (signal) {
    if (requestedSignal && requestedSignal === signal) {
      process.exit(0);
    } else {
      process.kill(process.pid, signal);
      return;
    }
  }
  process.exit(code ?? 0);
});

const terminate = (signal) => {
  requestedSignal = signal;
  child.kill(signal);
};

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => terminate(signal));
}
