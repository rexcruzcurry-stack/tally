import React, { useState, useEffect, useMemo } from "react";
import {
  Receipt, FolderPlus, BookOpen, BarChart3, Plus, Trash2, X,
  ArrowDownRight, ArrowUpRight, Store, ChevronRight, RotateCcw, Check, Folder
} from "lucide-react";

/* ----------------------------- constants ----------------------------- */

const EXPENSE_CATEGORIES = [
  "Materials & Supplies","Equipment","Labor & Wages","Rent & Utilities",
  "Transportation & Fuel","Food & Beverage","Marketing & Ads",
  "Professional Services","Permits & Fees","Maintenance & Repairs","Other",
];
const REVENUE_CATEGORIES = [
  "Product Sales","Service Income","Rental Income","Repair Income",
  "Commission","Deposit","Refund","Other",
];
const CURRENCIES = {
  PHP:{code:"PHP",label:"₱ PHP"},USD:{code:"USD",label:"$ USD"},EUR:{code:"EUR",label:"€ EUR"},
  GBP:{code:"GBP",label:"£ GBP"},SGD:{code:"SGD",label:"$ SGD"},AUD:{code:"AUD",label:"$ AUD"},
  JPY:{code:"JPY",label:"¥ JPY"},
};

// Logistics-themed placeholder examples cycled per item row
const ITEM_PLACEHOLDERS = [
  "Corrugated shipping boxes 50-pack",
  "Bubble wrap roll 500m",
  "Pallet wrap / stretch film",
  "Diesel fuel 50L",
  "Freight charges Manila–Cebu",
  "Customs clearance fee",
  "Cargo straps 10pcs",
  "Packing tape 48mm × 100m",
  "Forklift PM service",
  "Warehouse storage fee",
  "Wooden pallets 10pcs",
  "Barcode labels 1000-roll",
];

const K_PROJECTS="finledger_projects", K_ENTRIES="finledger_entries", K_CURRENCY="finledger_currency";

/* ----------------------------- storage ------------------------------- */
const store = {
  async get(k){try{return window.localStorage.getItem(k);}catch(e){return null;}},
  async set(k,v){try{window.localStorage.setItem(k,v);}catch(e){}},
};

/* ----------------------------- helpers ------------------------------- */
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const todayStr=()=>new Date().toISOString().slice(0,10);
const num=v=>{const n=parseFloat(String(v).replace(/,/g,""));return isNaN(n)?0:n;};

const blankItem=(idx=0)=>({
  id:uid(),
  itemName:"",
  costPerUnit:"",
  quantity:"1",
  totalOverride:null,
  placeholder:ITEM_PLACEHOLDERS[idx % ITEM_PLACEHOLDERS.length],
});

/* normalise legacy entries (flat fields) to items-array shape */
const normaliseEntry=e=>{
  if(e.items) return e;
  return {
    ...e,
    items:[{id:uid(),itemName:e.itemName||"",costPerUnit:e.costPerUnit||0,quantity:e.quantity||1,totalCost:e.totalCost||0}],
  };
};

