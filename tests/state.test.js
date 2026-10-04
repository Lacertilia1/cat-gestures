import test from 'node:test';
import assert from 'node:assert/strict';
import { GestureState } from '../src/state.js';
import { detectGesture } from '../src/gestures.js';
test('single bad frame does not switch and release is delayed', () => {
  const s = new GestureState();
  assert.equal(s.update('FIST',0),'DEFAULT');
  s.update('FIST',110); assert.equal(s.update('FIST',230),'FIST');
  assert.equal(s.update('THUMB_UP',250),'FIST');
  assert.equal(s.update('FIST',300),'FIST');
  s.update('DEFAULT',400); s.update('DEFAULT',600);
  assert.equal(s.update('DEFAULT',849),'FIST');
  assert.equal(s.update('DEFAULT',850),'DEFAULT');
});
test('minimum frames and interrupted candidates', () => {
  const s = new GestureState(); s.update('FIST',0);
  assert.equal(s.update('FIST',300),'DEFAULT');
  s.update('DEFAULT',310); s.update('FIST',320); s.update('FIST',400);
  assert.equal(s.update('FIST',550),'FIST');
});
function hand(direction) {
  const p = Array.from({length:21},()=>({x:.5,y:.6,z:0}));
  for (const i of [5,9,13,17]) { p[i]={x:.5,y:.6,z:0}; p[i+1]={x:.5+direction*.08,y:.6,z:0}; p[i+3]={x:.51,y:.61,z:0}; }
  p[8]={x:.5+direction*.25,y:.6,z:0}; return p;
}
test('pointing directions follow mirrored preview', () => {
  assert.equal(detectGesture({landmarks:[hand(1)]}).gesture,'POINT_LEFT');
  assert.equal(detectGesture({landmarks:[hand(-1)]}).gesture,'POINT_RIGHT');
  assert.equal(detectGesture({landmarks:[]}).gesture,'DEFAULT');
});
test('classifier confidence rejects uncertain fist', () => {
  const result = score => ({landmarks:[Array.from({length:21},()=>({x:.5,y:.5,z:0}))],gestures:[[{categoryName:'Closed_Fist',score}]]});
  assert.equal(detectGesture(result(.9)).gesture,'FIST');
  assert.equal(detectGesture(result(.3)).gesture,'DEFAULT');
});
test('both hands are checked and detection order does not change the selected gesture', () => {
  const folded = Array.from({length:21},()=>({x:.5,y:.5,z:0}));
  const fist = [{categoryName:'Closed_Fist',score:.9}];
  const none = [{categoryName:'None',score:.9}];
  assert.equal(detectGesture({landmarks:[folded,folded],gestures:[none,fist]}).gesture,'FIST');
  const result = {landmarks:[folded,hand(1)],gestures:[fist,none]};
  assert.equal(detectGesture(result).gesture,'FIST');
  assert.equal(detectGesture(result,4/3,'FIST').gesture,'FIST');
  assert.equal(detectGesture({landmarks:[hand(1),folded],gestures:[none,fist]},4/3,'FIST').gesture,'FIST');
});

function fistPoints() {
  const p = Array.from({length:21},()=>({x:.5,y:.5,z:0}));
  p[0]={x:.5,y:.8,z:0};
  for (const [n,i] of [5,9,13,17].entries()) {
    const x=.4+n*.06;
    p[i]={x,y:.6,z:0}; p[i+1]={x,y:.45,z:0};
    p[i+2]={x,y:.5,z:.03}; p[i+3]={x,y:.59,z:.03};
  }
  p[4]={x:.42,y:.61,z:.01}; return p;
}
test('geometry detects rotated fists without classifier confirmation', () => {
  const original=fistPoints();
  for (const rotation of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
    const points=original.map(p=>({x:.5+(p.x-.5)*Math.cos(rotation)-(p.y-.5)*Math.sin(rotation),y:.5+(p.x-.5)*Math.sin(rotation)+(p.y-.5)*Math.cos(rotation),z:p.z}));
    assert.equal(detectGesture({landmarks:[points]} ,1).gesture,'FIST');
  }
  const side=original.map(p=>({x:.5+p.z,y:p.y,z:p.x-.5}));
  assert.equal(detectGesture({landmarks:[side]},1).gesture,'FIST');
});
test('extended thumb and open palm are not geometry fists', () => {
  const thumb=fistPoints(); thumb[4]={x:.1,y:.2,z:0};
  assert.equal(detectGesture({landmarks:[thumb]},1).gesture,'DEFAULT');
  const open=fistPoints();
  for (const i of [5,9,13,17]) open[i+3]={x:open[i].x,y:.2,z:0};
  assert.equal(detectGesture({landmarks:[open]},1).gesture,'DEFAULT');
});

