import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData } from "../store.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("watchlist:remove", async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.editMessageText(
      "Your watchlist is empty — nothing to remove.",
      { reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]) },
    );
    return;
  }
  const rows = userData.watchlist.map((item) => [
    inlineButton(`🗑 ${item.displayName} (${item.ticker})`, `watchlist:rmconfirm:${item.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Tap a coin to remove it from your watchlist:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^watchlist:rmconfirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const itemId = ctx.match![1];
  const userData = getUserData(ctx.session);
  const item = userData.watchlist.find((w) => w.id === itemId);
  if (!item) {
    await ctx.reply("That coin is no longer on your watchlist.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  await ctx.editMessageText(`Remove ${item.displayName} (${item.ticker}) from your watchlist?`, {
    reply_markup: inlineKeyboard([
      [inlineButton("✅ Yes, remove", `watchlist:rm:${itemId}`), inlineButton("❌ No, keep", "watchlist:view")],
    ]),
  });
});

composer.callbackQuery(/^watchlist:rm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const itemId = ctx.match![1];
  const userData = getUserData(ctx.session);
  const idx = userData.watchlist.findIndex((w) => w.id === itemId);
  if (idx === -1) {
    await ctx.editMessageText("That coin is no longer on your watchlist.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const removed = userData.watchlist.splice(idx, 1)[0];
  setUserData(ctx.session, userData);
  await ctx.editMessageText(`Removed ${removed.displayName} (${removed.ticker}) from your watchlist.`, {
    reply_markup: inlineKeyboard([
      [inlineButton("🗑 Remove another", "watchlist:remove")],
      [inlineButton("📊 View watchlist", "watchlist:view")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
