/**
 * Extension Components
 *
 * Components for the plugin UI extensibility system.
 */

export { Slot, type SlotProps } from './Slot';
export { SlotRenderer } from './SlotRenderer';

// Re-export types from context
export type {
  SettingsTabContribution,
  DockingPanelContribution,
  SlotContribution,
} from '../../contexts/ExtensionPointsContext';
