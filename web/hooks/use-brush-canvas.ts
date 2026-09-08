'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULTS, WIDTH, HEIGHT, demoStrokes, distance, renderStroke, type Brush, type Settings, type Stroke, type Point } from '@/lib/brush-engine';

export function useBrushCanvas() {
  const [brush,setBrush]=useState<Brush>('subway'),[settings,setSettings]=useState<Settings>(DEFAULTS);
  const [strokes,setStrokes]=useState<Stroke[]>(()=>demoStrokes('subway',DEFAULTS,12));
  const [past,setPast]=useState<Stroke[][]>([]),[future,setFuture]=useState<Stroke[][]>([]);
  const [playing,setPlaying]=useState(true),[grid,setGrid]=useState(true),[zoom,setZoom]=useState(1);
  const [mode,setMode]=useState<'draw'|'pan'>('draw'),[notice,setNotice]=useState('');
  const [position,setPosition]=useState({x:0,y:0}),[demo,setDemo]=useState(false);
  const canvas=useRef<HTMLCanvasElement>(null),container=useRef<HTMLDivElement>(null);
  const active=useRef<Stroke|null>(null),pan=useRef({x:0,y:0}),panStart=useRef<Point|null>(null),dirty=useRef(true),fit=useRef({scale:1,x:0,y:0});
  const state=useRef({strokes,brush,settings,playing,grid,zoom,mode,demo});state.current={strokes,brush,settings,playing,grid,zoom,mode,demo};
  const demoClock=useRef(0),pointer=useRef<number|null>(null);
  const commit=useCallback((next:Stroke[])=>{setPast(p=>[...p.slice(-29),state.current.strokes]);setStrokes(next);setFuture([]);dirty.current=true;},[]);
  const undo=useCallback(()=>{if(!past.length)return;setFuture(f=>[strokes,...f]);setStrokes(past[past.length-1]);setPast(p=>p.slice(0,-1));setDemo(false);dirty.current=true;},[past,strokes]);
  const redo=useCallback(()=>{if(!future.length)return;setPast(p=>[...p,strokes]);setStrokes(future[0]);setFuture(f=>f.slice(1));setDemo(false);dirty.current=true;},[future,strokes]);
  const resetView=useCallback(()=>{pan.current={x:0,y:0};setZoom(1);dirty.current=true;},[]);
  const compose=(animate=true)=>{commit(demoStrokes(brush,settings,Math.floor(Math.random()*10000)+1));demoClock.current=0;setDemo(animate);if(animate)setPlaying(true);resetView();};
  const clear=()=>{commit([]);setDemo(false);setNotice('Canvas cleared · Undo to restore');};
  const update=(key:keyof Settings,value:number|boolean)=>setSettings(s=>({...s,[key]:value}));
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),2800);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{dirty.current=true;},[strokes,grid,zoom,settings,demo]);
  useEffect(()=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)setPlaying(false);},[]);
  useEffect(()=>{
    const element=canvas.current,host=container.current;if(!element||!host)return;
    const c=element.getContext('2d',{alpha:false});if(!c){setNotice('This browser could not start the drawing canvas.');return;}
    const cache=document.createElement('canvas'),cc=cache.getContext('2d',{alpha:false})!;
    let w=0,h=0,dpr=1,frame=0,last=0,time=0,figureTick=-1;
    const resize=()=>{const r=host.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,2);element.width=cache.width=Math.round(w*dpr);element.height=cache.height=Math.round(h*dpr);dirty.current=true;};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    const tick=(now:number)=>{
      const s=state.current,dt=Math.min((now-last)/1000,.05);last=now;
      if(s.playing&&!document.hidden){time+=dt;if(s.demo){demoClock.current+=dt;dirty.current=true;if(demoClock.current>6.5)setDemo(false);}}
      const scale=Math.min(w/WIDTH,h/HEIGHT)*s.zoom,x=(w-WIDTH*scale)/2+pan.current.x,y=(h-HEIGHT*scale)/2+pan.current.y;fit.current={scale,x,y};
      const tickN=Math.floor(time*12);if(s.strokes.some(st=>st.brush==='figures')&&tickN!==figureTick){dirty.current=true;figureTick=tickN;}
      if(dirty.current||active.current){
        cc.setTransform(dpr,0,0,dpr,0,0);cc.fillStyle='#fdfefb';cc.fillRect(0,0,w,h);cc.save();cc.translate(x,y);cc.scale(scale,scale);
        if(s.grid){cc.fillStyle='#d4ded5';for(let gx=0;gx<=WIDTH;gx+=22)for(let gy=0;gy<=HEIGHT;gy+=22){cc.beginPath();cc.arc(gx,gy,.65,0,Math.PI*2);cc.fill();}}
        s.strokes.forEach((stroke,i)=>{if(s.demo){const p=Math.max(0,Math.min(1,(demoClock.current-i*.55)/2.6));if(p>0)renderStroke(cc,{...stroke,points:stroke.points.slice(0,Math.max(1,Math.ceil(stroke.points.length*p)))},time);}else renderStroke(cc,stroke,time);});
        if(active.current)renderStroke(cc,active.current,time);cc.restore();dirty.current=false;
      }
      c.setTransform(1,0,0,1,0,0);c.drawImage(cache,0,0);
      if(!s.demo){c.setTransform(dpr*scale,0,0,dpr*scale,dpr*x,dpr*y);s.strokes.filter(st=>st.brush==='subway').forEach(st=>{
        if(st.points.length<3)return;const progress=(time*.035+st.seed*.127)%1,idx=Math.floor(progress*(st.points.length-1)),a=st.points[idx],b=st.points[Math.min(idx+1,st.points.length-1)],t=progress*(st.points.length-1)-idx,px=a.x+(b.x-a.x)*t,py=a.y+(b.y-a.y)*t;
        c.beginPath();c.arc(px,py,5,0,Math.PI*2);c.fillStyle='#fff';c.fill();c.strokeStyle='#2c5d49';c.lineWidth=1.3;c.stroke();c.beginPath();c.arc(px,py,2,0,Math.PI*2);c.fillStyle='#2c5d49';c.fill();
      });}frame=requestAnimationFrame(tick);
    };frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[]);
  const toPoint=(e:{clientX:number;clientY:number;pressure?:number})=>{const r=canvas.current!.getBoundingClientRect(),{x,y,scale}=fit.current;return{x:(e.clientX-r.left-x)/scale,y:(e.clientY-r.top-y)/scale,pressure:e.pressure||.5};};
  const onPointerDown=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(e.button!==0||pointer.current!==null)return;pointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);setDemo(false);if(mode==='pan'){panStart.current={x:e.clientX-pan.current.x,y:e.clientY-pan.current.y};return;}active.current={id:Date.now(),brush,settings:{...settings},seed:Math.floor(Math.random()*10000),points:[toPoint(e)]};dirty.current=true;};
  const onPointerMove=(e:React.PointerEvent<HTMLCanvasElement>)=>{const p=toPoint(e);setPosition({x:Math.round(p.x),y:Math.round(p.y)});if(pointer.current!==e.pointerId)return;if(panStart.current){pan.current={x:e.clientX-panStart.current.x,y:e.clientY-panStart.current.y};dirty.current=true;return;}if(!active.current)return;const events=e.nativeEvent.getCoalescedEvents?.()||[e.nativeEvent];for(const ev of events.length?events:[e.nativeEvent]){const pt=toPoint(ev),pts=active.current.points;if(distance(pts[pts.length-1],pt)>2&&pts.length<5000)pts.push(pt);}dirty.current=true;};
  const onPointerUp=(e:React.PointerEvent<HTMLCanvasElement>)=>{if(pointer.current!==e.pointerId)return;if(active.current){commit([...state.current.strokes,active.current]);active.current=null;}panStart.current=null;pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);dirty.current=true;};
  const exportImage=()=>{try{const out=document.createElement('canvas');out.width=2400;out.height=1968;const c=out.getContext('2d')!;c.fillStyle='#fdfefb';c.fillRect(0,0,out.width,out.height);c.scale(2.4,2.4);strokes.forEach(s=>renderStroke(c,s));out.toBlob(blob=>{if(!blob){setNotice('Export failed. Please try again.');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`brush-atlas-${new Date().toISOString().slice(0,10)}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('Drawing exported · 2400 × 1968 PNG');});}catch{setNotice('Export failed. Please try again.');}};
  useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,button,[role="slider"],select,textarea'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}if(e.code==='Space'){e.preventDefault();setPlaying(p=>!p);}if(e.key==='b')setMode('draw');if(e.key==='h')setMode('pan');if(e.key==='0')resetView();if(['1','2','3'].includes(e.key))setBrush((['subway','figures','gunpla'] as Brush[])[Number(e.key)-1]);};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[undo,redo,resetView]);
  return {brush,setBrush,settings,setSettings,strokes,playing,setPlaying,grid,setGrid,zoom,setZoom,mode,setMode,notice,setNotice,position,demo,canvas,container,undo,redo,canUndo:past.length>0,canRedo:future.length>0,resetView,compose,clear,update,exportImage,onPointerDown,onPointerMove,onPointerUp};
}
