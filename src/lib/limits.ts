export const DEFAULT_FILE_LIMIT = 500;
export const DEFAULT_SEARCH_LIMIT = 20;

export interface SliceOptions {
  offset?: number;
  limit?: number;
}

export interface SliceResult<T> {
  lines: T[];
  totalLines: number;
  truncated: boolean;
  hint?: string;
}

export interface CapResult<T> {
  results: T[];
  totalMatches: number;
  truncated: boolean;
  hint?: string;
}

function normalize(opts: SliceOptions | undefined, defaultLimit: number): { offset: number; limit: number } {
  const offset = opts?.offset ?? 0;
  const limit = opts?.limit ?? defaultLimit;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new RangeError(`offset must be a non-negative integer (got ${offset})`);
  }
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`limit must be a positive integer (got ${limit})`);
  }
  return { offset, limit };
}

export function sliceLines<T>(lines: T[], opts?: SliceOptions): SliceResult<T> {
  const { offset, limit } = normalize(opts, DEFAULT_FILE_LIMIT);
  const slice = lines.slice(offset, offset + limit);
  const consumed = offset + slice.length;
  const truncated = consumed < lines.length;
  return {
    lines: slice,
    totalLines: lines.length,
    truncated,
    hint: truncated ? `more lines available — call again with offset=${consumed}` : undefined,
  };
}

export function capResults<T>(items: T[], opts?: SliceOptions): CapResult<T> {
  const { offset, limit } = normalize(opts, DEFAULT_SEARCH_LIMIT);
  const slice = items.slice(offset, offset + limit);
  const consumed = offset + slice.length;
  const truncated = consumed < items.length;
  return {
    results: slice,
    totalMatches: items.length,
    truncated,
    hint: truncated ? `more results available — call again with offset=${consumed}` : undefined,
  };
}
