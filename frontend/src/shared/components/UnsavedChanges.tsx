import { useContext,useEffect,useRef,useSyncExternalStore } from 'react';
import { UNSAFE_DataRouterContext,useBlocker } from 'react-router-dom';
const forms=new Set<symbol>();
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const notify=()=>listeners.forEach((listener)=>listener());
export function confirmDiscard(){return !forms.size || window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?');}
function RouteBlocker({dirty}:{dirty:boolean}){
  const blocker=useBlocker(()=>dirty && forms.size>0);
  useEffect(()=>{if(blocker.state==='blocked'){if(window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'))blocker.proceed();else blocker.reset();}},[blocker]);
  return null;
}
// React Router supports one blocker per router, even when several forms are open.
export function UnsavedNavigation(){
  const router=useContext(UNSAFE_DataRouterContext);
  const dirty=useSyncExternalStore(subscribe,()=>forms.size>0);
  return router ? <RouteBlocker dirty={dirty}/>:null;
}
export function UnsavedChanges({dirty}:{dirty:boolean}){
  const key=useRef(Symbol());
  useEffect(()=>{const id=key.current;if(dirty)forms.add(id);else forms.delete(id);notify();return()=>{forms.delete(id);notify();};},[dirty]);
  useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
  return null;
}
