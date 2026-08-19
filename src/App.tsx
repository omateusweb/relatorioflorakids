import {useMemo,useState} from 'react';
import {NavLink,Route,Routes,useLocation} from 'react-router-dom';
import {Activity,BarChart3,Clock3,LayoutDashboard,LogOut,Menu,MousePointerClick,Package,Radio,Settings,ShoppingBag,Tag,Users,X} from 'lucide-react';
import {FinancialDashboard} from './FinancialDashboard';
import {DimensionPage,MarketingOverview,TrackedSales,TrackingDiagnostics,TrackingSessions} from './MarketingDashboard';
import {AuthGate} from './Auth';
import {supabase} from './lib/supabase';
import {ProductsPage} from './ProductsPage';

const groups=[
 {label:'Principal',items:[['/','Dashboard',LayoutDashboard],['/produtos','Produtos',Package],['/historico','Histórico',Clock3]]},
 {label:'Marketing',items:[['/marketing','Visão geral',BarChart3],['/marketing/canais','Canais',Users],['/marketing/campanhas','Campanhas',Tag],['/marketing/criativos','Criativos',MousePointerClick],['/marketing/vendas','Vendas rastreadas',ShoppingBag]]},
 {label:'Tracking',items:[['/tracking/sessoes','Sessões',Radio],['/tracking/diagnostico','Diagnóstico',Activity]]}
];

function Shell({email}:{email:string}){
 const [open,setOpen]=useState(false);
 const location=useLocation();
 const title=useMemo(()=>groups.flatMap(group=>group.items).find(item=>item[0]===location.pathname)?.[1]||'EcomReports',[location]);
 return <div className="app">
  <aside className={open?'open':''}>
   <div className="brand"><img className="brand-logo" src="/flora-kids-logo.png" alt="Flora Kids"/><span><small>EcomReports</small><b>Painel de performance</b></span><button onClick={()=>setOpen(false)} aria-label="Fechar menu"><X/></button></div>
   <nav>{groups.map(group=><div className="nav-group" key={group.label}><label>{group.label}</label>{group.items.map(([to,name,Icon])=><NavLink end={to==='/'} to={to as string} key={to as string} onClick={()=>setOpen(false)}><Icon/><span>{name as string}</span></NavLink>)}</div>)}</nav>
   <div className="sidebar-bottom"><NavLink to="/configuracoes"><Settings/>Configurações</NavLink><div className="user"><img src="/flora-kids-mark.png" alt=""/><span><b>Flora Kids</b><small title={email}>{email}</small></span><button className="logout" onClick={()=>supabase!.auth.signOut()} title="Sair"><LogOut/></button></div></div>
  </aside>
  <main><div className="mobile-head"><button onClick={()=>setOpen(true)} aria-label="Abrir menu"><Menu/></button><b>{title as string}</b><img src="/flora-kids-mark.png" alt=""/></div><div className="content"><Routes>
   <Route path="/" element={<FinancialDashboard/>}/>
   <Route path="/historico" element={<FinancialDashboard/>}/>
   <Route path="/produtos" element={<ProductsPage/>}/>
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

export function App(){return <AuthGate>{email=><Shell email={email}/>}</AuthGate>}