/* =====================================================================
   App
===================================================================== */
export default function App(){
  const [loaded,setLoaded]=useState(false);
  const [projects,setProjects]=useState([]);
  const [entries,setEntries]=useState([]);
  const [currency,setCurrency]=useState("PHP");
  const [tab,setTab]=useState("input");
  const [toast,setToast]=useState(null);

  useEffect(()=>{
    (async()=>{
      const p=await store.get(K_PROJECTS), e=await store.get(K_ENTRIES), c=await store.get(K_CURRENCY);
      if(p)try{setProjects(JSON.parse(p));}catch(x){}
      if(e)try{setEntries(JSON.parse(e).map(normaliseEntry));}catch(x){}
      if(c&&CURRENCIES[c])setCurrency(c);
      setLoaded(true);
    })();
  },[]);

  const saveProjects=next=>{setProjects(next);store.set(K_PROJECTS,JSON.stringify(next));};
  const saveEntries=next=>{setEntries(next);store.set(K_ENTRIES,JSON.stringify(next));};
  const saveCurrency=c=>{setCurrency(c);store.set(K_CURRENCY,c);};

  const fmt=useMemo(()=>{
    const code=CURRENCIES[currency]?.code||"PHP";
    const f=new Intl.NumberFormat(undefined,{style:"currency",currency:code,
      minimumFractionDigits:code==="JPY"?0:2,maximumFractionDigits:code==="JPY"?0:2});
    return n=>f.format(num(n));
  },[currency]);

  const flash=msg=>{setToast(msg);setTimeout(()=>setToast(null),2600);};

  const totalsFor=pid=>{
    let revenue=0,expense=0,count=0;
    for(const e of entries){
      if(e.projectId!==pid)continue; count++;
      if(e.type==="revenue")revenue+=num(e.totalCost);
      else expense+=num(e.totalCost);
    }
    return{revenue,expense,net:revenue-expense,count};
  };
  const grand=useMemo(()=>{
    let revenue=0,expense=0;
    for(const e of entries){
      if(e.type==="revenue")revenue+=num(e.totalCost);
      else expense+=num(e.totalCost);
    }
    return{revenue,expense,net:revenue-expense};
  },[entries]);

  const addProject=(name,description)=>{
    const proj={id:uid(),name:name.trim(),description:description.trim(),createdAt:Date.now()};
    saveProjects([...projects,proj]);
    flash(`Project "${proj.name}" added`);
    return proj.id;
  };
  const deleteProject=pid=>{
    saveProjects(projects.filter(p=>p.id!==pid));
    saveEntries(entries.filter(e=>e.projectId!==pid));
    flash("Project and its receipts removed");
  };

  const addEntry=entry=>{
    saveEntries([{...entry,id:uid(),createdAt:Date.now()},...entries]);
    flash(`${entry.type==="revenue"?"Revenue":"Expense"} receipt saved`);
  };
  const deleteEntry=id=>saveEntries(entries.filter(e=>e.id!==id));

  if(!loaded) return <div className="app"><Styles/><div className="loading">Opening the books…</div></div>;

  return(
    <div className="app">
      <Styles/>
      <header className="topbar">
        <div className="brand">
          <div className="mark"><BookOpen size={20} strokeWidth={2.2}/></div>
          <div>
            <div className="brandname">Tally</div>
            <div className="tagline">Project expense &amp; revenue ledger</div>
          </div>
        </div>
        <label className="curr">
          <span className="curr-label">Currency</span>
          <select value={currency} onChange={e=>saveCurrency(e.target.value)}>
            {Object.keys(CURRENCIES).map(k=><option key={k} value={k}>{CURRENCIES[k].label}</option>)}
          </select>
        </label>
      </header>

      <nav className="tabs" role="tablist">
        <Tab id="input" tab={tab} setTab={setTab} icon={<Receipt size={16}/>} label="Input"/>
        <Tab id="ledger" tab={tab} setTab={setTab} icon={<BookOpen size={16}/>} label="Project Ledger"/>
        <Tab id="projects" tab={tab} setTab={setTab} icon={<Folder size={16}/>} label="Projects"/>
        <Tab id="overview" tab={tab} setTab={setTab} icon={<BarChart3 size={16}/>} label="Overview"/>
      </nav>

      <main className="panel">
        {tab==="input"&&<InputTab projects={projects} addEntry={addEntry} goProjects={()=>setTab("projects")}/>}
        {tab==="ledger"&&<LedgerTab projects={projects} entries={entries} totalsFor={totalsFor}
          fmt={fmt} deleteEntry={deleteEntry} goInput={()=>setTab("input")} goProjects={()=>setTab("projects")}/>}
        {tab==="projects"&&<ProjectsTab projects={projects} totalsFor={totalsFor} fmt={fmt}
          addProject={addProject} deleteProject={deleteProject}/>}
        {tab==="overview"&&<OverviewTab projects={projects} grand={grand} totalsFor={totalsFor}
          fmt={fmt} openLedger={pid=>{window.__tallySelected=pid;setTab("ledger");}}/>}
      </main>

      {toast&&<div className="toast"><Check size={15}/> {toast}</div>}
    </div>
  );
}

function Tab({id,tab,setTab,icon,label}){
  return(
    <button role="tab" aria-selected={tab===id} className={"tab"+(tab===id?" active":"")} onClick={()=>setTab(id)}>
      {icon}<span>{label}</span>
    </button>
  );
}

/* =====================================================================
   Item row component
===================================================================== */
function ItemRow({item,idx,onChange,onRemove,canRemove}){
  const autoTotal=num(item.costPerUnit)*num(item.quantity);
  const displayTotal=item.totalOverride!==null?item.totalOverride:(item.costPerUnit===""?"":autoTotal.toFixed(2));

  const set=(field,val)=>onChange(item.id,{...item,[field]:val});

  return(
    <div className="item-row">
      <div className="item-row-num">{idx+1}</div>
      <div className="item-row-body">
        <div className="item-desc-row">
          <Field label="Item / description" compact>
            <input className="input" value={item.itemName} placeholder={item.placeholder}
              onChange={e=>set("itemName",e.target.value)}/>
          </Field>
        </div>
        <div className="row3">
          <Field label="Cost per unit" compact>
            <input className="input mono" inputMode="decimal" value={item.costPerUnit} placeholder="0.00"
              onChange={e=>{set("costPerUnit",e.target.value);onChange(item.id,{...item,costPerUnit:e.target.value,totalOverride:null});}}/>
          </Field>
          <Field label="Qty" compact>
            <input className="input mono" inputMode="decimal" value={item.quantity} placeholder="1"
              onChange={e=>onChange(item.id,{...item,quantity:e.target.value,totalOverride:null})}/>
          </Field>
          <Field label={<span>Total {item.totalOverride!==null
            ?<button className="auto-link" onClick={()=>onChange(item.id,{...item,totalOverride:null})}><RotateCcw size={11}/> auto</button>
            :<span className="auto-tag">auto</span>}</span>} compact>
            <input className="input mono" inputMode="decimal" value={displayTotal} placeholder="0.00"
              onChange={e=>onChange(item.id,{...item,totalOverride:e.target.value})}/>
          </Field>
        </div>
      </div>
      {canRemove&&(
        <button className="item-remove" aria-label="Remove item" onClick={()=>onRemove(item.id)}>
          <X size={15}/>
        </button>
      )}
    </div>
  );
}

