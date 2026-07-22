import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData } from "../store.js";
import { fetchPrices, formatPrice, formatChange } from "../price-feed.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:view", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nTap ➕ Add Coin to start tracking crypto.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add Coin", "watchlist:add")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const ids = userData.watchlist.map((w) => w.coingeckoId);
  const prices = await fetchPrices(ids);
  for (const item of userData.watchlist) {
    const p = prices.get(item.coingeckoId);
    if (p) {
      item.lastPrice = p.priceUsd;
      item.lastChange24h = p.change24h;
      item.lastChecked = Date.now();
    }
  }
  setUserData(ctx.session, userData);
  const lines = userData.watchlist.map((item) => {
    const price = item.lastPrice !== undefined ? `$${formatPrice(item.lastPrice)}` : "—";
    const change = item.lastChange24h !== undefined ? ` ${formatChange(item.lastChange24h)}` : "";
    return `• ${item.displayName} (${item.ticker}): ${price}${change}`;
  });
  await ctx.editMessageText("📊 Your watchlist:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add Coin", "watchlist:add"), inlineButton("🗑 Remove Coin", "watchlist:remove")],
      [inlineButton("🔄 Refresh prices", "watchlist:view")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("watchlist:refresh", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty.\n\nTap ➕ Add Coin to start tracking crypto.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add Coin", "watchlist:add")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const ids = userData.watchlist.map((w) => w.coingeckoId);
  const prices = await fetchPrices(ids);
  for (const item of userData.watchlist) {
    const p = prices.get(item.coingeckoId);
    if (p) {
      item.lastPrice = p.priceUsd;
      item.lastChange24h = p.change24h;
      item.lastChecked = Date.now();
    }
  }
  setUserData(ctx.session, userData);
  const lines = userData.watchlist.map((item) => {
    const price = item.lastPrice !== undefined ? `$${formatPrice(item.lastPrice)}` : "—";
    const change = item.lastChange24h !== undefined ? ` ${formatChange(item.lastChange24h)}` : "";
    return `• ${item.displayName} (${item.ticker}): ${price}${change}`;
  });
  await ctx.editMessageText("📊 Your watchlist (refreshed):\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add Coin", "watchlist:add"), inlineButton("🗑 Remove Coin", "watchlist:remove")],
      [inlineButton("🔄 Refresh prices", "watchlist:view")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
