import { useState } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import Toggle from '../components/Toggle';
import { CloseIcon } from '../components/icons';
import { Container, ReminderRule } from '../types';

const TARGET_STEP = 100;
const MIN_TARGET = 100;

type SettingsScreenProps = {
  target: number;
  dayStartHour: number;
  containers: Container[];
  remindersEnabled: boolean;
  reminderRules: ReminderRule[];
  gamificationEnabled: boolean;
  streak: number | null;
  errorMessage: string;
  onTargetStep: (delta: number) => void;
  onDayStartHourChange: (hour: number) => void;
  onAddContainer: (name: string, volumeMl: number) => void;
  onRemoveContainer: (id: string) => void;
  onRemindersEnabledChange: (value: boolean) => void;
  onAddReminderRule: (atTime: string) => void;
  onUpdateReminderRule: (id: string, atTime: string) => void;
  onRemoveReminderRule: (id: string) => void;
  onGamificationChange: (value: boolean) => void;
};

export default function SettingsScreen({
  target,
  dayStartHour,
  containers,
  remindersEnabled,
  reminderRules,
  gamificationEnabled,
  streak,
  errorMessage,
  onTargetStep,
  onDayStartHourChange,
  onAddContainer,
  onRemoveContainer,
  onRemindersEnabledChange,
  onAddReminderRule,
  onUpdateReminderRule,
  onRemoveReminderRule,
  onGamificationChange
}: SettingsScreenProps) {
  const [newContainerName, setNewContainerName] = useState('');
  const [newContainerMl, setNewContainerMl] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('10:00');

  const handleAddContainer = () => {
    const volumeMl = Number(newContainerMl);
    if (!newContainerName.trim() || !Number.isFinite(volumeMl) || volumeMl <= 0) return;
    onAddContainer(newContainerName.trim(), volumeMl);
    setNewContainerName('');
    setNewContainerMl('');
  };

  const handleAddReminder = () => {
    if (!newReminderTime) return;
    onAddReminderRule(newReminderTime);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Dagelijks doel">
        <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface-raised px-4 py-3">
          <button
            type="button"
            onClick={() => onTargetStep(-TARGET_STEP)}
            disabled={target <= MIN_TARGET}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-lg font-semibold text-text disabled:opacity-40"
          >
            −
          </button>
          <span className="text-lg font-bold text-text">{target} ml</span>
          <button
            type="button"
            onClick={() => onTargetStep(TARGET_STEP)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg text-lg font-semibold text-text"
          >
            +
          </button>
        </div>
      </Card>

      <Card title="Daggrens">
        <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface-raised px-4 py-3">
          <span className="text-sm text-text-muted">Nieuwe dag begint om</span>
          <select
            value={dayStartHour}
            onChange={(event) => onDayStartHourChange(Number(event.target.value))}
            className="rounded-card border border-border bg-bg px-3 py-2 text-sm font-semibold text-text"
          >
            {Array.from({ length: 24 }, (_, hour) => hour).map((hour) => (
              <option key={hour} value={hour}>
                {String(hour).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </Card>

      <Card title="Bekers & flessen">
        <div className="flex flex-col gap-3">
          {containers.length > 0 && (
            <ul className="flex flex-col gap-2">
              {containers.map((container) => (
                <li
                  key={container.id}
                  className="flex items-center justify-between rounded-card border border-border bg-surface-raised px-4 py-3"
                >
                  <span className="text-sm text-text">
                    {container.name} — {container.volume_ml} ml
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveContainer(container.id)}
                    className="text-xs font-medium text-text-muted"
                  >
                    Verwijderen
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Naam"
              value={newContainerName}
              onChange={(event) => setNewContainerName(event.target.value)}
              className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted"
            />
            <input
              type="number"
              min="1"
              placeholder="ml"
              value={newContainerMl}
              onChange={(event) => setNewContainerMl(event.target.value)}
              className="w-24 shrink-0 rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text placeholder:text-text-muted"
            />
          </div>
          <Button variant="primary" onClick={handleAddContainer} className="w-full">
            + Toevoegen
          </Button>
        </div>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <Toggle
            checked={remindersEnabled}
            onChange={onRemindersEnabledChange}
            label="Herinneringen"
            description="Op gekozen momenten"
          />
          <Toggle
            checked={gamificationEnabled}
            onChange={onGamificationChange}
            label="Streaks"
            description="Toon een streak-teller"
          />

          {remindersEnabled && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {reminderRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-raised px-4 py-2"
                >
                  <input
                    type="time"
                    value={rule.at_time.slice(0, 5)}
                    onChange={(event) => onUpdateReminderRule(rule.id, event.target.value)}
                    className="bg-transparent text-sm text-text"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveReminderRule(rule.id)}
                    className="text-text-muted"
                    aria-label="Tijdstip verwijderen"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newReminderTime}
                  onChange={(event) => setNewReminderTime(event.target.value)}
                  className="w-full rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text"
                />
                <Button variant="primary" onClick={handleAddReminder} className="shrink-0">
                  + Toevoegen
                </Button>
              </div>
            </div>
          )}

          {gamificationEnabled && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text">Huidige streak</span>
                <span className="text-xs text-text-muted">Dagen op rij met doel behaald</span>
              </div>
              <span className="text-2xl font-bold text-accent">{streak ?? 0}</span>
            </div>
          )}
        </div>
      </Card>

      <Card title="Eenheid">
        <div className="rounded-card border border-border bg-surface-raised px-4 py-3 text-sm text-text">
          Milliliter (ml)
        </div>
      </Card>

      {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
    </div>
  );
}