/* =====================================================================
   Input tab
===================================================================== */
function InputTab({projects,addEntry,goProjects}){
  const [projectId,setProjectId]=useState(projects[0]?.id||"");
  const [type,setType]=useState("expense");
  const [category,setCategory]=useState(EXPENSE_CATEGORIES[0]);
  const [items,setItems]=useState([blankItem(0)]);
  const [date,setDate]=useState(todayStr());
  const [vendorName,setVendorName]=useState("");
  const [vendorContact,setVendorContact]=useState("");
  const [vendorAddress,setVendorAddress]=useState("");
  const [notes,setNotes]=useState("");
  const [errors,setErrors]=useState({});

  const cats=type==="revenue"?REVENUE_CATEGORIES:EXPENSE_CATEGORIES;

  const switchType=t=>{
    setType(t);
    setCategory(t==="revenue"?REVENUE_CATEGORIES[0]:EXPENSE_CATEGORIES[0]);
  };

  const updateItem=(id,next)=>setItems(prev=>prev.map(i=>i.id===id?next:i));
  const addItem=()=>setItems(prev=>[...prev,blankItem(prev.length)]);
  const removeItem=id=>setItems(prev=>prev.filter(i=>i.id!==id));

  const itemTotal=item=>{
    if(item.totalOverride!==null) return num(item.totalOverride);
    return num(item.costPerUnit)*num(item.quantity);
  };
  const receiptTotal=items.reduce((s,i)=>s+itemTotal(i),0);

  const save=()=>{
    const errs={};
    if(!projectId) errs.projectId="Pick a project";
    const itemErrs=items.map(i=>!i.itemName.trim()?"Required":"");
    if(itemErrs.some(Boolean)) errs.items=itemErrs;
    setErrors(errs);
    if(Object.keys(errs).length) return;

    addEntry({
      projectId,type,category,date,
      items:items.map(i=>({
        id:i.id,
        itemName:i.itemName.trim(),
        costPerUnit:num(i.costPerUnit),
        quantity:num(i.quantity),
        totalCost:itemTotal(i),
      })),
      totalCost:receiptTotal,
      vendorName:vendorName.trim(),
      vendorContact:vendorContact.trim(),
      vendorAddress:vendorAddress.trim(),
      notes:notes.trim(),
    });

    setItems([blankItem(0)]);
    setVendorName("");setVendorContact("");setVendorAddress("");setNotes("");
    setErrors({});
  };

  if(projects.length===0) return(
    <Empty icon={<FolderPlus size={26}/>} title="No projects yet"
      body="Every receipt belongs to a project. Register your first project to start logging expenses and revenue."
      action={<button className="btn btn-primary" onClick={goProjects}><Plus size={16}/> Go to Projects</button>}/>
  );

  return(
    <div className="card form-card">
      <div className="card-head">
        <span className="eyebrow">New receipt</span>
        <h2>Log a receipt</h2>
        <p className="card-sub">Add one or more line items per receipt, then file under a project.</p>
      </div>

      <div className="seg" role="group">
        <button className={"seg-btn"+(type==="expense"?" on exp":"")} onClick={()=>switchType("expense")}>
          <ArrowDownRight size={16}/> Expense
        </button>
        <button className={"seg-btn"+(type==="revenue"?" on rev":"")} onClick={()=>switchType("revenue")}>
          <ArrowUpRight size={16}/> Revenue
        </button>
      </div>

      <div className="row2">
        <Field label="Project" error={errors.projectId}>
          <select className="input" value={projectId} onChange={e=>setProjectId(e.target.value)}>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Category">
          <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
            {cats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* ---- Line items ---- */}
      <div className="items-section">
        <div className="items-head">
          <span className="block-label">Line items</span>
          <span className="item-count">{items.length} {items.length===1?"item":"items"}</span>
        </div>

        <div className="items-list">
          {items.map((item,idx)=>(
            <ItemRow key={item.id} item={item} idx={idx}
              onChange={updateItem} onRemove={removeItem} canRemove={items.length>1}
              error={errors.items?.[idx]}/>
          ))}
        </div>

        <button className="add-item-btn" onClick={addItem}>
          <Plus size={15}/> Add another item
        </button>
      </div>

      <Field label="Date">
        <input className="input mono" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      </Field>

      <div className="vendor-block">
        <div className="block-head"><Store size={14}/> Vendor / Party</div>
        <Field label="Vendor name">
          <input className="input" value={vendorName} placeholder="Who you paid / who paid you"
            onChange={e=>setVendorName(e.target.value)}/>
        </Field>
        <div className="row2">
          <Field label="Contact">
            <input className="input" value={vendorContact} placeholder="Phone, email or TIN"
              onChange={e=>setVendorContact(e.target.value)}/>
          </Field>
          <Field label="Address">
            <input className="input" value={vendorAddress} placeholder="City / address"
              onChange={e=>setVendorAddress(e.target.value)}/>
          </Field>
        </div>
      </div>

      <Field label="Notes (optional)">
        <textarea className="input textarea" value={notes} rows={2}
          placeholder="Anything worth remembering about this receipt"
          onChange={e=>setNotes(e.target.value)}/>
      </Field>

      <div className="form-foot">
        <div className="foot-total">
          <span className="eyebrow">Receipt total · {items.length} {items.length===1?"item":"items"}</span>
          <span className={"foot-amt "+type}>{receiptTotal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
        <button className="btn btn-primary" onClick={save}><Plus size={16}/> Save receipt</button>
      </div>
    </div>
  );
}

/* =====================================================================
   Project Ledger tab
===================================================================== */
function LedgerTab({projects,entries,totalsFor,fmt,deleteEntry,goInput,goProjects}){
  const initial=(typeof window!=="undefined"&&window.__tallySelected)||projects[0]?.id||"";
  const [pid,setPid]=useState(initial);
  const [confirmId,setConfirmId]=useState(null);
  const [expanded,setExpanded]=useState({});

  useEffect(()=>{
    if(typeof window!=="undefined"&&window.__tallySelected){
      setPid(window.__tallySelected);
      window.__tallySelected=null;
    }
  },[]);

  if(projects.length===0) return(
    <Empty icon={<FolderPlus size={26}/>} title="No projects yet"
      body="Register a project, then log receipts to see them gathered here."
      action={<button className="btn btn-primary" onClick={goProjects}><Plus size={16}/> Go to Projects</button>}/>
  );

  const valid=projects.some(p=>p.id===pid)?pid:projects[0].id;
  const project=projects.find(p=>p.id===valid);
  const t=totalsFor(valid);
  const list=entries.filter(e=>e.projectId===valid);
  const revenue=list.filter(e=>e.type==="revenue");
  const expense=list.filter(e=>e.type==="expense");
  const toggleExpand=id=>setExpanded(prev=>({...prev,[id]:!prev[id]}));

  return(
    <div>
      <div className="pill-row">
        {projects.map(p=>(
          <button key={p.id} className={"pill"+(p.id===valid?" on":"")} onClick={()=>setPid(p.id)}>{p.name}</button>
        ))}
      </div>

      <div className="ledger-summary card">
        <div className="ls-name">
          <span className="eyebrow">Project ledger</span>
          <h2>{project.name}</h2>
          {project.description&&<p className="card-sub">{project.description}</p>}
        </div>
        <div className="ls-figs">
          <div className="ls-fig"><span className="rev-dot"/>Revenue<b className="mono rev">{fmt(t.revenue)}</b></div>
          <div className="ls-fig"><span className="exp-dot"/>Expense<b className="mono exp">{fmt(t.expense)}</b></div>
          <div className="ls-fig net"><span>Net</span><b className={"mono "+(t.net>=0?"rev":"exp")}>{fmt(t.net)}</b></div>
        </div>
      </div>

      {list.length===0?(
        <Empty small icon={<Receipt size={22}/>} title="No receipts filed"
          body="This project has no entries yet."
          action={<button className="btn btn-ghost" onClick={goInput}><Plus size={15}/> Add a receipt</button>}/>
      ):(
        <>
          <LedgerSection title="Revenue" kind="rev" rows={revenue} fmt={fmt}
            confirmId={confirmId} setConfirmId={setConfirmId} deleteEntry={deleteEntry}
            subtotal={t.revenue} expanded={expanded} toggleExpand={toggleExpand}/>
          <LedgerSection title="Expense" kind="exp" rows={expense} fmt={fmt}
            confirmId={confirmId} setConfirmId={setConfirmId} deleteEntry={deleteEntry}
            subtotal={t.expense} expanded={expanded} toggleExpand={toggleExpand}/>
        </>
      )}
    </div>
  );
}

function LedgerSection({title,kind,rows,fmt,confirmId,setConfirmId,deleteEntry,subtotal,expanded,toggleExpand}){
  return(
    <section className={"ledger-sec "+kind}>
      <div className="sec-head">
        <h3>{kind==="rev"?<ArrowUpRight size={16}/>:<ArrowDownRight size={16}/>}{title}</h3>
        <span className="sec-count">{rows.length} {rows.length===1?"entry":"entries"}</span>
      </div>
      {rows.length===0?(
        <div className="sec-empty">No {title.toLowerCase()} entries.</div>
      ):(
        <div className="rows">
          {rows.map(e=>{
            const multiItem=e.items&&e.items.length>1;
            const isExp=expanded[e.id];
            return(
              <div className="lrow-wrap" key={e.id}>
                <div className="lrow">
                  <div className="lr-left">
                    {/* receipt header line */}
                    <div className="lr-title">
                      {multiItem?(
                        <button className="expand-btn" onClick={()=>toggleExpand(e.id)}>
                          <span className="expand-icon">{isExp?"▾":"▸"}</span>
                          {e.items.length} items
                        </button>
                      ):(
                        e.items?.[0]?.itemName||"(no description)"
                      )}
                    </div>
                    <div className="lr-meta">
                      <span className="tagcat">{e.category}</span>
                      <span className="dot">·</span>
                      <span className="mono dim">{e.date}</span>
                      {e.vendorName&&<><span className="dot">·</span><span className="dim">{e.vendorName}</span></>}
                    </div>
                    {/* single-item shows qty detail inline */}
                    {!multiItem&&e.items?.[0]&&num(e.items[0].quantity)!==1&&(
                      <div className="lr-qty-hint">{e.items[0].quantity} × {fmt(e.items[0].costPerUnit)}</div>
                    )}
                    {e.notes&&<div className="lr-note">{e.notes}</div>}
                  </div>
                  <div className="lr-right">
                    <span className={"lr-amt mono "+kind}>{fmt(e.totalCost)}</span>
                    {confirmId===e.id?(
                      <span className="confirm">
                        <button className="mini danger" onClick={()=>{deleteEntry(e.id);setConfirmId(null);}}>Delete</button>
                        <button className="mini" onClick={()=>setConfirmId(null)}>Keep</button>
                      </span>
                    ):(
                      <button className="icon-btn" aria-label="Delete entry" onClick={()=>setConfirmId(e.id)}><Trash2 size={15}/></button>
                    )}
                  </div>
                </div>

                {/* expanded item list for multi-item receipts */}
                {multiItem&&isExp&&(
                  <div className="item-breakdown">
                    {e.items.map((it,i)=>(
                      <div className="ibd-row" key={it.id||i}>
                        <span className="ibd-num">{i+1}</span>
                        <span className="ibd-name">{it.itemName}</span>
                        <span className="ibd-qty mono dim">{it.quantity} × {fmt(it.costPerUnit)}</span>
                        <span className={"ibd-total mono "+kind}>{fmt(it.totalCost)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="subtotal">
        <span>Subtotal</span><b className={"mono "+kind}>{fmt(subtotal)}</b>
      </div>
    </section>
  );
}

/* =====================================================================
   Projects tab
===================================================================== */
function ProjectsTab({projects,totalsFor,fmt,addProject,deleteProject}){
  const [name,setName]=useState("");
  const [desc,setDesc]=useState("");
  const [err,setErr]=useState("");
  const [confirmId,setConfirmId]=useState(null);

  const submit=()=>{
    if(!name.trim()){setErr("Give the project a name");return;}
    addProject(name,desc);setName("");setDesc("");setErr("");
  };

  return(
    <div className="projects-grid">
      <div className="card form-card">
        <div className="card-head">
          <span className="eyebrow">New project</span>
          <h2>Register a project</h2>
          <p className="card-sub">Projects are the buckets your receipts get filed into.</p>
        </div>
        <Field label="Project name" error={err}>
          <input className="input" value={name} placeholder="e.g. Café Build-Out" onChange={e=>setName(e.target.value)}/>
        </Field>
        <Field label="Description (optional)">
          <textarea className="input textarea" rows={2} value={desc} placeholder="What is this project?" onChange={e=>setDesc(e.target.value)}/>
        </Field>
        <button className="btn btn-primary full" onClick={submit}><Plus size={16}/> Add project</button>
      </div>

      <div className="proj-list">
        <div className="list-head"><span className="eyebrow">Registered projects</span><span className="dim">{projects.length} total</span></div>
        {projects.length===0?<div className="sec-empty pad">No projects yet — add your first one.</div>
          :projects.map(p=>{
            const t=totalsFor(p.id);
            return(
              <div className="proj-card" key={p.id}>
                <div className="proj-top">
                  <div>
                    <div className="proj-name">{p.name}</div>
                    {p.description&&<div className="proj-desc">{p.description}</div>}
                  </div>
                  {confirmId===p.id?(
                    <span className="confirm">
                      <button className="mini danger" onClick={()=>{deleteProject(p.id);setConfirmId(null);}}>Delete all</button>
                      <button className="mini" onClick={()=>setConfirmId(null)}>Cancel</button>
                    </span>
                  ):(
                    <button className="icon-btn" aria-label="Delete project" onClick={()=>setConfirmId(p.id)}><Trash2 size={15}/></button>
                  )}
                </div>
                <div className="proj-figs">
                  <span className="mono rev">{fmt(t.revenue)}</span>
                  <span className="sep">in</span>
                  <span className="mono exp">{fmt(t.expense)}</span>
                  <span className="sep">out</span>
                  <span className={"mono net-fig "+(t.net>=0?"rev":"exp")}>{fmt(t.net)} net</span>
                  <span className="proj-count">{t.count} {t.count===1?"receipt":"receipts"}</span>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

/* =====================================================================
   Overview tab
===================================================================== */
function OverviewTab({projects,grand,totalsFor,fmt,openLedger}){
  if(projects.length===0) return(
    <Empty icon={<BarChart3 size={26}/>} title="Nothing to total yet"
      body="Once you register projects and log receipts, the whole portfolio rolls up here."/>
  );

  const denom=grand.revenue+grand.expense;
  const revPct=denom>0?(grand.revenue/denom)*100:50;
  const expPct=denom>0?(grand.expense/denom)*100:50;
  const rows=projects.map(p=>({p,t:totalsFor(p.id)})).sort((a,b)=>b.t.net-a.t.net);

  return(
    <div>
      <div className="hero card">
        <span className="eyebrow">All projects · net position</span>
        <div className={"hero-num mono "+(grand.net>=0?"rev":"exp")}>{fmt(grand.net)}</div>
        <div className="bar" role="img" aria-label="Revenue vs expense split">
          <div className="bar-rev" style={{width:revPct+"%"}}/>
          <div className="bar-exp" style={{width:expPct+"%"}}/>
        </div>
        <div className="bar-legend">
          <div><span className="rev-dot"/> Revenue <b className="mono rev">{fmt(grand.revenue)}</b></div>
          <div><span className="exp-dot"/> Expense <b className="mono exp">{fmt(grand.expense)}</b></div>
        </div>
      </div>

      <div className="ptable card">
        <div className="pt-head"><span className="eyebrow">Per project</span></div>
        <div className="pt-rows">
          <div className="pt-row pt-labels">
            <span>Project</span><span className="r">Revenue</span><span className="r">Expense</span><span className="r">Net</span><span/>
          </div>
          {rows.map(({p,t})=>(
            <button className="pt-row pt-data" key={p.id} onClick={()=>openLedger(p.id)}>
              <span className="pt-name">{p.name}<small>{t.count} {t.count===1?"receipt":"receipts"}</small></span>
              <span className="r mono rev">{fmt(t.revenue)}</span>
              <span className="r mono exp">{fmt(t.expense)}</span>
              <span className={"r mono "+(t.net>=0?"rev":"exp")}>{fmt(t.net)}</span>
              <span className="pt-go"><ChevronRight size={16}/></span>
            </button>
          ))}
          <div className="pt-row pt-total">
            <span>Total</span>
            <span className="r mono rev">{fmt(grand.revenue)}</span>
            <span className="r mono exp">{fmt(grand.expense)}</span>
            <span className={"r mono "+(grand.net>=0?"rev":"exp")}>{fmt(grand.net)}</span>
            <span/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- shared ----------------------------- */
function Field({label,error,children,compact}){
  return(
    <label className={"field"+(compact?" compact":"")}>
      <span className="label">{label}{error&&<em className="err">{error}</em>}</span>
      {children}
    </label>
  );
}

function Empty({icon,title,body,action,small}){
  return(
    <div className={"empty"+(small?" small":"")}>
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

/* ----------------------------- styles ----------------------------- */
function Styles(){
  return(
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

.app{
  --ink:#16302b;--paper:#eceee9;--surface:#fbfcfa;--rule:#d7dcd4;
  --brand:#1f4e46;--brand-2:#2c6b60;--rev:#157160;--exp:#b25c36;
  --muted:#6c756e;--soft:#f1f3ef;
  font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  color:var(--ink);background:var(--paper);min-height:100%;padding:20px;box-sizing:border-box;
  max-width:1080px;margin:0 auto;
}
.app *{box-sizing:border-box}
.mono{font-family:'JetBrains Mono',ui-monospace,Menlo,monospace;font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.rev{color:var(--rev)}.exp{color:var(--exp)}.dim{color:var(--muted)}
.loading{padding:80px 0;text-align:center;color:var(--muted);font-size:15px}

/* top bar */
.topbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:12px}
.mark{width:40px;height:40px;border-radius:11px;background:var(--brand);color:#eaf3f0;display:grid;place-items:center;box-shadow:0 2px 0 rgba(22,48,43,.18)}
.brandname{font-size:21px;font-weight:700;letter-spacing:-.02em;line-height:1}
.tagline{font-size:12.5px;color:var(--muted);margin-top:3px}
.curr{display:flex;align-items:center;gap:8px}
.curr-label{font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:var(--muted);font-weight:600}
.curr select,.input{font-family:inherit}
.curr select{padding:8px 10px;border:1px solid var(--rule);border-radius:9px;background:var(--surface);color:var(--ink);font-size:13px;font-weight:500;cursor:pointer}

/* tabs */
.tabs{display:flex;gap:4px;background:var(--soft);border:1px solid var(--rule);border-radius:13px;padding:4px;margin-bottom:20px;overflow-x:auto}
.tab{flex:1;min-width:fit-content;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;border:none;background:transparent;color:var(--muted);font-family:inherit;font-size:13.5px;font-weight:600;border-radius:9px;cursor:pointer;white-space:nowrap;transition:background .15s,color .15s}
.tab:hover{color:var(--ink)}
.tab.active{background:var(--surface);color:var(--brand);box-shadow:0 1px 2px rgba(22,48,43,.1)}

/* cards */
.card{background:var(--surface);border:1px solid var(--rule);border-radius:16px;padding:22px;margin-bottom:18px}
.card-head{margin-bottom:18px}
.card-head h2{margin:6px 0 0;font-size:20px;font-weight:600;letter-spacing:-.02em}
.card-sub{margin:6px 0 0;color:var(--muted);font-size:13.5px;line-height:1.5}
.eyebrow{font-size:10.5px;text-transform:uppercase;letter-spacing:.16em;color:var(--brand-2);font-weight:600}

/* fields */
.field{display:block;margin-bottom:14px}
.field.compact{margin-bottom:10px}
.label{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:6px}
.label .err{color:var(--exp);font-style:normal;font-size:11.5px;font-weight:500}
.input{width:100%;padding:11px 13px;border:1px solid var(--rule);border-radius:10px;background:#fff;color:var(--ink);font-size:14px;font-weight:500;transition:border-color .15s,box-shadow .15s}
.input::placeholder{color:#9aa39c}
.input:focus{outline:none;border-color:var(--brand-2);box-shadow:0 0 0 3px rgba(44,107,96,.14)}
.textarea{resize:vertical;min-height:46px;line-height:1.5}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.auto-tag{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:var(--soft);padding:2px 6px;border-radius:5px;font-weight:600}
.auto-link{display:inline-flex;align-items:center;gap:3px;font-family:inherit;font-size:10.5px;color:var(--brand-2);background:none;border:none;cursor:pointer;font-weight:600;text-transform:uppercase;letter-spacing:.08em}

/* segmented control */
.seg{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:var(--soft);border:1px solid var(--rule);border-radius:11px;padding:4px;margin-bottom:18px}
.seg-btn{display:flex;align-items:center;justify-content:center;gap:7px;padding:11px;border:none;background:transparent;color:var(--muted);font-family:inherit;font-size:14px;font-weight:600;border-radius:8px;cursor:pointer;transition:all .15s}
.seg-btn.on.exp{background:#fff;color:var(--exp);box-shadow:0 1px 2px rgba(178,92,54,.2)}
.seg-btn.on.rev{background:#fff;color:var(--rev);box-shadow:0 1px 2px rgba(21,113,96,.2)}

/* items section */
.items-section{border:1px solid var(--rule);border-radius:13px;overflow:hidden;margin-bottom:16px;background:var(--soft)}
.items-head{display:flex;justify-content:space-between;align-items:center;padding:11px 16px;border-bottom:1px solid var(--rule);background:var(--surface)}
.block-label{font-size:11px;text-transform:uppercase;letter-spacing:.13em;font-weight:600;color:var(--brand-2)}
.item-count{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600}
.items-list{display:flex;flex-direction:column;gap:0}
.item-row{display:flex;gap:10px;align-items:flex-start;padding:14px 16px;border-bottom:1px solid var(--rule);background:var(--surface)}
.item-row:last-of-type{}
.item-row-num{min-width:22px;height:22px;border-radius:6px;background:var(--soft);border:1px solid var(--rule);display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--muted);margin-top:28px;flex-shrink:0}
.item-row-body{flex:1;min-width:0}
.item-desc-row{margin-bottom:0}
.item-remove{margin-top:28px;width:30px;height:30px;flex-shrink:0;display:grid;place-items:center;border:1px solid var(--rule);background:#fff;border-radius:8px;color:var(--muted);cursor:pointer;transition:all .15s}
.item-remove:hover{color:var(--exp);border-color:var(--exp);background:#fdf3ef}
.add-item-btn{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border:none;background:var(--soft);color:var(--brand-2);font-family:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .15s;border-top:1px solid var(--rule)}
.add-item-btn:hover{background:#e7ebe4}

/* vendor block */
.vendor-block{border:1px dashed var(--rule);border-radius:12px;padding:16px;margin:6px 0 14px;background:#fafbf8}
.block-head{display:flex;align-items:center;gap:7px;font-size:11px;text-transform:uppercase;letter-spacing:.12em;font-weight:600;color:var(--brand-2);margin-bottom:12px}

/* form footer */
.form-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-top:1px solid var(--rule);padding-top:18px;margin-top:6px;flex-wrap:wrap}
.foot-total{display:flex;flex-direction:column;gap:3px}
.foot-amt{font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:600;font-variant-numeric:tabular-nums}
.foot-amt.expense{color:var(--exp)}.foot-amt.revenue{color:var(--rev)}

/* buttons */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 18px;border:none;border-radius:10px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
.btn-primary{background:var(--brand);color:#eef5f2}
.btn-primary:hover{background:#173b35}
.btn-ghost{background:var(--soft);color:var(--brand);border:1px solid var(--rule)}
.btn-ghost:hover{background:#e7eae4}
.btn.full{width:100%}

/* pills */
.pill-row{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.pill{padding:8px 14px;border:1px solid var(--rule);background:var(--surface);color:var(--muted);border-radius:99px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s}
.pill:hover{color:var(--ink)}
.pill.on{background:var(--brand);color:#eef5f2;border-color:var(--brand)}

/* ledger summary */
.ledger-summary{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap}
.ls-name h2{margin:6px 0 0;font-size:22px;letter-spacing:-.02em}
.ls-figs{display:flex;gap:26px;align-items:flex-end;flex-wrap:wrap}
.ls-fig{display:flex;flex-direction:column;gap:5px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600}
.ls-fig b{font-size:18px;letter-spacing:-.01em}
.ls-fig.net b{font-size:22px}
.rev-dot,.exp-dot{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;vertical-align:middle}
.rev-dot{background:var(--rev)}.exp-dot{background:var(--exp)}

/* ledger sections */
.ledger-sec{margin-bottom:18px;border:1px solid var(--rule);border-radius:14px;overflow:hidden;background:var(--surface)}
.ledger-sec.rev{border-top:3px solid var(--rev)}
.ledger-sec.exp{border-top:3px solid var(--exp)}
.sec-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--rule)}
.sec-head h3{margin:0;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600}
.ledger-sec.rev .sec-head h3{color:var(--rev)}.ledger-sec.exp .sec-head h3{color:var(--exp)}
.sec-count{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600}
.sec-empty{padding:18px;color:var(--muted);font-size:13.5px}
.sec-empty.pad{padding:24px}
.rows{display:flex;flex-direction:column}
.lrow-wrap{border-bottom:1px solid var(--soft)}
.lrow-wrap:last-child{border-bottom:none}
.lrow{display:flex;justify-content:space-between;gap:14px;padding:13px 18px}
.lr-left{flex:1;min-width:0}
.lr-title{font-size:14.5px;font-weight:600;letter-spacing:-.01em}
.lr-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:4px;font-size:12px;color:var(--muted)}
.tagcat{background:var(--soft);padding:2px 8px;border-radius:6px;font-weight:600;font-size:11px;color:var(--brand-2)}
.dot{color:#c2c9c0}
.lr-qty-hint{margin-top:4px;font-size:12px;color:var(--muted);font-family:'JetBrains Mono',monospace}
.lr-note{margin-top:5px;font-size:12.5px;color:var(--muted);font-style:italic}
.lr-right{display:flex;align-items:center;gap:12px;flex-shrink:0}
.lr-amt{font-size:15px;font-weight:600}
.icon-btn{width:30px;height:30px;display:grid;place-items:center;border:1px solid var(--rule);background:#fff;border-radius:8px;color:var(--muted);cursor:pointer;transition:all .15s}
.icon-btn:hover{color:var(--exp);border-color:var(--exp)}
.confirm{display:flex;gap:5px}
.mini{padding:6px 10px;border:1px solid var(--rule);background:#fff;border-radius:7px;font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;color:var(--ink)}
.mini.danger{background:var(--exp);color:#fff;border-color:var(--exp)}
.subtotal{display:flex;justify-content:space-between;align-items:center;padding:13px 18px;background:var(--soft);font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;color:var(--muted)}
.subtotal b{font-size:16px;letter-spacing:-.01em;text-transform:none}

/* expand toggle */
.expand-btn{display:inline-flex;align-items:center;gap:6px;background:none;border:none;font-family:inherit;font-size:14.5px;font-weight:600;color:var(--ink);cursor:pointer;padding:0;letter-spacing:-.01em}
.expand-icon{font-size:12px;color:var(--muted)}

/* item breakdown */
.item-breakdown{border-top:1px dashed var(--rule);margin:0 18px 6px;padding:8px 0 10px}
.ibd-row{display:grid;grid-template-columns:20px 1fr auto auto;gap:8px;align-items:center;padding:5px 0;font-size:13px}
.ibd-num{font-size:10px;font-weight:700;color:var(--muted);text-align:center;background:var(--soft);border-radius:4px;width:18px;height:18px;display:grid;place-items:center}
.ibd-name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ibd-qty{font-size:12px;white-space:nowrap}
.ibd-total{font-size:13.5px;font-weight:600;text-align:right;white-space:nowrap}

/* projects */
.projects-grid{display:grid;grid-template-columns:360px 1fr;gap:18px;align-items:start}
.proj-list{display:flex;flex-direction:column;gap:12px}
.list-head{display:flex;justify-content:space-between;align-items:center;padding:0 4px 2px}
.proj-card{background:var(--surface);border:1px solid var(--rule);border-radius:13px;padding:16px 18px}
.proj-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.proj-name{font-size:16px;font-weight:600;letter-spacing:-.01em}
.proj-desc{font-size:13px;color:var(--muted);margin-top:3px;line-height:1.45}
.proj-figs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;font-size:13.5px}
.proj-figs .sep{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);margin-right:4px}
.net-fig{font-weight:600;margin-left:auto}
.proj-count{width:100%;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:2px;font-weight:600}

/* overview */
.hero{display:flex;flex-direction:column;gap:14px}
.hero-num{font-size:46px;font-weight:600;letter-spacing:-.03em;line-height:1;margin-top:2px}
.bar{display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--soft)}
.bar-rev{background:var(--rev);transition:width .4s ease}
.bar-exp{background:var(--exp);transition:width .4s ease}
.bar-legend{display:flex;gap:26px;flex-wrap:wrap;font-size:13px;color:var(--muted);font-weight:500}
.bar-legend b{margin-left:6px;font-size:14px}
.pt-head{margin-bottom:6px}
.pt-rows{display:flex;flex-direction:column}
.pt-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr 24px;gap:10px;align-items:center;padding:12px 8px}
.pt-row .r{text-align:right}
.pt-labels{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);font-weight:600;border-bottom:1px solid var(--rule)}
.pt-data{background:none;border:none;border-bottom:1px solid var(--soft);font-family:inherit;cursor:pointer;text-align:left;color:var(--ink);transition:background .12s;border-radius:8px}
.pt-data:hover{background:var(--soft)}
.pt-name{display:flex;flex-direction:column;font-size:14.5px;font-weight:600;gap:2px}
.pt-name small{font-size:11px;color:var(--muted);font-weight:500;letter-spacing:.04em}
.pt-row .mono{font-size:14px;font-weight:600}
.pt-go{color:var(--muted);display:grid;place-items:center}
.pt-total{border-top:2px solid var(--ink);margin-top:4px;font-weight:700}
.pt-total span:first-child{font-size:12px;text-transform:uppercase;letter-spacing:.1em}
.pt-total .mono{font-size:15px}

/* empty states */
.empty{text-align:center;padding:54px 24px;background:var(--surface);border:1px dashed var(--rule);border-radius:16px}
.empty.small{padding:34px 20px}
.empty-icon{width:56px;height:56px;border-radius:15px;background:var(--soft);color:var(--brand-2);display:grid;place-items:center;margin:0 auto 16px}
.empty h3{margin:0 0 8px;font-size:18px;font-weight:600}
.empty p{margin:0 auto 18px;color:var(--muted);font-size:14px;line-height:1.55;max-width:380px}

/* toast */
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%);background:var(--ink);color:#eef5f2;padding:11px 18px;border-radius:11px;font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:8px;box-shadow:0 8px 24px rgba(22,48,43,.28);z-index:50;animation:rise .25s ease}
@keyframes rise{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}

@media(max-width:760px){
  .app{padding:14px}
  .projects-grid{grid-template-columns:1fr}
  .row3{grid-template-columns:1fr 1fr}
  .ls-figs{gap:18px}
  .hero-num{font-size:36px}
  .pt-row{grid-template-columns:1.4fr 1fr 1fr 18px;gap:6px}
  .pt-row .r:nth-child(3){display:none}
  .pt-labels span:nth-child(3){display:none}
  .ibd-row{grid-template-columns:20px 1fr auto}
  .ibd-qty{display:none}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
`}</style>
  );
}
