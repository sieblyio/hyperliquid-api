import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

import { validateBrowserBundles } from './browser-bundle-validation.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const npmCli = process.env.npm_execpath;
let npmCache;

function runNpm(args, cwd, capture = false) {
  const command = npmCli
    ? process.execPath
    : process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm';
  const commandArgs = npmCli ? [npmCli, ...args] : args;
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: capture ? 'utf8' : undefined,
    env: {
      ...process.env,
      ...(npmCache ? { npm_config_cache: npmCache } : {}),
    },
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  });
}

function runNode(args, cwd) {
  execFileSync(process.execPath, args, { cwd, stdio: 'inherit' });
}

await mkdir(path.join(repoRoot, 'tmp'), { recursive: true });
const tempRoot = await mkdtemp(path.join(repoRoot, 'tmp', 'packed-smoke-'));
const consumerRoot = path.join(tempRoot, 'consumer');
npmCache = path.join(tempRoot, '.npm-cache');

try {
  const packOutput = runNpm(
    ['pack', '--json', '--ignore-scripts', '--pack-destination', tempRoot],
    repoRoot,
    true,
  );
  const [packResult] = JSON.parse(packOutput);
  assert.equal(packResult.name, '@siebly/hyperliquid-api');
  const tarballPath = path.join(tempRoot, packResult.filename);
  const packedFiles = new Set(packResult.files.map((file) => file.path));

  for (const requiredPath of [
    'LICENSE.md',
    'README.md',
    'llms.txt',
    'package.json',
    'dist/cjs/lib/https-agent.browser.js',
    'dist/cjs/lib/event-emitter.browser.js',
    'dist/cjs/package.json',
    'dist/mjs/lib/https-agent.browser.js',
    'dist/mjs/lib/event-emitter.browser.js',
    'dist/mjs/package.json',
    'dist/mjs/index.d.ts',
  ]) {
    assert.equal(
      packedFiles.has(requiredPath),
      true,
      `Packed tarball is missing ${requiredPath}`,
    );
  }
  for (const filePath of packedFiles) {
    assert.equal(
      /(^|\/)(examples|scripts|test)(\/|$)/.test(filePath),
      false,
      `Packed tarball unexpectedly contains ${filePath}`,
    );
    assert.equal(
      filePath.includes('README_BEFORE_RELEASE'),
      false,
      'Packed tarball contains the private release checklist',
    );
  }

  await mkdir(path.join(consumerRoot, 'src'), { recursive: true });
  await writeFile(
    path.join(consumerRoot, 'package.json'),
    `${JSON.stringify(
      { name: 'hyperliquid-packed-consumer', private: true, type: 'module' },
      null,
      2,
    )}\n`,
  );
  runNpm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--save-exact',
      tarballPath,
    ],
    consumerRoot,
  );

  const assertions = `
const constructors = ['RestClient', 'WebsocketAPIClient', 'WebsocketClient'];
for (const name of constructors) {
  assert.equal(typeof sdk[name], 'function', \`Missing \${name}\`);
}
assert.equal(typeof sdk.HyperliquidApiError, 'function');
assert.equal(typeof sdk.HyperliquidWebSocketError, 'function');
const rest = new sdk.RestClient();
assert.equal(typeof rest.getAllMids, 'function');
assert.equal(typeof rest.submitOrder, 'function');
const subscriptions = new sdk.WebsocketClient();
assert.equal(subscriptions instanceof EventEmitter, true, 'Streaming client is not a Node EventEmitter');
assert.equal(subscriptions.eventNames().length, 0);
`;
  await Promise.all([
    writeFile(
      path.join(consumerRoot, 'esm.mjs'),
      `import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import * as sdk from '@siebly/hyperliquid-api';
${assertions}
`,
    ),
    writeFile(
      path.join(consumerRoot, 'commonjs.cjs'),
      `const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const sdk = require('@siebly/hyperliquid-api');
${assertions}
`,
    ),
    copyFile(
      path.join(repoRoot, 'test/packaging/fixtures/browser-rest.ts'),
      path.join(consumerRoot, 'src/browser-rest.ts'),
    ),
    copyFile(
      path.join(repoRoot, 'test/packaging/fixtures/browser-websocket.ts'),
      path.join(consumerRoot, 'src/browser-websocket.ts'),
    ),
  ]);

  // Exercise the same response contracts against the published declarations.
  const responseContract = (
    await readFile(
      path.join(repoRoot, 'test/types/response-contract.ts'),
      'utf8',
    )
  ).replace('../../src/index.js', '@siebly/hyperliquid-api');
  await writeFile(
    path.join(consumerRoot, 'src/response-contract.ts'),
    responseContract,
  );
  await writeFile(
    path.join(consumerRoot, 'src/response-contract.cts'),
    responseContract,
  );

  runNode(['esm.mjs'], consumerRoot);
  runNode(['commonjs.cjs'], consumerRoot);

  for (const format of ['cjs', 'esm']) {
    const extension = format === 'cjs' ? 'cjs' : 'mjs';
    const fixturePath = `runtime.${extension}`;
    await build({
      absWorkingDir: consumerRoot,
      entryPoints: ['src/browser-websocket.ts'],
      outfile: fixturePath,
      bundle: true,
      platform: 'node',
      packages: 'external',
      format,
    });
    runNode(
      [
        '--input-type=module',
        '-e',
        `import('./${fixturePath}').then(module => module.exerciseWebsocket()).catch(error => { console.error(error); process.exitCode = 1; });`,
      ],
      consumerRoot,
    );
  }

  for (const format of ['cjs', 'mjs']) {
    const manifest = JSON.parse(
      await readFile(
        path.join(
          consumerRoot,
          'node_modules/@siebly/hyperliquid-api/dist',
          format,
          'package.json',
        ),
        'utf8',
      ),
    );
    assert.equal(
      manifest.browser['./lib/event-emitter.js'],
      './lib/event-emitter.browser.js',
    );
  }

  const { restBytes, websocketBytes } = await validateBrowserBundles({
    absWorkingDir: consumerRoot,
    nodePaths: [path.join(repoRoot, 'node_modules')],
    restEntryPoint: 'src/browser-rest.ts',
    websocketEntryPoint: 'src/browser-websocket.ts',
  });
  const sharedOptions = {
    compilerOptions: {
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      noEmit: true,
      skipLibCheck: false,
      strict: true,
      exactOptionalPropertyTypes: true,
      target: 'ES2022',
      types: [],
    },
    include: ['src/**/*.ts', 'src/**/*.cts'],
  };
  for (const configuration of [
    { fileName: 'tsconfig.bundler.json', resolution: 'Bundler' },
    { fileName: 'tsconfig.nodenext.json', resolution: 'NodeNext' },
  ]) {
    await writeFile(
      path.join(consumerRoot, configuration.fileName),
      `${JSON.stringify(
        {
          ...sharedOptions,
          compilerOptions: {
            ...sharedOptions.compilerOptions,
            module:
              configuration.resolution === 'NodeNext' ? 'NodeNext' : 'ESNext',
            moduleResolution: configuration.resolution,
          },
        },
        null,
        2,
      )}\n`,
    );
    runNode(
      [
        path.join(repoRoot, 'node_modules/typescript/bin/tsc'),
        '--project',
        configuration.fileName,
      ],
      consumerRoot,
    );
  }

  await assert.rejects(
    readFile(
      path.join(consumerRoot, 'node_modules', '@types', 'ws', 'package.json'),
    ),
    'Packed consumer unexpectedly installed @types/ws',
  );

  console.log(
    `Packed consumer smoke passed (${packResult.entryCount} files, ${packResult.size} packed bytes, REST browser bundle ${restBytes} bytes, WebSocket browser bundle ${websocketBytes} bytes).`,
  );
} finally {
  await rm(tempRoot, { force: true, recursive: true });
}
