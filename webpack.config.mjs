import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import developmentOptions from './fvtt.config.mjs'
import { ensureModuleOutputDir } from './ci_scripts/fvtt-paths.mjs'

const rootFolder = path.dirname(fileURLToPath(import.meta.url))

/** `webpack --mode production` → argv[3] is `production` */
const buildMode = process.argv[3] === 'production' ? 'production' : 'development'

function buildDestination() {
  const manifestPath = path.join(rootFolder, 'module.json')
  try {
    const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (json.id) {
      const dest = ensureModuleOutputDir(developmentOptions, json.id)
      if (dest) {
        console.log(`[webpack] module output → ${dest}`)
        return dest
      }
    }
  } catch (err) {
    console.warn('[webpack] could not read module.json for output path:', err.message)
  }
  const fallback = path.join(rootFolder, 'build')
  console.warn(
    `[webpack] fvtt.config.js userDataPath not set — output → ${fallback} (set userDataPath for Foundry to see it)`
  )
  return fallback
}

function copyList() {
  const list = [
    { from: 'module.json', to: 'module.json' },
    { from: 'scripts', to: 'scripts' },
    { from: 'styles', to: 'styles' },
    { from: 'language', to: 'language' }
  ]
  if (fs.existsSync(path.join(rootFolder, 'templates'))) {
    list.push({ from: 'templates', to: 'templates' })
  }
  if (fs.existsSync(path.join(rootFolder, 'assets'))) {
    list.push({ from: 'assets', to: 'assets' })
  }
  if (fs.existsSync(path.join(rootFolder, 'README.md'))) {
    list.push({ from: 'README.md', to: 'README.md', toType: 'file' })
  }
  return list
}

export default {
  bail: buildMode === 'production',
  context: rootFolder,
  entry: {},
  mode: buildMode,
  output: {
    clean: true,
    path: buildDestination()
  },
  plugins: [
    new CopyWebpackPlugin({ patterns: copyList() })
  ],
  watch: buildMode === 'development'
}
