# @lp-labs/react-spacing-editor

An original controlled margin/padding editor with linked sides, explicit units,
presets, and min-width responsive rules. React 18.2 or 19 is the only runtime
peer. There are no runtime dependencies.

## Use

```sh
npm install @lp-labs/react-spacing-editor react react-dom
```

In a React application with CSS imports enabled:

```tsx
import { useState } from "react";
import {
  SpacingEditor,
  createSpacing,
  spacingToCss,
  validateSpacing,
} from "@lp-labs/react-spacing-editor";
import "@lp-labs/react-spacing-editor/styles.css";

export default function App() {
  const [value, setValue] = useState(createSpacing);
  return (
    <>
      <SpacingEditor value={value} onChange={setValue} />
      <pre>{validateSpacing(value).length ? "Invalid spacing" : spacingToCss(value, ".card")}</pre>
    </>
  );
}
```

Both named ESM imports and CommonJS `require` expose the same API. The stylesheet
is a separate `styles.css` subpath, never automatically imported by JavaScript.
Imports and server rendering do not require browser globals.

## Component and all exported types

`SpacingEditor(props: SpacingEditorProps)` requires `value: SpacingValue` and
`onChange(next: SpacingValue): void`. Keep the emitted value in state; all edits
are immutable. Optional props: `disabled?: boolean = false`,
`className?: string = ""`, `style?: React.CSSProperties`, and
`"aria-label"?: string = "Spacing editor"`.

```ts
type SpacingUnit = "px" | "rem" | "em" | "%";
type SpacingSide = "top" | "right" | "bottom" | "left";
type SpacingKind = "margin" | "padding";
interface SpacingLength { value: number; unit: SpacingUnit }
type SpacingSides = Record<SpacingSide, SpacingLength>;
interface SpacingRule { margin: SpacingSides; padding: SpacingSides }
interface ResponsiveSpacing { minWidth: number; value: SpacingRule }
interface SpacingValue { base: SpacingRule; responsive: ResponsiveSpacing[] }
```

`SpacingEditorProps` and the types above are exported. All fields are required.
Margin numbers are finite in [-10000,10000]; padding numbers are finite in
[0,10000]. Unit numbers are literal values, not conversions. There may be 0-8
responsive rules, with strictly increasing unique integer `minWidth` values
from 1 to 10000 pixels. Each responsive rule is a complete replacement for all
base sides, not a partial override.

## All runtime exports

* `SpacingEditor`: the component above.
* `SPACING_PRESETS`: a frozen readonly tuple `[0, 4, 8, 16, 24, 32]`.
* `createSpacing(): SpacingValue`: returns fresh data with every base margin
  and padding side `{ value: 0, unit: "px" }` and no responsive rules.
* `validateSpacing(value: SpacingValue): string[]`: returns constraint errors
  or `[]`. Expects the structural schema above, not arbitrary unknown JSON.
* `setSpacingSide(value: SpacingValue, kind: SpacingKind, side: SpacingSide,
  length: SpacingLength, linked = false, minWidth?: number): SpacingValue`:
  validates and immutably replaces one side, or all four sides of that kind
  when linked. Omit minWidth to edit base; otherwise it must identify an
  existing breakpoint. Throws `RangeError` for invalid input/result, unknown
  kind/side or nonexistent breakpoint. No automatic unit conversion occurs.
* `applySpacingPreset(value: SpacingValue, size: number, minWidth?: number):
  SpacingValue`: validates and replaces BOTH margin and padding at the selected
  existing rule with the uniform size in px. Throws `RangeError` for invalid
  input, a size not in `SPACING_PRESETS`, or an absent breakpoint.
* `spacingToCss(value: SpacingValue, selector = ".spaced"): string`: validates,
  then emits a base rule and ascending `@media (min-width: Npx)` rules with
  top/right/bottom/left shorthands. Selector must be one simple ASCII class,
  id or tag, starting with a letter after any `.`/`#`; combinators, pseudo
  selectors, escaping and arbitrary CSS are unsupported. Invalid data throws
  `RangeError`; invalid selector throws `SyntaxError`. Export only returns
  text; it does not install styles or download a file.

These are all runtime exports; there is no default export or custom error class.

## Editing and responsive behavior

Link checkboxes default to false and affect subsequent edits only; switching
linking on does not immediately overwrite unequal sides. A linked numeric or
unit edit copies the full resulting length to all sides of that kind.
Presets apply to the currently selected base/breakpoint. Add breakpoint copies
the current complete rule, creates 640px initially and then increments the last
breakpoint by 320px, up to 8 rules and 10000px. Numeric breakpoint edits are
sorted and reject duplicates. Removing a breakpoint selects base.

Side edits which violate bounds are rejected, with an announced error.
Controlled invalid input from a parent is reported and CSS is withheld. Preview
shows the selected rule, not a simulation of the browser viewport. Percentages
and relative units use the preview container's native CSS context, so their
appearance may differ in the consuming layout. The preview scrolls large values.

No `auto`, `calc()`, CSS variables, logical properties, unit conversion,
breakpoint inheritance, container queries, general CSS import, or arbitrary CSS
values are supported. This is intentionally a bounded subset, not a design-system
or CSS-framework compatibility claim.

## Customization and accessibility

Styles are scoped to `.lps-editor`; customize `--lps-accent`, root `style`,
or `className`. Labeled native controls, fieldset legends, visible focus
outlines, and `role="alert"` errors support keyboard operation. Color-coded
preview boxes also contain text. Keep sufficient contrast when overriding
colors. No production certification is claimed.

[CSS box model](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model) |

## License

[MIT](./LICENSE).

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
