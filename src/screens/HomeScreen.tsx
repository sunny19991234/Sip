import Button from '../components/Button';
import Card from '../components/Card';
import { Container, DrinkLogRow } from '../types';

type HomeScreenProps = {
  target: number;
  totalToday: number;
  remaining: number;
  progress: number;
  containers: Container[];
  logs: DrinkLogRow[];
  customAmount: string;
  onCustomAmountChange: (value: string) => void;
  onLog: (amount: number, source: string) => void;
  onCustomLog: () => void;
  onUndo: () => void;
};

export default function HomeScreen({
  target,
  totalToday,
  remaining,
  progress,
  containers,
  logs,
  customAmount,
  onCustomAmountChange,
  onLog,
  onCustomLog,
  onUndo
}: HomeScreenProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted">Vandaag</p>
        <p className="mt-2 text-4xl font-bold text-text">{totalToday} ml</p>
        <p className="mt-1 text-sm text-text-muted">
          {progress}% van {target} ml · nog {remaining} ml
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-accent transition-[width]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </Card>

      <Card title="Snel loggen">
        <div className="grid grid-cols-2 gap-3">
          {containers.length > 0 ? (
            containers.map((container) => (
              <Button key={container.id} variant="primary" onClick={() => onLog(container.volume_ml, 'ui')}>
                {container.volume_ml} ml
              </Button>
            ))
          ) : (
            <Button variant="raised" disabled>
              Laden...
            </Button>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            min="10"
            step="10"
            value={customAmount}
            onChange={(event) => onCustomAmountChange(event.target.value)}
            className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text"
          />
          <Button variant="raised" onClick={onCustomLog}>
            Loggen
          </Button>
        </div>
      </Card>

      <Card title="Recente entries">
        {logs.length > 0 ? (
          <>
            <Button variant="ghost" className="mb-3" onClick={onUndo}>
              Undo laatste
            </Button>
            <ul className="flex flex-col gap-2">
              {logs.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between rounded-card border border-border bg-surface-raised px-4 py-3"
                >
                  <span className="text-sm font-semibold text-text">{entry.amount_ml} ml</span>
                  <span className="flex gap-3 text-xs text-text-muted">
                    <span>{entry.source}</span>
                    <span>
                      {new Date(entry.logged_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-text-muted">Nog geen entries voor vandaag.</p>
        )}
      </Card>
    </div>
  );
}
