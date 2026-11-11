# Repository instructions

## UI/UX work
- For any UI, UX, visual design, layout, interaction, or design-system task, use the project-installed UI UX Pro Max skill at `.agents/skills/ui-ux-pro-max/SKILL.md` when it is present.
- Before implementing a page, consult `design-system/mealpha-pro/MASTER.md` and any page-specific guide under `design-system/mealpha-pro/pages/`.
- Use the skill's search script to retrieve relevant style, typography, palette, UX, and React/Tailwind guidance. Do not rely on generic design assumptions when a relevant catalog result exists.
- Treat the design system as guidance, not permission to replace working product behavior. Preserve existing data flows, local-first storage, Dropbox sync, authentication, accessibility, and platform-specific behavior.
- Do not introduce Google Firebase or Google Cloud dependencies.
- Never fabricate financial values, investment performance, user activity, charts, or demo records in production UI.
- Keep Persian RTL and English LTR fully supported, including layout direction, number/date formatting, keyboard navigation, and responsive states.
- Maintain both light and dark modes and all six existing accent palettes (violet, blue, green, cyan, orange, pink). Theme choice must not break contrast or semantic status colors.
- Prefer shared components and design tokens over page-specific duplicated styles. Validate desktop, tablet, and mobile layouts.
