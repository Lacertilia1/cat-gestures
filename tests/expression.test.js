import test from 'node:test';
import assert from 'node:assert/strict';
import { isMouthOpen } from '../src/expression.js';
test('mouth condition requires a visible face with open jaw', () => {
  const result = score => ({faceBlendshapes:[{categories:[{categoryName:'jawOpen',score}]}]});
  assert.equal(isMouthOpen(result(.5)),true);
  assert.equal(isMouthOpen(result(.1)),false);
  assert.equal(isMouthOpen(null),false);
});
