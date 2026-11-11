# MeAlpha Pro — Master Design System

## Product
MeAlpha Pro is a local-first personal finance and life-planning application for managing money, wealth, goals, tasks, habits, focus, and analytical reports. Its UI must communicate trust, clarity, control, and premium craftsmanship—not a generic admin template.

## Technology and constraints
- Application stack: React + TypeScript + Tailwind CSS (Vite; desktop/mobile builds share the application UI).
- Preserve existing application architecture, data models, persistence, and navigation unless the task explicitly changes them.
- Local-first is a core product property. Dropbox is the supported synchronization provider; do not add Firebase or Google Cloud dependencies.
- Never invent balances, income/expense values, investment returns, account activity, goals, or chart data. Empty states must be useful and honest.

## Brand and visual direction
- Premium, calm, modern financial command center.
- Use a clear visual hierarchy, generous but disciplined spacing, restrained surfaces, subtle borders, and purposeful elevation.
- Avoid excessive gradients, glass effects, decorative cards, crowded KPI grids, tiny text, and visual noise.
- Use a consistent spacing/radius/type scale and shared components. Prefer lucide-react icons already used by the app; avoid emoji as interface icons.
- Use data visualization only when it explains a decision. Label axes, units, periods, and empty states clearly; provide accessible text summaries.

## Themes
- Support light and dark appearance.
- Preserve all six accent palettes: violet, blue, green, cyan, orange, and pink.
- Accent selection must persist and work in both appearance modes.
- Keep semantic colors (success, warning, danger, info) distinct from the user's accent color.
- Meet readable contrast in both themes; never rely on color alone to communicate status.

## Localization and layout
- Persian is RTL and English is LTR. Direction must be correct at page, component, form, chart, and icon level.
- Avoid hard-coded left/right assumptions; use logical CSS properties such as margin-inline and padding-inline.
- Ensure Persian typography is legible and consistent; preserve English typography and mixed-script values.
- Format dates, currencies, percentages, and digits according to the selected locale without changing stored numeric values.
- Responsive behavior must be intentionally designed for phone, tablet, laptop, and wide desktop—not merely scaled down.

## Interaction and accessibility
- Every visible control must work, have a clear state, and be keyboard accessible.
- Provide loading, empty, success, error, disabled, and offline states where relevant.
- Use semantic HTML, visible focus indicators, adequate hit targets, labels, and accessible names.
- Preserve user confirmation for destructive actions and never silently discard unsaved data.

## Finance-specific UX
- Prioritize cash flow, net worth, budgets, goals, and trend context without overwhelming the user.
- Distinguish actual values from forecasts and targets.
- Show date ranges and currency units wherever financial metrics appear.
- Make transaction entry and review efficient, with clear categories and filters.
- Reports should provide actionable insights, not just decorative charts.

## Implementation quality gate
1. Inspect existing page logic and shared components before redesigning.
2. Query the UI UX Pro Max skill for the relevant domain, style, typography, palette, and stack guidance.
3. Reuse the app's existing tokens and components where practical; document deliberate changes.
4. Preserve business logic and test affected flows.
5. Run typecheck, lint, build, and UI smoke tests available in the repository.
6. Review Persian RTL, English LTR, light/dark, all accent palettes, and narrow-screen behavior.
