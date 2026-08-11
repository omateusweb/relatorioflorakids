import {useMemo,useState} from 'react';
import {NavLink,Route,Routes,useLocation} from 'react-router-dom';
import {Activity,BarChart3,Clock3,LayoutDashboard,Menu,MousePointerClick,Radio,Settings,ShoppingBag,Tag,Users,X} from 'lucide-react';
import {FinancialDashboard} from './FinancialDashboard';
import {DimensionPage,MarketingOverview,TrackedSales,TrackingDiagnostics,TrackingSessions} from './MarketingDashboard';

const groups=[
 {label:'Principal',items:[['/','Dashboard',LayoutDashboard],['/historico','Histórico',Clock3]]},
 {label:'Marketing',items:[['/marketing','Visão geral',BarChart3],['/marketing/canais','Canais',Users],['/marketing/campanhas','Campanhas',Tag],['/marketing/criativos','Criativos',MousePointerClick],['/marketing/vendas','Vendas rastreadas',ShoppingBag]]},
 {label:'Tracking',items:[['/tracking/sessoes','Sessões',Radio],['/tracking/diagnostico','Diagnóstico',Activity]]}
];

function Shell(){
 const [open,setOpen]=useState(false);
 const location=useLocation();
 const title=useMemo(()=>groups.flatMap(group=>group.items).find(item=>item[0]===location.pathname)?.[1]||'EcomReports',[location]);
 return <div className="app">
  <aside className={open?'open':''}>
   <div className="brand"><div>F</div><span><b>EcomReports</b><small>Flora Kids</small></span><button onClick={()=>setOpen(false)}><X/></button></div>
   <nav>{groups.map(group=><div className="nav-group" key={group.label}><label>{group.label}</label>{group.items.map(([to,name,Icon])=><NavLink end={to==='/'} to={to as string} key={to as string} onClick={()=>setOpen(false)}><Icon/><span>{name as string}</span></NavLink>)}</div>)}</nav>
   <div className="sidebar-bottom"><NavLink to="/configuracoes"><Settings/>Configurações</NavLink><div className="user"><div>FK</div><span><b>Flora Kids</b><small>Administrador</small></span></div></div>
  </aside>
  <main><div className="mobile-head"><button onClick={()=>setOpen(true)}><Menu/></button><b>{title as string}</b><span/></div><div className="content"><Routes>
   <Route path="/" element={<FinancialDashboard/>}/>
   <Route path="/historico" element={<FinancialDashboard/>}/>
   <Route path="/marketing" element={<MarketingOverview/>}/>
   <Route path="/marketing/canais" element={<DimensionPage kind="channels"/>}/>
   <Route path="/marketing/campanhas" element={<DimensionPage kind="campaigns"/>}/>
   <Route path="/marketing/criativos" element={<DimensionPage kind="creatives"/>}/>
   <Route path="/marketing/vendas" element={<TrackedSales/>}/>
   <Route path="/tracking/sessoes" element={<TrackingSessions/>}/>
   <Route path="/tracking/diagnostico" element={<TrackingDiagnostics/>}/>
   <Route path="*" element={<TrackingDiagnostics/>}/>
  </Routes></div></main>
  {open&&<button className="scrim" onClick={()=>setOpen(false)}/>}
 </div>;
}

export function App(){return <Shell/>}
