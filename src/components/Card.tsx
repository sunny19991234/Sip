import { ReactNode } from 'react';

type CardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export default function Card({ title, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-card border border-border bg-surface p-5 ${className}`}>
      {title && <p className="mb-4 text-sm font-semibold text-text">{title}</p>}
      {children}
    </section>
  );
}
