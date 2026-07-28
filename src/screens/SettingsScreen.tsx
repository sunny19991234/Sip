import { ReactNode } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';

type SettingsScreenProps = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  target: number;
  gamificationEnabled: boolean;
  status: string;
  onSupabaseUrlChange: (value: string) => void;
  onSupabaseAnonKeyChange: (value: string) => void;
  onTargetChange: (value: number) => void;
  onGamificationChange: (value: boolean) => void;
  onSave: () => void;
};

export default function SettingsScreen({
  supabaseUrl,
  supabaseAnonKey,
  target,
  gamificationEnabled,
  status,
  onSupabaseUrlChange,
  onSupabaseAnonKeyChange,
  onTargetChange,
  onGamificationChange,
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
          <label className="flex items-center justify-between gap-3 text-sm text-text">
            <span>Streaks tonen ("X dagen op rij")</span>
            <input
              type="checkbox"
              checked={gamificationEnabled}
              onChange={(event) => onGamificationChange(event.target.checked)}
              className="h-5 w-5 accent-accent"
            />
          </label>
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
