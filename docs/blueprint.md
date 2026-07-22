# CryptoWatch — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A personal Telegram bot for tracking cryptocurrency prices with customizable alerts and summaries. Users can create private watchlists, set price-threshold and percent-change alerts, request on-demand prices, and configure quiet hours and alert cooldowns. The bot owner receives anonymized usage metrics and top-fired alerts.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Individual crypto traders
- Casual crypto holders

## Success criteria

- Users can create and manage private watchlists with validated tickers
- Alerts are delivered according to user-configured rules and quiet hours
- Morning summaries are sent at user-specified times
- Owner receives anonymized metrics with top-fired alerts

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Begin onboarding to set timezone, morning summary preference, and quiet hours
- **/watchlist** (command, actor: user, command: /watchlist) — Manage watchlist with Add, Remove, and View options
  - inputs: ticker, display name
  - outputs: watchlist items, validation errors
- **/price** (command, actor: user, command: /price) — Request current price for a specific ticker or all watchlist items
  - inputs: ticker
  - outputs: current price, percent change
- **Add Coin** (button, actor: user, callback: watchlist:add) — Open coin selection menu with seeded tickers and 'Other' option
  - inputs: ticker selection
  - outputs: watchlist item added
- **Remove Coin** (button, actor: user, callback: watchlist:remove) — Select and remove a coin from the watchlist
  - inputs: coin selection
  - outputs: watchlist item removed
- **View List** (button, actor: user, callback: watchlist:view) — Display current watchlist items with prices and changes
  - inputs: none
  - outputs: watchlist items
- **Set Alert** (button, actor: user, callback: alert:set) — Configure a new alert rule for a selected coin
  - inputs: alert type, parameters
  - outputs: alert rule created

## Flows

### Onboarding
_Trigger:_ /start

1. Set timezone
2. Configure morning summary preference
3. Set default quiet hours

_Data touched:_ User profile

### Add Coin to Watchlist
_Trigger:_ watchlist:add

1. Select from seeded list or type custom ticker
2. Validate ticker
3. Add to watchlist with display name

_Data touched:_ Watchlist item

### Remove Coin from Watchlist
_Trigger:_ watchlist:remove

1. Select coin from watchlist
2. Confirm removal
3. Remove from watchlist

_Data touched:_ Watchlist item

### Configure Alert
_Trigger:_ alert:set

1. Select coin from watchlist
2. Choose alert type (PriceThreshold or PercentMove)
3. Enter parameters (price/direction or percent/window)
4. Confirm and save alert rule

_Data touched:_ Alert rule

### Price Check
_Trigger:_ /price

1. Parse ticker parameter
2. Fetch current price
3. Calculate percent change vs last known price
4. Display result

_Data touched:_ Watchlist item, Alert event

### Morning Summary
_Trigger:_ scheduled

1. Check user's configured summary time
2. Gather watchlist prices and changes
3. Format summary message
4. Send to user

_Data touched:_ User profile, Watchlist item, Alert event

### Alert Trigger
_Trigger:_ price change event

1. Check if change meets alert rules
2. Verify not in quiet hours
3. Check cooldown period
4. Send alert message if conditions met

_Data touched:_ Alert rule, User profile, Alert event

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User profile** _(retention: persistent)_ — User-specific settings and preferences
  - fields: Telegram ID, timezone, quiet hours, morning summary time, cooldown length
- **Watchlist item** _(retention: persistent)_ — A cryptocurrency being tracked by a user
  - fields: ticker, display name, last-known price
- **Alert rule** _(retention: persistent)_ — A user-defined condition for price alerts
  - fields: coin, alert type, parameters, last triggered
- **Alert event** _(retention: persistent)_ — Record of an alert being triggered or suppressed
  - fields: coin, old price, new price, percent change, timestamp, delivered status

## Integrations

- **Telegram** (required) — Bot API messaging and inline buttons
- **Price feed** (required) — Market price lookup with retry logic
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- View anonymized metrics (user counts, active users, top alerts)
- Access to owner-only chat for metrics and alerts

## Notifications

- Price alerts with coin details and change metrics
- Morning summary of watchlist performance
- Error notifications for invalid tickers or failed price lookups

## Permissions & privacy

- All user data is private and not shared
- Owner receives only anonymized metrics
- Users can manage their own watchlists and settings

## Edge cases

- Unknown or invalid tickers during add/remove
- Price feed failures with retry logic
- Alerts during quiet hours
- Multiple alert rules for the same coin
- Morning summary when no price changes occurred

## Required tests

- Verify alert delivery during non-quiet hours with cooldown
- Test morning summary formatting and timing
- Validate ticker validation and error handling
- Confirm quiet hour suppression and post-quiet delivery
- Test price lookup failure recovery

## Assumptions

- Default quiet hours are 23:00-07:00 local time
- Default cooldown is 60 minutes per user+coin+rule
- Percent-move window defaults to 1 hour
- Morning summary is optional and default off
- Unknown tickers are handled with helpful error messages
