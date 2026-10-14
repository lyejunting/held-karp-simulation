import { describe, it, expect } from "vitest";
import {
  heldKarp,
  matrix,
  defaults,
  encode,
  decode,
  haversine,
} from "./solver";
function permutations(a: number[]): number[][] {
  return a.length
    ? a.flatMap((n, i) =>
        permutations(a.filter((_, j) => j !== i)).map((t) => [n, ...t]),
      )
    : [[]];
}
function exhaustive(cost: number[][], closed: boolean) {
  return Math.min(
    ...permutations(
      Array.from({ length: cost.length - 1 }, (_, i) => i + 1),
    ).map((path) => {
      const route = [0, ...path, ...(closed ? [0] : [])];
      return route.slice(1).reduce((sum, v, i) => sum + cost[route[i]][v], 0);
    }),
  );
}
describe("exact Held–Karp", () => {
  it("matches exhaustive search for both variants, including asymmetric matrices", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let n = 2; n <= 7; n++)
      for (let run = 0; run < 4; run++) {
        const cost = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) =>
            i === j ? 0 : 1 + random() * 50,
          ),
        );
        for (const closed of [false, true]) {
          const result = heldKarp(cost, closed);
          expect(result.distance).toBeCloseTo(exhaustive(cost, closed), 9);
          expect(result.order[0]).toBe(0);
          expect(new Set(result.order.filter((i) => i !== 0)).size).toBe(n - 1);
          expect(result.order.length).toBe(n + (closed ? 1 : 0));
          if (closed) expect(result.order.at(-1)).toBe(0);
          else expect(result.order.at(-1)).not.toBe(0);
          expect(
            result.order
              .slice(1)
              .reduce((sum, v, i) => sum + cost[result.order[i]][v], 0),
          ).toBeCloseTo(result.distance, 9);
        }
      }
  });
  it("handles no waypoints, one waypoint, coincident points and ties", () => {
    expect(heldKarp([[0]], true).distance).toBe(0);
    expect(
      heldKarp(
        [
          [0, 5],
          [5, 0],
        ],
        false,
      ).distance,
    ).toBe(5);
    expect(
      heldKarp(
        [
          [0, 5],
          [5, 0],
        ],
        true,
      ).distance,
    ).toBe(10);
    expect(
      heldKarp(
        [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
        false,
      ).order.length,
    ).toBe(3);
  });
  it("default Jakarta scenario genuinely reorders the open route", () => {
    const scenario = defaults(),
      cost = matrix([scenario.origin, ...scenario.waypoints]);
    const closed = heldKarp(cost, true),
      open = heldKarp(cost, false);
    expect(open.distance).toBeLessThan(closed.distance);
    const tour = closed.order.slice(0, -1);
    expect(open.order).not.toEqual(tour);
    expect(open.order).not.toEqual([0, ...tour.slice(1).reverse()]);
    expect(open.distance).toBeCloseTo(exhaustive(cost, false), 8);
    expect(closed.distance).toBeCloseTo(exhaustive(cost, true), 8);
    console.info("Default routes", { closed, open });
  });
  it("uses symmetric geographic distances", () => {
    const s = defaults();
    expect(haversine(s.origin, s.origin)).toBe(0);
    expect(haversine(s.origin, s.waypoints[0])).toBeCloseTo(
      haversine(s.waypoints[0], s.origin),
      10,
    );
  });
});
describe("scenario sharing", () => {
  it("preserves unicode names, customized coordinates and metric", () => {
    const s = defaults();
    s.origin.lat = -6.2;
    s.waypoints[0].name = "Jakarta / café 🌿 & #";
    expect(decode("#scenario=" + encode(s))).toEqual(s);
  });
  it("rejects malformed, oversized, duplicate and unsupported scenarios", () => {
    expect(decode("#scenario=%")).toBeNull();
    const s = defaults();
    s.waypoints.push(s.waypoints[0]);
    expect(decode(encode(s))).toBeNull();
    s.waypoints.pop();
    s.waypoints[0].lng = Infinity;
    expect(decode(encode(s))).toBeNull();
    expect(
      decode(encode({ ...defaults(), metric: "duration" } as never)),
    ).toBeNull();
  });
});
