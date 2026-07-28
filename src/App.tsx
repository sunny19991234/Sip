import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import TabBar, { TabId } from './components/TabBar';
import HomeScreen from './screens/HomeScreen';
import StatsScreen from './screens/StatsScreen';
import SettingsScreen from './screens/SettingsScreen';
import { Container, DailyIntakeRow, DrinkLogRow, SettingsRow } from './types';

const DEFAULT_TARGET = 3000;
const STORAGE_URL_KEY = 'sip-supabase-url';
const STORAGE_KEY_KEY = 'sip-supabase-key';
const DEFAULT_CONTAINERS = [
  { name: 'Glas', volume_ml: 250, sort_order: 1, is_nfc_default: false },
  { name: 'Fles', volume_ml: 750, sort_order: 2, is_nfc_default: true },
  { name: 'Liter', volume_ml: 1000, sort_order: 3, is_nfc_default: false }
];

const DEFAULT_SETTINGS = {
  daily_target_ml: DEFAULT_TARGET,
  day_start_hour: 4,
  timezone: 'Europe/Amsterdam',
  gamification_enabled: false
};

const supabaseUrlEnv = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKeyEnv = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function normalizeSupabaseUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    if (!url.hostname.endsWith('.supabase.co')) {
      return trimmed.replace(/\/+$/, '');
    }
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

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
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [logs, setLogs] = useState<DrinkLogRow[]>([]);
  const [history, setHistory] = useState<DailyIntakeRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [gamificationEnabled, setGamificationEnabled] = useState(DEFAULT_SETTINGS.gamification_enabled);
  const [status, setStatus] = useState('Loading…');
  const [customAmount, setCustomAmount] = useState('250');
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseUrlEnv);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(supabaseAnonKeyEnv);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_URL_KEY) : '';
    const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) : '';
    const effectiveUrl = normalizeSupabaseUrl(supabaseUrl || storedUrl || '');
    const effectiveKey = supabaseAnonKey || storedKey || '';

    setSupabaseUrl(effectiveUrl);
    setSupabaseAnonKey(effectiveKey);

    if (!effectiveUrl || !effectiveKey) {
      setStatus('Vul je Supabase URL en anon key in in de instellingen.');
      return;
    }

    const supabase = createClient(effectiveUrl, effectiveKey);
    setClient(supabase);

    const load = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        let session = sessionData.session;
        if (!session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) throw signInError;
          session = signInData.session;
        }

        const currentUserId = session?.user?.id;
        if (!currentUserId) throw new Error('Geen actieve Supabase-sessie.');
        setUserId(currentUserId);

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_URL_KEY, effectiveUrl);
          localStorage.setItem(STORAGE_KEY_KEY, effectiveKey);
        }
        await ensureDefaults(supabase, currentUserId);
        await refreshData(supabase, currentUserId);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Onbekende fout');
      }
    };

    load();
  }, []);

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
      { data: settingsData, error: settingsError },
      { data: historyData, error: historyError }
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
      supabase.from('daily_intake').select('*').eq('user_id', currentUserId).order('day', { ascending: false }).limit(60)
    ]);

    if (containerError || logError || settingsError || historyError) {
      throw containerError || logError || settingsError || historyError;
    }

    setContainers(containerData || []);
    setLogs(((logData || []) as DrinkLogRow[]).filter((entry) => isTodayInAmsterdam(entry.logged_at)));
    setSettings(settingsData as SettingsRow | null);
    setTarget(settingsData?.daily_target_ml ?? DEFAULT_TARGET);
    setGamificationEnabled(settingsData?.gamification_enabled ?? DEFAULT_SETTINGS.gamification_enabled);
    setHistory((historyData || []) as DailyIntakeRow[]);
    setStatus('Verbonden');
  };

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

  const saveSettings = async () => {
    const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);
    if (!normalizedUrl || !supabaseAnonKey) {
      setStatus('Vul een geldige Supabase URL en anon key in.');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_URL_KEY, normalizedUrl);
      localStorage.setItem(STORAGE_KEY_KEY, supabaseAnonKey);
    }

    setSupabaseUrl(normalizedUrl);
    const supabase = createClient(normalizedUrl, supabaseAnonKey);
    setClient(supabase);
    setStatus('Opslaan en verbinden…');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      let session = sessionData.session;
      if (!session) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) throw signInError;
        session = signInData.session;
      }

      const currentUserId = session?.user?.id;
      if (!currentUserId) throw new Error('Geen actieve Supabase-sessie.');
      setUserId(currentUserId);

      await ensureDefaults(supabase, currentUserId);
      await refreshData(supabase, currentUserId);

      const { error } = await supabase.from('settings').upsert(
        {
          user_id: currentUserId,
          daily_target_ml: target,
          day_start_hour: settings?.day_start_hour ?? DEFAULT_SETTINGS.day_start_hour,
          timezone: settings?.timezone ?? DEFAULT_SETTINGS.timezone,
          gamification_enabled: gamificationEnabled
        },
        { onConflict: ['user_id'] }
      );

      if (error) {
        throw error;
      }

      setSettings((current) => ({
        user_id: currentUserId,
        daily_target_ml: target,
        day_start_hour: current?.day_start_hour ?? DEFAULT_SETTINGS.day_start_hour,
        timezone: current?.timezone ?? DEFAULT_SETTINGS.timezone,
        gamification_enabled: gamificationEnabled
      }));
      setStatus('Instellingen opgeslagen');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Onbekende fout bij opslaan');
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
      {tab === 'stats' && <StatsScreen history={history.slice(0, 7)} />}
      {tab === 'settings' && (
        <SettingsScreen
          supabaseUrl={supabaseUrl}
          supabaseAnonKey={supabaseAnonKey}
          target={target}
          gamificationEnabled={gamificationEnabled}
          status={status}
          onSupabaseUrlChange={setSupabaseUrl}
          onSupabaseAnonKeyChange={setSupabaseAnonKey}
          onTargetChange={setTarget}
          onGamificationChange={setGamificationEnabled}
          onSave={saveSettings}
        />
      )}

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
