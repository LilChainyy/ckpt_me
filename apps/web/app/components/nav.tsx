import Link from 'next/link';

interface NavProps {
  breadcrumbs?: { label: string; href?: string }[];
}

export default function Nav({ breadcrumbs }: NavProps) {
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
    </nav>
  );
}
