export type PaneDivider = "left" | "right";

export interface PaneLayout {
  sidebarWidth: number;
  inspectorWidth: number;
}

export const RESIZER_WIDTH = 8;
export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 420;
export const MIN_BOARD_WIDTH = 420;
export const MIN_INSPECTOR_WIDTH = 320;

export const DEFAULT_PANE_LAYOUT: PaneLayout = {
  sidebarWidth: 240,
  inspectorWidth: 430,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Math.round(value), min), max);
}

export function clampPaneLayout(layout: PaneLayout, viewportWidth: number): PaneLayout {
  const minViewportWidth =
    MIN_SIDEBAR_WIDTH + MIN_BOARD_WIDTH + MIN_INSPECTOR_WIDTH + RESIZER_WIDTH * 2;
  const availableWidth = Math.max(viewportWidth, minViewportWidth) - RESIZER_WIDTH * 2;
  const sidebarMax = Math.min(
    MAX_SIDEBAR_WIDTH,
    availableWidth - MIN_BOARD_WIDTH - MIN_INSPECTOR_WIDTH,
  );
  const sidebarWidth = clamp(layout.sidebarWidth, MIN_SIDEBAR_WIDTH, sidebarMax);
  const inspectorMax = availableWidth - MIN_BOARD_WIDTH - sidebarWidth;
  const inspectorWidth = clamp(layout.inspectorWidth, MIN_INSPECTOR_WIDTH, inspectorMax);

  return { sidebarWidth, inspectorWidth };
}

export function resizePaneLayout(
  layout: PaneLayout,
  divider: PaneDivider,
  deltaX: number,
  viewportWidth: number,
) {
  const nextLayout =
    divider === "left"
      ? { ...layout, sidebarWidth: layout.sidebarWidth + deltaX }
      : { ...layout, inspectorWidth: layout.inspectorWidth - deltaX };

  return clampPaneLayout(nextLayout, viewportWidth);
}

export function paneGridTemplate(layout: PaneLayout) {
  return `${layout.sidebarWidth}px ${RESIZER_WIDTH}px minmax(${MIN_BOARD_WIDTH}px, 1fr) ${RESIZER_WIDTH}px ${layout.inspectorWidth}px`;
}
