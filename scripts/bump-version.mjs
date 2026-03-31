#!/usr/bin/env node

/**
 * Version bump script
 * Usage: node scripts/bump-version.mjs [major|minor|patch]
 *
 * - Bumps the version in package.json
 * - Adds a changelog entry to CHANGELOG.md
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

const bumpType = process.argv[2] || 'patch';

if (!['major', 'minor', 'patch'].includes(bumpType)) {
  console.error(`Invalid bump type: "${bumpType}". Use major, minor, or patch.`);
  process.exit(1);
}

// Read package.json
const pkgPath = resolve(rootDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const currentVersion = pkg.version;

// Bump version
const [major, minor, patch] = currentVersion.split('.').map(Number);
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
pkg.version = newVersion;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Updated package.json: ${currentVersion} -> ${newVersion}`);

// Update CHANGELOG.md
const changelogPath = resolve(rootDir, 'CHANGELOG.md');
let changelog;
try {
  changelog = readFileSync(changelogPath, 'utf-8');
} catch {
  changelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n';
}

const today = new Date().toISOString().split('T')[0];
const newEntry = `\n## [${newVersion}] - ${today}\n\n### Changed\n\n- Version bump (${bumpType})\n`;

// Insert new entry after the header
const headerEnd = changelog.indexOf('\n\n');
if (headerEnd !== -1) {
  changelog = changelog.slice(0, headerEnd + 1) + newEntry + changelog.slice(headerEnd + 1);
} else {
  changelog += newEntry;
}

writeFileSync(changelogPath, changelog);
console.log(`Updated CHANGELOG.md with entry for ${newVersion}`);

// Output the new version for CI consumption
console.log(`::set-output name=version::${newVersion}`);
console.log(`NEW_VERSION=${newVersion}`);
