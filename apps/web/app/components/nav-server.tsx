import { auth, signOut } from '@/lib/auth';
import Nav from './nav';

interface NavServerProps {
  breadcrumbs?: { label: string; href?: string }[];
}

/**
 * Server Component wrapper around Nav that reads the NextAuth session
 * and passes user data + sign-out action as props.
 *
 * Use this in Server Components (e.g. dashboard, login, brief pages).
 * For Client Components (e.g. landing page), use Nav directly -- it will
 * render a "Sign in" link instead of user info since no user prop is passed.
 */
export default async function NavServer({ breadcrumbs }: NavServerProps) {
  let user: { name?: string | null; email?: string | null; image?: string | null } | null = null;

  try {
    const session = await auth();
    user = session?.user ?? null;
  } catch {
    // auth() may throw if env vars are missing during build; degrade gracefully
  }

  async function handleSignOut() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <Nav
      breadcrumbs={breadcrumbs}
      user={user}
      signOutAction={handleSignOut}
    />
  );
}