function raisedPalm(offset=0) {
  const p=Array.from({length:21},()=>({x:.5+offset,y:.6,z:0}));
  p[0]={x:.5+offset,y:.8,z:0};
  for (const [n,i] of [5,9,13,17].entries()) {
    const x=.4+n*.06+offset;
    p[i]={x,y:.6,z:0}; p[i+1]={x,y:.48,z:0}; p[i+3]={x,y:.3,z:0};
  }
  p[4]={x:.18+offset,y:.58,z:0}; return p;
}
test('meme requires two open palms at any position and rotation',()=>{
  const a=raisedPalm(), b=raisedPalm(.3);
  assert.equal(detectGesture({landmarks:[a,b]},1,'FIST').gesture,'HANDS_UP');
  assert.equal(detectGesture({landmarks:[a]},1).gesture,'DEFAULT');
  assert.notEqual(detectGesture({landmarks:[a,fistPoints()]},1).gesture,'HANDS_UP');
  const down=b.map(p=>({...p,y:1-p.y}));
  assert.equal(detectGesture({landmarks:[a,down]},1).gesture,'HANDS_UP');
  const sideways=b.map(p=>({x:p.y,y:p.x,z:p.z}));
  assert.equal(detectGesture({landmarks:[sideways,a]},1).gesture,'HANDS_UP');
  const moved=a.map(p=>({...p,x:p.x+.1,y:p.y-.2}));
  assert.equal(detectGesture({landmarks:[moved,b]},1).gesture,'HANDS_UP');
});

test('index pointing toward camera triggers, sideways and backwards do not',()=>{
  const p=fistPoints();
  p[5]={x:.4,y:.6,z:0}; p[6]={x:.4,y:.6,z:-.12}; p[8]={x:.4,y:.6,z:-.3};
  assert.equal(detectGesture({landmarks:[p]},1,'DEFAULT',false).gesture,'POINT_CAMERA');
  assert.equal(detectGesture({landmarks:[p]},1,'DEFAULT',true).gesture,'POINT_CAMERA');
  const mirrored=p.map(a=>({...a,x:1-a.x}));
  assert.equal(detectGesture({landmarks:[mirrored]},1,'DEFAULT',true).gesture,'POINT_CAMERA');
  assert.equal(detectGesture({landmarks:[mirrored]},1,'DEFAULT',false).gesture,'POINT_CAMERA');
  const backwards=p.map(a=>({...a,z:-a.z}));
  assert.notEqual(detectGesture({landmarks:[backwards]},1).gesture,'POINT_CAMERA');
  assert.notEqual(detectGesture({landmarks:[hand(1)]},1).gesture,'POINT_CAMERA');
});

test('camera pointing accepts a moderate diagonal angle',()=>{
  const p=fistPoints();
  p[5]={x:.4,y:.6,z:0}; p[6]={x:.46,y:.58,z:-.07}; p[8]={x:.55,y:.55,z:-.17};
  assert.equal(detectGesture({landmarks:[p]},1,'DEFAULT',false).gesture,'POINT_CAMERA');
});

test('shaka uses the left side of the displayed video',()=>{
  const p=fistPoints();
  p[4]={x:.12,y:.5,z:0}; p[18]={x:p[17].x,y:.48,z:0}; p[20]={x:p[17].x,y:.3,z:0};
  assert.equal(detectGesture({landmarks:[p]},1,'DEFAULT',false).gesture,'SHAKA');
  assert.equal(detectGesture({landmarks:[p]},1,'DEFAULT',true).gesture,'SHAKA_RIGHT');
  const mirrored=p.map(a=>({...a,x:1-a.x}));
  assert.equal(detectGesture({landmarks:[mirrored]},1,'DEFAULT',true).gesture,'SHAKA');
  p[4]={x:.42,y:.61,z:.01};
  assert.notEqual(detectGesture({landmarks:[p]},1,'DEFAULT',false).gesture,'SHAKA');
});

