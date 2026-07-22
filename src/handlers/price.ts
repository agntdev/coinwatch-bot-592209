import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData } from "../store.js";
import { fetchPrice, fetchPrices, formatPrice, formatChange, lookupTicker } from "../price-feed.js";

const composer = new Composer<Ctx>();

composer.command("price", async (ctx) => {
  const args = (ctx.message?.text ?? "").replace(/^\/price\s*/, "").trim().toUpperCase();
  if (!args) {
    const userData = getUserData(ctx.session);
    if (userData.watchlist.length === 0) {
      await ctx.reply(
        "No coins to check. Add some to your watchlist first.",
        { reply_markup: inlineKeyboard([[inlineButton("➕ Add Coin", "watchlist:add")]]) },
      );
      return;
    }
    const ids = userData.watchlist.map((w) => w.coingeckoId);
    const prices = await fetchPrices(ids);
    const lines = userData.watchlist.map((item) => {
      const p = prices.get(item.coingeckoId);
      if (p) {
        return `• ${item.displayName} (${item.ticker}): $${formatPrice(p.priceUsd)} ${formatChange(p.change24h)}`;
      }
      return `• ${item.displayName} (${item.ticker}): price unavailable`;
    });
    await ctx.reply("🔍 Prices:\n\n" + lines.join("\n"), {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const info = lookupTicker(args);
  if (!info) {
    await ctx.reply(
      `Couldn't find "${args}". Check the ticker and try again.`,
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const price = await fetchPrice(info.id);
  if (!price) {
    await ctx.reply(
      `Couldn't fetch the price for ${info.name}. Try again in a moment.`,
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  await ctx.reply(
    `🔍 ${info.name} (${info.ticker}):\n` +
      `$${formatPrice(price.priceUsd)}\n` +
      `24h change: ${formatChange(price.change24h)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔍 Check another", "price:menu")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("price:menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty. Add coins to check prices.",
      {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add Coin", "watchlist:add")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  const rows = userData.watchlist.map((item) => [
    inlineButton(`${item.ticker} — ${item.displayName}`, `price:check:${item.coingeckoId}`),
  ]);
  rows.push([inlineButton("📊 All prices", "price:all")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Pick a coin to check its price:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^price:check:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coinId = ctx.match![1];
  const price = await fetchPrice(coinId);
  if (!price) {
    await ctx.editMessageText("Couldn't fetch the price. Try again.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.editMessageText(
    `🔍 ${price.name} (${price.ticker}):\n` +
      `$${formatPrice(price.priceUsd)}\n` +
      `24h change: ${formatChange(price.change24h)}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔍 Check another", "price:menu")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("price:all", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  const ids = userData.watchlist.map((w) => w.coingeckoId);
  const prices = await fetchPrices(ids);
  const lines = userData.watchlist.map((item) => {
    const p = prices.get(item.coingeckoId);
    if (p) {
      return `• ${item.displayName} (${item.ticker}): $${formatPrice(p.priceUsd)} ${formatChange(p.change24h)}`;
    }
    return `• ${item.displayName} (${item.ticker}): price unavailable`;
  });
  await ctx.editMessageText("🔍 All prices:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("🔍 Check another", "price:menu")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
