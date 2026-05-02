/** Dispatches global event consumed by `Tutorial` — extracted for react-refresh purity. */
export function runTutorial(): void {
  window.dispatchEvent(new Event("let-think:run-tutorial"));
}
