import { useEffect, useMemo, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import './App.css';

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
  timezone: 'Europe/Amsterdam'
};

type Container = {
  id: string;
  user_id: string;
  name: string;
  volume_ml: number;
  sort_order: number;
  is_nfc_default: boolean;
};

type DrinkLogRow = {
  id: string;
  user_id: string;
  amount_ml: number;
  source: string;
  logged_at: string;
  deleted_at?: string | null;
};

type SettingsRow = {
  user_id: string;
  daily_target_ml: number;
  day_start_hour: number;
  timezone: string;
};

type DailyIntakeRow = {
  user_id: string;
  day: string;
  total_ml: number;
  target_ml: number;
  goal_met: boolean;
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

export default function App() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [logs, setLogs] = useState<DrinkLogRow[]>([]);
  const [history, setHistory] = useState<DailyIntakeRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [status, setStatus] = useState('Loading…');
  const [customAmount, setCustomAmount] = useState('250');
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseUrlEnv);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(supabaseAnonKeyEnv);

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

    const [{ data: containerData, error: containerError }, { data: logData, error: logError }, { data: settingsData, error: settingsError }, { data: historyData, error: historyError }] = await Promise.all([
      supabase.from('containers').select('*').eq('user_id', currentUserId).order('sort_order'),
      supabase.from('drink_log').select('*').eq('user_id', currentUserId).is('deleted_at', null).order('logged_at', { ascending: false }).limit(30),
      supabase.from('settings').select('*').eq('user_id', currentUserId).maybeSingle(),
      supabase.from('daily_intake').select('*').eq('user_id', currentUserId).order('day', { ascending: false }).limit(7)
    ]);

    if (containerError || logError || settingsError || historyError) {
      throw containerError || logError || settingsError || historyError;
    }

    setContainers(containerData || []);
    setLogs(((logData || []) as DrinkLogRow[]).filter((entry) => isTodayInAmsterdam(entry.logged_at)));
    setSettings(settingsData as SettingsRow | null);
    setTarget(settingsData?.daily_target_ml ?? DEFAULT_TARGET);
    setHistory((historyData || []) as DailyIntakeRow[]);
    setStatus('Verbonden');
  };

  const totalToday = useMemo(() => logs.reduce((sum, row) => sum + row.amount_ml, 0), [logs]);
  const remaining = useMemo(() => Math.max(target - totalToday, 0), [target, totalToday]);
  const progress = Math.min(Math.round((totalToday / target) * 100), 100);

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
  };

  const undoLast = async () => {
    if (!client || logs.length === 0) {
      return;
    }

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
    if (!supabaseUrl || !supabaseAnonKey) {
      setStatus('Vul een geldige Supabase URL en anon key in.');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_URL_KEY, supabaseUrl);
      localStorage.setItem(STORAGE_KEY_KEY, supabaseAnonKey);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
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

      const { error } = await supabase.from('settings').upsert({
        user_id: currentUserId,
        daily_target_ml: target,
        day_start_hour: settings?.day_start_hour ?? DEFAULT_SETTINGS.day_start_hour,
        timezone: settings?.timezone ?? DEFAULT_SETTINGS.timezone
      }, { onConflict: ['user_id'] });

      if (error) {
        throw error;
      }

      setSettings((current) => ({
        user_id: currentUserId,
        daily_target_ml: target,
        day_start_hour: current?.day_start_hour ?? DEFAULT_SETTINGS.day_start_hour,
        timezone: current?.timezone ?? DEFAULT_SETTINGS.timezone
      }));
      setStatus('Instellingen opgeslagen');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Onbekende fout bij opslaan');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Today&apos;s water</p>
          <h1 className="title">{totalToday} ml</h1>
          <p className="hero-subtitle">{progress}% van {target} ml</p>
        </div>
        <div>
          <button className="settings-btn" type="button" aria-label="Instellingen" onClick={() => document.getElementById('settingsSection')?.scrollIntoView({ behavior: 'smooth' })}>⚙</button>
          <p className="footer-note">{status}</p>
        </div>
      </header>

      <section className="card" id="settingsSection">
        <p className="section-title">Instellingen</p>
        <div className="field">
          <label htmlFor="urlInput">Supabase URL</label>
          <input
            id="urlInput"
            type="url"
            placeholder="https://<project>.supabase.co"
            value={supabaseUrl}
            onChange={(event) => setSupabaseUrl(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="keyInput">Supabase anon key</label>
          <input
            id="keyInput"
            type="text"
            placeholder="anon key"
            value={supabaseAnonKey}
            onChange={(event) => setSupabaseAnonKey(event.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="targetInput">Dagdoel (ml)</label>
          <input
            id="targetInput"
            type="number"
            min="500"
            step="50"
            value={target}
            onChange={(event) => setTarget(Number(event.target.value))}
          />
        </div>
        <button type="button" className="button primary" onClick={saveSettings}>
          Opslaan
        </button>
      </section>

      <section className="hero-card">
        <div className="hero-stats">
          <p className="hero-title">Dagdoel</p>
          <p className="hero-value">{target} ml</p>
          <p className="hero-subtitle">Nog {remaining} ml te drinken</p>
        </div>
        <div className="water-card" aria-hidden="true">
          <div className="water-wave" />
          <div className="water-fill" style={{ height: `${progress}%` }} />
        </div>
      </section>

      <section className="card">
        <p className="section-title">Snel loggen</p>
        <div className="button-grid">
          {containers.length > 0 ? containers.map((container) => (
            <button
              key={container.id}
              type="button"
              className="button primary"
              onClick={() => addLog(container.volume_ml, 'ui')}
            >
              {container.volume_ml} ml
            </button>
          )) : (
            <button type="button" className="button secondary" disabled>
              Laden...
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <p className="section-title">Historie</p>
        {history.length > 0 ? (
          <ul className="history-list">
            {history.map((day) => (
              <li key={day.day} className="history-item">
                <strong>{new Date(day.day).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'numeric' })}</strong>
                <div className="item-meta">
                  <span>{day.total_ml} ml</span>
                  <span>{day.goal_met ? 'Voltooid' : 'Open'}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="footer-note">Geen historie beschikbaar.</p>
        )}
      </section>

      <section className="card">
        <p className="section-title">Recente entries</p>
        {logs.length > 0 ? (
          <>
            <button type="button" className="button secondary" onClick={undoLast}>
              Undo laatste
            </button>
            <ul className="recent-list">
              {logs.map((entry) => (
                <li key={entry.id} className="recent-item">
                  <strong>{entry.amount_ml} ml</strong>
                  <div className="item-meta">
                    <span>{entry.source}</span>
                    <span>{new Date(entry.logged_at).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="footer-note">Nog geen entries voor vandaag.</p>
        )}
      </section>

      <section className="footer-note">
        Deze app gebruikt Supabase voor historie en instellingen.
      </section>
    </div>
  );
}
