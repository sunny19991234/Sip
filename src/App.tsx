import { useEffect, useMemo, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export default function App() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [containers, setContainers] = useState<Container[]>([]);
  const [logs, setLogs] = useState<DrinkLogRow[]>([]);
  const [settings, setSettings] = useState<SettingsRow | null>(null);
  const [dailyIntake, setDailyIntake] = useState<DailyIntakeRow | null>(null);
  const [status, setStatus] = useState('Loading…');
  const [customAmount, setCustomAmount] = useState('250');

  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      setStatus('Missing Supabase env values. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    setClient(supabase);

    const load = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        let session = sessionData.session;
        if (!session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
          if (signInError) {
            throw signInError;
          }
          session = signInData.session;
        }

        const userId = session?.user?.id;
        if (!userId) {
          throw new Error('No user session available');
        }

        const [{ data: containerData, error: containerError }, { data: logData, error: logError }, { data: settingsData, error: settingsError }, { data: dailyData, error: dailyError }] = await Promise.all([
          supabase.from('containers').select('*').eq('user_id', userId).order('sort_order'),
          supabase.from('drink_log').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
          supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('daily_intake').select('*').eq('user_id', userId).order('day', { ascending: false }).maybeSingle(),
        ]);

        if (containerError || logError || settingsError || dailyError) {
          throw containerError || logError || settingsError || dailyError;
        }

        setContainers(containerData || []);
        setLogs(logData || []);
        setSettings(settingsData as SettingsRow | null);
        setDailyIntake(dailyData as DailyIntakeRow | null);
        setStatus('Connected');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    load();
  }, []);

  const totalToday = useMemo(() => logs.reduce((sum, row) => sum + row.amount_ml, 0), [logs]);
  const remaining = useMemo(() => {
    const target = settings?.daily_target_ml ?? 3000;
    return Math.max(target - totalToday, 0);
  }, [settings, totalToday]);

  const addLog = async (amount: number, source: string) => {
    if (!client) {
      return;
    }

    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) {
      setStatus('No active user session');
      return;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error } = await client.from('drink_log').insert({
      id,
      user_id: userId,
      amount_ml: amount,
      source,
      logged_at: now,
    });

    if (error) {
      setStatus(`Insert failed: ${error.message}`);
      return;
    }

    setLogs((current) => [{ id, user_id: userId, amount_ml: amount, source, logged_at: now }, ...current]);
    setStatus(`Logged ${amount} ml`);
  };

  const undoLast = async () => {
    if (!client || logs.length === 0) {
      return;
    }

    const latest = logs[0];
    const now = new Date().toISOString();
    const { error } = await client.from('drink_log').update({ deleted_at: now }).eq('id', latest.id);

    if (error) {
      setStatus(`Undo failed: ${error.message}`);
      return;
    }

    setLogs((current) => current.filter((row) => row.id !== latest.id));
    setStatus('Last entry removed');
  };

  const handleCustomLog = async () => {
    const amount = Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus('Enter a valid amount');
      return;
    }
    await addLog(amount, 'manual');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, fontFamily: 'sans-serif', lineHeight: 1.5 }}>
      <h1>Sip</h1>
      <p>{status}</p>

      <section style={{ marginBottom: 24 }}>
        <h2>Today</h2>
        <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 16, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{totalToday} / {settings?.daily_target_ml ?? 3000} ml</strong>
            <span>{Math.min(Math.round((totalToday / (settings?.daily_target_ml ?? 3000)) * 100), 100)}%</span>
          </div>
          <div style={{ height: 16, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((totalToday / (settings?.daily_target_ml ?? 3000)) * 100, 100)}%`, background: totalToday >= (settings?.daily_target_ml ?? 3000) ? '#16a34a' : '#3b82f6', transition: 'width 0.2s ease' }} />
          </div>
          <p style={{ marginTop: 8, marginBottom: 0 }}>
            Remaining: <strong>{remaining} ml</strong>
          </p>
          {dailyIntake ? <p style={{ marginBottom: 0 }}>Goal met: {dailyIntake.goal_met ? 'Yes' : 'No'}</p> : null}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Quick log</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {containers.map((container) => (
            <button key={container.id} onClick={() => addLog(container.volume_ml, 'ui')} style={{ padding: '10px 14px' }}>
              {container.name} · {container.volume_ml} ml
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h2>Custom amount</h2>
        <input value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} style={{ padding: 8, marginRight: 8 }} />
        <button onClick={handleCustomLog}>Log amount</button>
      </section>

      <section>
        <h2>Recent entries</h2>
        {logs.length > 0 ? (
          <>
            <button onClick={undoLast} style={{ marginBottom: 12 }}>
              Undo last entry
            </button>
            <ul style={{ paddingLeft: 18 }}>
              {logs.map((entry) => (
                <li key={entry.id} style={{ marginBottom: 8 }}>
                  <strong>{entry.amount_ml} ml</strong> · {entry.source} · {new Date(entry.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>No entries yet for today.</p>
        )}
      </section>
    </div>
  );
}
