import Link from 'next/link';

/**
 * Shape of the user object passed to Nav for authenticated display.
 * Matches the subset of NextAuth Session["user"] that the nav needs.
 */
interface NavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface NavProps {
  breadcrumbs?: { label: string; href?: string }[];
  /** When provided, shows user avatar + Dashboard link + sign-out form. */
  user?: NavUser | null;
  /**
   * Server action to call when the sign-out form is submitted.
   * Required when `user` is provided.
   */
  signOutAction?: () => Promise<void>;
}

/**
 * Shared navigation bar.
 *
 * This component is intentionally kept as a plain (non-async) component so it
 * can be imported by both Client Components and Server Components. Session
 * data is passed in via props -- see NavServer for a convenience wrapper
 * that reads the session automatically in Server Component contexts.
 */
export default function Nav({ breadcrumbs, user, signOutAction }: NavProps) {
  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        ckpt
      </Link>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="nav-breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="nav-crumb">
              <span className="nav-sep">/</span>
              {crumb.href ? (
                <Link href={crumb.href} className="nav-crumb-link">
                  {crumb.label}
                </Link>
              ) : (
                <span className="nav-crumb-text">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <span className="nav-spacer" />

      {user ? (
        <div className="nav-user">
          <Link href="/dashboard" className="nav-link">
            Dashboard
          </Link>
          {user.image && (
            <img
              src={user.image}
              alt={user.name ?? 'User avatar'}
              className="nav-avatar"
            />
          )}
          <span className="nav-user-name">
            {user.name ?? user.email}
          </span>
          {signOutAction && (
            <form action={signOutAction}>
              <button type="submit" className="btn-sign-out">
                Sign out
              </button>
            </form>
          )}
        </div>
      ) : (
        <Link href="/login" className="nav-link">
          Sign in
        </Link>
      )}
    </nav>
  );
}
