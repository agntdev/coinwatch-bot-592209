import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData } from "../store.js";
import { seededTickers, lookupTicker } from "../price-feed.js";

const COIN_ID_TO_INFO: Record<string, { ticker: string; name: string }> = {
  bitcoin: { ticker: "BTC", name: "Bitcoin" },
  ethereum: { ticker: "ETH", name: "Ethereum" },
  solana: { ticker: "SOL", name: "Solana" },
  ripple: { ticker: "XRP", name: "XRP" },
  cardano: { ticker: "ADA", name: "Cardano" },
  dogecoin: { ticker: "DOGE", name: "Dogecoin" },
  polkadot: { ticker: "DOT", name: "Polkadot" },
  "avalanche-2": { ticker: "AVAX", name: "Avalanche" },
  chainlink: { ticker: "LINK", name: "Chainlink" },
  "matic-network": { ticker: "MATIC", name: "Polygon" },
  uniswap: { ticker: "UNI", name: "Uniswap" },
  litecoin: { ticker: "LTC", name: "Litecoin" },
  cosmos: { ticker: "ATOM", name: "Cosmos" },
  near: { ticker: "NEAR", name: "NEAR Protocol" },
  aptos: { ticker: "APT", name: "Aptos" },
};

registerMainMenuItem({ label: "➕ Add Coin", data: "watchlist:add", order: 11 });

const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:add", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  const existing = new Set(userData.watchlist.map((w) => w.coingeckoId));
  const tickers = seededTickers().filter((t) => {
    const id = t.data.replace("watchlist:pick:", "");
    return !existing.has(id);
  });
  if (tickers.length === 0) {
    await ctx.editMessageText(
      "You've added all available coins!\n\nType a custom ticker to add more.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const rows = tickers.map((t) => [inlineButton(t.text, t.data)]);
  rows.push([inlineButton("✏️ Type a custom ticker", "watchlist:custom")]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Pick a coin to add to your watchlist:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^watchlist:pick:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coinId = ctx.match![1];
  const info = COIN_ID_TO_INFO[coinId];
  if (!info) {
    await ctx.editMessageText("Unknown coin. Try a custom ticker.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "watchlist:add")]]),
    });
    return;
  }
  const userData = getUserData(ctx.session);
  if (userData.watchlist.some((w) => w.coingeckoId === coinId)) {
    ctx.session.step = undefined;
    await ctx.editMessageText(`${info.name} is already on your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add another", "watchlist:add")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  userData.watchlist.push({
    id: `${coinId}_${Date.now()}`,
    ticker: info.ticker,
    displayName: info.name,
    coingeckoId: coinId,
  });
  setUserData(ctx.session, userData);
  await ctx.editMessageText(`✅ Added ${info.name} (${info.ticker}) to your watchlist.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add another", "watchlist:add")],
      [inlineButton("📊 View watchlist", "watchlist:view")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

composer.callbackQuery("watchlist:custom", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "add_coin_ticker";
  await ctx.editMessageText(
    "Type the ticker symbol (e.g. BTC, ETH, SOL):",
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step === "add_coin_ticker") {
    const ticker = ctx.message.text.trim().toUpperCase();
    const info = lookupTicker(ticker);
    if (!info) {
      await ctx.reply(
        `Couldn't find "${ticker}". Check the spelling and try again.`,
        { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
      );
      return;
    }
    const userData = getUserData(ctx.session);
    if (userData.watchlist.some((w) => w.coingeckoId === info.id)) {
      ctx.session.step = undefined;
      await ctx.reply(`${info.name} is already on your watchlist.`, {
        reply_markup: inlineKeyboard([
          [inlineButton("➕ Add another", "watchlist:add")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      });
      return;
    }
    userData.watchlist.push({
      id: `${info.id}_${Date.now()}`,
      ticker: info.ticker,
      displayName: info.name,
      coingeckoId: info.id,
    });
    setUserData(ctx.session, userData);
    ctx.session.step = undefined;
    await ctx.reply(`✅ Added ${info.name} (${info.ticker}) to your watchlist.`, {
      reply_markup: inlineKeyboard([
        [inlineButton("➕ Add another", "watchlist:add")],
        [inlineButton("📊 View watchlist", "watchlist:view")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    });
    return;
  }
  return next();
});

export default composer;
