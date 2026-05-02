/**
 * Focused app shell machine selectors — prefer these over aggregating all UI state in one hook.
 */
export {
  useAppLayoutSelectors,
  useWakeUpOverlaySelectors,
  useGraphSurfaceMachineSelectors,
  useChatDockMachineSelectors,
  type AppLayoutSelectors,
  type WakeUpOverlaySelectors,
  type GraphSurfaceMachineSelectors,
  type ChatDockMachineSelectors,
} from "./useAppShellMachineSelectors";
