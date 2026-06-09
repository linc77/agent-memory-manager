import { describe, expect, it } from "vitest";
import {
  DEFAULT_PANE_LAYOUT,
  MIN_BOARD_WIDTH,
  RESIZER_WIDTH,
  resizePaneLayout,
} from "./paneLayout";

describe("pane layout", () => {
  it("starts with a wider inspector default", () => {
    expect(DEFAULT_PANE_LAYOUT.inspectorWidth).toBeGreaterThan(340);
  });

  it("resizes the sidebar from the left separator", () => {
    const resized = resizePaneLayout(DEFAULT_PANE_LAYOUT, "left", 64, 1400);

    expect(resized.sidebarWidth).toBe(DEFAULT_PANE_LAYOUT.sidebarWidth + 64);
    expect(resized.inspectorWidth).toBe(DEFAULT_PANE_LAYOUT.inspectorWidth);
  });

  it("resizes the inspector from the right separator", () => {
    const resized = resizePaneLayout(DEFAULT_PANE_LAYOUT, "right", -72, 1400);

    expect(resized.sidebarWidth).toBe(DEFAULT_PANE_LAYOUT.sidebarWidth);
    expect(resized.inspectorWidth).toBe(DEFAULT_PANE_LAYOUT.inspectorWidth + 72);
  });

  it("preserves board minimum width while dragging", () => {
    const resized = resizePaneLayout(DEFAULT_PANE_LAYOUT, "right", -900, 1100);
    const boardWidth = 1100 - resized.sidebarWidth - resized.inspectorWidth - RESIZER_WIDTH * 2;

    expect(boardWidth).toBeGreaterThanOrEqual(MIN_BOARD_WIDTH);
  });
});
