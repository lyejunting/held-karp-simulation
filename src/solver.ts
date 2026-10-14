export type Place = { id: string; name: string; lng: number; lat: number };
export type Scenario = {
  origin: Place;
  waypoints: Place[];
  metric: "distance";
};
export type Solution = { order: number[]; distance: number; latency: number };
export const defaults = (): Scenario => ({
  origin: { id: "origin", name: "Blok M", lng: 106.8002, lat: -6.2445 },
  metric: "distance",
  waypoints: [
    { id: "1", name: "Monas", lng: 106.8272, lat: -6.1754 },
    { id: "2", name: "Kota Tua", lng: 106.8133, lat: -6.1352 },
    { id: "3", name: "Ancol", lng: 106.8467, lat: -6.1256 },
    { id: "4", name: "Kelapa Gading", lng: 106.9056, lat: -6.1576 },
    { id: "5", name: "Grand Galaxy Park", lng: 106.9719, lat: -6.2706 },
    { id: "6", name: "Taman Mini", lng: 106.8827, lat: -6.3024 },
    { id: "7", name: "Ragunan", lng: 106.8206, lat: -6.3125 },
    { id: "8", name: "Universitas Indonesia", lng: 106.8242, lat: -6.365 },
  ],
});
export function haversine(a: Place, b: Place): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
export function matrix(places: Place[]): number[][] {
  return places.map((a) => places.map((b) => haversine(a, b)));
}
// Index 0 is the origin. Every other vertex is visited exactly once.
export function heldKarp(cost: number[][], closed: boolean): Solution {
  const start = performance.now(),
    n = cost.length - 1;
  if (!n)
    return { order: [0], distance: 0, latency: performance.now() - start };
  const size = 1 << n;
  const dp = Array.from({ length: size }, () =>
    Array<number>(n).fill(Infinity),
  );
  const parent = Array.from({ length: size }, () => Array<number>(n).fill(-1));
  for (let j = 0; j < n; j++) dp[1 << j][j] = cost[0][j + 1];
  for (let mask = 1; mask < size; mask++)
    for (let j = 0; j < n; j++) {
      if (!(mask & (1 << j))) continue;
      const previous = mask ^ (1 << j);
      if (!previous) continue;
      for (let k = 0; k < n; k++)
        if (previous & (1 << k)) {
          const candidate = dp[previous][k] + cost[k + 1][j + 1];
          if (candidate < dp[mask][j]) {
            dp[mask][j] = candidate;
            parent[mask][j] = k;
          }
        }
    }
  let end = 0,
    distance = Infinity;
  for (let j = 0; j < n; j++) {
    const value = dp[size - 1][j] + (closed ? cost[j + 1][0] : 0);
    if (value < distance) {
      distance = value;
      end = j;
    }
  }
  let mask = size - 1,
    j = end;
  const order: number[] = [];
  while (j !== -1) {
    order.push(j + 1);
    const next = parent[mask][j];
    mask ^= 1 << j;
    j = next;
  }
  order.reverse();
  order.unshift(0);
  if (closed) order.push(0);
  return { order, distance, latency: performance.now() - start };
}
export function encode(s: Scenario) {
  return encodeURIComponent(JSON.stringify(s));
}
export function decode(hash: string): Scenario | null {
  try {
    const s = JSON.parse(decodeURIComponent(hash.replace(/^#scenario=/, "")));
    const valid = (p: Place) =>
      p &&
      typeof p.id === "string" &&
      typeof p.name === "string" &&
      p.name.length <= 100 &&
      Number.isFinite(p.lng) &&
      Number.isFinite(p.lat) &&
      Math.abs(p.lng) <= 180 &&
      Math.abs(p.lat) <= 85;
    if (
      s.metric !== "distance" ||
      !valid(s.origin) ||
      !Array.isArray(s.waypoints) ||
      s.waypoints.length > 8 ||
      !s.waypoints.every(valid)
    )
      return null;
    if (
      new Set([s.origin.id, ...s.waypoints.map((p: Place) => p.id)]).size !==
      s.waypoints.length + 1
    )
      return null;
    return s;
  } catch {
    return null;
  }
}
