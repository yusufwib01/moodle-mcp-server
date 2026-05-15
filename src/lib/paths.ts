import { existsSync, realpathSync, statSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";

export class PathSafetyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathSafetyError";
  }
}

function assertDirectoryExists(path: string): void {
  if (!existsSync(path)) {
    throw new PathSafetyError(`Path does not exist: ${path}`);
  }
  if (!statSync(path).isDirectory()) {
    throw new PathSafetyError(`Path is not a directory: ${path}`);
  }
}

export function resolveRoot(override?: string): string {
  const candidate = override ?? process.env.MOODLE_ROOT;
  if (!candidate) {
    throw new PathSafetyError(
      "MOODLE_ROOT is not set and no per-call root override was provided.",
    );
  }
  if (!isAbsolute(candidate)) {
    throw new PathSafetyError(`Moodle root must be an absolute path: ${candidate}`);
  }
  assertDirectoryExists(candidate);
  return realpathSync(candidate);
}

export function safeJoin(root: string, relativePath: string): string {
  if (relativePath.includes("\u0000")) {
    throw new PathSafetyError("Path contains a null byte.");
  }
  const resolvedRoot = realpathSync(root);
  const joined = resolve(resolvedRoot, relativePath);
  const realJoined = existsSync(joined) ? realpathSync(joined) : joined;
  if (realJoined !== resolvedRoot && !realJoined.startsWith(resolvedRoot + sep)) {
    throw new PathSafetyError(`Path escapes the Moodle root: ${relativePath}`);
  }
  return realJoined;
}
