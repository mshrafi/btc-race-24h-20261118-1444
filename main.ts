// Deep-dip BTC bot — btc-race-24h-20261118-1444.
//
// Strategy (RESEARCH.md §3, exact): buy ONE deep 30-bar dip at full size, then
// sit through the fade and take the slow recovery with a wide take-profit.
//   - Entry: close down >= 180 bps vs 30 received bars ago -> buy 100% of cash.
//   - Late fallback: from received-bar index >= 1000, a drop >= 120 bps also buys.
//   - Exit: return >= +240 bps vs cost, or <= -250 bps, or held >= 480 received
//     bars -> sell the whole position.
//   - At most 1 order per reply; buy max_slippage_bps 200, sell 300.
// All arithmetic is integer (BigInt); no randomness, no wall clock, no network,
// no files. State comes from each batch's account; closes count received bars
// only (a missing bar appends nothing and sends no order).

// Why this shape (research findings on the dev window):
//   - The window is one big V: a -2.80% down day, then a slow grind back.
//     There is exactly one real dip (bar 67, -201 bps) and it recovers
//     +253 bps only if held ~440 bars, so tight TPs / fast exits leave
//     money on the table — hence the wide +240 bps TP and 480-bar hold.
//   - Trend-following does not work here: momentum / EMA-cross loses
//     -$148 on this window, so the bot buys the dip instead of the trend.
//   - The late fallback buy (>= 120 bps from bar 1000) exists so the bot
//     never finishes with zero trades if the deep dip never comes.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 30;
const D_DEEP = 180n;
const D_LATE = 120n;
const LATE_FROM_INDEX = 1000;
const TP_BPS = 240n;
const SL_BPS = -250n;
const MAX_HOLD_BARS = 480;
const BUY_SLIPPAGE_BPS = 200;
const SELL_SLIPPAGE_BPS = 300;

const closes: bigint[] = [];
let entryRecvIdx: number | null = null;
let n = 0;

await runBars({
  onBatch(state: BarsState, batch: Batch): OrderInput[] {
    // 1. Fold in the batch: append the CBBTC close only if this batch has one.
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) closes.push(BigInt(bar.c));
    // A buy fill in this batch sets entryRecvIdx to the current received-bar count.
    for (const f of batch.fills) {
      if (f.status === 'filled' && f.side === 'buy' && f.symbol === SYMBOL) {
        entryRecvIdx = closes.length;
      }
    }
    // Missing bar: append nothing, send no order.
    if (bar === undefined) return [];
    if (state.warmingUp) return [];

    const c = closes[closes.length - 1]!;
    const pos = state.positions.get(SYMBOL);

    // 2. Holding a position: evaluate exits using the latest close.
    if (pos !== undefined && pos.qty > 0n) {
      if (entryRecvIdx === null) entryRecvIdx = closes.length;
      const cost = pos.cost;
      if (cost > 0n) {
        const value = (pos.qty * c * 1_000_000n) / 10_000_000_000_000n; // qty*c*10^6/10^13
        const retBps = ((value - cost) * 10_000n) / cost;
        const heldBars = closes.length - entryRecvIdx;
        if (retBps >= TP_BPS || retBps <= SL_BPS || heldBars >= MAX_HOLD_BARS) {
          n += 1;
          return [{
            side: 'sell',
            symbol: SYMBOL,
            qty: pos.qty.toString(),
            max_slippage_bps: SELL_SLIPPAGE_BPS,
            client_id: `s${n}`,
          }];
        }
      }
      return [];
    }

    // 3. Flat: evaluate entry (need >= 31 closes; earliest entry is the 31st bar).
    if (closes.length < LOOKBACK + 1) return [];
    const ref = closes[closes.length - 1 - LOOKBACK]!;
    const dropBps = ((ref - c) * 10_000n) / ref;
    const late = closes.length - 1 >= LATE_FROM_INDEX;
    if (dropBps >= D_DEEP || (late && dropBps >= D_LATE)) {
      const cash = state.cash;
      if (cash <= 0n) return [];
      n += 1;
      return [{
        side: 'buy',
        symbol: SYMBOL,
        notional_quote_units: cash.toString(),
        max_slippage_bps: BUY_SLIPPAGE_BPS,
        client_id: `b${n}`,
      }];
    }
    return [];
  },
});
