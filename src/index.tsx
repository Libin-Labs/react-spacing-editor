import { useState, type CSSProperties } from 'react';
import {
  applySpacingPreset,
  setSpacingSide,
  spacingToCss,
  SPACING_PRESETS,
  validateSpacing,
  type SpacingKind,
  type SpacingSide,
  type SpacingSides,
  type SpacingUnit,
  type SpacingValue,
} from './engine.js';

export * from './engine.js';

export interface SpacingEditorProps {
  value: SpacingValue;
  onChange: (value: SpacingValue) => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
}

function copySides(sides: SpacingSides): SpacingSides {
  return {
    top: { ...sides.top },
    right: { ...sides.right },
    bottom: { ...sides.bottom },
    left: { ...sides.left },
  };
}

export function SpacingEditor({
  value,
  onChange,
  disabled = false,
  className = '',
  style,
  'aria-label': label = 'Spacing editor',
}: SpacingEditorProps) {
  const [active, setActive] = useState<number | undefined>();
  const [linked, setLinked] = useState({ margin: false, padding: false });
  const [editError, setEditError] = useState('');
  const errors = validateSpacing(value);
  const breakpoint = value.responsive.find((item) => item.minWidth === active);
  const minWidth = breakpoint?.minWidth;
  const rule = breakpoint?.value ?? value.base;
  const edit = (
    kind: SpacingKind,
    side: SpacingSide,
    patch: { value?: number; unit?: SpacingUnit },
  ) => {
    try {
      onChange(
        setSpacingSide(
          value,
          kind,
          side,
          { ...rule[kind][side], ...patch },
          linked[kind],
          minWidth,
        ),
      );
      setEditError('');
    } catch (error) {
      setEditError((error as Error).message);
    }
  };
  const previewStyle: CSSProperties = {};
  if (!errors.length) {
    for (const kind of ['margin', 'padding'] as const) {
      previewStyle[kind] = (['top', 'right', 'bottom', 'left'] as const)
        .map((side) => `${rule[kind][side].value}${rule[kind][side].unit}`)
        .join(' ');
    }
  }
  return (
    <section className={`lps-editor ${className}`} style={style} aria-label={label}>
      <fieldset disabled={disabled}>
        <legend>Responsive rule</legend>
        <label>
          Editing rule
          <select
            value={minWidth ?? 'base'}
            onChange={(event) => {
              setActive(event.target.value === 'base' ? undefined : Number(event.target.value));
              setEditError('');
            }}
          >
            <option value="base">Base</option>
            {value.responsive.map((item) => (
              <option key={item.minWidth} value={item.minWidth}>
                From {item.minWidth}px
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={
            value.responsive.length >= 8 ||
            errors.length > 0 ||
            (value.responsive[value.responsive.length - 1]?.minWidth ?? 320) + 320 > 10000
          }
          onClick={() => {
            const next = (value.responsive[value.responsive.length - 1]?.minWidth ?? 320) + 320;
            const copy = { margin: copySides(rule.margin), padding: copySides(rule.padding) };
            onChange({
              ...value,
              responsive: [...value.responsive, { minWidth: next, value: copy }],
            });
            setActive(next);
          }}
        >
          Add breakpoint
        </button>
        {breakpoint && (
          <>
            <label>
              Min width (px)
              <input
                type="number"
                min={1}
                max={10000}
                value={breakpoint.minWidth}
                onChange={(event) => {
                  const next = event.target.valueAsNumber;
                  if (
                    !Number.isInteger(next) ||
                    next < 1 ||
                    next > 10000 ||
                    value.responsive.some((item) => item.minWidth === next && item !== breakpoint)
                  )
                    return;
                  onChange({
                    ...value,
                    responsive: value.responsive
                      .map((item) => (item === breakpoint ? { ...item, minWidth: next } : item))
                      .sort((a, b) => a.minWidth - b.minWidth),
                  });
                  setActive(next);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...value,
                  responsive: value.responsive.filter((item) => item !== breakpoint),
                });
                setActive(undefined);
              }}
            >
              Remove breakpoint
            </button>
          </>
        )}
      </fieldset>
      {(['margin', 'padding'] as const).map((kind) => (
        <fieldset disabled={disabled} key={kind}>
          <legend>{kind}</legend>
          <label>
            <input
              type="checkbox"
              checked={linked[kind]}
              onChange={(event) => setLinked({ ...linked, [kind]: event.target.checked })}
            />
            Link {kind} sides
          </label>
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <div key={side}>
              <label>
                {kind} {side}
                <input
                  type="number"
                  min={kind === 'padding' ? 0 : -10000}
                  max={10000}
                  step="0.1"
                  value={rule[kind][side].value}
                  onChange={(event) => {
                    if (Number.isFinite(event.target.valueAsNumber))
                      edit(kind, side, { value: event.target.valueAsNumber });
                  }}
                />
              </label>
              <label>
                {kind} {side} unit
                <select
                  value={rule[kind][side].unit}
                  onChange={(event) =>
                    edit(kind, side, { unit: event.target.value as SpacingUnit })
                  }
                >
                  {['px', 'rem', 'em', '%'].map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </fieldset>
      ))}
      <fieldset disabled={disabled || errors.length > 0}>
        <legend>Presets (both margin and padding)</legend>
        {SPACING_PRESETS.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(applySpacingPreset(value, size, minWidth))}
          >
            {size}px preset
          </button>
        ))}
      </fieldset>
      <div className="lps-preview" aria-label="Selected rule preview">
        <div style={previewStyle}>Content</div>
      </div>
      {(errors.length > 0 || editError) && (
        <p role="alert">
          {errors.join(' ')} {editError}
        </p>
      )}
      <label>
        CSS export
        <textarea rows={8} readOnly value={errors.length ? '' : spacingToCss(value)} />
      </label>
    </section>
  );
}
