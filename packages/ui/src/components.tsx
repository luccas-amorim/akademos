import type { CSSProperties, ReactNode } from 'react';
import {
  Button as AriaButton,
  type ButtonProps as AriaButtonProps,
  Checkbox as AriaCheckbox,
  type CheckboxProps as AriaCheckboxProps,
  FieldError,
  Input,
  Label,
  Meter,
  Switch as AriaSwitch,
  type SwitchProps as AriaSwitchProps,
  TextArea,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  ToggleButton,
  ToggleButtonGroup,
  type Key,
} from 'react-aria-components';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/* ——— Botão ——— */

export type ButtonVariant =
  'primary' | 'dark' | 'olive' | 'outline' | 'outline-primary' | 'subtle' | 'link';

export interface ButtonProps extends Omit<AriaButtonProps, 'className' | 'style'> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  className,
  ...props
}: ButtonProps) {
  return (
    <AriaButton
      {...props}
      className={cx(
        'ak-button',
        `ak-button--${variant}`,
        size !== 'md' && `ak-button--${size}`,
        block && 'ak-button--block',
        className,
      )}
    />
  );
}

/* ——— Cartão ——— */

export interface CardProps {
  children: ReactNode;
  padding?: 'none' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article' | 'aside';
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, padding = 'md', as: Tag = 'div', className, style }: CardProps) {
  return (
    <Tag
      className={cx(
        'ak-card',
        padding === 'md' && 'ak-card--pad',
        padding === 'lg' && 'ak-card--pad-lg',
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}

/* ——— Barra de progresso ——— */

export interface ProgressBarProps {
  /** 0–100. */
  value: number;
  label: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Texto lido por leitores de tela no lugar do percentual. */
  valueLabel?: string;
}

export function ProgressBar({ value, label, color, size = 'sm', valueLabel }: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <Meter value={v} aria-label={label} {...(valueLabel ? { valueLabel } : {})}>
      {() => (
        <div className={cx('ak-bar', size === 'md' && 'ak-bar--md', size === 'lg' && 'ak-bar--lg')}>
          <div className="ak-bar__fill" style={{ width: `${v}%`, background: color }} />
        </div>
      )}
    </Meter>
  );
}

/* ——— KPI ——— */

export interface KpiProps {
  label: string;
  value: ReactNode;
  /** 0–100; omitido = sem barra. */
  progress?: number;
  caption?: ReactNode;
  valueColor?: string;
  compact?: boolean;
}

export function Kpi({ label, value, progress, caption, valueColor, compact }: KpiProps) {
  return (
    <div className={cx('ak-card', 'ak-kpi', compact ? 'ak-kpi--compact' : 'ak-card--pad')}>
      <div className="ak-eyebrow ak-kpi__label">{label}</div>
      <div className="ak-kpi__value" style={valueColor ? { color: valueColor } : undefined}>
        {value}
      </div>
      {progress !== undefined && <ProgressBar value={progress} label={label} />}
      {caption && <div className="ak-small ak-muted">{caption}</div>}
    </div>
  );
}

/* ——— Pílula ——— */

export interface PillProps {
  children: ReactNode;
  color?: string;
  background?: string;
  outline?: boolean;
  strong?: boolean;
}

export function Pill({ children, color, background, outline, strong }: PillProps) {
  return (
    <span
      className={cx('ak-pill', outline && 'ak-pill--outline', strong && 'ak-pill--strong')}
      style={{ color, background }}
    >
      {children}
    </span>
  );
}

/* ——— Cabeçalho de página ——— */

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  aside?: ReactNode;
  hero?: boolean;
}

export function PageHeader({ title, subtitle, eyebrow, aside, hero }: PageHeaderProps) {
  return (
    <header className="ak-page-header">
      <div>
        {eyebrow && (
          <div className="ak-small ak-muted" style={{ marginBottom: 4 }}>
            {eyebrow}
          </div>
        )}
        <h1 className={cx('ak-h1', hero && 'ak-h1--hero')}>{title}</h1>
        {subtitle && <div className="ak-page-header__sub">{subtitle}</div>}
      </div>
      {aside}
    </header>
  );
}

/* ——— Filtros (seleção única) ——— */

export interface FilterOption<K extends string> {
  id: K;
  label: string;
}

export interface FiltersProps<K extends string> {
  label: string;
  options: ReadonlyArray<FilterOption<K>>;
  value: K;
  onChange: (value: K) => void;
}

export function Filters<K extends string>({ label, options, value, onChange }: FiltersProps<K>) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      className="ak-filters"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys: Set<Key>) => {
        const [k] = [...keys];
        if (k !== undefined) onChange(String(k) as K);
      }}
    >
      {options.map((o) => (
        <ToggleButton key={o.id} id={o.id} className="ak-filter">
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/* ——— Abas segmentadas ——— */

export function Segmented<K extends string>({ label, options, value, onChange }: FiltersProps<K>) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      className="ak-segmented"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys: Set<Key>) => {
        const [k] = [...keys];
        if (k !== undefined) onChange(String(k) as K);
      }}
    >
      {options.map((o) => (
        <ToggleButton key={o.id} id={o.id} className="ak-segmented__item">
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/* ——— Campo de texto ——— */

export interface TextFieldProps extends Omit<AriaTextFieldProps, 'className' | 'children'> {
  label: ReactNode;
  labelAside?: ReactNode;
  placeholder?: string;
  multiline?: boolean;
  size?: 'sm' | 'md';
  errorMessage?: string;
}

export function TextField({
  label,
  labelAside,
  placeholder,
  multiline,
  size = 'md',
  errorMessage,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField {...props} className="ak-field">
      {labelAside ? (
        <span className="ak-field__label-row">
          <Label>{label}</Label>
          {labelAside}
        </span>
      ) : (
        <Label>{label}</Label>
      )}
      {multiline ? (
        <TextArea className="ak-textarea" placeholder={placeholder} />
      ) : (
        <Input
          className={cx('ak-input', size === 'sm' && 'ak-input--sm')}
          placeholder={placeholder}
        />
      )}
      <FieldError className="ak-field__error">{errorMessage}</FieldError>
    </AriaTextField>
  );
}

/* ——— Checkbox e Switch ——— */

export function Checkbox({
  children,
  ...props
}: Omit<AriaCheckboxProps, 'className' | 'children'> & { children: ReactNode }) {
  return (
    <AriaCheckbox {...props} className="ak-checkbox">
      {({ isSelected }) => (
        <>
          <span className="ak-checkbox__box" aria-hidden>
            {isSelected ? '✓' : ''}
          </span>
          {children}
        </>
      )}
    </AriaCheckbox>
  );
}

export function Switch({
  children,
  ...props
}: Omit<AriaSwitchProps, 'className' | 'children'> & { children: ReactNode }) {
  return (
    <AriaSwitch {...props} className="ak-switch">
      <span className="ak-switch__track" aria-hidden />
      {children}
    </AriaSwitch>
  );
}

/* ——— Aviso ——— */

export interface NoteProps {
  tone: 'positive' | 'danger' | 'warning' | 'neutral' | 'info';
  children: ReactNode;
  role?: 'status' | 'alert';
}

export function Note({ tone, children, role }: NoteProps) {
  return (
    <div className={cx('ak-note', `ak-note--${tone}`)} role={role}>
      {children}
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return <div className="ak-divider">{children}</div>;
}
