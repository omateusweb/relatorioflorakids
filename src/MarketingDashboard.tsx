import {useCallback,useEffect,useMemo,useState} from 'react';
import {Activity,BarChart3,CalendarDays,ChevronDown,Download,PackageOpen,Radio,RefreshCw,Search,ShoppingBag} from 'lucide-react';
import {apiFetch} from './lib/api';

type DimensionRow={name:string;sessions:number;orders:number;revenue:number;conversion:number;share:number};
type Sale={id:string;date:string;order:string;channel:string;campaign:string;creative:string;revenue:number;status:string;attributed:boolean;hasUtm:boolean};
type Session={id:string;date:string;session:string;channel:string;source:string;medium:string;campaign:string;creative:string;landing:string;events:number;status:string};
type Diagnostic={ok:boolean;warning?:boolean;detail:string};
type Analytics={range:{from:string;to:string};summary:{attributedRevenue:number;attributedOrders:number;totalOrders:number;sessions:number;conversion:number;ticket:number;coverage:number;utmValid:number;noCampaign:number;noSession:number};dimensions:{channels:DimensionRow[];campaigns:DimensionRow[];creatives:DimensionRow[]};sales:Sale[];sessions:Session[];diagnostics:{database:Diagnostic;capture:Diagnostic;webhook:Diagnostic;integration:Diagnostic};syncedAt:string};

const money=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const iso=(date:Date)=>{const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');return `${y}-${m}-${d}`};
const initialRange=()=>{const to=new Date(),from=new Date(to);from.setDate(to.getDate()-29);return{from:iso(from),to:iso(to)}};
const shortDate=(value:string)=>new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).replace('.','');
const percentage=(value:number)=>`${value.toFixed(1).replace('.',',')}%`;

function useAnalytics(){
 const initial=initialRange();
 const [from,setFrom]=useState(initial.from),[to,setTo]=useState(initial.to),[data,setData]=useState<Analytics|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const response=await apiFetch(`/api/analytics?from=${from}&to=${to}`);const body=await response.json();if(!response.ok)throw new Error(body.error);setData(body)}catch{setError('Não foi possível carregar os dados reais de tracking.')}finally{setLoading(false)}},[from,to]);
 useEffect(()=>{load();const timer=window.setInterval(load,60000);return()=>window.clearInterval(timer)},[load]);
 const preset=(days:number)=>{const end=new Date(),start=new Date(end);start.setDate(end.getDate()-(days-1));setFrom(iso(start));setTo(iso(end))};
 return{from,to,setFrom,setTo,data,loading,error,load,preset};
}

function Header({section='Marketing',title,copy,updated,loading,onRefresh,action}:{section?:string;title:string;copy:string;updated?:string;loading:boolean;onRefresh:()=>void;action?:React.ReactNode}){
 return <header className="page-title"><div><span>{section}</span><h1>{title}</h1><p>{updated?`Atualizado ${new Date(updated).toLocaleString('pt-BR')}`:copy}</p></div><div className="page-actions">{action}<button className="refresh" onClick={onRefresh} disabled={loading}><RefreshCw className={loading?'spin':''}/> Atualizar</button></div></header>;
}
function Filters({from,to,setFrom,setTo,preset}:{from:string;to:string;setFrom:(v:string)=>void;setTo:(v:string)=>void;preset:(days:number)=>void}){
 return <div className="finance-filters analytics-filters"><label><select defaultValue="30" onChange={event=>preset(Number(event.target.value))}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option></select><ChevronDown/></label><label className="date"><CalendarDays/><input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label className="date"><CalendarDays/><input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label></div>;
}
function Metric({label,value,detail,tone='green'}:{label:string;value:string;detail?:string;tone?:string}){return <article className="metric"><div className={`metric-icon ${tone}`}>{tone==='green'?<BarChart3/>:<Activity/>}</div><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</article>}
function State({loading,error,data}:{loading:boolean;error:string;data:Analytics|null}){if(loading&&!data)return <div className="panel empty"><RefreshCw className="spin"/><h3>Sincronizando dados reais…</h3></div>;if(error)return <div className="finance-warning">{error}</div>;return null}
function PanelHead({title}:{title:string}){return <div className="panel-head"><h2>{title}</h2></div>}

function exportSales(rows:Sale[]){
 const quote=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
 const csv=[['Data','Pedido','Canal','Campanha','Criativo','Receita','Status'],...rows.map(x=>[x.date,x.order,x.channel,x.campaign,x.creative,x.revenue,x.status])].map(row=>row.map(quote).join(';')).join('\n');
 const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([`\uFEFF${csv}`],{type:'text/csv;charset=utf-8'}));link.download=`vendas-rastreadas-${iso(new Date())}.csv`;link.click();URL.revokeObjectURL(link.href);
}

