"use client";
import ThreePartViewer from "./ThreePartViewer";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
type Tab="ai"|"skiss"|"3d";
type GenState="idle"|"loading"|"done"|"error";
type Upload={id:number;filename:string;mimetype:string;aiImage?:string;aiError?:string;genState:GenState;model3d?:string;tripoState?:string;tripoProgress?:number;tripoTaskId?:string;segmentedModel?:string;segTaskId?:string;};
function dlUrl(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;a.click();}
function shareOrDl(url:string,name:string,type:string){fetch(url).then(r=>r.blob()).then(blob=>{const f=new File([blob],name,{type});if((navigator as any).canShare?.({files:[f]})){(navigator as any).share({files:[f]}).catch(()=>dlUrl(url,name));}else dlUrl(url,name);}).catch(()=>dlUrl(url,name));}
type Rect={x:number;y:number;w:number;h:number};
function AiImageEditor({aiImage,projectId,uploadId,onNewImage,onCancel}:{aiImage:string;projectId:string;uploadId:number;onNewImage:(img:string)=>void;onCancel:()=>void}){
  const imgRef=useRef<HTMLImageElement>(null);
  const[rect,setRect]=useState<Rect|null>(null);
  const[dragging,setDragging]=useState(false);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const[partPrompt,setPartPrompt]=useState("");
  const[state,setState]=useState<"idle"|"loading"|"done">("idle");
  const[error,setError]=useState("");
  const[resultImg,setResultImg]=useState<string|null>(null);
  function getRelPos(e:React.MouseEvent,el:HTMLElement){const r=el.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};}
  function onMouseDown(e:React.MouseEvent){const img=imgRef.current;if(!img)return;e.preventDefault();const pos=getRelPos(e,img);dragStart.current=pos;setDragging(true);setRect(null);setResultImg(null);setError("");setState("idle");}
  function onMouseMove(e:React.MouseEvent){if(!dragging||!dragStart.current||!imgRef.current)return;const pos=getRelPos(e,imgRef.current);const x=Math.min(dragStart.current.x,pos.x);const y=Math.min(dragStart.current.y,pos.y);const w=Math.abs(pos.x-dragStart.current.x);const h=Math.abs(pos.y-dragStart.current.y);setRect({x,y,w,h});}
  function onMouseUp(e:React.MouseEvent){setDragging(false);if(!dragStart.current||!imgRef.current)return;const pos=getRelPos(e,imgRef.current);const x=Math.min(dragStart.current.x,pos.x);const y=Math.min(dragStart.current.y,pos.y);const w=Math.abs(pos.x-dragStart.current.x);const h=Math.abs(pos.y-dragStart.current.y);if(w>0.02&&h>0.02)setRect({x,y,w,h});else setRect(null);dragStart.current=null;}
  async function applyEdit(){if(!rect||!partPrompt.trim())return;setState("loading");setError("");try{const canvas=document.createElement("canvas");const natW=imgRef.current?.naturalWidth||512;const natH=imgRef.current?.naturalHeight||512;canvas.width=natW;canvas.height=natH;const ctx=canvas.getContext("2d")!;ctx.fillStyle="black";ctx.fillRect(0,0,natW,natH);ctx.fillStyle="white";ctx.fillRect(Math.round(rect.x*natW),Math.round(rect.y*natH),Math.round(rect.w*natW),Math.round(rect.h*natH));const maskB64=canvas.toDataURL("image/png").split(",")[1];const srcB64=aiImage.includes(",")?aiImage.split(",")[1]:aiImage;const prompt="Edit only the region marked white in the mask image: "+partPrompt+". Keep everything outside that region exactly the same.";const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data:srcB64,mimeType:"image/jpeg"},{data:maskB64,mimeType:"image/png"}]})});if(!res.ok){setError("Fel "+res.status);setState("idle");return;}const json=await res.json();if(json.images?.[0]){setResultImg(json.images[0]);setState("done");}else{setError(json.error||"Inget resultat");setState("idle");}}catch(e2){setError(String(e2));setState("idle");}}
  async function confirmResult(){if(!resultImg)return;await fetch("/api/projects/"+projectId+"/uploads/"+uploadId+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({aiImage:resultImg})});onNewImage(resultImg);}
  const hasRect=!!(rect&&rect.w>0.01&&rect.h>0.01);
  return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%"}}>
      <p style={{margin:0,fontSize:"11px",color:"#666"}}>{hasRect?"Markering aktiv - skriv vad som ska andras":"Dra pa bilden for att markera ett omrade"}</p>
      <button onClick={onCancel} style={{padding:"4px 10px",background:"transparent",border:"1px solid #ccc",borderRadius:"6px",fontSize:"11px",color:"#888",cursor:"pointer"}}>Stang redigering</button>
    </div>
    <div style={{position:"relative",width:"100%",userSelect:"none"}}>
      <img ref={imgRef} src={aiImage} draggable={false} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} style={{width:"100%",maxHeight:"340px",objectFit:"contain",borderRadius:"10px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",cursor:"crosshair",display:"block"}} alt="AI"/>
      {rect&&rect.w>0.005&&rect.h>0.005&&(<div style={{position:"absolute",left:(rect.x*100)+"%",top:(rect.y*100)+"%",width:(rect.w*100)+"%",height:(rect.h*100)+"%",border:"2px solid #f59e0b",background:"rgba(245,158,11,0.18)",pointerEvents:"none",borderRadius:"3px"}}/>)}
    </div>
    {hasRect&&state!=="done"&&(<div style={{display:"flex",gap:"8px",width:"100%"}}>
      <input value={partPrompt} onChange={e=>setPartPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyEdit()} placeholder="Vad ska andras? (t.ex. rod lader, metallic silver...)" style={{flex:1,padding:"8px 10px",borderRadius:"7px",border:"1px solid #ddd",fontSize:"12px",outline:"none"}} disabled={state==="loading"}/>
      <button onClick={applyEdit} disabled={!partPrompt.trim()||state==="loading"} style={{padding:"8px 14px",background:state==="loading"?"#aaa":"#f59e0b",border:"none",borderRadius:"7px",fontSize:"12px",fontWeight:600,color:"white",cursor:state==="loading"?"not-allowed":"pointer",whiteSpace:"nowrap"}}>{state==="loading"?"Genererar...":"Andra omradet"}</button>
      <button onClick={()=>{setRect(null);setPartPrompt("");setError("");}} style={{padding:"8px 10px",background:"#f3f4f6",border:"none",borderRadius:"7px",fontSize:"12px",color:"#888",cursor:"pointer"}}>Rensa</button>
    </div>)}
    {error&&<p style={{color:"#ef4444",fontSize:"11px",margin:0,alignSelf:"flex-start"}}>{error}</p>}
    {state==="loading"&&<div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"18px",height:"18px",border:"2px solid #f59e0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{margin:0,fontSize:"11px",color:"#888"}}>Genererar andring...</p></div>}
    {state==="done"&&resultImg&&(<div style={{width:"100%",display:"flex",flexDirection:"column",gap:"8px"}}>
      <p style={{margin:0,fontSize:"12px",fontWeight:600,color:"#333"}}>Resultat:</p>
      <img src={resultImg.startsWith("data:")?resultImg:"data:image/jpeg;base64,"+resultImg} style={{width:"100%",maxHeight:"300px",objectFit:"contain",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}} alt="Resultat"/>
      <div style={{display:"flex",gap:"8px"}}>
        <button onClick={confirmResult} style={{flex:1,padding:"9px",background:"#22c55e",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:600,color:"white",cursor:"pointer"}}>Spara som ny AI-bild</button>
        <button onClick={()=>{setState("idle");setResultImg(null);}} style={{padding:"9px 12px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"12px",color:"#555",cursor:"pointer"}}>Forsok igen</button>
        <button onClick={()=>{setState("idle");setResultImg(null);setRect(null);setPartPrompt("");}} style={{padding:"9px 12px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"12px",color:"#888",cursor:"pointer"}}>Avbryt</button>
      </div>
    </div>)}
  </div>);}
export default function GeneratePage(){
  const router=useRouter();const params=useParams();const projectId=params?.id as string;
  const[tab,setTab]=useState<Tab>(()=>{try{return (localStorage.getItem("tab_"+projectId) as Tab)||"ai";}catch{return "ai";}});
  const[uploads,setUploads]=useState<Upload[]>([]);
  const[selected,setSelected]=useState(()=>{try{return parseInt(localStorage.getItem("sel_"+projectId)||"0")||0;}catch{return 0;}});
  const[prompt,setPrompt]=useState("");const[ready,setReady]=useState(false);const[editingPrompt,setEditingPrompt]=useState(false);
  const[aiEditMode,setAiEditMode]=useState(false);
  const uploadsRef=useRef<Upload[]>([]);useEffect(()=>{uploadsRef.current=uploads;},[uploads]);
  useEffect(()=>{try{localStorage.setItem("tab_"+projectId,tab);}catch{}},[tab,projectId]);
  useEffect(()=>{try{localStorage.setItem("sel_"+projectId,String(selected));}catch{}},[selected,projectId]);
  useEffect(()=>{ function openLightbox(src:string){ const ov=document.createElement("div"); ov.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;padding:20px;"; const im=document.createElement("img"); im.src=src; im.style.cssText="max-width:95%;max-height:95%;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.5);"; const cl=document.createElement("div"); cl.textContent="X"; cl.style.cssText="position:absolute;top:18px;right:24px;color:white;font-size:28px;font-weight:700;cursor:pointer;line-height:1;"; ov.appendChild(im);ov.appendChild(cl); ov.addEventListener("click",()=>ov.remove()); document.body.appendChild(ov); } function decorate(){ const imgs=Array.from(document.querySelectorAll("img")); for(const img of imgs){ const el=img as HTMLImageElement; if(el.dataset.zoomReady)continue; if(el.naturalWidth&&el.naturalWidth<80)continue; if(el.width&&el.width<80)continue; el.dataset.zoomReady="1"; const wrap=el.parentElement; if(!wrap)continue; if(getComputedStyle(wrap).position==="static")wrap.style.position="relative"; const btn=document.createElement("button"); btn.type="button"; btn.innerHTML="&#128269;"; btn.title="Visa i helskarm"; btn.style.cssText="position:absolute;top:6px;right:6px;width:28px;height:28px;border:none;border-radius:6px;background:rgba(0,0,0,0.55);color:white;font-size:14px;cursor:pointer;z-index:50;display:flex;align-items:center;justify-content:center;padding:0;"; btn.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();openLightbox(el.currentSrc||el.src);}); wrap.appendChild(btn); } } decorate(); const iv=setInterval(decorate,1500); return function(){clearInterval(iv);}; },[]);
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
      <div style={{display:"flex",borderBottom:"1px solid var(--border)"}}>{(["ai","skiss","3d"]as Tab[]).map(t=>(<button key={t} onClick={()=>{setTab(t);setAiEditMode(false);}} style={{flex:1,padding:"8px 0",background:tab===t?"var(--accent)":"transparent",border:"none",color:tab===t?"white":"var(--text2)",fontSize:"11px",fontWeight:tab===t?500:400,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.04em"}}>{t==="ai"?"AI":t==="skiss"?"Skiss":"3D"}</button>))}</div>
      <div style={{flex:1,overflowY:"auto",padding:"8px"}}>{uploads.map((u,i)=>(<div key={u.id} onClick={()=>{setSelected(i);setAiEditMode(false);}} style={{marginBottom:"8px",borderRadius:"8px",overflow:"hidden",border:selected===i?"2px solid #1a56db":"1px solid var(--border)",cursor:"pointer",background:"var(--bg)"}}>
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
          <button onClick={generateMissing} disabled={anyLoading||uploads.length===0} style={{padding:"6px 14px",background:anyLoading?"#aaa":"#1a56db",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:anyLoading?"not-allowed":"pointer"}}>{anyLoading?"Genererar...":"Generera nya"}</button>
          <button onClick={generateAll} disabled={anyLoading||uploads.length===0} style={{marginLeft:"4px",padding:"6px 14px",background:anyLoading?"#aaa":"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:anyLoading?"not-allowed":"pointer"}}>Generera alla</button>
        </div>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
        {!cur?(<p style={{color:"#888",fontSize:"14px"}}>Inga uppladdade bilder</p>
        ):tab==="ai"?(cur.genState==="loading"?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}><div style={{width:"32px",height:"32px",border:"3px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{color:"#555",fontSize:"13px"}}>Genererar AI-bild...</p></div>
        ):cur.aiImage?(aiEditMode?(<AiImageEditor aiImage={cur.aiImage} projectId={projectId} uploadId={cur.id} onNewImage={(img)=>{setUploads(p=>p.map((x,idx)=>idx===selected?{...x,aiImage:img}:x));setAiEditMode(false);}} onCancel={()=>setAiEditMode(false)}/>):(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
          <img src={cur.aiImage} style={{maxWidth:"100%",maxHeight:"320px",borderRadius:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}} alt="AI"/>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>dlUrl(cur.aiImage!,"ai-bild.jpg")} style={B("#555")}>Ladda ner</button>
            <button onClick={()=>shareOrDl(cur.aiImage!,"ai-bild.jpg","image/jpeg")} style={B("#1a56db")}>Dela</button>
            <button onClick={()=>setAiEditMode(true)} style={B("#f59e0b")}>Redigera omrade</button>
          </div>
          <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
            {cur.model3d?(<button onClick={()=>setTab("3d")} style={B(cur.segTaskId?"#f59e0b":"#22c55e")}>{cur.segTaskId?"Visa segmenterad":"Visa 3D"}</button>
            ):cur.tripoState==="loading"?(<div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"120px",height:"5px",background:"#ddd",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(cur.tripoProgress||0)+"%",height:"100%",background:"#7c3aed",transition:"width 0.5s"}}/></div><p style={{color:"#7c3aed",fontSize:"11px",margin:0}}>{cur.tripoProgress||0}%</p></div>
            ):cur.tripoState==="error"?(<button onClick={()=>runTripo(selected,false)} style={B("#ef4444")}>Forsok igen</button>
            ):(<><button onClick={()=>runTripo(selected,false)} style={B("#7c3aed")}>Skapa 3D</button><button onClick={()=>runTripo(selected,true)} style={B("#f59e0b")}>Segmentering</button></>)}
          </div>
        </div>)
        ):cur.genState==="error"?(<div style={{textAlign:"center"}}><p style={{color:"#ef4444",fontSize:"13px",marginBottom:"8px"}}>Fel: {cur.aiError}</p><button onClick={()=>generateOne(selected)} style={B("#1a56db")}>Forsok igen</button></div>
        ):(<div style={{textAlign:"center"}}><p style={{color:"#888",fontSize:"13px",marginBottom:"8px"}}>Ingen AI-bild</p><button onClick={()=>generateOne(selected)} style={B("#1a56db")}>Generera</button></div>)
        ):tab==="skiss"?(<SkissView projectId={projectId} upload={cur}/>
        ):(cur.segTaskId?<SegViewer modelUrl={cur.model3d||""} segTaskId={cur.segTaskId} projectId={projectId} uploadId={cur.id} aiImage={cur.aiImage}/>:cur.model3d?<ModelViewer modelUrl={cur.model3d} uploadId={cur.id}/>:(<p style={{color:"#888",fontSize:"13px"}}>{cur.aiImage?"Klicka Skapa 3D":"Generera AI-bild forst"}</p>))}
      </div>
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </main>);}
TEST_APPEND
