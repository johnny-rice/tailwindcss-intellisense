import PackageJson from '@npmcli/package-json'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import semver from 'semver'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Let `vsce` get the metadata for the extension
// Querying the marketplace API directly is not supported or recommended
let result = spawnSync(
  path.resolve(__dirname, '../../packages/vscode-tailwindcss/node_modules/.bin/vsce'),
  ['show', 'bradlc.vscode-tailwindcss', '--json'],
  { encoding: 'utf8' },
)

if (result.status !== 0) {
  console.error(result.stderr)
  throw new Error('Failed to get extension metadata')
}

let metadata = JSON.parse(result.stdout)

if (!metadata) {
  console.error(result.error)
  throw new Error('Failed to get extension metadata')
}

/** @type {string[]} */
let versions = metadata.versions.map(({ version }) => version)

// Determine the latest version of the extension. Pre-release builds use odd patch versions,
// while release builds use even patch versions.
let latest = versions
  .map((v) => semver.parse(v, { includePrerelease: true, loose: false }))
  .filter((v) => v !== null)
  .filter((v) => v.prerelease.length === 0)
  .sort((a, b) => b.compare(a) || b.compareBuild(a))
  .at(0)

if (!latest) {
  throw new Error('Failed to find a published extension version')
}

// Bump the patch version in `package.json`
let nextPatch = latest.patch + (latest.patch % 2 === 1 ? 2 : 1)
let nextVersion = `${latest.major}.${latest.minor}.${nextPatch}`

let pkg = await PackageJson.load('packages/vscode-tailwindcss')
await pkg.update({ version: nextVersion }).save()
