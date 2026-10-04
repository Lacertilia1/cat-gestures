import test from 'node:test';
import assert from 'node:assert/strict';
import { HandMotion } from '../src/motion.js';
function result(gap, side='Left') {
  const p=Array.from({length:21},()=>({x:.5,y:.6,z:0}));
  p[0]={x:.5,y:.8,z:0};
  for (const i of [5,9,13,17]) { p[i]={x:.5,y:.6,z:0}; p[i+1]={x:.58,y:.6,z:0}; p[i+3]={x:.51,y:.61,z:0}; }
  p[8]={x:.7,y:.6,z:0}; p[4]={x:.7-gap*.2,y:.6,z:0};
  return {landmarks:[p],handedness:[[{categoryName:side}]]};
}
test('open then closed fingers trigger pinch on either hand',()=>{
  for (const side of ['Left','Right']) {
    const m=new HandMotion();
    assert.equal(m.update(result(1,side),0,1),null);
    assert.equal(m.update(result(1,side),60,1),null);
    assert.equal(m.update(result(.2,side),120,1),null);
    assert.equal(m.update(result(.2,side),180,1),'PINCH');
    for(let t=240;t<=1380;t+=60) m.update(result(.2,side),t,1);
    assert.equal(m.update(result(.2,side),1440,1),null);
  }
});
test('closed fingers alone and interrupted tracking do not trigger',()=>{
  const m=new HandMotion();
  for(let t=0;t<300;t+=60) assert.equal(m.update(result(.2),t,1),null);
  m.reset(); m.update(result(1),0,1); m.update(result(1),60,1); m.update({},100,1);
  m.update(result(.2),120,1); assert.equal(m.update(result(.2),180,1),null);
});

test('fingers do not need to touch, but must noticeably converge',()=>{
  const m=new HandMotion();
  m.update(result(1),0,1); m.update(result(1),60,1);
  assert.equal(m.update(result(.7),120,1),null);
  m.update(result(.4),180,1);
  assert.equal(m.update(result(.4),240,1),'PINCH');
});
