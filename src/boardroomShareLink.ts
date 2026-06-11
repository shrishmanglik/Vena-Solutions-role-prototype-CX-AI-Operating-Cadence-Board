import { parsePortfolioSnapshot } from "./portfolioSnapshot";
import type { SnapshotParseResult } from "./portfolioSnapshot";

export const BOARDROOM_SHARE_HASH_KEY = "boardroom";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(value: string): string {
  const bytes = encoder.encode(value);
  let binary = "";
  const chunkSize = 8192;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string): string | null {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;

  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

    return decoder.decode(bytes);
  } catch {
    return null;
  }
}

export function encodeBoardroomSnapshot(snapshotJson: string): string {
  return toBase64Url(snapshotJson);
}

export function buildBoardroomShareUrl(snapshotJson: string, href: string): string {
  const url = new URL(href);
  const params = new URLSearchParams();

  params.set(BOARDROOM_SHARE_HASH_KEY, encodeBoardroomSnapshot(snapshotJson));
  url.hash = params.toString();

  return url.toString();
}

export function parseBoardroomShareHash(hash: string): SnapshotParseResult | null {
  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;

  if (!normalized) {
    return null;
  }

  const token = new URLSearchParams(normalized).get(BOARDROOM_SHARE_HASH_KEY);

  if (!token) {
    return null;
  }

  const snapshot = fromBase64Url(token);

  if (!snapshot) {
    return { ok: false, error: "Boardroom share link is not readable." };
  }

  return parsePortfolioSnapshot(snapshot);
}
