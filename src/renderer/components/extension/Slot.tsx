/**
 * Slot Component
 *
 * Extension point that renders plugin contributions for a specific slot.
 * Plugins can inject UI into these slots by declaring contributions in their manifest.
 */

import React from 'react';
import type { ExtensionSlotId } from '../../../shared/types';
import { useSlotContributions } from '../../contexts/ExtensionPointsContext';
import { SlotRenderer } from './SlotRenderer';

export interface SlotProps {
  /** The slot ID to render contributions for */
  id: ExtensionSlotId;

  /** Context data passed to plugin components */
  context?: Record<string, unknown>;

  /** Optional className for the slot container */
  className?: string;

  /** Whether to render inline (no wrapper div) */
  inline?: boolean;

  /** Custom render wrapper for each contribution */
  renderWrapper?: (
    contribution: { pluginId: string; pluginPath: string },
    children: React.ReactNode
  ) => React.ReactNode;
}

/**
 * Slot component that renders all plugin contributions for a given slot ID.
 *
 * Usage:
 * ```tsx
 * <Slot id="task-card:badge" context={{ taskId: task.id }} />
 * ```
 */
export const Slot: React.FC<SlotProps> = ({
  id,
  context = {},
  className,
  inline = false,
  renderWrapper,
}) => {
  const contributions = useSlotContributions(id);

  // No contributions = no render
  if (contributions.length === 0) {
    return null;
  }

  const content = contributions.map((contribution) => {
    const element = (
      <SlotRenderer
        key={`${contribution.pluginId}-${contribution.slotId}`}
        contribution={contribution}
        context={context}
      />
    );

    if (renderWrapper) {
      return renderWrapper(contribution, element);
    }

    return element;
  });

  if (inline) {
    return <>{content}</>;
  }

  return (
    <div className={className} data-slot-id={id}>
      {content}
    </div>
  );
};

export default Slot;
