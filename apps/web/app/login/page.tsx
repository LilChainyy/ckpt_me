import { signIn } from '@/lib/auth';
import NavServer from '../components/nav-server';

export default function LoginPage() {
  return (
    <main className="page">
      <NavServer />
      <div className="page-header" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <h1 className="page-title">Sign in to ckpt</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
          Sign in with your GitHub account to create and share checkpoints.
        </p>
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo: '/dashboard' });
          }}
        >
          <button type="submit" className="btn btn-primary">
            Sign in with GitHub
          </button>
        </form>
      </div>
    </main>
  );
}
