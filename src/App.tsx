import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import TabBar, { TabId } from './components/TabBar';
import HomeScreen from './screens/HomeScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { Container, DailyIntakeRow, DrinkLogRow, ReminderRule, SettingsRow } from './types';

const DEFAULT_TARGET = 3000;
const DEFAULT_CONTAINERS = [
  { name: 'Glas', volume_ml: 250, sort_order: 1, is_nfc_default: false },
  { name: 'Fles', volume_ml: 750, sort_order: 2, is_nfc_default: true },
  { name: 'Liter', volume_ml: 1000, sort_order: 3, is_nfc_default: false }
];

const DEFAULT_SETTINGS = {
  daily_target_ml: DEFAULT_TARGET,
  day_start_hour: 4,
  timezone: 'Europe/Amsterdam',
  gamification_enabled: false,
  reminders_enabled: false
};

function normalizeSupabaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

const SUPABASE_URL = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL || '');
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function toAmsterdamDateString(date: Date) {
  return date.toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' });
}

function isTodayInAmsterdam(timestamp: string) {
  const date = new Date(timestamp);
  return toAmsterdamDateString(date) === toAmsterdamDateString(new Date());
}

function logicalDayISO(date: Date, dayStartHour: number, timezone: string) {
  const shifted = new Date(date.getTime() - dayStartHour * 3600 * 1000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    shifted
  );
}

function computeStreak(history: DailyIntakeRow[], todayIso: string) {
  if (history.length === 0) return 0;

  const sorted = [...history].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
  let index = 0;
  if (sorted[0].day === todayIso && !sorted[0].goal_met) {
    index = 1;
  }

  let streak = 0;
  let expected: Date | null = null;
  for (; index < sorted.length; index++) {
    const row = sorted[index];
    if (!row.goal_met) break;

    const rowDate = new Date(`${row.day}T00:00:00Z`);
    if (expected && rowDate.getTime() !== expected.getTime()) break;

    streak++;
    expected = new Date(rowDate);
    expected.setUTCDate(expected.getUTCDate() - 1);
  }

  return streak;
}

