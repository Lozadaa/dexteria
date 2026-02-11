/**
 * DockingLayout - Main layout renderer
 */

import React, { useCallback } from 'react';
import { useLayoutStore } from './store';
import { useComponentRegistry } from './ComponentRegistry';
import { ViewGroupPanel } from './components/ViewGroupPanel';
import { SplitContainer } from './components/SplitContainer';
import type { LayoutNode, TreePath } from './types';

// ============================================================================
// Component
// ============================================================================

export const DockingLayout: React.FC = () => {
  const tree = useLayoutStore((state) => state.tree);
  const groups = useLayoutStore((state) => state.groups);
  const { getTitle, getIcon, renderView } = useComponentRegistry();

  // Recursive renderer for layout nodes
  const renderNode = useCallback(
    (node: LayoutNode, path: TreePath): React.ReactNode => {
      if (node.type === 'leaf') {
        const group = groups[node.groupId];
        if (!group) {
          console.error(`Group not found: ${node.groupId}`);
          return null;
        }

        return (
          <ViewGroupPanel
            key={node.groupId}
            groupId={node.groupId}
            group={group}
            renderView={renderView}
            getViewTitle={getTitle}
            getViewIcon={getIcon}
          />
        );
      }

      // Split node
      return (
        <SplitContainer
          key={`split-${path.join('-')}`}
          node={node}
          path={path}
          renderNode={renderNode}
        />
      );
    },
    [groups, getTitle, getIcon, renderView]
  );

  return (
    <div className="h-full w-full overflow-hidden" role="region" aria-label="Workspace panels">
      {renderNode(tree, [])}
    </div>
  );
};

export default DockingLayout;
