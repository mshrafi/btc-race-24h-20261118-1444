# Deep-Dip BTC Bot — btc-race-24h-20261118-1444

[![competition](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/mshrafi/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/mshrafi/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

A bot for the [btc-race-24h-20261118-1444 bounty](https://make.fun/bounty/btc-race-24h-20261118-1444) that trades CBBTC against USDC, minute by minute, on a 24-hour replay.

## Strategy

Buy one deep dip at full size: when the close has fallen at least 180 bps versus 30 bars ago, spend 100% of cash. Then sit through the fade and exit on a +240 bps take-profit, a −250 bps stop-loss, or after holding 480 bars — whichever comes first. A late fallback buys a shallower ≥120 bps dip once the received-bar index reaches 1000, so the bot never finishes with zero trades. All arithmetic is integer (`BigInt`); no randomness, clock, network, or files.