function SalesTable({rows,compact=false}:{rows:Sale[];compact?:boolean}){
 const visible=compact?rows.slice(0,6):rows;
 return <section className="panel sales"><PanelHead title={compact?'Vendas recentes':'Pedidos pagos e atribuição'}/>{visible.length===0?<Empty title="Nenhuma venda no período" copy="Quando uma venda paga chegar, ela aparecerá aqui com a origem encontrada."/>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Pedido</th><th>Canal</th><th>Campanha</th><th>Criativo</th><th>Receita</th><th>Status</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td>{shortDate(row.date)}</td><td><b>{row.order}</b></td><td>{row.channel}</td><td>{row.campaign}</td><td>{row.creative}</td><td><b>{money(row.revenue)}</b></td><td><em className={row.attributed?'success':'muted'}>{row.status}</em></td></tr>)}</tbody></table></div>}</section>;
}
function Empty({title,copy}:{title:string;copy:string}){return <div className="empty"><PackageOpen/><h3>{title}</h3><p>{copy}</p></div>}

export function MarketingOverview(){
 const q=useAnalytics(),s=q.data?.summary;
 const max=Math.max(...(q.data?.dimensions.channels.map(x=>x.revenue)||[]),1);
 return <><Header title="Visão geral" copy="Performance e atribuição de vendas em um só lugar." updated={q.data?.syncedAt} loading={q.loading} onRefresh={q.load} action={<button className="primary" onClick={()=>exportSales(q.data?.sales||[])}><Download/> Exportar</button>}/><Filters {...q}/><State {...q}/>{q.data&&<><section className="metrics"><Metric label="Receita atribuída" value={money(s!.attributedRevenue)} detail={`${s!.attributedOrders} de ${s!.totalOrders} vendas`}/><Metric label="Sessões" value={String(s!.sessions)} detail="Capturadas no período" tone="purple"/><Metric label="Conversão rastreada" value={percentage(s!.conversion)} detail="Vendas atribuídas ÷ sessões" tone="orange"/><Metric label="Ticket atribuído" value={money(s!.ticket)} detail="Pedidos com sessão" tone="red"/></section><section className="grid-two"><div className="panel"><PanelHead title="Receita por canal"/><div className="bars">{q.data.dimensions.channels.length?q.data.dimensions.channels.slice(0,6).map(row=><div className="bar" key={row.name}><span>{row.name}</span><i><b style={{width:`${row.revenue/max*100}%`}}/></i><strong>{percentage(row.share)}</strong></div>):<Empty title="Sem receita atribuída" copy="As sessões já estão sendo coletadas; a receita aparece após uma compra associada."/>}</div></div><div className="panel"><PanelHead title="Qualidade do tracking"/><div className="quality"><div><strong>{percentage(s!.coverage)}</strong><span>das vendas com sessão identificada</span></div><ul><li><i className="ok"/>Vendas com UTM <b>{percentage(s!.utmValid)}</b></li><li><i className="warn"/>Sessões sem campanha <b>{percentage(s!.noCampaign)}</b></li><li><i className="bad"/>Vendas sem sessão <b>{percentage(s!.noSession)}</b></li></ul></div></div></section><SalesTable rows={q.data.sales} compact/></>}</>;
}

