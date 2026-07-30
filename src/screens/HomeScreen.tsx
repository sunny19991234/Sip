import Button from '../components/Button';
import WaterGlass from '../components/WaterGlass';
import { Container, DrinkLogRow } from '../types';

type HomeScreenProps = {
  target: number;
  totalToday: number;
  progress: number;
  containers: Container[];
  logs: DrinkLogRow[];
  customAmount: string;
  streak: number | null;
  showUndo: boolean;
  pendingIds: Set<string>;
  onCustomAmountChange: (value: string) => void;
  onLog: (amount: number, source: string) => void;
  onCustomLog: () => void;
  onUndo: () => void;
};

const SOURCE_LABEL: Record<string, string> = {
  nfc: 'NFC',
  ui: 'Snelknop',
  manual: 'Handmatig'
};

const TODAY_LABEL = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Amsterdam'
}).format(new Date());

export default function HomeScreen({
  target,
  totalToday,
  progress,
  containers,
  logs,
  customAmount,
  streak,
  showUndo,
  pendingIds,
  onCustomAmountChange,
  onLog,
  onCustomLog,
  onUndo
}: HomeScreenProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-text">Vandaag</p>
          <p className="text-sm text-text-muted">{TODAY_LABEL}</p>
        </div>
        {streak !== null && streak > 0 && (
          <span className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text">
            {streak} {streak === 1 ? 'dag' : 'dagen'} op rij
          </span>
        )}
      </div>

      <WaterGlass percent={progress} amountMl={totalToday} targetMl={target} />

      {showUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="-mt-2 self-center text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Ongedaan maken
        </button>
      )}

      <div className="grid grid-cols-3 gap-3">
        {containers.length > 0 ? (
          containers.map((container) => (
            <button
              key={container.id}
              type="button"
              onClick={() => onLog(container.volume_ml, 'ui')}
              className="flex flex-col items-center justify-center gap-1 rounded-card border border-border bg-surface-raised px-2 py-4"
            >
              <span className="text-base font-semibold text-text">+{container.volume_ml} ml</span>
              <span className="text-xs text-text-muted">{container.name}</span>
            </button>
          ))
        ) : (
          <Button variant="raised" disabled>
            Laden...
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          min="10"
          step="10"
          placeholder="Aangepaste hoeveelheid (ml)"
          value={customAmount}
          onChange={(event) => onCustomAmountChange(event.target.value)}
          className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted"
        />
        <Button variant="primary" onClick={onCustomLog} className="shrink-0">
          Toevoegen
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-text-muted">Log</p>
        {logs.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {logs.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-card bg-surface-raised px-4 py-4"
              >
                <span className="flex items-center gap-2 text-sm text-text">
                  {new Date(entry.logged_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  <span className="text-xs font-normal text-text-muted">· {SOURCE_LABEL[entry.source] ?? entry.source}</span>
                  {pendingIds.has(entry.id) && (
                    <span className="text-xs font-normal text-text-muted">· wordt gesynchroniseerd</span>
                  )}
                </span>
                <span className="text-sm font-semibold text-text">+{entry.amount_ml} ml</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">Nog geen entries voor vandaag.</p>
        )}
      </div>
    </div>
  );
}
