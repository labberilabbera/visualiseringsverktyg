"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";

type Tab = "ai"|"skiss"|"3d";
type GenState = "idle"|"loading"|"done"|"error";
type Upload = { id:number;filename:string;mimetype:string;aiImage?:string;aiError?:string;genState:GenState;model3d?:string;tripoState?:string;tripoProgress?:number; };

export default function GeneratePage() {
  const router = useRouter(); const params = useParams(); const projectId = params?.id as string;
  const [tab,setTab]=useState<Tab>("ai"); const [uploads,setUploads]=useState<Upload[]>([]); const [selected,setSelected]=useState(0);
  const [prompt,setPrompt]=useState(""); const [ready,setReady]=useState(false); const [editingPrompt,setEditingPrompt]=useState(false);
  const uploadsRef=useRef<Upload[]>([]); useEffect(()=>{uploadsRef.current=uploads;},[uploads]);
  useEffect(()=>{
    fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(d.error){router.replace("/login");}});
    fetch("/api/projects/"+projectId).then(r=>r.json()).then(d=>setPrompt(d.prompt||""));
    loadUploads();
  },[projectId,router]);
  async function loadUploads(){const res=await fetch("/api/projects/"+projectId+"/uploads");if(!res.ok)return;const data=await res.json();setUploads(data.map((u:Upload)=>({...u,genState:"idle"as GenState})));setReady(true);}
  async function generateAll(){if(!prompt.trim())return;for(let i=0;i<uploadsRef.current.length;i++)await generateOne(i);}
  async function generateOne(i:number){if(!prompt.trim())return;setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,genState:"loading"}:x));const u=uploadsRef.current[i];try{const dr=await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data");const{data,mimetype}=await dr.json();const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data,mimeType:mimetype}]})});const json=await res.json();if(json.images?.[0]){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiImage:json.images[0],genState:"done"}:x));setTab("ai");}else{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiError:json.error||"fel",genState:"error"}:x));}}catch(e){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiError:String(e),genState:"error"}:x));}}
  async function deleteUpload(i:number){const u=uploadsRef.current[i];await fetch("/api/projects/"+projectId+"/uploads/"+u.id,{method:"DELETE"});const next=uploadsRef.current.filter((_,idx)=>idx!==i);setUploads(next);if(selected>=next.length)setSelected(Math.max(0,next.length-1));}
  async function runTripo(i:number){const aiImage=uploadsRef.current[i]?.aiImage;if(!aiImage)return;setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"loading",tripoProgress:0}:x));try{const res=await fetch("/api/tripo/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageData:aiImage})});const json=await res.json();if(!json.taskId){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}const taskId=json.taskId;for(let a=0;a<60;a++){await new Promise(r=>setTimeout(r,4000));const pd=await(await fetch("/api/tripo/generate?taskId="+taskId)).json();if(pd.status==="success"&&pd.modelUrl){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,model3d:pd.modelUrl,tripoState:"done"}:x));setTab("3d");return;}if(pd.status==="failed"||pd.status==="cancelled"){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoProgress:pd.progress??0}:x));}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}catch{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}}
  const cur=uploads[selected]; const anyLoading=uploads.some(u=>u.genState==="loading");
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");}
  if(!ready)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)"}}><div style={{width:"24px",height:"24px",border:"2px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>);
  return(
    <main style={{minHeight:"100vh",background:"var(--bg)",fontFamily:"system-ui,sans-serif",color:"var(--text)",display:"flex"}}>
      <aside style={{width:"200px",minWidth:"200px",borderRight:"1px solid var(--border)",background:"var(--bg2)",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",borderBottom:"1px solid var(--border)"}}>
          {(["ai","skiss","3d"]as Tab[]).map(t=>(<button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 0",background:tab===t?"var(--accent)":"transparent",border:"none",color:tab===t?"white":"var(--text2)",fontSize:"11px",fontWeight:tab===t?500:400,cursor:"pointer",fontFamily:"system-ui",textTransform:"uppercase",letterSpacing:"0.04em"}}>{t==="ai"?"AI bild":t==="skiss"?"Skiss":"3D"}</button>))}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
          {uploads.map((u,i)=>(<div key={u.id} onClick={()=>setSelected(i)} style={{marginBottom:"8px",borderRadius:"8px",overflow:"hidden",border:selected===i?"2px solid #1a56db":"1px solid var(--border)",cursor:"pointer",background:"var(--bg)"}}>
            <div style={{height:"72px",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{u.aiImage?<img src={u.aiImage} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<div style={{fontSize:"10px",color:"#555",textAlign:"center",padding:"4px"}}>{u.filename}</div>}</div>
            <div style={{display:"flex",gap:"3px",padding:"4px",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:"9px",padding:"2px 5px",borderRadius:"4px",fontWeight:500,background:u.genState==="done"?"#16a34a22":u.genState==="loading"?"#1a56db22":u.genState==="error"?"#c0392b22":"#33333344",color:u.genState==="done"?"#22c55e":u.genState==="loading"?"#6ea8fe":u.genState==="error"?"#ef4444":"var(--text2)"}}>{u.tripoState==="loading"?(u.tripoProgress?u.tripoProgress+"%":"3D..."):u.genState==="done"?"klar":u.genState==="loading"?"...":u.genState==="error"?"fel":"väntar"}</span>
              <div style={{display:"flex",gap:"3px"}}><button onClick={e=>{e.stopPropagation();generateOne(i);}} style={{background:"#1a56db22",border:"none",borderRadius:"4px",padding:"2px 5px",cursor:"pointer",fontSize:"10px",color:"#6ea8fe"}}>↺</button><button onClick={e=>{e.stopPropagation();deleteUpload(i);}} style={{background:"#c0392b22",border:"none",borderRadius:"4px",padding:"2px 5px",cursor:"pointer",fontSize:"10px",color:"#ef4444"}}>✕</button></div>
            </div>
          </div>))}
        </div>
        <div style={{padding:"10px",borderTop:"1px solid var(--border)"}}><button onClick={logout} style={{width:"100%",padding:"5px 0",background:"transparent",border:"1px solid var(--border2)",borderRadius:"6px",fontSize:"11px",color:"var(--text2)",cursor:"pointer"}}>Logga ut</button></div>
      </aside>
      <div style={{flex:1,background:"#fadcd9",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"10px 16px",borderBottom:"1px solid #e8b8b0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f5cdc8"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:0}}>
            {editingPrompt?(<input autoFocus value={prompt} onChange={e=>setPrompt(e.target.value)} onBlur={()=>setEditingPrompt(false)} onKeyDown={e=>e.key==="Enter"&&setEditingPrompt(false)} style={{flex:1,padding:"5px 8px",borderRadius:"6px",border:"1px solid #ccc",fontSize:"12px",background:"white",color:"#111",outline:"none"}}/>):(<p onClick={()=>setEditingPrompt(true)} style={{fontSize:"12px",color:"#444",margin:0,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"text",padding:"5px 0"}}>{prompt||"Klicka för att redigera prompt..."}</p>)}
          </div>
          <div style={{display:"flex",gap:"6px",flexShrink:0,marginLeft:"10px"}}>
            <button onClick={()=>router.push("/projects/"+projectId+"/qr")} style={{padding:"6px 10px",background:"transparent",border:"1px solid #bbb",borderRadius:"8px",fontSize:"12px",color:"#555",cursor:"pointer"}}>+ Bilder</button>
            <button onClick={generateAll} disabled={anyLoading||uploads.length===0} style={{padding:"6px 14px",background:anyLoading?"#aaa":"#1a56db",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:anyLoading?"not-allowed":"pointer"}}>{anyLoading?"Genererar...":"Generera alla"}</button>
          </div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          {!cur?(<p style={{color:"#888",fontSize:"14px"}}>Inga uppladdade bilder</p>
          ):tab==="ai"?(cur.genState==="loading"?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}><div style={{width:"32px",height:"32px",border:"3px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{color:"#555",fontSize:"13px"}}>Genererar AI-bild...</p></div>
          ):cur.aiImage?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
            <img src={cur.aiImage} style={{maxWidth:"100%",maxHeight:"380px",borderRadius:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}} alt="AI"/>
            {cur.model3d?(<button onClick={()=>setTab("3d")} style={{padding:"8px 20px",background:"#22c55e",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:500,color:"white",cursor:"pointer"}}>Visa 3D-modell →</button>
            ):cur.tripoState==="loading"?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}><div style={{width:"200px",height:"6px",background:"#ddd",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(cur.tripoProgress||0)+"%",height:"100%",background:"#7c3aed",transition:"width 0.5s"}}/></div><p style={{color:"#7c3aed",fontSize:"12px",margin:0}}>Skapar 3D-modell... {cur.tripoProgress||0}%</p></div>
            ):cur.tripoState==="error"?(<button onClick={()=>runTripo(selected)} style={{padding:"8px 20px",background:"#ef4444",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:500,color:"white",cursor:"pointer"}}>Försök igen →</button>
            ):(<button onClick={()=>runTripo(selected)} style={{padding:"8px 20px",background:"#7c3aed",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:500,color:"white",cursor:"pointer"}}>Skapa 3D-modell →</button>)}
          </div>):cur.genState==="error"?(<div style={{textAlign:"center"}}><p style={{color:"#ef4444",fontSize:"13px",marginBottom:"8px"}}>Fel: {cur.aiError}</p><button onClick={()=>generateOne(selected)} style={{padding:"7px 16px",background:"#1a56db",border:"none",borderRadius:"8px",fontSize:"13px",color:"white",cursor:"pointer"}}>Försök igen</button></div>
          ):(<div style={{textAlign:"center"}}><p style={{color:"#888",fontSize:"13px",marginBottom:"8px"}}>Ingen AI-bild ännu</p><button onClick={()=>generateOne(selected)} style={{padding:"7px 16px",background:"#1a56db",border:"none",borderRadius:"8px",fontSize:"13px",color:"white",cursor:"pointer"}}>Generera denna</button></div>)
          ):tab==="skiss"?(<SkissView projectId={projectId} upload={cur}/>
          ):(cur.model3d?<ModelViewer modelUrl={cur.model3d}/>:(<p style={{color:"#888",fontSize:"13px"}}>{cur.aiImage?"Klicka \"Skapa 3D-modell\" under AI-bilden":"Generera AI-bild först"}</p>))}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

function SkissView({projectId,upload}:{projectId:string;upload:Upload}){
  const[src,setSrc]=useState<string|null>(null);
  useEffect(()=>{fetch("/api/projects/"+projectId+"/uploads/"+upload.id+"/data").then(r=>r.json()).then(d=>setSrc("data:"+d.mimetype+";base64,"+d.data)).catch(()=>setSrc(null));},[upload.id,projectId]);
  if(!src)return<p style={{color:"#888",fontSize:"13px"}}>Laddar skiss...</p>;
  return<img src={src} style={{maxWidth:"100%",maxHeight:"420px",borderRadius:"12px"}} alt="Skiss"/>;
}

function ModelViewer({modelUrl}:{modelUrl:string}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!ref.current)return;
    if(!document.querySelector('script[data-mv]')){
      const s=document.createElement("script");s.type="module";s.setAttribute("data-mv","1");
      s.src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
      document.head.appendChild(s);
    }
    const create=()=>{
      if(!ref.current)return;
      const mv=document.createElement("model-viewer") as any;
      mv.setAttribute("src",modelUrl);mv.setAttribute("alt","3D modell");
      mv.setAttribute("auto-rotate","");mv.setAttribute("camera-controls","");
      mv.setAttribute("shadow-intensity","1");mv.setAttribute("exposure","0.8");
      mv.style.width="100%";mv.style.height="420px";mv.style.background="#f5e8e5";
      ref.current.innerHTML="";ref.current.appendChild(mv);
    };
    if(customElements.get("model-viewer")){create();}
    else{const s=document.querySelector('script[data-mv]');if(s)s.addEventListener("load",create,{once:true});else setTimeout(create,2000);}
    return()=>{if(ref.current)ref.current.innerHTML="";};
  },[modelUrl]);
  return(
    <div style={{width:"100%",maxWidth:"600px",borderRadius:"12px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",background:"#f5e8e5"}}>
      <div ref={ref} style={{width:"100%",height:"420px",background:"#f5e8e5",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <p style={{color:"#aaa",fontSize:"12px"}}>Laddar 3D...</p>
      </div>
      <p style={{textAlign:"center",fontSize:"11px",color:"#aaa",padding:"6px 0",margin:0}}>Dra för att rotera · Scroll för zoom</p>
    </div>
  );
      }
