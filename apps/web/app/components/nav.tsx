'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface NavProps {
  breadcrumbs?: { label: string; href?: string }[];
  user?: NavUser | null;
  signOutAction?: () => Promise<void>;
}

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Checkpoints', href: '/dashboard' },
  { label: 'Brief', href: '/checkpoint/demo/brief' },
  { label: 'Timeline', href: '/checkpoint/demo/timeline' },
];

export default function Nav({ breadcrumbs, user, signOutAction }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">
        <span className="nav-logo-icon">&#9684;</span>
        <span className="nav-logo-text">ckpt</span>
      </Link>

      <div className="nav-links">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link${pathname === link.href ? ' nav-link--active' : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

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

      <div className="nav-right">
        <span className="nav-cli-badge">cli v0.4.2</span>
        {user ? (
          <div className="nav-user">
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
                <button type="submit" className="btn btn-signin">
                  Sign out
                </button>
              </form>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn btn-signin">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
