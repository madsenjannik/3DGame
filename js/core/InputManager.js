// @ts-nocheck
export class InputManager {
  move = { x:0, y:0 };
  actionPressed = false;
  hopPressed = false;
  strikePressed = false;   // R76: desktop left click on the game view
  moved = false;
  runIntent = false;
  moveMagnitude = 0;

  constructor({ joy, knob, actionButton }) {
    this.keys = Object.create(null);
    this.joy = joy; this.knob = knob; this.actionButton = actionButton;
    this.isTouch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);
    if (this.isTouch) document.body.classList.add('touch');
    this.joyPointer = null; this.joyCenter = {x:0,y:0}; this.JR=54;
    this.lookPointer = null; this.lookLast = {x:0,y:0}; this.lookStart = {x:0,y:0,t:0};
    this.lookAccum = {x:0,y:0}; this.lookGesture = 'pending';

    addEventListener('keydown', e=>{
      this.keys[e.code]=true;
      if(e.code==='Space'){if(!e.repeat)this.hopPressed=true;e.preventDefault();}
      else if(['KeyE','Enter'].includes(e.code)){if(!e.repeat)this.actionPressed=true;e.preventDefault();}
    });
    addEventListener('keyup', e=>{this.keys[e.code]=false;});
    addEventListener('blur', ()=>{for(const k in this.keys)this.keys[k]=false;this.hopPressed=false;this.actionPressed=false;this.resetTouchPointers();});
    actionButton.addEventListener('pointerdown', e=>{e.stopPropagation();e.preventDefault();this.actionPressed=true;});
    // R75: visible Hop button on phones (the swipe-up gesture still works)
    document.getElementById('hop-btn')?.addEventListener('pointerdown', e=>{e.stopPropagation();e.preventDefault();this.hopPressed=true;});
    addEventListener('pointerdown', e=>this.onPointerDown(e));
    addEventListener('pointermove', e=>this.onPointerMove(e));
    addEventListener('pointerup', e=>this.endPointer(e));
    addEventListener('pointercancel', e=>this.endPointer(e));
    document.addEventListener('gesturestart', e=>e.preventDefault());
  }

  isUiTarget(target){
    return !!target?.closest?.('button,[role="button"],input,select,textarea,a,.gear-panel,.fishing-ui,.stable-talk,.stable-race-ui,.choice-panel');
  }
  movementZone(e){return this.isTouch&&e.clientX<innerWidth*.48&&!this.isUiTarget(e.target);}
  lookZone(e){return this.isTouch&&e.clientX>=innerWidth*.42&&!this.isUiTarget(e.target);}
  placeFloatingJoy(e){
    const size=this.joy.offsetWidth||124;
    const x=Math.max(size*.5+12,Math.min(innerWidth*.46-size*.5-8,e.clientX));
    const y=Math.max(size*.5+12,Math.min(innerHeight-size*.5-16,e.clientY));
    this.joyCenter.x=x;this.joyCenter.y=y;
    this.joy.style.left=`${x-size/2}px`;this.joy.style.top=`${y-size/2}px`;
    this.joy.style.right='auto';this.joy.style.bottom='auto';this.joy.classList.add('active');
    this.knob.style.transition='none';this.knob.style.transform='translate(0,0)';
  }
  onPointerDown(e){
    if(document.body.classList.contains('mobile-bag-open'))return;
    if(e.target===this.actionButton||this.actionButton.contains(e.target))return;
    if(!this.isTouch&&e.pointerType==='mouse'&&e.button===0&&e.target?.tagName==='CANVAS'&&!this.isUiTarget(e.target))this.strikePressed=true;   // R76: left click = Strike (never interact)
    if(this.joyPointer===null&&this.movementZone(e)){
      this.joyPointer=e.pointerId;this.placeFloatingJoy(e);this.move.x=this.move.y=0;return;
    }
    if(this.lookPointer===null&&this.lookZone(e)){
      this.lookPointer=e.pointerId;this.lookLast.x=e.clientX;this.lookLast.y=e.clientY;
      this.lookStart={x:e.clientX,y:e.clientY,t:performance.now()};this.lookGesture='pending';
    }
  }
  moveJoy(e){
    let dx=e.clientX-this.joyCenter.x,dy=e.clientY-this.joyCenter.y;
    const l=Math.hypot(dx,dy);if(l>this.JR){dx*=this.JR/l;dy*=this.JR/l;}
    this.knob.style.transform=`translate(${dx}px,${dy}px)`;
    const jx=dx/this.JR,jy=-dy/this.JR,jl=Math.hypot(jx,jy);
    if(jl>.10){const s=Math.min(1,(jl-.10)/.82)/jl;this.move.x=jx*s;this.move.y=jy*s;}
    else{this.move.x=0;this.move.y=0;}
  }
  moveLook(e){
    const totalX=e.clientX-this.lookStart.x,totalY=e.clientY-this.lookStart.y,elapsed=performance.now()-this.lookStart.t;
    if(this.lookGesture==='pending'){
      const dist=Math.hypot(totalX,totalY);if(dist<10)return;
      const upwardCandidate=totalY<0&&Math.abs(totalX)<34&&Math.abs(totalY)>Math.abs(totalX)*1.55;
      if(upwardCandidate&&elapsed<260){
        if(totalY<-42){this.lookGesture='jump';this.hopPressed=true;}
        return;
      }
      this.lookGesture='camera';
    }
    if(this.lookGesture!=='camera')return;
    const dx=e.clientX-this.lookLast.x,dy=e.clientY-this.lookLast.y;
    this.lookLast.x=e.clientX;this.lookLast.y=e.clientY;
    this.lookAccum.x+=dx;this.lookAccum.y+=dy;
  }
  onPointerMove(e){
    if(e.pointerId===this.joyPointer)this.moveJoy(e);
    else if(e.pointerId===this.lookPointer)this.moveLook(e);
  }
  endPointer(e){
    if(e.pointerId===this.joyPointer){
      this.joyPointer=null;this.move.x=this.move.y=0;
      this.knob.style.transition='transform .14s ease-out';this.knob.style.transform='translate(0,0)';
      this.joy.classList.remove('active');
    }
    if(e.pointerId===this.lookPointer){
      const elapsed=performance.now()-this.lookStart.t;
      const totalY=e.clientY-this.lookStart.y,totalX=e.clientX-this.lookStart.x;
      if(this.lookGesture==='pending'&&totalY<-34&&Math.abs(totalX)<30&&elapsed<250)this.hopPressed=true;
      this.lookPointer=null;this.lookGesture='pending';
    }
  }
  resetTouchPointers(){
    this.joyPointer=null;this.lookPointer=null;this.move.x=this.move.y=0;this.lookAccum.x=this.lookAccum.y=0;
    this.joy?.classList.remove('active');if(this.knob)this.knob.style.transform='translate(0,0)';
  }
  consumeLook(){const v={x:this.lookAccum.x,y:this.lookAccum.y};this.lookAccum.x=0;this.lookAccum.y=0;return v;}

  update() {
    if(document.body.classList.contains('mobile-bag-open')){
      this.frameMove={x:0,y:0};this.moveMagnitude=0;this.runIntent=false;this.move.x=this.move.y=0;
      this.actionPressed=false;this.hopPressed=false;this.strikePressed=false;return;
    }
    let x=(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0);
    let y=(this.keys.KeyW||this.keys.ArrowUp?1:0)-(this.keys.KeyS||this.keys.ArrowDown?1:0);
    const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}
    if(this.joyPointer!==null){x=this.move.x;y=this.move.y;}
    this.moveMagnitude=Math.min(1,Math.hypot(x,y));
    this.runIntent=this.isTouch?this.moveMagnitude>.76:!!(this.keys.ShiftLeft||this.keys.ShiftRight);
    if(this.moveMagnitude>.05)this.moved=true;
    this.frameMove={x,y};
  }

  consumeAction(){const v=this.actionPressed;this.actionPressed=false;return v;}
  consumeStrike(){const v=this.strikePressed;this.strikePressed=false;return v;}
  consumeHop(){const v=this.hopPressed;this.hopPressed=false;return v;}
}
