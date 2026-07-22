import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData } from "../store.js";

registerMainMenuItem({ label: "📊 Watchlist", data: "watchlist:view", order: 10 });

const composer = new Composer<Ctx>();

composer.command("watchlist", async (ctx) => {
  const userData = getUserData(ctx.session);
  if (userData.watchlist.length === 0) {
    await ctx.reply(
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
  const lines = userData.watchlist.map((item) => {
    const price = item.lastPrice !== undefined ? `$${item.lastPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—";
    const change = item.lastChange24h !== undefined ? ` (${item.lastChange24h >= 0 ? "+" : ""}${item.lastChange24h.toFixed(2)}%)` : "";
    return `• ${item.displayName} (${item.ticker}): ${price}${change}`;
  });
  await ctx.reply("📊 Your watchlist:\n\n" + lines.join("\n"), {
    reply_markup: inlineKeyboard([
      [inlineButton("➕ Add Coin", "watchlist:add"), inlineButton("🗑 Remove Coin", "watchlist:remove")],
      [inlineButton("🔄 Refresh prices", "watchlist:refresh")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
