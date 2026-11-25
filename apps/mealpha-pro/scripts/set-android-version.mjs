#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(packageJson.version || '');
const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/.exec(version);
if (!match) throw new Error(`Unsupported MeAlpha Pro semantic version: ${version}`);

const [, majorText, minorText, patchText] = match;
const major = Number(majorText), minor = Number(minorText), patch = Number(patchText);
if (minor >= 1000 || patch >= 1000) throw new Error(`Android version components exceed the versionCode scheme: ${version}`);
const versionCode = major * 1_000_000 + minor * 1_000 + patch;
if (!Number.isSafeInteger(versionCode) || versionCode <= 0 || versionCode > 2_147_483_647) {
  throw new Error(`Android versionCode is outside the supported range: ${versionCode}`);
}

const gradlePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'android', 'app', 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
const codePattern = /(\bversionCode\s+)\d+/;
const namePattern = /(\bversionName\s+)[\"'][^\"']+[\"']/;
if (!codePattern.test(gradle) || !namePattern.test(gradle)) {
  throw new Error(`Could not locate generated Android versionCode/versionName in ${gradlePath}`);
}
gradle = gradle.replace(codePattern, `$1${versionCode}`).replace(namePattern, `$1"${version}"`);
if (!new RegExp(`\\bversionCode\\s+${versionCode}\\b`).test(gradle) ||
    !gradle.includes(`versionName "${version}"`)) {
  throw new Error('Android Gradle version update did not verify.');
}
fs.writeFileSync(gradlePath, gradle);
console.log(`Android package version set to ${version} (versionCode ${versionCode}).`);
