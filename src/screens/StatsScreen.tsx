import Card from '../components/Card';
import { DailyIntakeRow } from '../types';

type StatsScreenProps = {
  history: DailyIntakeRow[];
  target: number;
  streak: number | null;
  gamificationEnabled: boolean;
};

function weekdayLabel(dayIso: string) {
  const date = new Date(`${dayIso}T00:00:00`);
  const label = date.toLocaleDateString('nl-NL', { weekday: 'short' }).replace('.', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function StatTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-text">
        {value} <span className="text-sm font-medium text-text-muted">{unit}</span>
      </p>
    </div>
  );
}

export default function StatsScreen({ history, target, streak, gamificationEnabled }: StatsScreenProps) {
  const days = [...history].reverse();
  const avgPerDay = history.length > 0 ? Math.round(history.reduce((sum, day) => sum + day.total_ml, 0) / history.length) : 0;
  const goalMetCount = history.filter((day) => day.goal_met).length;
  const maxScale = Math.max(target, ...days.map((day) => day.total_ml), 1) * 1.15;
  const goalLinePercent = (target / maxScale) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className={`grid gap-3 ${gamificationEnabled ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <StatTile label="Gem. per dag" value={String(avgPerDay)} unit="ml" />
        {gamificationEnabled && <StatTile label="Streak" value={String(streak ?? 0)} unit="dagen" />}
        <StatTile label="Doel gehaald" value={`${goalMetCount}/${history.length || 7}`} unit="dagen" />
      </div>

      <Card>
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-text-muted">Afgelopen 7 dagen</p>
        {days.length > 0 ? (
          <>
            <div className="relative flex h-40 items-end gap-2">
              <div
                className="pointer-events-none absolute inset-x-0 border-t border-dashed border-text-muted"
                style={{ bottom: `${goalLinePercent}%` }}
              />
              {days.map((day) => {
                const heightPercent = (day.total_ml / maxScale) * 100;
                return (
                  <div key={day.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-xs font-medium text-text">{day.total_ml}</span>
                    <div
                      className={`w-full max-w-8 rounded-t-md ${day.goal_met ? 'bg-accent' : 'bg-surface-raised'}`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              {days.map((day) => (
                <span key={day.day} className="flex-1 text-center text-xs text-text-muted">
                  {weekdayLabel(day.day)}
                </span>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-0 w-4 border-t border-dashed border-text-muted" />
              <span>Doel — {target} ml</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted">Geen historie beschikbaar.</p>
        )}
      </Card>
    </div>
  );
}
