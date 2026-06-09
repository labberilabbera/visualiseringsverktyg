"use client";
import ThreePartViewer from "./ThreePartViewer";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
type Tab="ai"|"skiss"|"3d";
type GenState="idle"|"loading"|"done"|"error";
type Upload={id:number;filename:string;mimetype:string;aiImage?:string;aiError?:string;genState:GenState;model3d?:string;tripoState?:string;tripoProgress?:number;tripoTaskId?:string;segmentedModel?:string;segTaskId?:string;};
function dlUrl(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;a.click();}
function shareOrDl(url:string,name:string,type:string){fetch(url).then(r=>r.blob()).then(blob=>{const f=new File([blob],name,{type});if((navigator as any).canShare?.({files:[f]})){(navigator as any).share({files:[f]}).catch(()=>dlUrl(url,name));}else dlUrl(url,name);}).catch(()=>dlUrl(url,name));}
export default function GeneratePage(){
  const router=useRouter();const params=useParams();const projectId=params?.id as string;
  const[tab,setTab]=useState<Tab>(()=>{try{return (localStorage.getItem("tab_"+projectId) as Tab)||"ai";}catch{return "ai";}});const[uploads,setUploads]=useState<Upload[]>([]);const[selected,setSelected]=useState(()=>{try{return parseInt(localStorage.getItem("sel_"+projectId)||"0")||0;}catch{return 0;}});
  const[prompt,setPrompt]=useState("");const[ready,setReady]=useState(false);const[editingPrompt,setEditingPrompt]=useState(false);
  const uploadsRef=useRef<Upload[]>([]);useEffect(()=>{uploadsRef.current=uploads;},[uploads]);useEffect(()=>{try{localStorage.setItem("tab_"+projectId,tab);}catch{}},[tab,projectId]);useEffect(()=>{try{localStorage.setItem("sel_"+projectId,String(selected));}catch{}},[selected,projectId]);
  useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(d.error)router.replace("/login");});fetch("/api/projects/"+projectId).then(r=>r.json()).then(d=>setPrompt(d.prompt||""));loadUploads();},[projectId,router]);
  async function loadUploads(){const res=await fetch("/api/projects/"+projectId+"/uploads");if(!res.ok)return;const data=await res.json();setUploads(data.map((u:any)=>({id:u.id,filename:u.filename,mimetype:u.mimetype,aiImage:u.ai_image||undefined,model3d:u.model3d_url||undefined,tripoTaskId:u.tripo_task_id||undefined,segmentedModel:u.segmented_model_url||undefined,segTaskId:u.seg_task_id||undefined,genState:(u.ai_image?"done":"idle")as GenState,tripoState:u.model3d_url?"done":undefined})));setReady(true);}
  async function generateAll(){if(!prompt.trim())return;await Promise.all(uploadsRef.current.map((_,i)=>generateOne(i)));}
  async function generateMissing(){if(!prompt.trim())return;await Promise.all(uploadsRef.current.map((_,i)=>uploadsRef.current[i].aiImage?Promise.resolve():generateOne(i)));}
  async function generateOne(i:number){if(!prompt.trim())return;const u0=uploadsRef.current[i];fetch("/api/projects/"+projectId+"/uploads/"+u0.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({model3dUrl:null,tripoTaskId:null,segTaskId:null,segmentedModelUrl:null})}).catch(()=>{});setUploads(p=>p.map((x,idx)=>idx===i?{...x,genState:"loading",model3d:undefined,tripoTaskId:undefined,segTaskId:undefined,segmentedModel:undefined,tripoState:undefined}:x));const u=uploadsRef.current[i];try{const dr=await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data");const{data,mimetype}=await dr.json();const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data,mimeType:mimetype}]})});const json=await res.json();if(json.images?.[0]){const aiImage=json.images[0];await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({aiImage})});setUploads(p=>p.map((x,idx)=>idx===i?{...x,aiImage,genState:"done"}:x));setTab("ai");}else setUploads(p=>p.map((x,idx)=>idx===i?{...x,aiError:json.error||"fel",genState:"error"}:x));}catch(e){setUploads(p=>p.map((x,idx)=>idx===i?{...x,aiError:String(e),genState:"error"}:x));}}
  async function deleteUpload(i:number){const u=uploadsRef.current[i];await fetch("/api/projects/"+projectId+"/uploads/"+u.id,{method:"DELETE"});const next=uploadsRef.current.filter((_,idx)=>idx!==i);setUploads(next);if(selected>=next.length)setSelected(Math.max(0,next.length-1));}
  async function runTripo(i:number,withParts:boolean){const aiImage=uploadsRef.current[i]?.aiImage;if(!aiImage)return;setUploads(p=>p.map((x,idx)=>idx===i?{...x,tripoState:"loading",tripoProgress:0}:x));const u=uploadsRef.current[i];try{const res=await fetch("/api/tripo/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageData:aiImage,generateParts:withParts})});const json=await res.json();if(!json.taskId){setUploads(p=>p.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}const taskId=json.taskId;for(let a=0;a<120;a++){await new Promise(r=>setTimeout(r,5000));const pd=await(await fetch("/api/tripo/generate?taskId="+taskId)).json();if(pd.status==="success"&&pd.modelUrl){const patch:any={model3dUrl:pd.modelUrl,tripoTaskId:taskId};if(withParts)patch.segTaskId=taskId;await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(patch)});setUploads(p=>p.map((x,idx)=>idx===i?{...x,model3d:pd.modelUrl,tripoTaskId:taskId,segTaskId:withParts?taskId:x.segTaskId,tripoState:"done"}:x));setTab("3d");return;}if(pd.status==="failed"||pd.status==="cancelled"){setUploads(p=>p.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}setUploads(p=>p.map((x,idx)=>idx===i?{...x,tripoProgress:pd.progress??0}:x));}setUploads(p=>p.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}catch{setUploads(p=>p.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}}
  const cur=uploads[selected];const anyLoading=uploads.some(u=>u.genState==="loading");
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");}
  const B=(c:string)=>({padding:"7px 14px",background:c,border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}as const);
  if(!ready)return(<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:"24px",height:"24px",border:"2px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>);
  return(<main style={{minHeight:"100vh",background:"var(--bg)",fontFamily:"system-ui,sans-serif",color:"var(--text)",display:"flex"}}>
    <aside style={{width:"200px",minWidth:"200px",borderRight:"1px solid var(--border)",background:"var(--bg2)",display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",borderBottom:"1px solid var(--border)"}}>{(["ai","skiss","3d"]as Tab[]).map(t=>(<button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 0",background:tab===t?"var(--accent)":"transparent",border:"none",color:tab===t?"white":"var(--text2)",fontSize:"11px",fontWeight:tab===t?500:400,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.04em"}}>{t==="ai"?"AI":t==="skiss"?"Skiss":"3D"}</button>))}</div>
      <div style={{flex:1,overflowY:"auto",padding:"8px"}}>{uploads.map((u,i)=>(<div key={u.id} onClick={()=>setSelected(i)} style={{marginBottom:"8px",borderRadius:"8px",overflow:"hidden",border:selected===i?"2px solid #1a56db":"1px solid var(--border)",cursor:"pointer",background:"var(--bg)"}}>
        <div style={{height:"72px",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>{u.aiImage?<img src={u.aiImage} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<div style={{fontSize:"10px",color:"#555",textAlign:"center",padding:"4px"}}>{u.filename}</div>}</div>
        <div style={{display:"flex",gap:"3px",padding:"4px",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"9px",padding:"2px 5px",borderRadius:"4px",fontWeight:500,background:u.segTaskId&&u.model3d?"#f59e0b22":u.model3d?"#7c3aed22":u.genState==="done"?"#16a34a22":u.genState==="loading"?"#1a56db22":u.genState==="error"?"#c0392b22":"#33333344",color:u.segTaskId&&u.model3d?"#f59e0b":u.model3d?"#a78bfa":u.genState==="done"?"#22c55e":u.genState==="loading"?"#6ea8fe":u.genState==="error"?"#ef4444":"var(--text2)"}}>{u.tripoState==="loading"?(u.tripoProgress?u.tripoProgress+"%":"3D..."):u.segTaskId&&u.model3d?"Seg klar":u.model3d?"3D klar":u.genState==="done"?"klar":u.genState==="loading"?"...":u.genState==="error"?"fel":"vantar"}</span>
          <div style={{display:"flex",gap:"3px"}}><button onClick={e=>{e.stopPropagation();generateOne(i);}} style={{background:"#1a56db22",border:"none",borderRadius:"4px",padding:"2px 5px",cursor:"pointer",fontSize:"10px",color:"#6ea8fe"}}>&#x21BA;</button><button onClick={e=>{e.stopPropagation();deleteUpload(i);}} style={{background:"#c0392b22",border:"none",borderRadius:"4px",padding:"2px 5px",cursor:"pointer",fontSize:"10px",color:"#ef4444"}}>X</button></div>
        </div>
      </div>))}</div>
      <div style={{padding:"10px",borderTop:"1px solid var(--border)"}}><button onClick={logout} style={{width:"100%",padding:"5px 0",background:"transparent",border:"1px solid var(--border2)",borderRadius:"6px",fontSize:"11px",color:"var(--text2)",cursor:"pointer"}}>Logga ut</button></div>
    </aside>
    <div style={{flex:1,background:"#fadcd9",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"10px 16px",borderBottom:"1px solid #e8b8b0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f5cdc8"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:0}}>{editingPrompt?(<input autoFocus value={prompt} onChange={e=>setPrompt(e.target.value)} onBlur={()=>setEditingPrompt(false)} onKeyDown={e=>e.key==="Enter"&&setEditingPrompt(false)} style={{flex:1,padding:"5px 8px",borderRadius:"6px",border:"1px solid #ccc",fontSize:"12px",background:"white",color:"#111",outline:"none"}}/>):(<p onClick={()=>setEditingPrompt(true)} style={{fontSize:"12px",color:"#444",margin:0,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"text",padding:"5px 0"}}>{prompt||"Klicka for att redigera prompt..."}</p>)}</div>
        <div style={{display:"flex",gap:"6px",flexShrink:0,marginLeft:"10px"}}>
          <button onClick={()=>router.push("/projects/"+projectId+"/qr")} style={{padding:"6px 10px",background:"transparent",border:"1px solid #bbb",borderRadius:"8px",fontSize:"12px",color:"#555",cursor:"pointer"}}>+ Bilder</button>
          <button onClick={generateMissing} disabled={anyLoading||uploads.length===0} style={{padding:"6px 14px",background:anyLoading?"#aaa":"#1a56db",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:anyLoading?"not-allowed":"pointer"}}>{anyLoading?"Genererar...":"Generera nya"}</button><button onClick={generateAll} disabled={anyLoading||uploads.length===0} style={{marginLeft:"4px",padding:"6px 14px",background:anyLoading?"#aaa":"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:anyLoading?"not-allowed":"pointer"}}>Generera alla</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        {!cur?(<p style={{color:"#888",fontSize:"14px"}}>Inga uppladdade bilder</p>
        ):tab==="ai"?(cur.genState==="loading"?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}><div style={{width:"32px",height:"32px",border:"3px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{color:"#555",fontSize:"13px"}}>Genererar AI-bild...</p></div>
        ):cur.aiImage?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
          <img src={cur.aiImage} style={{maxWidth:"100%",maxHeight:"320px",borderRadius:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}} alt="AI"/>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>dlUrl(cur.aiImage!,"ai-bild.jpg")} style={B("#555")}>Ladda ner</button>
            <button onClick={()=>shareOrDl(cur.aiImage!,"ai-bild.jpg","image/jpeg")} style={B("#1a56db")}>Dela</button>
          </div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
            {cur.model3d?(<button onClick={()=>setTab("3d")} style={B(cur.segTaskId?"#f59e0b":"#22c55e")}>{cur.segTaskId?"Visa segmenterad":"Visa 3D"}</button>
            ):cur.tripoState==="loading"?(<div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"120px",height:"5px",background:"#ddd",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(cur.tripoProgress||0)+"%",height:"100%",background:"#7c3aed",transition:"width 0.5s"}}/></div><p style={{color:"#7c3aed",fontSize:"11px",margin:0}}>{cur.tripoProgress||0}%</p></div>
            ):cur.tripoState==="error"?(<button onClick={()=>runTripo(selected,false)} style={B("#ef4444")}>Forsok igen</button>
            ):(<><button onClick={()=>runTripo(selected,false)} style={B("#7c3aed")}>Skapa 3D</button><button onClick={()=>runTripo(selected,true)} style={B("#f59e0b")}>Segmentering</button></>)}
          </div>
        </div>):cur.genState==="error"?(<div style={{textAlign:"center"}}><p style={{color:"#ef4444",fontSize:"13px",marginBottom:"8px"}}>Fel: {cur.aiError}</p><button onClick={()=>generateOne(selected)} style={B("#1a56db")}>Forsok igen</button></div>
        ):(<div style={{textAlign:"center"}}><p style={{color:"#888",fontSize:"13px",marginBottom:"8px"}}>Ingen AI-bild</p><button onClick={()=>generateOne(selected)} style={B("#1a56db")}>Generera</button></div>)
        ):tab==="skiss"?(<SkissView projectId={projectId} upload={cur}/>
        ):(cur.segTaskId?<SegViewer modelUrl={cur.model3d||""} segTaskId={cur.segTaskId} projectId={projectId} uploadId={cur.id} aiImage={cur.aiImage}/>:cur.model3d?<ModelViewer modelUrl={cur.model3d} uploadId={cur.id}/>:(<p style={{color:"#888",fontSize:"13px"}}>{cur.aiImage?"Klicka Skapa 3D":"Generera AI-bild forst"}</p>))}
      </div>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </main>);}

function SkissView({projectId,upload}:{projectId:string;upload:Upload}){
  const[src,setSrc]=useState<string|null>(null);
  useEffect(()=>{fetch("/api/projects/"+projectId+"/uploads/"+upload.id+"/data").then(r=>r.json()).then(d=>setSrc("data:"+d.mimetype+";base64,"+d.data)).catch(()=>setSrc(null));},[upload.id,projectId]);
  if(!src)return<p style={{color:"#888",fontSize:"13px"}}>Laddar...</p>;
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
    <img src={src} style={{maxWidth:"100%",maxHeight:"380px",borderRadius:"12px"}} alt="Skiss"/>
    <div style={{display:"flex",gap:"8px"}}>
      <button onClick={()=>dlUrl(src,"skiss.jpg")} style={{padding:"7px 14px",background:"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Ladda ner</button>
      <button onClick={()=>shareOrDl(src,"skiss.jpg","image/jpeg")} style={{padding:"7px 14px",background:"#1a56db",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Dela</button>
    </div>
  </div>);}

function MRCodeModal({modelUrl,uploadId,onClose}:{modelUrl:string;uploadId:number;onClose:()=>void}){
  const[code,setCode]=useState<string|null>(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    fetch("/api/vr",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({modelUrl,uploadId})})
      .then(r=>r.json()).then(d=>{setCode(d.code);setLoading(false);});
  },[modelUrl,uploadId]);
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}} onClick={onClose}>
    <div style={{background:"white",borderRadius:"16px",padding:"32px",textAlign:"center",maxWidth:"320px",width:"90%"}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:"40px",marginBottom:"12px"}}>&#x1F97D;</div>
      <h2 style={{margin:"0 0 8px",fontSize:"20px",fontWeight:700,color:"#111"}}>Visa i Mixed Reality</h2>
      <p style={{fontSize:"13px",color:"#666",marginBottom:"24px"}}>Oppna Meta Quest Browser och ga till:<br/><strong style={{color:"#1a56db"}}>{typeof window!=="undefined"?window.location.origin:""}/ar</strong></p>
      {loading?(<div style={{width:"64px",height:"64px",border:"4px solid #f59e0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
      ):(<div style={{display:"flex",gap:"12px",justifyContent:"center",marginBottom:"20px"}}>
        {(code||"---").split("").map((d,i)=>(<div key={i} style={{width:"64px",height:"80px",background:"#f59e0b",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"40px",fontWeight:700,color:"white"}}>{d}</div>))}
      </div>)}
      <p style={{fontSize:"11px",color:"#aaa",marginBottom:"16px"}}>Koden ar giltig i 24 timmar</p>
      <button onClick={onClose} style={{width:"100%",padding:"10px",background:"#333",border:"none",borderRadius:"8px",color:"white",fontSize:"14px",cursor:"pointer"}}>Stang</button>
    </div>
  </div>);}

function ModelViewer({modelUrl,uploadId}:{modelUrl:string;uploadId:number}){
  const ref=useRef<HTMLDivElement>(null);const proxySrc="/api/proxy?url="+encodeURIComponent(modelUrl);
  const[showMR,setShowMR]=useState(false);
  useEffect(()=>{if(!ref.current)return;if(!document.querySelector('script[data-mv]')){const s=document.createElement("script");s.type="module";s.setAttribute("data-mv","1");s.src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";document.head.appendChild(s);}
    const build=()=>{if(!ref.current)return;const mv=document.createElement("model-viewer")as any;mv.setAttribute("src",proxySrc);mv.setAttribute("alt","3D");mv.setAttribute("camera-controls","");mv.setAttribute("shadow-intensity","1");mv.style.cssText="width:100%;height:360px;background:#f5e8e5;";ref.current.innerHTML="";ref.current.appendChild(mv);};
    if(customElements.get("model-viewer"))build();else{customElements.whenDefined("model-viewer").then(build);setTimeout(build,3000);}
    return()=>{if(ref.current)ref.current.innerHTML="";};},[proxySrc]);
  return(<div style={{width:"100%",maxWidth:"600px",display:"flex",flexDirection:"column",gap:"10px"}}>
    <div style={{borderRadius:"12px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",background:"#f5e8e5"}}>
      <div ref={ref} style={{width:"100%",height:"360px",background:"#f5e8e5",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#999",fontSize:"12px"}}>Laddar...</p></div>
      <p style={{textAlign:"center",fontSize:"11px",color:"#aaa",padding:"6px 0",margin:0}}>Dra for att rotera - Scroll for zoom</p>
    </div>
    <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
      <button onClick={()=>dlUrl(proxySrc,"3d-modell.glb")} style={{padding:"7px 14px",background:"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Ladda ner GLB</button>
      <button onClick={()=>shareOrDl(proxySrc,"3d-modell.glb","model/gltf-binary")} style={{padding:"7px 14px",background:"#7c3aed",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Dela</button>
      <button onClick={()=>setShowMR(true)} style={{padding:"7px 14px",background:"#0ea5e9",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Visa i MR</button>
    </div>
    {showMR&&<MRCodeModal modelUrl={modelUrl} uploadId={uploadId} onClose={()=>setShowMR(false)}/>}
  </div>);}

function PartInset({modelUrl,part,label}:{modelUrl:string;part:string;label:string}){
  const ref=useRef<HTMLDivElement>(null);
  const src="/api/tripo/split-glb?isolate="+encodeURIComponent(part)+"&modelUrl="+encodeURIComponent(modelUrl);
  useEffect(()=>{
    if(!ref.current)return;
    const build=()=>{if(!ref.current)return;const mv=document.createElement("model-viewer") as any;mv.setAttribute("src",src);mv.setAttribute("alt",label);mv.setAttribute("camera-controls","");mv.setAttribute("auto-rotate","");mv.setAttribute("rotation-per-second","40deg");mv.setAttribute("interaction-prompt","none");mv.setAttribute("shadow-intensity","0.6");mv.setAttribute("environment-image","neutral");mv.style.cssText="width:100%;height:100%;background:#ffffff;--poster-color:transparent;";ref.current.innerHTML="";ref.current.appendChild(mv);};
    if(customElements.get("model-viewer"))build();else customElements.whenDefined("model-viewer").then(build);
    return()=>{if(ref.current)ref.current.innerHTML="";};
  },[src]);
  return(<div style={{position:"absolute",top:"10px",right:"10px",width:"150px",height:"150px",borderRadius:"10px",overflow:"hidden",border:"2px solid #f59e0b",boxShadow:"0 4px 16px rgba(0,0,0,0.25)",background:"white"}}>
    <div ref={ref} style={{width:"100%",height:"118px"}}/>
    <div style={{height:"32px",display:"flex",alignItems:"center",justifyContent:"center",background:"#f59e0b",color:"white",fontSize:"11px",fontWeight:600,padding:"0 6px",textAlign:"center"}}>{label}</div>
  </div>);
}

function SegViewer({modelUrl,segTaskId,projectId,uploadId,aiImage}:{modelUrl:string;segTaskId:string;projectId:string;uploadId:number;aiImage?:string}){
  const ref=useRef<HTMLDivElement>(null);
  const[currentUrl,setCurrentUrl]=useState(modelUrl);
  const fullProxy="/api/proxy?url="+encodeURIComponent(currentUrl);
  const[meshNames,setMeshNames]=useState<string[]>([]);
  const meshNamesRef=useRef<string[]>([]);
  useEffect(()=>{meshNamesRef.current=meshNames;},[meshNames]);
  const[partLabels,setPartLabels]=useState<Record<string,string>>({});
  const[loadingNames,setLoadingNames]=useState(true);
  const[selParts,setSelParts]=useState<string[]>([]);
  const[focusPart,setFocusPart]=useState<string|null>(null);
  const[partPrompt,setPartPrompt]=useState("");
  const[previewImg,setPreviewImg]=useState<string|null>(null);
  const[step,setStep]=useState<"idle"|"prompting"|"previewing"|"texturing">("idle");
  const[progress,setProgress]=useState(0);
  const[statusMsg,setStatusMsg]=useState("");
  const[error,setError]=useState("");
  const[showMR,setShowMR]=useState(false);

  useEffect(()=>{
    if(!modelUrl)return;
    fetch("/api/tripo/split-glb?modelUrl="+encodeURIComponent(modelUrl))
      .then(r=>r.json()).then(async d=>{
        const names:string[]=d.names||[];
        setMeshNames(names);
        if(names.length>0&&aiImage){
          try{
            const res=await fetch("/api/ai/parts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageData:aiImage,partCount:names.length})});
            const json=await res.json();
            if(json.names&&Object.keys(json.names).length>0) setPartLabels(json.names);
          }catch{}
        }
        setLoadingNames(false);
      }).catch(()=>setLoadingNames(false));
  },[modelUrl,aiImage]);

  

  function togglePart(name:string){setSelParts(prev=>prev.includes(name)?prev.filter(p=>p!==name):[...prev,name]);}
  function partNum(n:string){const i=meshNames.indexOf(n);return "Del "+(i+1);}
  function partHint(n:string){const g=partLabels[n];return g&&g!==n?g:"";}
  function partLabel(n:string){return partNum(n);}
  function selLabels(){return selParts.map(partLabel).join(", ");}

  async function generatePreview(){
    if(selParts.length===0||!partPrompt.trim())return;
    if(!aiImage){setError("Ingen AI-bild tillganglig");setStep("prompting");return;}
    setStep("previewing");setPreviewImg(null);setError("");setFocusPart(null);
    try{
      const prompt="Take this image and modify ONLY the "+selLabels()+" to look like: "+partPrompt+". Keep everything else exactly the same. Show the complete object.";
      const b64=aiImage.includes(",")?aiImage.split(",")[1]:aiImage;
      const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data:b64,mimeType:"image/jpeg"}]})});
      if(!res.ok){setError("Fel "+res.status+" - forsok igen");setStep("prompting");return;}
      const json=await res.json();
      if(json.images?.[0])setPreviewImg(json.images[0]);
      else{setError(json.error||"Kunde inte generera forhandsgranskning");setStep("prompting");}
    }catch(e){setError("Natverksfel: "+String(e));setStep("prompting");}
  }

  async function applyTexture(){
    if(selParts.length===0||!partPrompt.trim())return;
    setStep("texturing");setProgress(10);setError("");setStatusMsg("Texturerar "+selLabels()+"...");
    try{
      const txRes=await fetch("/api/tripo/retexture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({originalTaskId:segTaskId,previewImage:previewImg})});
      const txJson=await txRes.json();
      if(!txJson.taskId){setError(txJson.error||"Texturering misslyckades");setStep("prompting");return;}
      for(let a=0;a<90;a++){
        await new Promise(r=>setTimeout(r,4000));
        const pd=await(await fetch("/api/tripo/retexture?taskId="+txJson.taskId)).json();
        if(typeof pd.progress==="number")setProgress(10+Math.round((pd.progress/100)*90));
        if(pd.status==="success"&&pd.modelUrl){
          await fetch("/api/projects/"+projectId+"/uploads/"+uploadId+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({segmentedModelUrl:pd.modelUrl})});
          setCurrentUrl(pd.modelUrl);setStep("idle");setSelParts([]);setPartPrompt("");setPreviewImg(null);setStatusMsg("");return;
        }
        if(pd.status==="failed"||pd.status==="cancelled"){setError("Texturering misslyckades"+(pd.errorCode?" (kod "+pd.errorCode+")":""));setStep("prompting");return;}
      }
      setError("Timeout");setStep("prompting");
    }catch(e){setError(String(e));setStep("prompting");}}

  

  return(<div style={{width:"100%",maxWidth:"600px",display:"flex",flexDirection:"column",gap:"10px"}}>
    <div style={{borderRadius:"12px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",background:"#f5e8e5",position:"relative"}}>
      <ThreePartViewer modelUrl={currentUrl} selected={selParts} onToggle={togglePart} onHover={setFocusPart} height={300}/>
      
      <p style={{textAlign:"center",fontSize:"11px",color:"#aaa",padding:"6px 0",margin:0}}>Dra for att rotera - Scroll for zoom</p>
    </div>

    {(step==="idle"||step==="prompting")&&(<div style={{background:"white",borderRadius:"10px",padding:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
      <p style={{margin:"0 0 4px",fontSize:"12px",fontWeight:600,color:"#333"}}>Valj delar att andra (en eller flera):</p>
      <p style={{margin:"0 0 8px",fontSize:"11px",color:"#999"}}>Klicka direkt pa delarna i 3D-modellen for att markera dem (markerade delar lyser upp). Du kan ocksa anvanda knapparna nedan. Valj en eller flera delar.</p>
      {loadingNames?<p style={{fontSize:"11px",color:"#aaa",margin:0}}>Analyserar delar...</p>
      :meshNames.length>0?(<div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px"}}>
        {meshNames.map(n=>{const on=selParts.includes(n);return(<button key={n} onClick={()=>togglePart(n)} onMouseEnter={()=>setFocusPart(n)} onMouseLeave={()=>setFocusPart(null)} title={n} style={{padding:"6px 12px",background:on?"#f59e0b":"#f3f4f6",border:on?"2px solid #d97706":"2px solid transparent",borderRadius:"6px",fontSize:"11px",fontWeight:on?600:500,color:on?"white":"#555",cursor:"pointer"}}>{on?"\u2713 ":""}{partNum(n)}</button>);})}
      </div>):<p style={{fontSize:"11px",color:"#aaa",margin:0}}>Inga delar hittades</p>}
      {selParts.length>0&&(<>
        <p style={{margin:"0 0 8px",fontSize:"11px",color:"#666"}}>Valda: <strong style={{color:"#d97706"}}>{selLabels()}</strong></p>
        <div style={{display:"flex",gap:"8px"}}>
          <input value={partPrompt} onChange={e=>setPartPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&generatePreview()} placeholder={"Beskriv detaljerat: farg, material, monster, finish (t.ex. blank rod laderkladsel)..."} style={{flex:1,padding:"8px 10px",borderRadius:"7px",border:"1px solid #ddd",fontSize:"12px",outline:"none"}}/>
          <button onClick={generatePreview} disabled={!partPrompt.trim()} style={{padding:"8px 14px",background:"#1a56db",border:"none",borderRadius:"7px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer",whiteSpace:"nowrap"}}>Forhandsgranska</button>
        </div>
      </>)}
      {error&&<p style={{color:"#ef4444",fontSize:"11px",margin:"6px 0 0"}}>{error}</p>}
    </div>)}

    {step==="previewing"&&(<div style={{background:"white",borderRadius:"10px",padding:"14px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
      {!previewImg?(<div style={{display:"flex",alignItems:"center",gap:"10px",padding:"8px 0"}}><div style={{width:"20px",height:"20px",border:"2px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/><p style={{margin:0,fontSize:"12px",color:"#555"}}>Genererar forhandsgranskning med AI...</p></div>
      ):(<>
        <p style={{margin:"0 0 8px",fontSize:"12px",fontWeight:600,color:"#333"}}>{selLabels()}: "{partPrompt}"</p>
        <img src={previewImg.startsWith("data:")?previewImg:"data:image/jpeg;base64,"+previewImg} style={{width:"100%",maxHeight:"200px",objectFit:"contain",borderRadius:"8px",marginBottom:"10px",background:"#f5f5f5"}} alt="Forhandsgranskning"/>
        <div style={{display:"flex",gap:"8px"}}>
          <button onClick={applyTexture} style={{flex:1,padding:"9px",background:"#22c55e",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:600,color:"white",cursor:"pointer"}}>Godkann - Kor i Tripo</button>
          <button onClick={()=>setStep("prompting")} style={{padding:"9px 12px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"12px",color:"#555",cursor:"pointer"}}>Justera</button>
          <button onClick={()=>{setStep("idle");setPreviewImg(null);}} style={{padding:"9px 12px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"12px",color:"#888",cursor:"pointer"}}>Avbryt</button>
        </div>
      </>)}
    </div>)}

    {step==="texturing"&&(<div style={{background:"white",borderRadius:"10px",padding:"14px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)"}}>
      <div style={{width:"100%",height:"5px",background:"#eee",borderRadius:"3px",overflow:"hidden",marginBottom:"6px"}}><div style={{width:progress+"%",height:"100%",background:"#22c55e",transition:"width 0.5s"}}/></div>
      <p style={{fontSize:"11px",color:"#22c55e",margin:0}}>{statusMsg} {progress}%</p>
    </div>)}

    <div style={{display:"flex",gap:"8px",justifyContent:"center",flexWrap:"wrap"}}>
      <button onClick={()=>dlUrl(fullProxy,"seg-modell.glb")} style={{padding:"7px 14px",background:"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Ladda ner GLB</button>
      <button onClick={()=>setShowMR(true)} style={{padding:"7px 14px",background:"#0ea5e9",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>Visa i MR</button>
    </div>
    {showMR&&<MRCodeModal modelUrl={currentUrl} uploadId={uploadId} onClose={()=>setShowMR(false)}/>}
  </div>);}
