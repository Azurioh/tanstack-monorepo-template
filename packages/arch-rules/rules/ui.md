# UI (every app, ADR 0007)

1. **shadcn first, minimal hand-written HTML.** Every control is a `@repo/ui` component
   (`import { Button } from '@repo/ui/components/button'`). Order: an existing `@repo/ui`
   component; a composition of them in the feature's `client/components/`; a new shadcn component
   added to `packages/ui`; a custom component only when no shadcn item covers the need, with a
   header comment saying why. Hand-rolled buttons, inputs, alerts and card-like `div`s are
   defects. `packages/ui` components are owned code (ADR 0007), not vendored: change them there, once,
   never per screen.
2. **Sizes and variants are props.** `size` / `variant` only; no height or padding overrides on
   `@repo/ui` components. Tap targets are the package's job: the default `Button`, icon `Button`
   and `Input` are 44 px (`h-11` / `size-11`); never use a smaller size for a primary touch
   control. `w-full` only where the layout needs it (for example a submit button on phones,
   `w-full sm:w-auto`).
3. **Tokens only.** Semantic Tailwind tokens from `@repo/ui/theme.css` (`bg-primary`,
   `text-muted-foreground`, `text-destructive`, `border-border`…). Never hex values, palette
   colours (`gray-*`, `zinc-*`) or arbitrary `[#…]` colours.
4. **View / ViewModel split.** A View (`client/components/`) renders props and calls callbacks:
   no data fetching, no state beyond local presentation. A ViewModel (`client/hooks/use-*.ts`)
   owns state, queries, mutations and actions, and returns exactly the View's props. A page
   (`client/pages/`) composes ViewModels and Views; a route file only mounts the page and runs
   its loader.
5. **Forms: zod + `useReducer`, no form library.** The feature's `schemas.ts` holds the zod
   schema shared with the procedure input; the ViewModel validates with it before submitting,
   keeps the form state in a `useReducer` with an explicit status (`idle`, `invalid`,
   `submitting`, `succeeded`, `failed`) and ignores results of superseded submissions.
6. **Data**: reads go through the route loader (`ensureQueryData`) and the same query options in
   the ViewModel, built from the oRPC TanStack Query utils in `client/api/`; a mutation
   invalidates the queries it changes. No `fetch` in a component.
7. **Copy lives in `client/copy.ts`**, English only, never as a literal in a component; error
   copy is keyed by business code (`errors.md`).
8. **Accessibility**: every input has a `Label`; a field error is linked with `aria-describedby`
   and announced (`role="alert"`); a request-level error uses `Alert`; one `h1` per page.
9. **Mobile-first, then desktop.** Layout starts at phone width and adds `sm:` / `md:` variants;
   no hover-only affordance, no horizontal scroll at 375 px.
10. **Before "done"**: the screen is checked at 375 px and at desktop width, every interactive
    element is at least 44 px on touch, and the end-to-end test of the flow passes.
