/**
 * SplitContainer - Renders a split node with resizable panels
 */

import React, { useCallback, useRef, useState } from 'react';
import type { SplitNode, TreePath } from '../types';
import { useLayoutActions } from '../store';
import { clamp } from '../utils';

// ============================================================================
// Props
// ============================================================================

interface SplitContainerProps {
  node: SplitNode;
  path: TreePath;
  renderNode: (node: SplitNode['a'] | SplitNode['b'], path: TreePath) => React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export const SplitContainer: React.FC<SplitContainerProps> = ({
  node,
  path,
  renderNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const { resizeSplit } = useLayoutActions();

  const isHorizontal = node.direction === 'row';

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();
        const containerSize = isHorizontal
          ? containerRect.width
          : containerRect.height;

        const currentPos = isHorizontal ? moveEvent.clientX : moveEvent.clientY;
        const startOffset = isHorizontal ? containerRect.left : containerRect.top;

        // Calculate new ratio based on cursor position
        const newRatio = (currentPos - startOffset) / containerSize;
        const clampedRatio = clamp(newRatio, 0.1, 0.9);

        resizeSplit(path, clampedRatio);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isHorizontal, node.ratio, path, resizeSplit]
  );

  // Calculate sizes
  const firstSize = `${node.ratio * 100}%`;
  const secondSize = `${(1 - node.ratio) * 100}%`;

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full ${isHorizontal ? 'flex-row' : 'flex-col'}`}
      style={{ position: 'relative' }}
    >
      {/* First child */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: firstSize,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {renderNode(node.a, [...path, 0])}
      </div>

      {/* Resize handle */}
      <div
        className={`
          ${isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'}
          bg-border hover:bg-primary/50 transition-colors
          ${isResizing ? 'bg-primary' : ''}
          flex-shrink-0
        `}
        style={{
          position: 'relative',
          zIndex: 10,
        }}
        onMouseDown={handleResizeStart}
      >
        {/* Invisible larger hit area */}
        <div
          className={`
            absolute
            ${isHorizontal ? 'inset-y-0 -inset-x-1' : 'inset-x-0 -inset-y-1'}
          `}
        />
      </div>

      {/* Second child */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: secondSize,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {renderNode(node.b, [...path, 1])}
      </div>

      {/* Resize overlay to prevent iframe interference during drag */}
      {isResizing && (
        <div
          className="fixed inset-0 z-50"
          style={{ cursor: isHorizontal ? 'col-resize' : 'row-resize' }}
        />
      )}
    </div>
  );
};

export default SplitContainer;
