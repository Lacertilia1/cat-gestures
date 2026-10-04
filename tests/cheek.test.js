import test from 'node:test';
import assert from 'node:assert/strict';
import { detectCheekGesture } from '../src/cheek.js';
function fixture(x) {
  const face=Array.from({length:478},()=>({x:.5,y:.4}));
  face[234]={x:.35,y:.45};face[454]={x:.65,y:.45};
  const hand=Array.from({length:21},()=>({x,y:.65}));
  for(const i of [5,9,13,17]){hand[i]={x,y:.65};hand[i+1]={x,y:.55};hand[i+3]={x,y:.64};}
  hand[8]={x,y:.45};
  return [{landmarks:[hand]},{faceLandmarks:[face]}];
}
test('finger at cheek no longer triggers a reaction',()=>{
  const [hands,face]=fixture(.35);
  assert.equal(detectCheekGesture(hands,face,1,false),null);
  assert.equal(detectCheekGesture(hands,face,1,true),null);
  const [right,f]=fixture(.65);
  assert.equal(detectCheekGesture(right,f,1,false),null);
  assert.equal(detectCheekGesture(right,f,1,true),null);
  assert.equal(detectCheekGesture(hands,null),null);
  hands.landmarks[0][8]={x:.1,y:.1};
  assert.equal(detectCheekGesture(hands,face,1),null);
});

test('shush detects an upright index at the lips from either hand',()=>{
  for(const x of [.49,.51]) {
    const [hands,f]=fixture(x);
    f.faceLandmarks[0][13]={x:.5,y:.5};f.faceLandmarks[0][14]={x:.5,y:.52};
    hands.landmarks[0][8]={x,y:.51};
    assert.equal(detectCheekGesture(hands,f,1,false),'SHUSH');
    assert.equal(detectCheekGesture(hands,f,1,true),'SHUSH');
    hands.landmarks[0][8]={x:.1,y:.51};
    assert.notEqual(detectCheekGesture(hands,f,1,false),'SHUSH');
  }
});