export default function App() {
  const [tab, setTab] = useState<TabId>('home');
  const [client] = useState<SupabaseClient | null>(() =>
    SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [logs, setLogs] = useState<DrinkLogRow[]>([]);
  const [history, setHistory] = useState<DailyIntakeRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [status, setStatus] = useState('Loading…');
  const [settingsError, setSettingsError] = useState('');
  const [customAmount, setCustomAmount] = useState('250');
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!client) {
      setStatus('Supabase-omgevingsvariabelen ontbreken (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
      return;
    }

    const load = async () => {
      try {
        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;

        let session = sessionData.session;
        if (!session) {
          const { data: signInData, error: signInError } = await client.auth.signInAnonymously();
          if (signInError) throw signInError;
          session = signInData.session;
        }

        const currentUserId = session?.user?.id;
        if (!currentUserId) throw new Error('Geen actieve Supabase-sessie.');
        setUserId(currentUserId);

        await ensureDefaults(client, currentUserId);
        await refreshData(client, currentUserId);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Onbekende fout');
      }
    };

    load();
  }, [client]);

  const ensureDefaults = async (supabase: SupabaseClient, currentUserId: string) => {
    const [{ data: settingsData }, { data: containerData }] = await Promise.all([
      supabase.from('settings').select('*').eq('user_id', currentUserId).maybeSingle(),
      supabase.from('containers').select('*').eq('user_id', currentUserId).order('sort_order')
    ]);

    if (!settingsData) {
      await supabase.from('settings').insert({
        user_id: currentUserId,
        ...DEFAULT_SETTINGS
      });
    }

    const existingNames = new Set((containerData || []).map((item) => item.name));
    for (const item of DEFAULT_CONTAINERS) {
      if (!existingNames.has(item.name)) {
        await supabase.from('containers').insert({
          user_id: currentUserId,
          ...item
        });
      }
    }
  };

  const refreshData = async (supabase: SupabaseClient, currentUserId: string) => {
    setStatus('Laden…');

    const [
      { data: containerData, error: containerError },
      { data: logData, error: logError },
      { data: settingsData, error: settingsFetchError },
      { data: historyData, error: historyError },
      { data: reminderData, error: reminderError }
    ] = await Promise.all([
      supabase.from('containers').select('*').eq('user_id', currentUserId).order('sort_order'),
      supabase
        .from('drink_log')
        .select('*')
        .eq('user_id', currentUserId)
        .is('deleted_at', null)
        .order('logged_at', { ascending: false })
        .limit(30),
      supabase.from('settings').select('*').eq('user_id', currentUserId).maybeSingle(),
      supabase.from('daily_intake').select('*').eq('user_id', currentUserId).order('day', { ascending: false }).limit(60),
      supabase.from('reminder_rules').select('*').eq('user_id', currentUserId).order('at_time')
    ]);

    if (containerError || logError || settingsFetchError || historyError || reminderError) {
      throw containerError || logError || settingsFetchError || historyError || reminderError;
    }

    setContainers(containerData || []);
    setLogs(((logData || []) as DrinkLogRow[]).filter((entry) => isTodayInAmsterdam(entry.logged_at)));
    setSettings(settingsData as SettingsRow | null);
    setHistory((historyData || []) as DailyIntakeRow[]);
    setReminderRules((reminderData || []) as ReminderRule[]);
    setStatus('Verbonden');
  };

  const target = settings?.daily_target_ml ?? DEFAULT_TARGET;
  const gamificationEnabled = settings?.gamification_enabled ?? DEFAULT_SETTINGS.gamification_enabled;
  const remindersEnabled = settings?.reminders_enabled ?? DEFAULT_SETTINGS.reminders_enabled;

  const totalToday = useMemo(() => logs.reduce((sum, row) => sum + row.amount_ml, 0), [logs]);
  const progress = Math.min(Math.round((totalToday / target) * 100), 100);
  const streak = useMemo(() => {
    if (!gamificationEnabled) return null;
    const dayStartHour = settings?.day_start_hour ?? DEFAULT_SETTINGS.day_start_hour;
    const timezone = settings?.timezone ?? DEFAULT_SETTINGS.timezone;
    const todayIso = logicalDayISO(new Date(), dayStartHour, timezone);
    return computeStreak(history, todayIso);
  }, [gamificationEnabled, history, settings]);

  const addLog = async (amount: number, source: string) => {
    if (!client || !userId) {
      setStatus('Geen verbinding met Supabase.');
      return;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const { error } = await client.from('drink_log').insert({
      id,
      user_id: userId,
      amount_ml: amount,
      source,
      logged_at: now
    });

    if (error) {
      setStatus(`Fout bij opslaan: ${error.message}`);
      return;
    }

    setLogs((current) => [{ id, user_id: userId, amount_ml: amount, source, logged_at: now }, ...current]);
    setStatus(`${amount} ml opgeslagen`);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setShowUndo(true);
    undoTimerRef.current = setTimeout(() => setShowUndo(false), 10000);
  };

  const undoLast = async () => {
    if (!client || logs.length === 0) {
      return;
    }

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setShowUndo(false);

    const latest = logs[0];
    const now = new Date().toISOString();
    const { error } = await client.from('drink_log').update({ deleted_at: now }).eq('id', latest.id);

    if (error) {
      setStatus(`Undo mislukt: ${error.message}`);
      return;
    }

    setLogs((current) => current.filter((row) => row.id !== latest.id));
    setStatus('Laatste entry verwijderd');
  };

  const handleCustomLog = async () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus('Voer een geldig bedrag in.');
      return;
    }
    await addLog(amount, 'manual');
  };

  const updateSettings = async (patch: Partial<Pick<SettingsRow, 'daily_target_ml' | 'gamification_enabled' | 'reminders_enabled'>>) => {
    if (!client || !userId || !settings) return;
    const previous = settings;
    setSettings({ ...settings, ...patch });
    const { error } = await client.from('settings').update(patch).eq('user_id', userId);
    if (error) {
      setSettings(previous);
      setSettingsError(`Opslaan mislukt: ${error.message}`);
    } else {
      setSettingsError('');
    }
  };

  const handleTargetStep = (delta: number) => {
    const next = Math.max(100, target + delta);
    updateSettings({ daily_target_ml: next });
  };

  const addContainer = async (name: string, volumeMl: number) => {
    if (!client || !userId) return;
    const id = crypto.randomUUID();
    const sortOrder = containers.length > 0 ? Math.max(...containers.map((c) => c.sort_order ?? 0)) + 1 : 1;
    const newContainer: Container = {
      id,
      user_id: userId,
      name,
      volume_ml: volumeMl,
      sort_order: sortOrder,
      is_nfc_default: false
    };
    setContainers((current) => [...current, newContainer]);
    const { error } = await client.from('containers').insert(newContainer);
    if (error) {
      setContainers((current) => current.filter((c) => c.id !== id));
      setSettingsError(`Toevoegen mislukt: ${error.message}`);
    } else {
      setSettingsError('');
    }
  };

  const removeContainer = async (id: string) => {
    if (!client) return;
    const previous = containers;
    setContainers((current) => current.filter((c) => c.id !== id));
    const { error } = await client.from('containers').delete().eq('id', id);
    if (error) {
      setContainers(previous);
      setSettingsError(`Verwijderen mislukt: ${error.message}`);
    } else {
      setSettingsError('');
    }
  };

  const addReminderRule = async (atTime: string) => {
    if (!client || !userId) return;
    const id = crypto.randomUUID();
    const newRule: ReminderRule = { id, user_id: userId, at_time: atTime, expected_ml: null, enabled: true };
    setReminderRules((current) => [...current, newRule].sort((a, b) => a.at_time.localeCompare(b.at_time)));
    const { error } = await client.from('reminder_rules').insert(newRule);
    if (error) {
      setReminderRules((current) => current.filter((r) => r.id !== id));
      setSettingsError(`Toevoegen mislukt: ${error.message}`);
    } else {
      setSettingsError('');
    }
  };

  const updateReminderRule = async (id: string, atTime: string) => {
    if (!client) return;
    const previous = reminderRules;
    setReminderRules((current) =>
      current.map((r) => (r.id === id ? { ...r, at_time: atTime } : r)).sort((a, b) => a.at_time.localeCompare(b.at_time))
    );
    const { error } = await client.from('reminder_rules').update({ at_time: atTime }).eq('id', id);
    if (error) {
      setReminderRules(previous);
      setSettingsError(`Bijwerken mislukt: ${error.message}`);
    } else {
      setSettingsError('');
    }
  };

  const removeReminderRule = async (id: string) => {
    if (!client) return;
    const previous = reminderRules;
    setReminderRules((current) => current.filter((r) => r.id !== id));
    const { error } = await client.from('reminder_rules').delete().eq('id', id);
    if (error) {
      setReminderRules(previous);
      setSettingsError(`Verwijderen mislukt: ${error.message}`);
    } else {
      setSettingsError('');
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[520px] px-4 pb-28 pt-6">
      {tab === 'home' && (
        <HomeScreen
          target={target}
          totalToday={totalToday}
          progress={progress}
          containers={containers}
          logs={logs}
          customAmount={customAmount}
          streak={streak}
          showUndo={showUndo}
          onCustomAmountChange={setCustomAmount}
          onLog={addLog}
          onCustomLog={handleCustomLog}
          onUndo={undoLast}
        />
      )}
      {tab === 'stats' && (
        <StatsScreen history={history.slice(0, 7)} target={target} streak={streak} gamificationEnabled={gamificationEnabled} />
      )}
      {tab === 'settings' && (
        <SettingsScreen
          target={target}
          containers={containers}
          remindersEnabled={remindersEnabled}
          reminderRules={reminderRules}
          gamificationEnabled={gamificationEnabled}
          streak={streak}
          errorMessage={settingsError}
          onTargetStep={handleTargetStep}
          onAddContainer={addContainer}
          onRemoveContainer={removeContainer}
          onRemindersEnabledChange={(value) => updateSettings({ reminders_enabled: value })}
          onAddReminderRule={addReminderRule}
          onUpdateReminderRule={updateReminderRule}
          onRemoveReminderRule={removeReminderRule}
          onGamificationChange={(value) => updateSettings({ gamification_enabled: value })}
        />
      )}

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
