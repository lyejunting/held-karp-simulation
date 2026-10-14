import React, { useState } from "react";
import MapView from "./MapView";
import {
  defaults,
  matrix,
  heldKarp,
  encode,
  decode,
  type Scenario,
  type Solution,
  type Place,
} from "./solver";
import "./style.css";
type Results = { closed: Solution; open: Solution; scenario: Scenario };
export default function App() {
  const [scenario, setScenario] = useState<Scenario>(
    () => decode(location.hash) || defaults(),
  );
  const [results, setResults] = useState<Results | null>(null),
    [stale, setStale] = useState(false),
    [adding, setAdding] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const places = [scenario.origin, ...scenario.waypoints];
  function change(s: Scenario) {
    setScenario(s);
    if (results) setStale(true);
    setMessage("");
  }
  function update(id: string, patch: Partial<Place>) {
    change({
      ...scenario,
      origin:
        scenario.origin.id === id
          ? { ...scenario.origin, ...patch }
          : scenario.origin,
      waypoints: scenario.waypoints.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  }
  function optimize() {
    setBusy(true);
    setAdding(false);
    setTimeout(() => {
      const costs = matrix(places);
      setResults({
        closed: heldKarp(costs, true),
        open: heldKarp(costs, false),
        scenario: structuredClone(scenario),
      });
      setStale(false);
      setBusy(false);
    }, 30);
  }
  async function share() {
    const url = new URL(location.href);
    url.hash = `scenario=${encode(scenario)}`;
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.href);
      setMessage("Scenario link copied.");
    } catch {
      setMessage("Scenario saved in the address bar. Copy the URL to share.");
    }
  }
  const savedPlaces = results
    ? [results.scenario.origin, ...results.scenario.waypoints]
    : [];
  const saving = results ? results.closed.distance - results.open.distance : 0;
  const closedPath = results?.closed.order.slice(0, -1),
    openPath = results?.open.order;
  const same =
    closedPath &&
    openPath &&
    (JSON.stringify(closedPath) === JSON.stringify(openPath) ||
      JSON.stringify([0, ...closedPath.slice(1).reverse()]) ===
        JSON.stringify(openPath));
  function resultCard(kind: "closed" | "open") {
    if (!results) return null;
    const solution = results[kind];
    const closed = kind === "closed",
      end = savedPlaces[solution.order[solution.order.length - 1]];
    return (
      <article className={`result-card ${kind}`}>
        <div className="card-top">
          <span className="eyebrow">
            {closed ? "01 / CLOSED TOUR" : "02 / OPEN PATH"}
          </span>
          <span className="tag">
            {closed ? "Fixed destination" : "Flexible destination"}
          </span>
        </div>
        <h3>{closed ? "Back where you started." : "A different finish."}</h3>
        <p className="result-description">
          {closed
            ? `Every stop, then back to ${savedPlaces[0].name}.`
            : `Every stop, finishing at ${end.name}.`}
        </p>
        <MapView
          places={savedPlaces}
          order={solution.order}
          color={closed ? "#546e9f" : "#246955"}
        />
        <div className="stats">
          <div>
            <strong>
              {solution.distance.toFixed(2)} <small>km</small>
            </strong>
            <span>Total geographic distance</span>
          </div>
          <div>
            <strong>
              {solution.latency.toFixed(2)} <small>ms</small>
            </strong>
            <span>Held–Karp runtime</span>
          </div>
        </div>
        <div className="sequence">
          {solution.order.map((index, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="arrow">→</span>}
              <span className={index === 0 ? "origin-stop" : ""}>
                <b>{index === 0 ? "O" : index}</b>
                {savedPlaces[index].name}
                {closed && i === solution.order.length - 1 ? " (return)" : ""}
              </span>
            </React.Fragment>
          ))}
        </div>
      </article>
    );
  }
  return (
    <>
      <header className="nav">
        <a className="brand" href="#">
          <span className="brand-icon">↗</span>route<span>lab</span>
        </a>
        <span className="nav-note">AN INTERACTIVE ALGORITHM EXPLORER</span>
        <a href="#how-it-works">
          Behind the routes <span>↗</span>
        </a>
      </header>
      <main>
        <section className="hero">
          <div className="eyebrow">
            <span className="dot" /> SAME STOPS. DIFFERENT POSSIBILITIES.
          </div>
          <h1>
            Open TSP <span>vs</span> Closed TSP
          </h1>
          <p>See how fixing your destination changes the optimal route.</p>
          <div className="hero-meta">
            <span>Exact Held–Karp optimization</span>
            <span>Up to 8 waypoints</span>
            <span>No API key needed</span>
          </div>
        </section>
        <section className="playground">
          <div className="section-top">
            <div>
              <div className="eyebrow">01 / THE PLAYGROUND</div>
              <h2>Your route starts here.</h2>
            </div>
            <div className="toolbar">
              <button
                onClick={() => {
                  change(defaults());
                  setAdding(false);
                  history.replaceState(
                    null,
                    "",
                    location.pathname + location.search,
                  );
                }}
              >
                ↺ Reset demo
              </button>
              <button onClick={share}>↗ Share scenario</button>
            </div>
          </div>
          <p className="intro">
            We've prepared 8 locations around Jakarta. Click Optimize Routes to
            see how fixing the destination changes the optimal route.
          </p>
          <div className="map-panel">
            <div className="map-bar">
              <span>
                <span className="dot" /> GREATER JAKARTA, INDONESIA
              </span>
              <span>{scenario.waypoints.length} / 8 WAYPOINTS</span>
            </div>
            <MapView
              places={places}
              editable
              adding={adding}
              onMove={(id, lng, lat) => update(id, { lng, lat })}
              onAdd={(lng, lat) => {
                if (scenario.waypoints.length < 8)
                  change({
                    ...scenario,
                    waypoints: [
                      ...scenario.waypoints,
                      {
                        id: crypto.randomUUID(),
                        name: `Waypoint ${scenario.waypoints.length + 1}`,
                        lng,
                        lat,
                      },
                    ],
                  });
                setAdding(false);
              }}
            />
            <div className="map-footer">
              <span>
                <i className="legend-origin" /> Origin{" "}
                <i className="legend-waypoint" /> Waypoint{" "}
                <span className="drag-note">· Drag markers to move them</span>
              </span>
              <button
                disabled={scenario.waypoints.length >= 8 && !adding}
                onClick={() => setAdding(!adding)}
              >
                {adding ? "Cancel placement" : "+ Add waypoint"}
              </button>
            </div>
          </div>
          <div className="action-row">
            <div>
              <label className="metric-label">
                Optimize for{" "}
                <select value={scenario.metric} onChange={() => {}}>
                  <option value="distance">Geographic distance</option>
                </select>
              </label>
              <p>
                Straight-line distances, not driving routes. Travel times
                unavailable.
              </p>
            </div>
            <button
              className="primary"
              onClick={optimize}
              disabled={busy || scenario.waypoints.length === 0}
            >
              {busy ? "Finding optimal routes…" : "Optimize Routes"}{" "}
              <span>→</span>
            </button>
          </div>
          <div role="status" className="status">
            {message ||
              (stale
                ? "Routes need recalculation — results below show the previous configuration."
                : results
                  ? "Both routes optimized from the same distance matrix."
                  : "Ready when you are. Optimization runs only when you click.")}
          </div>
          <details className="editor">
            <summary>
              Edit locations <span>Names, coordinates & removal</span>
            </summary>
            <div className="editor-header">
              <span>Location</span>
              <span>Latitude</span>
              <span>Longitude</span>
              <span />
            </div>
            {places.map((p, i) => (
              <div className="editor-row" key={p.id}>
                <label>
                  <b>{i === 0 ? "O" : i}</b>
                  <input
                    aria-label={`Name of location ${i}`}
                    maxLength={100}
                    value={p.name}
                    onChange={(e) => update(p.id, { name: e.target.value })}
                  />
                </label>
                <input
                  aria-label={`Latitude of location ${i}`}
                  type="number"
                  step="0.0001"
                  min="-85"
                  max="85"
                  value={p.lat}
                  onChange={(e) => {
                    if (e.target.value !== "" && e.target.validity.valid)
                      update(p.id, { lat: Number(e.target.value) });
                  }}
                />
                <input
                  aria-label={`Longitude of location ${i}`}
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={p.lng}
                  onChange={(e) => {
                    if (e.target.value !== "" && e.target.validity.valid)
                      update(p.id, { lng: Number(e.target.value) });
                  }}
                />
                {i > 0 ? (
                  <button
                    aria-label={`Remove ${p.name}`}
                    onClick={() => {
                      change({
                        ...scenario,
                        waypoints: scenario.waypoints.filter(
                          (w) => w.id !== p.id,
                        ),
                      });
                      setAdding(false);
                    }}
                  >
                    ×
                  </button>
                ) : (
                  <span />
                )}
              </div>
            ))}
          </details>
        </section>
        {results && (
          <section
            className={`results ${stale ? "stale" : ""}`}
            aria-label="Route comparison"
          >
            <div className="section-top">
              <div>
                <div className="eyebrow">02 / THE COMPARISON</div>
                <h2>One starting point. Two outcomes.</h2>
              </div>
              <span className="tag">
                {stale
                  ? "Previous results · recalculate"
                  : "Exact optimal solutions"}
              </span>
            </div>
            <div className="result-grid">
              {resultCard("closed")}
              {resultCard("open")}
            </div>
            <div className="comparison">
              <div>
                <div className="eyebrow">THE COST OF RETURNING</div>
                <strong>
                  {saving.toFixed(2)} <small>km less</small>
                </strong>
                <p>
                  The open route is{" "}
                  {results.closed.distance
                    ? ((saving / results.closed.distance) * 100).toFixed(1)
                    : "0.0"}
                  % shorter.
                </p>
              </div>
              <div>
                <table>
                  <caption className="sr-only">
                    Comparison of optimized routes
                  </caption>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Closed TSP</th>
                      <th>Open TSP</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th>Distance</th>
                      <td>{results.closed.distance.toFixed(2)} km</td>
                      <td>{results.open.distance.toFixed(2)} km</td>
                    </tr>
                    <tr>
                      <th>Destination</th>
                      <td>{savedPlaces[0].name}</td>
                      <td>{savedPlaces[results.open.order.at(-1)!].name}</td>
                    </tr>
                    <tr>
                      <th>Return to origin</th>
                      <td>Yes</td>
                      <td>No</td>
                    </tr>
                    <tr>
                      <th>Runtime</th>
                      <td>{results.closed.latency.toFixed(2)} ms</td>
                      <td>{results.open.latency.toFixed(2)} ms</td>
                    </tr>
                    <tr>
                      <th>Travel duration</th>
                      <td>Unavailable</td>
                      <td>Unavailable</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="explanation">
              {same
                ? "The open path follows the same waypoint order as the closed tour (possibly reversed), with the return edge removed. This scenario does not produce a meaningful reordering."
                : "The flexible destination changes the optimal waypoint order. The open path is solved independently; it is not obtained by simply removing the return edge from the closed tour."}{" "}
              Both algorithms visit every waypoint exactly once using the same
              geographic distance matrix.
            </p>
          </section>
        )}
        <section id="how-it-works" className="how">
          <div className="eyebrow">
            {results ? "03" : "02"} / UNDER THE HOOD
          </div>
          <h2>A small constraint. A big difference.</h2>
          <div className="how-grid">
            <article>
              <span className="how-number">↻</span>
              <h3>Closed TSP</h3>
              <p>
                Visit every waypoint and return to the origin. The destination
                is fixed, so the solver must account for the final journey home.
              </p>
            </article>
            <article>
              <span className="how-number">↗</span>
              <h3>Open TSP</h3>
              <p>
                Start at the same origin and visit every waypoint. Finish
                wherever the total route is shortest. Setting the destination
                equal to the origin would force a return and solve the wrong
                problem for an open journey.
              </p>
            </article>
            <article>
              <span className="how-number">{"{}"}</span>
              <h3>Exact, not approximate</h3>
              <p>
                Held–Karp stores the best path for each visited subset and
                endpoint. Each variant runs independently in O(n² · 2ⁿ) time and
                O(n · 2ⁿ) space. The closed solver adds the return cost; the
                open solver chooses the cheapest endpoint.
              </p>
            </article>
          </div>
        </section>
        <footer>
          <a className="brand" href="#">
            route<span>lab</span>
          </a>
          <span>Built for curiosity. Powered by dynamic programming.</span>
          <a href="https://maplibre.org/" target="_blank" rel="noreferrer">
            Maps by MapLibre ↗
          </a>
        </footer>
      </main>
    </>
  );
}
