'use client';

import { useState } from 'react';
import { LiveDataConnect, type LiveDataOptions } from './LiveDataConnect';
import { AddressLink } from './AddressLink';
import { mockPositions, mockLiquidations, mockEngineState } from '@/lib/mockData';
import { formatBigint, type DecodedEngineState } from '@/lib/decodeEngineState';

export function DashboardClient() {
  const [live, setLive] = useState<DecodedEngineState | null>(null);
  const [liveMeta, setLiveMeta] = useState<LiveDataOptions | null>(null);

  const handleLiveData = (data: DecodedEngineState, opts: LiveDataOptions) => {
    setLive(data);
    setLiveMeta(opts);
  };
  const handleClear = () => {
    setLive(null);
    setLiveMeta(null);
  };

  const vault = live ? formatBigint(live.vault) : mockEngineState.vault.replace(/_/g, ',');
  const insurance = live ? formatBigint(live.insuranceBalance) : mockEngineState.insuranceBalance.replace(/_/g, ',');
  const oi = live ? formatBigint(live.totalOpenInterest) : mockEngineState.totalOpenInterest.replace(/_/g, ',');
  const cTot = live ? formatBigint(live.cTot) : mockEngineState.cTot.replace(/_/g, ',');
  const pnlPosTot = live ? formatBigint(live.pnlPosTot) : mockEngineState.pnlPosTot.replace(/_/g, ',');
  const fundingRate = live ? live.fundingRateBpsPerSlot : mockEngineState.fundingRateBpsPerSlot;
  const currentSlot = live ? live.currentSlot : mockEngineState.currentSlot;
  const lastCrankSlot = live ? live.lastCrankSlot : mockEngineState.lastCrankSlot;
  const liquidations = live?.lifetimeLiquidations ?? mockEngineState.lifetimeLiquidations;
  const numAccounts = live?.numUsedAccounts ?? mockEngineState.numUsedAccounts;

  // When live, don't show mock table rows — only engine aggregates are from chain
  const positionsToShow = live ? [] : mockPositions;
  const liquidationsToShow = live ? [] : mockLiquidations;

  return (
    <div className="container">
      {live ? (
        <div className="live-header-row">
          <div className="demo-pill live-pill">
            <span className="dot live-dot" />
            Live data from chain
          </div>
          {liveMeta?.stateAddress && (
            <span className="live-state-link">
              State: <AddressLink address={liveMeta.stateAddress} cluster={liveMeta.network} className="link-underline" />
            </span>
          )}
        </div>
      ) : (
        <div className="demo-pill">
          <span className="dot" />
          Demo mode — sample data. Connect a state account below for live data.
        </div>
      )}

      <LiveDataConnect onLiveData={handleLiveData} onClear={handleClear} />

      <header className="header">
        <h1>Percolator Dashboard</h1>
        <p className="subtitle">
          Vault, open interest, funding, positions & liquidations for any Percolator-based perp DEX.
        </p>
      </header>

      <p className="units-note">
        PnL, Capital, Vault, and related values are in <strong>quote token units</strong> (e.g. USDC: 6 decimals → 1 USDC = 1,000,000 units). Not dollars unless the market&apos;s quote token is USD.
      </p>
      <section className="cards">
        <div className="card">
          <h3>Vault</h3>
          <div className="value">{vault}</div>
        </div>
        <div className="card">
          <h3>Insurance</h3>
          <div className="value">{insurance}</div>
        </div>
        <div className="card">
          <h3>Open interest</h3>
          <div className="value">{oi}</div>
        </div>
        <div className="card">
          <h3>c_tot</h3>
          <div className="value">{cTot}</div>
        </div>
        <div className="card">
          <h3>PnL+ (pos tot, quote)</h3>
          <div className="value">{pnlPosTot}</div>
        </div>
        <div className="card">
          <h3>Funding (bps/slot)</h3>
          <div className="value">{fundingRate}</div>
        </div>
        <div className="card">
          <h3>Slot / Last crank</h3>
          <div className="value">{currentSlot.toLocaleString()} / {lastCrankSlot.toLocaleString()}</div>
        </div>
        <div className="card">
          <h3>Liquidations</h3>
          <div className="value">{liquidations}</div>
        </div>
        <div className="card">
          <h3>Accounts</h3>
          <div className="value">{numAccounts}</div>
        </div>
      </section>

      {live && (
        <div className="live-data-note">
          <p>
            <strong>Why {numAccounts} accounts but empty tables?</strong> The &quot;Accounts&quot; count is read from the engine&apos;s <code>num_used_accounts</code> on chain. We don&apos;t yet decode the <strong>account slab</strong> (the per-account list of capital, PnL, position, etc.), so we can&apos;t show individual rows. Adding slab decode would fill the positions table.
          </p>
          <p>
            <strong>Why are other stats zero?</strong> Either (1) the engine really has no deposits, open interest, or funding yet, or (2) this state account may be a <strong>wrapper</strong> (e.g. 8-byte discriminator before the engine data), so our decoder offsets might not match and we&apos;re reading zeros. If you see 0 everywhere but a positive account count, check the program&apos;s account layout (e.g. wrapper vs raw RiskEngine).
          </p>
        </div>
      )}

      <h2 className="section-title">Top positions</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Kind</th>
              <th>Owner</th>
              <th>Token</th>
              <th>Capital (quote)</th>
              <th>PnL (quote)</th>
              <th>Position (base)</th>
              <th>Entry</th>
            </tr>
          </thead>
          <tbody>
            {positionsToShow.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-table-msg">
                  {live
                    ? 'No live position data. Only engine aggregates above are from chain; position slab decode can be added for live rows.'
                    : 'No data. Connect a state account above for live engine state.'}
                </td>
              </tr>
            ) : (
              positionsToShow.map((row) => (
                <tr key={row.accountId}>
                  <td>{row.accountId}</td>
                  <td><span className={`badge ${row.kind}`}>{row.kind}</span></td>
                  <td>
                    {row.ownerAddress ? (
                      <AddressLink address={row.ownerAddress} cluster={liveMeta?.network ?? 'mainnet'} display={row.owner} className="link-underline" />
                    ) : (
                      row.owner
                    )}
                  </td>
                  <td>{row.token}</td>
                  <td>{row.capital.replace(/_/g, ',')}</td>
                  <td className={row.pnl.startsWith('-') ? 'neg' : 'pos'}>{row.pnl.replace(/_/g, ',')}</td>
                  <td>{row.positionSize.replace(/_/g, ',')}</td>
                  <td>{row.entryPrice}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!live && <p className="table-note">Positions: demo sample data. Connect a state account above for live engine state.</p>}

      <h2 className="section-title">Recent liquidations</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Slot</th>
              <th>Account</th>
              <th>Side</th>
              <th>Token</th>
              <th>Size (base)</th>
              <th>PnL (quote)</th>
            </tr>
          </thead>
          <tbody>
            {liquidationsToShow.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-msg">
                  {live
                    ? 'No live liquidation history. Only the liquidations count above is from chain; history decode can be added for live rows.'
                    : 'No data. Connect a state account above for live counts.'}
                </td>
              </tr>
            ) : (
              liquidationsToShow.map((liq, i) => (
                <tr key={i}>
                  <td>{liq.slot.toLocaleString()}</td>
                  <td>{liq.accountId}</td>
                  <td>{liq.side}</td>
                  <td>{liq.token}</td>
                  <td>{liq.size.replace(/_/g, ',')}</td>
                  <td className={liq.pnl.startsWith('-') ? 'neg' : 'pos'}>{liq.pnl.replace(/_/g, ',')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!live && <p className="table-note">Liquidations: demo sample data. Connect a state account above for live counts.</p>}

      <footer className="footer">
        <p>
          Built for <a href="https://github.com/aeyakovenko/percolator" target="_blank" rel="noopener noreferrer">Percolator</a>.
          {live ? ' Showing live engine state from chain.' : ' Enter a state account above to load live vault, OI & aggregates.'}
        </p>
      </footer>
    </div>
  );
}
