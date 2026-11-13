import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isGoldCertified } from '../skills/decisio-integrate/assets/gold-certified.mjs';

test('accepts the documented top-level gold fields and a certificate id', () => {
  assert.equal(isGoldCertified({ certified: true, certificate: 'queue#example', certificate_kind: 'gold' }), true);
});

test('agreement, unknown and missing kinds never satisfy gold-only routing', () => {
  for (const kind of ['agreement', 'unknown', undefined]) assert.equal(isGoldCertified({ certified: true, certificate: 'queue#example', certificate_kind: kind }), false);
});

test('registration objects and truthy strings are not certified answers', () => {
  assert.equal(isGoldCertified({ certified: true, certificate: { certificate_kind: 'gold' } }), false);
  assert.equal(isGoldCertified({ certified: 'true', certificate: 'queue#example', certificate_kind: 'gold' }), false);
  assert.equal(isGoldCertified({ certified: true, certificate: '', certificate_kind: 'gold' }), false);
});