const dimensionConfig={channels:{title:'Canais',key:'channels' as const,copy:'Compare a origem das sessões e da receita.'},campaigns:{title:'Campanhas',key:'campaigns' as const,copy:'Resultados reais agrupados por utm_campaign.'},creatives:{title:'Criativos',key:'creatives' as const,copy:'Resultados reais agrupados por utm_content.'}};
export function DimensionPage({kind}:{kind:keyof typeof dimensionConfig}){
 const q=useAnalytics(),config=dimensionConfig[kind],rows=q.data?.dimensions[config.key]||[],[search,setSearch]=useState('');
 const filtered=useMemo(()=>rows.filter(x=>x.name.toLowerCase().includes(search.toLowerCase())),[rows,search]);
 const revenue=rows.reduce((sum,x)=>sum+x.revenue,0),orders=rows.reduce((sum,x)=>sum+x.orders,0),sessions=rows.reduce((sum,x)=>sum+x.sessions,0);
 return <><Header title={config.title} copy={config.copy} updated={q.data?.syncedAt} loading={q.loading} onRefresh={q.load}/><Filters {...q}/><State {...q}/>{q.data&&<><section className="metrics"><Metric label="Receita atribuída" value={money(revenue)}/><Metric label="Pedidos atribuídos" value={String(orders)} tone="purple"/><Metric label="Sessões" value={String(sessions)} tone="orange"/><Metric label="Conversão" value={percentage(sessions?orders/sessions*100:0)} tone="red"/></section><section className="panel sales dimension-panel"><div className="panel-head"><h2>Desempenho por {config.title.toLowerCase()}</h2><label className="table-search"><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar…"/></label></div>{filtered.length===0?<Empty title={`Nenhum dado de ${config.title.toLowerCase()}`} copy="Altere o período ou aguarde novas sessões com UTMs."/>:<div className="table-wrap"><table><thead><tr><th>{config.title.slice(0,-1)}</th><th>Sessões</th><th>Pedidos</th><th>Receita</th><th>Conversão</th><th>Participação</th></tr></thead><tbody>{filtered.map(row=><tr key={row.name}><td><b>{row.name}</b></td><td>{row.sessions}</td><td>{row.orders}</td><td><b>{money(row.revenue)}</b></td><td>{percentage(row.conversion)}</td><td>{percentage(row.share)}</td></tr>)}</tbody></table></div>}</section></>}</>;
}

export function TrackedSales(){
 const q=useAnalytics(),s=q.data?.summary;
 return <><Header title="Vendas rastreadas" copy="Pedidos pagos associados à origem de marketing." updated={q.data?.syncedAt} loading={q.loading} onRefresh={q.load} action={<button className="primary" onClick={()=>exportSales(q.data?.sales||[])}><Download/> Exportar CSV</button>}/><Filters {...q}/><State {...q}/>{q.data&&<><section className="metrics"><Metric label="Pedidos pagos" value={String(s!.totalOrders)}/><Metric label="Pedidos atribuídos" value={String(s!.attributedOrders)} tone="purple"/><Metric label="Receita atribuída" value={money(s!.attributedRevenue)} tone="orange"/><Metric label="Cobertura" value={percentage(s!.coverage)} tone="red"/></section><SalesTable rows={q.data.sales}/></>}</>;
}

export function TrackingSessions(){
 const q=useAnalytics();
 return <><Header section="Tracking" title="Sessões" copy="Jornadas reais capturadas na loja." updated={q.data?.syncedAt} loading={q.loading} onRefresh={q.load}/><Filters {...q}/><State {...q}/>{q.data&&<section className="panel sales"><PanelHead title={`${q.data.sessions.length} sessões capturadas`}/>{q.data.sessions.length===0?<Empty title="Nenhuma sessão no período" copy="Altere as datas ou faça uma visita à loja com UTMs."/>:<div className="table-wrap"><table><thead><tr><th>Data</th><th>Sessão</th><th>Canal</th><th>Origem / meio</th><th>Campanha</th><th>Eventos</th><th>Etapa</th></tr></thead><tbody>{q.data.sessions.map(row=><tr key={row.id}><td>{shortDate(row.date)}</td><td><b>{row.session}…</b></td><td>{row.channel}</td><td>{row.source} / {row.medium}</td><td>{row.campaign}</td><td>{row.events}</td><td><em className={row.status==='Comprou'?'success':'muted'}>{row.status}</em></td></tr>)}</tbody></table></div>}</section>}</>;
}

export function TrackingDiagnostics(){
 const q=useAnalytics();
 const statuses=q.data?[['Endpoint de captura',q.data.diagnostics.capture],['Webhook Nuvemshop',q.data.diagnostics.webhook],['Supabase',q.data.diagnostics.database],['Loja conectada',q.data.diagnostics.integration]] as [string,Diagnostic][]:[];
 return <><Header section="Tracking" title="Diagnóstico" copy="Status real da captura e das integrações." updated={q.data?.syncedAt} loading={q.loading} onRefresh={q.load}/><State {...q}/>{q.data&&<><section className="status-grid">{statuses.map(([label,status])=><div className="status" key={label}><i className={status.warning?'bad':status.ok?'ok':'warn'}/><div><strong>{label}</strong><span>{status.detail}</span></div></div>)}</section><section className="panel checklist"><PanelHead title="Fluxo ativo"/><ol><li><b>Visita capturada</b><span>UTMs, identificadores de anúncio e página de entrada entram no Supabase.</span></li><li><b>Compra confirmada</b><span>O evento de compra liga o número do pedido à sessão.</span></li><li><b>Pagamento recebido</b><span>O webhook busca o pedido real e faz a atribuição sem duplicar vendas.</span></li><li><b>Relatórios atualizados</b><span>Estas telas consultam dados reais e atualizam automaticamente a cada minuto.</span></li></ol></section></>}</>;
}
