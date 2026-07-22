import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, inlineButton, inlineKeyboard } from "../toolkit/index.js";

const OWNER_ID = process.env.OWNER_ID ? parseInt(process.env.OWNER_ID, 10) : 0;

const composer = new Composer<Ctx>();

let metricsSnapshot = {
  totalUsers: 0,
  activeUsers24h: 0,
  topAlerts: [] as Array<{ coin: string; count: number }>,
};

export function updateMetrics(total: number, active: number, topAlerts: Array<{ coin: string; count: number }>): void {
  metricsSnapshot = { totalUsers: total, activeUsers24h: active, topAlerts };
}

if (OWNER_ID) {
  registerMainMenuItem({ label: "📈 Metrics", data: "owner:metrics", order: 50 });
}

composer.callbackQuery("owner:metrics", async (ctx) => {
  await ctx.answerCallbackQuery();
  if (!OWNER_ID || ctx.from?.id !== OWNER_ID) {
    await ctx.editMessageText("This feature is for the bot owner only.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const topAlerts = metricsSnapshot.topAlerts.length > 0
    ? metricsSnapshot.topAlerts.map((a, i) => `${i + 1}. ${a.coin}: ${a.count} fired`).join("\n")
    : "No alerts fired yet.";
  await ctx.editMessageText(
    "📈 Bot Metrics\n\n" +
      `Total users: ${metricsSnapshot.totalUsers}\n` +
      `Active (24h): ${metricsSnapshot.activeUsers24h}\n\n` +
      `Top alerts:\n${topAlerts}`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    },
  );
});

export default composer;
