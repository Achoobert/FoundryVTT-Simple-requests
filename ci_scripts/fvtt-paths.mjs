import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptsDir = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.dirname(scriptsDir)

/** Absolute Foundry user data root (folder that contains `Data/`). */
export function resolveUserDataPath(developmentOptions) {
  const raw = developmentOptions?.userDataPath
  if (!raw || typeof raw !== 'string' || !String(raw).trim()) {
    return null
  }
  const trimmed = String(raw).trim()
  return path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(REPO_ROOT, trimmed)
}

export function moduleOutputDir(developmentOptions, moduleId) {
  const userData = resolveUserDataPath(developmentOptions)
  if (!userData || !moduleId) {
    return null
  }
  return path.join(userData, 'Data', 'modules', moduleId)
}

/** Create `Data/modules/<id>` under userDataPath; return absolute path. */
export function ensureModuleOutputDir(developmentOptions, moduleId) {
  const dest = moduleOutputDir(developmentOptions, moduleId)
  if (!dest) {
    return null
  }
  fs.mkdirSync(dest, { recursive: true })
  return dest
}
