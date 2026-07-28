import Card from '../components/Card';
import { DailyIntakeRow } from '../types';

type StatsScreenProps = {
  history: DailyIntakeRow[];
};

export default function StatsScreen({ history }: StatsScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card title="Laatste 7 dagen">
        {history.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {history.map((day) => (
              <li
                key={day.day}
                className="flex items-center justify-between rounded-card border border-border bg-surface-raised px-4 py-3"
              >
                <span className="text-sm font-semibold text-text">
                  {new Date(day.day).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                </span>
                <span className="flex gap-3 text-xs text-text-muted">
                  <span>{day.total_ml} ml</span>
                  <span>{day.goal_met ? 'Voltooid' : 'Open'}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">Geen historie beschikbaar.</p>
        )}
      </Card>
    </div>
  );
}
