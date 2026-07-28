export type Container = {
  id: string;
  user_id: string;
  name: string;
  volume_ml: number;
  sort_order: number;
  is_nfc_default: boolean;
};

export type DrinkLogRow = {
  id: string;
  user_id: string;
  amount_ml: number;
  source: string;
  logged_at: string;
  deleted_at?: string | null;
};

export type SettingsRow = {
  user_id: string;
  daily_target_ml: number;
  day_start_hour: number;
  timezone: string;
  gamification_enabled: boolean;
};

export type DailyIntakeRow = {
  user_id: string;
  day: string;
  total_ml: number;
  target_ml: number;
  goal_met: boolean;
};
