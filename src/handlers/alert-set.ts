import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData } from "../store.js";

registerMainMenuItem({ label: "🔔 Set Alert", data: "alert:set", order: 12 });

const composer = new Composer<Ctx>();

composer.callbackQuery("alert:set", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.editMessageText(
      "Add coins to your watchlist first, then set alerts on them.",
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
    inlineButton(`${item.ticker} — ${item.displayName}`, `alert:coin:${item.coingeckoId}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Pick a coin to set an alert on:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^alert:coin:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const coinId = ctx.match![1];
  const userData = getUserData(ctx.session);
  const coin = userData.watchlist.find((w) => w.coingeckoId === coinId);
  if (!coin) {
    await ctx.editMessageText("That coin isn't on your watchlist.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  ctx.session.formAlertCoin = coinId;
  await ctx.editMessageText(
    `Set an alert for ${coin.displayName} (${coin.ticker}):\n\nWhat kind of alert?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("💰 Price threshold", "alert:type:price_threshold")],
        [inlineButton("📈 Percent move", "alert:type:percent_move")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery(/^alert:type:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const alertType = ctx.match![1];
  ctx.session.formAlertType = alertType;
  const coinId = ctx.session.formAlertCoin;
  const userData = getUserData(ctx.session);
  const coin = userData.watchlist.find((w) => w.coingeckoId === coinId);
  const coinName = coin ? `${coin.displayName} (${coin.ticker})` : "the coin";

  if (alertType === "price_threshold") {
    ctx.session.step = "alert_price";
    await ctx.editMessageText(
      `Set a price alert for ${coinName}.\n\n` +
        "Reply with the target price (e.g. 50000, 3000, 0.50):",
    );
    return;
  }

  await ctx.editMessageText(
    `Set a percent-change alert for ${coinName}.\n\n` +
      "How big should the move be? (e.g. 5 for 5%, 10 for 10%):",
    {
      reply_markup: inlineKeyboard([
        [inlineButton("3%", "alert:pct:3"), inlineButton("5%", "alert:pct:5")],
        [inlineButton("10%", "alert:pct:10"), inlineButton("20%", "alert:pct:20")],
        [inlineButton("⬅️ Back", `alert:coin:${coinId}`)],
      ]),
    },
  );
});

composer.callbackQuery(/^alert:pct:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const pct = parseInt(ctx.match![1], 10);
  ctx.session.formAlertPercent = pct;
  const coinId = ctx.session.formAlertCoin;
  const userData = getUserData(ctx.session);
  const coin = userData.watchlist.find((w) => w.coingeckoId === coinId);
  const coinName = coin ? `${coin.displayName} (${coin.ticker})` : "the coin";

  await ctx.editMessageText(
    `${coinName}: alert when price moves ±${pct}%.`,
    {
      reply_markup: inlineKeyboard([
        [
          inlineButton("✅ Confirm", "alert:confirm"),
          inlineButton("⬅️ Back", `alert:coin:${coinId}`),
        ],
      ]),
    },
  );
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step === "alert_price") {
    const text = ctx.message.text.trim();
    const price = parseFloat(text.replace(/[$,]/g, ""));
    if (isNaN(price) || price <= 0) {
      await ctx.reply("Please enter a valid price (e.g. 50000, 3000, 0.50):");
      return;
    }
    ctx.session.formAlertPrice = price;
    ctx.session.step = undefined;
    const coinId = ctx.session.formAlertCoin;
    const userData = getUserData(ctx.session);
    const coin = userData.watchlist.find((w) => w.coingeckoId === coinId);
    const coinName = coin ? `${coin.displayName} (${coin.ticker})` : "the coin";

    await ctx.reply(
      `${coinName}: alert when price goes above $${price.toLocaleString("en-US", { maximumFractionDigits: 2 })}.`,
      {
        reply_markup: inlineKeyboard([
          [inlineButton("✅ Confirm", "alert:confirm")],
          [inlineButton("⬅️ Back to menu", "menu:main")],
        ]),
      },
    );
    return;
  }
  return next();
});

composer.callbackQuery("alert:confirm", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  const coinId = ctx.session.formAlertCoin;
  const coin = userData.watchlist.find((w) => w.coingeckoId === coinId);
  if (!coin) {
    await ctx.editMessageText("Something went wrong. Start over from the menu.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    ctx.session.step = undefined;
    return;
  }

  const alertType = ctx.session.formAlertType;
  if (alertType === "price_threshold" && ctx.session.formAlertPrice) {
    userData.alerts.push({
      id: `alert_${Date.now()}`,
      coinId: coin.coingeckoId,
      coinTicker: coin.ticker,
      coinName: coin.displayName,
      type: "price_threshold",
      direction: "above",
      targetPrice: ctx.session.formAlertPrice,
      enabled: true,
    });
  } else if (alertType === "percent_move" && ctx.session.formAlertPercent) {
    userData.alerts.push({
      id: `alert_${Date.now()}`,
      coinId: coin.coingeckoId,
      coinTicker: coin.ticker,
      coinName: coin.displayName,
      type: "percent_move",
      percentChange: ctx.session.formAlertPercent,
      windowMinutes: 60,
      enabled: true,
    });
  } else {
    await ctx.editMessageText("Something went wrong. Start over.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    ctx.session.step = undefined;
    return;
  }

  setUserData(ctx.session, userData);
  ctx.session.step = undefined;
  ctx.session.formAlertCoin = undefined;
  ctx.session.formAlertType = undefined;
  ctx.session.formAlertPrice = undefined;
  ctx.session.formAlertPercent = undefined;

  const summary = userData.alerts.length;
  await ctx.editMessageText(
    `✅ Alert created for ${coin.displayName} (${coin.ticker}).\n\n` +
      `You have ${summary} alert${summary === 1 ? "" : "s"} active.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔔 Set another alert", "alert:set")],
        [inlineButton("📊 View alerts", "alert:list")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("alert:list", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.alerts.length === 0) {
    await ctx.editMessageText(
      "No alerts set yet.\n\nTap 🔔 Set Alert to create one.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const lines = userData.alerts.map((a, i) => {
    if (a.type === "price_threshold") {
      return `${i + 1}. ${a.coinName} (${a.coinTicker}): above $${a.targetPrice?.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    }
    return `${i + 1}. ${a.coinName} (${a.coinTicker}): ±${a.percentChange}% in ${a.windowMinutes}min`;
  });
  const rows = userData.alerts.map((a, i) => [
    inlineButton(`🗑 Delete`, `alert:del:${a.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("🔔 Your alerts:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^alert:del:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const alertId = ctx.match![1];
  const userData = getUserData(ctx.session);
  const idx = userData.alerts.findIndex((a) => a.id === alertId);
  if (idx === -1) {
    await ctx.editMessageText("That alert no longer exists.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const removed = userData.alerts.splice(idx, 1)[0];
  setUserData(ctx.session, userData);
  await ctx.editMessageText(`Deleted alert for ${removed.coinName} (${removed.coinTicker}).`, {
    reply_markup: inlineKeyboard([
      [inlineButton("🔔 Set another alert", "alert:set")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
