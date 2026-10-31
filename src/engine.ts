export type SpacingUnit = 'px' | 'rem' | 'em' | '%';
export type SpacingSide = 'top' | 'right' | 'bottom' | 'left';
export type SpacingKind = 'margin' | 'padding';

export interface SpacingLength {
  value: number;
  unit: SpacingUnit;
}

export type SpacingSides = Record<SpacingSide, SpacingLength>;

export interface SpacingRule {
  margin: SpacingSides;
  padding: SpacingSides;
}

export interface ResponsiveSpacing {
  minWidth: number;
  value: SpacingRule;
}

export interface SpacingValue {
  base: SpacingRule;
  responsive: ResponsiveSpacing[];
}

export const SPACING_PRESETS = Object.freeze([0, 4, 8, 16, 24, 32] as const);

const sides: SpacingSide[] = ['top', 'right', 'bottom', 'left'];

function uniform(value: number): SpacingSides {
  return {
    top: { value, unit: 'px' },
    right: { value, unit: 'px' },
    bottom: { value, unit: 'px' },
    left: { value, unit: 'px' },
  };
}

export function createSpacing(): SpacingValue {
  return { base: { margin: uniform(0), padding: uniform(0) }, responsive: [] };
}

export function validateSpacing(value: SpacingValue): string[] {
  const errors: string[] = [];
  if (value.responsive.length > 8) errors.push('At most 8 responsive breakpoints are supported.');
  value.responsive.forEach((item, index) => {
    if (
      !Number.isInteger(item.minWidth) ||
      item.minWidth < 1 ||
      item.minWidth > 10000 ||
      (index > 0 && item.minWidth <= value.responsive[index - 1].minWidth)
    )
      errors.push('Breakpoints must strictly increase as integers from 1 to 10000 px.');
  });
  for (const rule of [value.base, ...value.responsive.map((item) => item.value)]) {
    for (const kind of ['margin', 'padding'] as const) {
      for (const side of sides) {
        const length = rule[kind][side];
        if (!['px', 'rem', 'em', '%'].includes(length.unit))
          errors.push('Units must be px, rem, em, or %.');
        if (
          !Number.isFinite(length.value) ||
          length.value < (kind === 'padding' ? 0 : -10000) ||
          length.value > 10000
        )
          errors.push(
            `${kind} values must be finite, ${kind === 'padding' ? '0' : '-10000'} to 10000.`,
          );
      }
    }
  }
  return errors;
}

function assertSpacing(value: SpacingValue): void {
  const errors = validateSpacing(value);
  if (errors.length) throw new RangeError(errors.join(' '));
}

function replaceRule(value: SpacingValue, rule: SpacingRule, minWidth?: number): SpacingValue {
  if (minWidth === undefined) return { ...value, base: rule };
  if (!value.responsive.some((item) => item.minWidth === minWidth))
    throw new RangeError('Breakpoint does not exist.');
  return {
    ...value,
    responsive: value.responsive.map((item) =>
      item.minWidth === minWidth ? { ...item, value: rule } : item,
    ),
  };
}

export function setSpacingSide(
  value: SpacingValue,
  kind: SpacingKind,
  side: SpacingSide,
  length: SpacingLength,
  linked = false,
  minWidth?: number,
): SpacingValue {
  assertSpacing(value);
  if (!['margin', 'padding'].includes(kind) || !sides.includes(side))
    throw new RangeError('Invalid spacing kind or side.');
  const rule =
    minWidth === undefined
      ? value.base
      : value.responsive.find((item) => item.minWidth === minWidth)?.value;
  if (!rule) throw new RangeError('Breakpoint does not exist.');
  const nextSides = { ...rule[kind] };
  for (const key of linked ? sides : [side]) nextSides[key] = { ...length };
  const result = replaceRule(value, { ...rule, [kind]: nextSides }, minWidth);
  assertSpacing(result);
  return result;
}

export function applySpacingPreset(
  value: SpacingValue,
  size: number,
  minWidth?: number,
): SpacingValue {
  assertSpacing(value);
  if (!(SPACING_PRESETS as readonly number[]).includes(size))
    throw new RangeError('Unsupported spacing preset.');
  return replaceRule(value, { margin: uniform(size), padding: uniform(size) }, minWidth);
}

export function spacingToCss(value: SpacingValue, selector = '.spaced'): string {
  assertSpacing(value);
  if (!/^(?:[.#]?[a-zA-Z][a-zA-Z0-9_-]*)$/.test(selector))
    throw new SyntaxError('Selector must be one simple class, id, or tag.');
  const ruleCss = (rule: SpacingRule) =>
    `${selector} {\n  margin: ${sides.map((side) => `${rule.margin[side].value}${rule.margin[side].unit}`).join(' ')};\n  padding: ${sides.map((side) => `${rule.padding[side].value}${rule.padding[side].unit}`).join(' ')};\n}`;
  return [
    ruleCss(value.base),
    ...value.responsive.map(
      (item) =>
        `@media (min-width: ${item.minWidth}px) {\n${ruleCss(item.value)
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n')}\n}`,
    ),
  ].join('\n');
}
