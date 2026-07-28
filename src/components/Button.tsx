import { ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'raised' | 'ghost';
};

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-accent text-accent-foreground',
  raised: 'bg-surface-raised text-text border border-border',
  ghost: 'bg-transparent text-text-muted'
};

export default function Button({ variant = 'raised', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`rounded-card px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
