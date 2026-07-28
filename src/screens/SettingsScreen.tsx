import { ReactNode } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';

type SettingsScreenProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  target: number;
  status: string;
  onSupabaseUrlChange: (value: string) => void;
  onSupabaseAnonKeyChange: (value: string) => void;
  onTargetChange: (value: number) => void;
  onSave: () => void;
};

export default function SettingsScreen({
  supabaseUrl,
  supabaseAnonKey,
  target,
  status,
  onSupabaseUrlChange,
  onSupabaseAnonKeyChange,
  onTargetChange,
  onSave
}: SettingsScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="Instellingen">
        <div className="flex flex-col gap-4">
          <Field label="Supabase URL">
            <input
              type="url"
              placeholder="https://<project>.supabase.co"
              value={supabaseUrl}
              onChange={(event) => onSupabaseUrlChange(event.target.value)}
              className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text"
            />
          </Field>
          <Field label="Supabase anon key">
            <input
              type="text"
              placeholder="anon key"
              value={supabaseAnonKey}
              onChange={(event) => onSupabaseAnonKeyChange(event.target.value)}
              autoComplete="off"
              className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text"
            />
          </Field>
          <Field label="Dagdoel (ml)">
            <input
              type="number"
              min="500"
              step="50"
              value={target}
              onChange={(event) => onTargetChange(Number(event.target.value))}
              className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text"
            />
          </Field>
          <Button variant="primary" onClick={onSave}>
            Opslaan
          </Button>
          <p className="text-sm text-text-muted">{status}</p>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm text-text-muted">
      {label}
      {children}
    </label>
  );
}
