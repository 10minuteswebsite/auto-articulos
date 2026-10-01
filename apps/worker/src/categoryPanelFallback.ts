import type { RemoteCategory } from "./automation/10minutesWebsite";

/**
 * Chooses a safe fallback when the panel selected during onboarding returns
 * no categories. We only auto-select an unambiguous panel; silently mixing
 * panels would publish into the wrong site.
 */
export function chooseUnambiguousCategoryPanel(
  categories: RemoteCategory[],
): RemoteCategory[] | null {
  const byPanel = new Map<string, RemoteCategory[]>();
  for (const category of categories) {
    const panelCategories = byPanel.get(category.panel) ?? [];
    panelCategories.push(category);
    byPanel.set(category.panel, panelCategories);
  }

  const nonEmptyPanels = [...byPanel.values()].filter((items) => items.length > 0);
  return nonEmptyPanels.length === 1 ? nonEmptyPanels[0] : null;
}
