export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

const STORAGE_KEY_SIDEBAR = "think-sidebar-collapsed";
const STORAGE_KEY_PROJECTS_OPEN = "think-sidebar-projects-open";

export function getStoredSidebarCollapsed(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SIDEBAR);
    return stored === "true";
  } catch {
    return false;
  }
}

export function setStoredSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR, String(collapsed));
  } catch {
    /* ignore */
  }
}

export function getStoredProjectsSectionOpen(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_PROJECTS_OPEN);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

export function setStoredProjectsSectionOpen(open: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS_OPEN, String(open));
  } catch {
    /* ignore */
  }
}
