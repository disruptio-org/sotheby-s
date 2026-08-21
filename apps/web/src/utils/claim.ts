import type { ClaimKind } from '@sothebys/domain';

/** The query parameters the two kinds of link arrive under. */
const PARAMS: Record<string, ClaimKind> = {
  convite: 'invite',
  recuperar: 'reset',
};

export interface Claim {
  kind: ClaimKind;
  token: string;
}

const readAndErase = (): Claim | null => {
  const params = new URLSearchParams(window.location.search);

  let claim: Claim | null = null;
  for (const [param, kind] of Object.entries(PARAMS)) {
    const token = params.get(param);
    if (token && !claim) claim = { kind, token };
    params.delete(param);
  }
  if (!claim) return null;

  const rest = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`,
  );

  return claim;
};

/** Remembered so a second call — React's development double-mount — still sees
 * the token, rather than a URL the first call has already cleaned. */
let captured: Claim | null | undefined;

/**
 * Reads the token out of the address bar and erases it in the same breath. The
 * token is a credential: leaving it in the URL would put it in the browser's
 * history, in any bookmark, in a screenshot of the address bar, and in the
 * `Referer` header of every request the page makes afterwards. From here on it
 * exists only in memory, for as long as the tab is open.
 */
export const takeClaim = (): Claim | null => {
  if (captured === undefined) captured = readAndErase();
  return captured;
};
