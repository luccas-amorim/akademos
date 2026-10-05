export interface LogoProps {
  size?: number;
  /** Fundo claro atrás do ícone (para uso sobre o painel azul). */
  onDark?: boolean;
}

/** Monograma "A" do Akademos (design/static/img/favicon.svg). */
export function LogoMark({ size = 28, onDark }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      style={
        onDark
          ? { background: 'var(--bg)', borderRadius: 6, padding: 3, boxSizing: 'content-box' }
          : undefined
      }
    >
      <rect width="64" height="64" rx="12" fill="#1e3a8a" />
      <path
        d="M32 12 14 52h8l3.6-8.6h12.8L42 52h8L32 12Zm-3.7 24.6L32 27.4l3.7 9.2h-7.4Z"
        fill="#fff"
      />
    </svg>
  );
}
