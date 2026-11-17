type BrandLogoProps = {
  className?: string;
  inverse?: boolean;
};

export function BrandLogo({ className = '', inverse = false }: BrandLogoProps) {
  return (
    <span className={`brand-logo${inverse ? ' brand-logo-inverse' : ''} ${className}`.trim()}>
      <span className="brand-logo-symbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none" focusable="false">
          <path d="M16 5.5C12.1 2.5 6.1 4.5 6.6 10.8c.3 3.8 1.7 6.3 2.7 10.9.6 2.8 1.5 4.5 2.7 4.5 1.3 0 1.6-2.1 2.1-4.5.4-1.9 1.5-1.9 1.9 0 .5 2.4.9 4.5 2.1 4.5 1.3 0 2.2-1.7 2.8-4.5 1-4.6 2.4-7.1 2.7-10.9C25.9 4.5 19.9 2.5 16 5.5Z" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M11.2 8.6c1.7-.8 3 .7 4.8.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </span>
      <span className="brand-logo-wordmark">
        <strong>Dental</strong>
        <span>System</span>
      </span>
    </span>
  );
}
