import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserData, setUserData, defaultUserData } from "../store.js";

const WELCOME = "👋 Welcome to CryptoWatch! Tap a button below to get started.";

const TIMEZONE_OPTIONS = [
  { text: "UTC", data: "tz:UTC" },
  { text: "US Eastern (ET)", data: "tz:America/New_York" },
  { text: "US Central (CT)", data: "tz:America/Chicago" },
  { text: "US Pacific (PT)", data: "tz:America/Los_Angeles" },
  { text: "London (GMT/BST)", data: "tz:Europe/London" },
  { text: "Central Europe (CET)", data: "tz:Europe/Berlin" },
  { text: "India (IST)", data: "tz:Asia/Kolkata" },
  { text: "Tokyo (JST)", data: "tz:Asia/Tokyo" },
  { text: "Sydney (AEST)", data: "tz:Australia/Sydney" },
  { text: "Custom…", data: "tz:custom" },
];

const SUMMARY_OPTIONS = [
  { text: "Yes, send at 8 AM", data: "summary:on:8" },
  { text: "Yes, send at 7 AM", data: "summary:on:7" },
  { text: "Yes, send at 9 AM", data: "summary:on:9" },
  { text: "No thanks", data: "summary:off" },
];

const QUIET_OPTIONS = [
  { text: "11 PM – 7 AM (default)", data: "quiet:23:7" },
  { text: "10 PM – 6 AM", data: "quiet:22:6" },
  { text: "12 AM – 8 AM", data: "quiet:0:8" },
  { text: "No quiet hours", data: "quiet:none" },
];

const composer = new Composer<Ctx>();

composer.command("start", async (ctx) => {
  if (!ctx.session._userData) {
    setUserData(ctx.session, defaultUserData());
  }
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("onboard:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.session.step = "onboard_tz";
  await ctx.editMessageText(
    "Let's set up your preferences.\n\nFirst, what timezone are you in?",
    { reply_markup: inlineKeyboard(TIMEZONE_OPTIONS.map((o) => [inlineButton(o.text, o.data)])) },
  );
});

composer.callbackQuery(/^tz:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const tz = ctx.match![1];
  const userData = getUserData(ctx.session);

  if (tz === "custom") {
    ctx.session.step = "onboard_tz_custom";
    await ctx.editMessageText("Type your timezone (e.g. America/Sao_Paulo, Asia/Dubai):");
    return;
  }

  userData.profile.timezone = tz;
  setUserData(ctx.session, userData);
  ctx.session.step = "onboard_summary";
  await ctx.editMessageText(
    `Timezone set to ${tz}.\n\nWould you like a daily morning summary of your watchlist?`,
    { reply_markup: inlineKeyboard(SUMMARY_OPTIONS.map((o) => [inlineButton(o.text, o.data)])) },
  );
});

composer.callbackQuery(/^summary:(on|off)(?::(\d+))?$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const enabled = ctx.match![1] === "on";
  const hour = ctx.match![2] ? parseInt(ctx.match![2], 10) : 8;
  const userData = getUserData(ctx.session);
  userData.profile.summaryEnabled = enabled;
  userData.profile.summaryHour = hour;
  setUserData(ctx.session, userData);
  ctx.session.step = "onboard_quiet";
  const summaryText = enabled ? `Morning summary set for ${hour}:00.` : "Morning summary disabled.";
  await ctx.editMessageText(
    `${summaryText}\n\nNow, set your quiet hours (alerts won't send during this time):`,
    { reply_markup: inlineKeyboard(QUIET_OPTIONS.map((o) => [inlineButton(o.text, o.data)])) },
  );
});

composer.callbackQuery(/^quiet:(none|\d+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const userData = getUserData(ctx.session);
  if (ctx.match![1] === "none") {
    userData.profile.quietStart = 0;
    userData.profile.quietEnd = 0;
  } else {
    userData.profile.quietStart = parseInt(ctx.match![1], 10);
    userData.profile.quietEnd = parseInt(ctx.match![2], 10);
  }
  setUserData(ctx.session, userData);
  ctx.session.step = undefined;
  const quietText =
    ctx.match![1] === "none"
      ? "Quiet hours disabled."
      : `Quiet hours set to ${userData.profile.quietStart}:00–${userData.profile.quietEnd}:00.`;
  await ctx.editMessageText(`All set! ${quietText}\n\n` + WELCOME, {
    reply_markup: mainMenuKeyboard(),
  });
});

composer.on("message:text", async (ctx, next) => {
  if (ctx.session.step === "onboard_tz_custom") {
    const tz = ctx.message.text.trim();
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
    } catch {
      await ctx.reply("That doesn't look like a valid timezone. Try again (e.g. America/Sao_Paulo):");
      return;
    }
    const userData = getUserData(ctx.session);
    userData.profile.timezone = tz;
    setUserData(ctx.session, userData);
    ctx.session.step = "onboard_summary";
    await ctx.reply(
      `Timezone set to ${tz}.\n\nWould you like a daily morning summary of your watchlist?`,
      { reply_markup: inlineKeyboard(SUMMARY_OPTIONS.map((o) => [inlineButton(o.text, o.data)])) },
    );
    return;
  }
  return next();
});

export default composer;
