let clockFn: () => Date = () => new Date();

export function now(): Date {
  return clockFn();
}

export function setClock(fn: () => Date): void {
  clockFn = fn;
}

export function resetClock(): void {
  clockFn = () => new Date();
}

export function getHourInTimezone(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: tz,
    }).formatToParts(now());
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    return isNaN(h) ? 0 : h;
  } catch {
    return now().getUTCHours();
  }
}

export function isQuietHours(quietStart: number, quietEnd: number, tz: string): boolean {
  const h = getHourInTimezone(tz);
  if (quietStart > quietEnd) {
    return h >= quietStart || h < quietEnd;
  }
  return h >= quietStart && h < quietEnd;
}

export function isWithinCooldown(lastTriggered: number | undefined, cooldownMinutes: number): boolean {
  if (!lastTriggered) return false;
  return now().getTime() - lastTriggered < cooldownMinutes * 60 * 1000;
}
