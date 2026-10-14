// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import App from "./App";
import { defaults, encode } from "./solver";
vi.mock("./MapView", () => ({
  default: ({ places, onMove, onAdd, editable }: any) => (
    <div data-testid="map">
      {places.map((p: any) => (
        <span key={p.id}>{p.name}</span>
      ))}
      {editable && (
        <>
          <button onClick={() => onMove("1", 106.9, -6.2)}>
            Drag test marker
          </button>
          <button onClick={() => onAdd(106.8, -6.3)}>Place test marker</button>
        </>
      )}
    </div>
  ),
}));
afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});
describe("playground behavior", () => {
  it("loads all nine markers without optimizing and runs both routes with one click", async () => {
    render(<App />);
    expect(screen.getAllByTestId("map")).toHaveLength(1);
    expect(within(screen.getByTestId("map")).getByText("Blok M")).toBeTruthy();
    expect(
      screen.queryByRole("region", { name: "Route comparison" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Optimize Routes/ }));
    await screen.findByRole("region", { name: "Route comparison" });
    expect(screen.getAllByTestId("map")).toHaveLength(3);
    expect(screen.getByText("72.50 km")).toBeTruthy();
    expect(screen.getByText("62.06 km")).toBeTruthy();
  });
  it("retains old map inputs after a drag and clears stale status after recalculation", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /Optimize Routes/ }));
    await screen.findByRole("region", { name: "Route comparison" });
    fireEvent.click(screen.getByRole("button", { name: "Drag test marker" }));
    expect(screen.getByRole("status").textContent).toContain(
      "Routes need recalculation",
    );
    fireEvent.click(screen.getByRole("button", { name: /Optimize Routes/ }));
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Both routes optimized",
      ),
    );
    expect(screen.queryByText("72.50 km")).toBeNull();
  });
  it("enforces eight stops and supports remove, add, name edit, and reset", () => {
    render(<App />);
    const add = screen.getByRole("button", {
      name: "+ Add waypoint",
    }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove Monas" }));
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    fireEvent.click(screen.getByRole("button", { name: "Place test marker" }));
    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Name of location 1"), {
      target: { value: "Custom stop" },
    });
    expect(
      within(screen.getByTestId("map")).getByText("Custom stop"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reset demo/ }));
    expect(within(screen.getByTestId("map")).getByText("Monas")).toBeTruthy();
  });
  it("loads shared coordinates and names without optimizing", () => {
    const s = defaults();
    s.origin.name = "My origin";
    s.waypoints[0].lng = 106.91;
    history.replaceState(null, "", "/#scenario=" + encode(s));
    render(<App />);
    expect(
      within(screen.getByTestId("map")).getByText("My origin"),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Longitude of location 1") as HTMLInputElement)
        .value,
    ).toBe("106.91");
    expect(
      screen.queryByRole("region", { name: "Route comparison" }),
    ).toBeNull();
  });
});