test('victory requires two extended fingers or a confident model result',()=>{
  const p=fistPoints();
  for(const i of [5,9]) { p[i+1]={x:p[i].x,y:.48,z:0};p[i+3]={x:p[i].x,y:.28,z:0}; }
  assert.equal(detectGesture({landmarks:[p]},1).gesture,'VICTORY');
  const mirrored=p.map(a=>({...a,x:1-a.x}));
  assert.equal(detectGesture({landmarks:[mirrored]},1).gesture,'VICTORY');
  assert.notEqual(detectGesture({landmarks:[fistPoints()]},1).gesture,'VICTORY');
});

test('upward index triggers on both sides without confusing victory',()=>{
  const p=fistPoints();
  p[6]={x:p[5].x,y:.48,z:0};p[8]={x:p[5].x,y:.28,z:0};
  assert.equal(detectGesture({landmarks:[p]},1).gesture,'POINT_UP');
  assert.equal(detectGesture({landmarks:[p.map(a=>({...a,x:1-a.x}))]},1).gesture,'POINT_UP');
  assert.notEqual(detectGesture({landmarks:[fistPoints()]},1).gesture,'POINT_UP');
});

test('middle finger on either hand is distinct from fist and index up',()=>{
  const p=fistPoints();
  p[10]={x:p[9].x,y:.48,z:0};p[12]={x:p[9].x,y:.25,z:0};
  assert.equal(detectGesture({landmarks:[p]},1).gesture,'MIDDLE_FINGER');
  assert.equal(detectGesture({landmarks:[p.map(a=>({...a,x:1-a.x}))]},1).gesture,'MIDDLE_FINGER');
  assert.notEqual(detectGesture({landmarks:[fistPoints()]},1).gesture,'MIDDLE_FINGER');
});

test('visible fist wins over a different gesture on the other hand',()=>{
  const p=hand(1);
  const result={landmarks:[p,fistPoints()],gestures:[[{categoryName:'None',score:.9}],[{categoryName:'Closed_Fist',score:.5}]]};
  assert.equal(detectGesture(result,1,'POINT_LEFT').gesture,'FIST');
});

test('upward and camera pointing are exclusive even with a mistaken fist classifier',()=>{
  for(const mode of ['up','camera']) {
    const p=fistPoints();
    p[6]=mode==='up'?{x:p[5].x,y:.48,z:0}:{x:p[5].x,y:.6,z:-.12};
    p[8]=mode==='up'?{x:p[5].x,y:.28,z:0}:{x:p[5].x,y:.6,z:-.3};
    const result={landmarks:[p],gestures:[[{categoryName:'Closed_Fist',score:.7}]]};
    assert.equal(detectGesture(result,1).gesture,mode==='up'?'POINT_UP':'POINT_CAMERA');
  }
});

test('folded tips returning toward wrist detect a fist despite straight-looking joints',()=>{
  const p=fistPoints();
  for(const i of [5,9,13,17]) {
    p[i+1]={x:p[i].x,y:.48,z:0};
    p[i+3]={x:p[i].x,y:.7,z:0};
  }
  assert.equal(detectGesture({landmarks:[p]},1).gesture,'FIST');
  const rotated=p.map(a=>({x:a.y,y:1-a.x,z:a.z}));
  assert.equal(detectGesture({landmarks:[rotated]},1).gesture,'FIST');
});

test('wrong Victory model label cannot override index pointing at camera',()=>{
  const p=fistPoints();
  p[6]={x:p[5].x,y:.6,z:-.12};p[8]={x:p[5].x,y:.6,z:-.3};
  const result={landmarks:[p],gestures:[[{categoryName:'Victory',score:.95}]]};
  assert.equal(detectGesture(result,1).gesture,'POINT_CAMERA');
});

test('open mouth allows pointing without aiming at a specific camera position',()=>{
  assert.equal(detectGesture({landmarks:[hand(1)]},1,'DEFAULT',true,true).gesture,'POINT_CAMERA');
  assert.equal(detectGesture({landmarks:[hand(-1)]},1,'DEFAULT',true,true).gesture,'POINT_CAMERA');
});
test('extended pinky and thumb prevent model fist label from overriding shaka',()=>{
  const p=fistPoints();p[4]={x:.12,y:.5,z:0};p[18]={x:p[17].x,y:.48,z:0};p[20]={x:p[17].x,y:.3,z:0};
  const r={landmarks:[p],gestures:[[{categoryName:'Closed_Fist',score:.8}]]};
  assert.equal(detectGesture(r,1,'DEFAULT',false).gesture,'SHAKA');
});
