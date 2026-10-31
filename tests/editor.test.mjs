import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import {
  SpacingEditor,
  SPACING_PRESETS,
  applySpacingPreset,
  createSpacing,
  setSpacingSide,
  spacingToCss,
  validateSpacing,
} from '../dist/esm/index.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import('react-dom/client');
after(() => dom.window.close());

test('linked edits, fresh defaults, presets and unit-aware responsive CSS', () => {
  const value = createSpacing();
  const linked = setSpacingSide(value, 'margin', 'top', { value: -2, unit: 'rem' }, true);
  assert.equal(value.base.margin.top.value, 0);
  assert.deepEqual(linked.base.margin.left, { value: -2, unit: 'rem' });
  assert.notEqual(linked.base.margin.left, linked.base.margin.top);
  assert.equal(SPACING_PRESETS.length, 6);
  const preset = applySpacingPreset(value, 16);
  preset.responsive.push({ minWidth: 768, value: applySpacingPreset(createSpacing(), 24).base });
  const responsive = setSpacingSide(preset, 'padding', 'left', { value: 5, unit: '%' }, false, 768);
  assert.match(spacingToCss(responsive, '#card'), /@media \(min-width: 768px\)/);
  assert.match(spacingToCss(responsive), /padding: 24px 24px 24px 5%;/);
  assert.deepEqual(validateSpacing(responsive), []);
  assert.equal(createSpacing().base.padding.top.value, 0);
});

test('negative padding, unknown units, selector injection and breakpoint bounds fail', () => {
  const value = createSpacing();
  assert.throws(
    () => setSpacingSide(value, 'padding', 'top', { value: -1, unit: 'px' }),
    RangeError,
  );
  assert.throws(
    () => setSpacingSide(value, 'margin', 'top', { value: NaN, unit: 'px' }),
    RangeError,
  );
  assert.throws(
    () => setSpacingSide(value, 'margin', 'top', { value: 1, unit: 'px;}' }),
    RangeError,
  );
  assert.throws(
    () => setSpacingSide(value, 'margin', 'top', { value: 1, unit: 'px' }, false, 600),
    RangeError,
  );
  assert.throws(() => applySpacingPreset(value, 7), RangeError);
  assert.throws(() => spacingToCss(value, 'div { color:red }'), SyntaxError);
  for (const widths of [[0], [10001], [768, 640], [640, 640]]) {
    assert.throws(
      () =>
        spacingToCss({
          ...value,
          responsive: widths.map((minWidth) => ({ minWidth, value: value.base })),
        }),
      RangeError,
    );
  }
});

test('controlled linked side editing, presets, responsive rules and unmount', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let value = createSpacing();
  const render = () =>
    root.render(
      React.createElement(SpacingEditor, {
        value,
        onChange: (next) => {
          value = next;
          render();
        },
      }),
    );
  await act(() => render());
  const label = (text) =>
    [...host.querySelectorAll('label')].find((node) => node.textContent === text);
  await act(() => label('Link margin sides').querySelector('input').click());
  const input = label('margin top').querySelector('input');
  await act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(
      input,
      '12',
    );
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  assert.equal(value.base.margin.left.value, 12);
  const button = (text) =>
    [...host.querySelectorAll('button')].find((node) => node.textContent === text);
  await act(() => button('Add breakpoint').click());
  assert.equal(value.responsive[0].minWidth, 640);
  await act(() => button('8px preset').click());
  assert.equal(value.responsive[0].value.padding.top.value, 8);
  assert.equal(value.base.padding.top.value, 0);
  await act(() => button('Remove breakpoint').click());
  assert.equal(value.responsive.length, 0);
  await act(() => root.unmount());
  host.remove();
});
