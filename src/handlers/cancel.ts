import { Composer } from "grammy";
import type { Ctx } from "../bot.js";

const composer = new Composer<Ctx>();

composer.command("cancel", async (ctx) => {
  ctx.session.step = undefined;
  ctx.session.formTicker = undefined;
  ctx.session.formDisplayName = undefined;
  ctx.session.formAlertCoin = undefined;
  ctx.session.formAlertType = undefined;
  ctx.session.formAlertPrice = undefined;
  ctx.session.formAlertPercent = undefined;
  ctx.session.formAlertWindow = undefined;
  await ctx.reply("Cancelled. Tap /start to open the menu.", {
    reply_markup: { remove_keyboard: true },
  });
});

export default composer;
