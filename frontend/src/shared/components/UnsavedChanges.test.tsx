// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { createMemoryRouter,Link,Outlet,RouterProvider } from 'react-router-dom';
import { confirmDiscard,UnsavedChanges,UnsavedNavigation } from './UnsavedChanges';

function Form({name}:{name:string}){
  const [value,setValue]=useState('');
  return <><UnsavedChanges dirty={!!value}/><label>{name}<input value={value} onChange={(e)=>setValue(e.target.value)}/></label></>;
}
function start(){
  // Router navigation creates a Node Request; jsdom's AbortSignal is from another realm.
  vi.stubGlobal('Request',class extends Request {
    constructor(input:RequestInfo|URL,init?:RequestInit){super(input,{...init,signal:undefined});}
  });
  const router=createMemoryRouter([{element:<><UnsavedNavigation/><Link to="/destino">Salir</Link><Outlet/></>,children:[
    {path:'/',element:<><Form name="Horario"/><Form name="Bloqueo"/></>},
    {path:'/destino',element:<h1>Destino</h1>}
  ]}]);
  render(<RouterProvider router={router}/>);
}
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('cambios sin guardar con varias formas abiertas',()=>{
  it('conserva ambas formas al cancelar y pide una sola confirmación al salir',async()=>{
    const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);
    start();
    fireEvent.change(screen.getByLabelText('Horario'),{target:{value:'08:00'}});
    fireEvent.change(screen.getByLabelText('Bloqueo'),{target:{value:'Descanso'}});
    fireEvent.click(screen.getByText('Salir'));
    await waitFor(()=>expect(confirm).toHaveBeenCalledTimes(1));
    expect((screen.getByLabelText('Horario') as HTMLInputElement).value).toBe('08:00');
    expect((screen.getByLabelText('Bloqueo') as HTMLInputElement).value).toBe('Descanso');
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText('Salir'));
    await screen.findByRole('heading',{name:'Destino'});
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(confirmDiscard()).toBe(true);
  });
  it('protege la recarga y retira la protección al restaurar los campos',()=>{
    start();
    fireEvent.change(screen.getByLabelText('Bloqueo'),{target:{value:'Descanso'}});
    const dirtyEvent=new Event('beforeunload',{cancelable:true});
    window.dispatchEvent(dirtyEvent);expect(dirtyEvent.defaultPrevented).toBe(true);
    fireEvent.change(screen.getByLabelText('Bloqueo'),{target:{value:''}});
    const cleanEvent=new Event('beforeunload',{cancelable:true});
    window.dispatchEvent(cleanEvent);expect(cleanEvent.defaultPrevented).toBe(false);
    expect(confirmDiscard()).toBe(true);
  });
});
