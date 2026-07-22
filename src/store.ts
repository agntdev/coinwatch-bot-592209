import type { StorageAdapter } from "grammy";

export interface UserProfile {
  timezone: string;
  summaryEnabled: boolean;
  summaryHour: number;
  quietStart: number;
  quietEnd: number;
  cooldownMinutes: number;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  displayName: string;
  coingeckoId: string;
  lastPrice?: number;
  lastChange24h?: number;
  lastChecked?: number;
}

export interface AlertRule {
  id: string;
  coinId: string;
  coinTicker: string;
  coinName: string;
  type: "price_threshold" | "percent_move";
  direction?: "above" | "below";
  targetPrice?: number;
  percentChange?: number;
  windowMinutes?: number;
  lastTriggered?: number;
  enabled: boolean;
}

export interface AlertEvent {
  coinId: string;
  coinTicker: string;
  oldPrice: number;
  newPrice: number;
  percentChange: number;
  timestamp: number;
  delivered: boolean;
}

export interface UserData {
  profile: UserProfile;
  watchlist: WatchlistItem[];
  alerts: AlertRule[];
  alertEvents: AlertEvent[];
}

export function defaultProfile(): UserProfile {
  return {
    timezone: "UTC",
    summaryEnabled: false,
    summaryHour: 8,
    quietStart: 23,
    quietEnd: 7,
    cooldownMinutes: 60,
  };
}

export function defaultUserData(): UserData {
  return {
    profile: defaultProfile(),
    watchlist: [],
    alerts: [],
    alertEvents: [],
  };
}

export function getUserData(session: { _userData?: UserData }): UserData {
  const raw = session._userData;
  return raw ?? defaultUserData();
}

export function setUserData(session: { _userData?: UserData }, data: UserData): void {
  session._userData = data;
}
