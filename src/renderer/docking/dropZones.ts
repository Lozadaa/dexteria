/**
 * Dexteria Layout & View System v6
 * Drop Zone Detection
 */

import type { DropZone, DropZoneResult, DropZoneConfig } from './types';

// ============================================================================
// Configuration
// ============================================================================

export const ZONE_CONFIG: DropZoneConfig = {
  edgeThreshold: 0.22, // 22% of edge
  tabBarHeight: 36,
};

// ============================================================================
// Drop Zone Detection
// ============================================================================

/**
 * Detect the drop zone using NORMALIZED DISTANCE to the nearest edge.
 *
 * In corners, this produces more natural behavior:
 * - If you're closer to the left edge than the top, zone = "left"
 * - VS Code behaves this way
 */
export function detectDropZone(
  containerRect: DOMRect,
  tabBarRect: DOMRect | null,
  tabRects: DOMRect[],
  mouseX: number,
  mouseY: number
): DropZoneResult | null {
  // Check bounds
  if (
    mouseX < containerRect.left ||
    mouseX > containerRect.right ||
    mouseY < containerRect.top ||
    mouseY > containerRect.bottom
  ) {
    return null;
  }

  const { width, height } = containerRect;
  const { edgeThreshold } = ZONE_CONFIG;

  // Relative position (0 to 1)
  const relX = (mouseX - containerRect.left) / width;
  const relY = (mouseY - containerRect.top) / height;

  // Normalized distances to each edge (0 = at edge, 1 = at center)
  const distTop = relY;
  const distBottom = 1 - relY;
  const distLeft = relX;
  const distRight = 1 - relX;

  // Find minimum distance
  const minDist = Math.min(distTop, distBottom, distLeft, distRight);

  // If minimum distance is greater than threshold, we're in center
  if (minDist > edgeThreshold) {
    let tabIndex: number | undefined;
    if (tabBarRect && isPointInRect(mouseX, mouseY, tabBarRect)) {
      tabIndex = calculateTabIndex(mouseX, tabRects);
    }
    return { zone: 'center', tabIndex };
  }

  // Determine nearest edge
  // On exact tie, priority: top > bottom > left > right
  if (distTop === minDist) return { zone: 'top' };
  if (distBottom === minDist) return { zone: 'bottom' };
  if (distLeft === minDist) return { zone: 'left' };
  if (distRight === minDist) return { zone: 'right' };

  // Fallback (shouldn't reach here)
  return { zone: 'center' };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a point is inside a rect
 */
function isPointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Calculate the tab index based on mouse X position
 */
function calculateTabIndex(mouseX: number, tabRects: DOMRect[]): number {
  if (tabRects.length === 0) return 0;

  for (let i = 0; i < tabRects.length; i++) {
    const rect = tabRects[i];
    const midpoint = rect.left + rect.width / 2;
    if (mouseX < midpoint) return i;
  }

  return tabRects.length;
}

// ============================================================================
// Drop Zone Visual Helpers
// ============================================================================

/**
 * Get the CSS for a drop zone overlay
 */
export function getDropZoneOverlayStyle(
  zone: DropZone,
  _containerRect: DOMRect
): React.CSSProperties {
  const { edgeThreshold } = ZONE_CONFIG;
  const edgeSize = `${edgeThreshold * 100}%`;

  switch (zone) {
    case 'top':
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: edgeSize,
      };
    case 'bottom':
      return {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: edgeSize,
      };
    case 'left':
      return {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: edgeSize,
      };
    case 'right':
      return {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: edgeSize,
      };
    case 'center':
      return {
        position: 'absolute',
        top: edgeSize,
        bottom: edgeSize,
        left: edgeSize,
        right: edgeSize,
      };
  }
}

/**
 * Get the preview rect for a drop zone
 */
export function getDropZonePreviewRect(
  zone: DropZone,
  containerRect: DOMRect
): { x: number; y: number; width: number; height: number } {
  const { edgeThreshold: _edgeThreshold } = ZONE_CONFIG;

  switch (zone) {
    case 'top':
      return {
        x: containerRect.left,
        y: containerRect.top,
        width: containerRect.width,
        height: containerRect.height * 0.5,
      };
    case 'bottom':
      return {
        x: containerRect.left,
        y: containerRect.top + containerRect.height * 0.5,
        width: containerRect.width,
        height: containerRect.height * 0.5,
      };
    case 'left':
      return {
        x: containerRect.left,
        y: containerRect.top,
        width: containerRect.width * 0.5,
        height: containerRect.height,
      };
    case 'right':
      return {
        x: containerRect.left + containerRect.width * 0.5,
        y: containerRect.top,
        width: containerRect.width * 0.5,
        height: containerRect.height,
      };
    case 'center':
      return {
        x: containerRect.left,
        y: containerRect.top,
        width: containerRect.width,
        height: containerRect.height,
      };
  }
}
