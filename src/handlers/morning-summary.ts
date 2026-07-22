import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData } from "../store.js";
import { fetchPrices, formatPrice, formatChange } from "../price-feed.js";
import { now, getHourInTimezone, isQuietHours } from "../clock.js";

const composer = new Composer<Ctx>();

export async function sendMorningSummary(bot: { api: { sendMessage: (chatId: number | string, text: string, opts?: Record<string, unknown>) => Promise<unknown> } }, chatId: number | string, userData: ReturnType<typeof getUserData>): Promise<void> {
  if (userData.watchlist.length === 0) return;
  const ids = userData.watchlist.map((w) => w.coingeckoId);
  const prices = await fetchPrices(ids);
  const lines = userData.watchlist.map((item) => {
    const p = prices.get(item.coingeckoId);
    if (p) {
      item.lastPrice = p.priceUsd;
      item.lastChange24h = p.change24h;
      item.lastChecked = now().getTime();
      return `• ${item.displayName} (${item.ticker}): $${formatPrice(p.priceUsd)} ${formatChange(p.change24h)}`;
    }
    return `• ${item.displayName} (${item.ticker}): price unavailable`;
  });
  const hour = userData.profile.summaryHour;
  const timeLabel = hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`;
  const text = `☀️ Morning summary (${timeLabel})\n\n${lines.join("\n")}`;
  try {
    await bot.api.sendMessage(chatId, text, {
      reply_markup: inlineKeyboard([
        [inlineButton("📊 View watchlist", "watchlist:view")],
        [inlineButton("🔍 Check prices", "price:menu")],
      ]),
    });
  } catch {
    // Best-effort: don't crash on delivery failure
  }
}

composer.callbackQuery("summary:send", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty. Add coins to get a summary.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const ids = userData.watchlist.map((w) => w.coingeckoId);
  const prices = await fetchPrices(ids);
  const lines = userData.watchlist.map((item) => {
    const p = prices.get(item.coingeckoId);
    if (p) {
      item.lastPrice = p.priceUsd;
      item.lastChange24h = p.change24h;
      item.lastChecked = now().getTime();
      return `• ${item.displayName} (${item.ticker}): $${formatPrice(p.priceUsd)} ${formatChange(p.change24h)}`;
    }
    return `• ${item.displayName} (${item.ticker}): price unavailable`;
  });
  setUserData(ctx.session, userData);
  await ctx.editMessageText("📊 Your watchlist summary:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔄 Refresh", "summary:send")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export function checkAndSendMorningSummary(
  bot: { api: { sendMessage: (chatId: number | string, text: string, opts?: Record<string, unknown>) => Promise<unknown> } },
  chatId: number | string,
  userData: ReturnType<typeof getUserData>,
): boolean {
  if (!userData.profile.summaryEnabled) return false;
  if (isQuietHours(userData.profile.quietStart, userData.profile.quietEnd, userData.profile.timezone)) return false;
  const currentHour = getHourInTimezone(userData.profile.timezone);
  if (currentHour !== userData.profile.summaryHour) return false;
  void sendMorningSummary(bot, chatId, userData);
  return true;
}

export function checkAlerts(
  bot: { api: { sendMessage: (chatId: number | string, text: string) => Promise<unknown> } },
  chatId: number | string,
  userData: ReturnType<typeof getUserData>,
  prices: Map<string, { priceUsd: number; change24h: number }>,
): void {
  if (isQuietHours(userData.profile.quietStart, userData.profile.quietEnd, userData.profile.timezone)) return;
  for (const alert of userData.alerts) {
    if (!alert.enabled) continue;
    const price = prices.get(alert.coinId);
    if (!price) continue;
    let triggered = false;
    if (alert.type === "price_threshold" && alert.targetPrice !== undefined) {
      triggered = price.priceUsd >= alert.targetPrice;
    } else if (alert.type === "percent_move" && alert.percentChange !== undefined) {
      triggered = Math.abs(price.change24h) >= alert.percentChange;
    }
    if (!triggered) continue;
    const lastKey = `${alert.id}_last`;
    const lastTriggered = (userData as unknown as Record<string, number | undefined>)[lastKey];
    if (lastTriggered && now().getTime() - lastTriggered < userData.profile.cooldownMinutes * 60 * 1000) continue;
    (userData as unknown as Record<string, number | undefined>)[lastKey] = now().getTime();
    const changeText = price.change24h >= 0 ? `+${price.change24h.toFixed(2)}%` : `${price.change24h.toFixed(2)}%`;
    let msgText: string;
    if (alert.type === "price_threshold") {
      msgText = `🔔 ${alert.coinName} (${alert.coinTicker}) hit $${formatPrice(price.priceUsd)} (24h: ${changeText})`;
    } else {
      msgText = `🔔 ${alert.coinName} (${alert.coinTicker}) moved ${changeText} in 24h — now $${formatPrice(price.priceUsd)}`;
    }
    void bot.api.sendMessage(chatId, msgText).catch(() => {});
    userData.alertEvents.push({
      coinId: alert.coinId,
      coinTicker: alert.coinTicker,
      oldPrice: 0,
      newPrice: price.priceUsd,
      percentChange: price.change24h,
      timestamp: now().getTime(),
      delivered: true,
    });
  }
}

export default composer;
