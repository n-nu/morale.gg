const controlClass =
  "rounded-md bg-gold px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-gold-ink transition-colors hover:bg-gold-bright";

export function hasAuthenticatedUser(
  session: { user?: unknown } | null | undefined,
): boolean {
  return session?.user != null;
}

export function AuthNavView({
  signedIn,
  signOutAction,
  devSignInHref,
}: {
  signedIn: boolean;
  signOutAction: () => Promise<void>;
  devSignInHref?: string;
}) {
  if (!signedIn) {
    return (
      <>
        {devSignInHref && (
          <a href={devSignInHref} className={controlClass}>
            Demo sign-in
          </a>
        )}
        {/* Auth.js route handler, not a page — plain anchor is intentional. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/signin" className={controlClass}>
          Sign in
        </a>
      </>
    );
  }

  return (
    <form action={signOutAction}>
      <button type="submit" className={controlClass}>
        Sign out
      </button>
    </form>
  );
}
