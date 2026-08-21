/** The query parameter the invitation e-mail puts the token in. */
const PARAM = 'convite';

const readAndErase = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get(PARAM);
  if (!token) return null;

  params.delete(PARAM);
  const rest = params.toString();
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`,
  );

  return token;
};

/** Remembered so a second call — React's development double-mount — still sees
 * the token, rather than a URL the first call has already cleaned. */
let captured: string | null | undefined;

/**
 * Reads the invitation token out of the address bar and erases it in the same
 * breath. The token is a credential: leaving it in the URL would put it in the
 * browser's history, in any bookmark, in a screenshot of the address bar, and
 * in the `Referer` header of every request the page makes afterwards. From here
 * on it exists only in memory, for as long as the tab is open.
 */
export const takeInviteToken = (): string | null => {
  if (captured === undefined) captured = readAndErase();
  return captured;
};
