"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";


type Tab = "ai"|"skiss"|"3d";
type GenState = "idle"|"loading"|"done"|"error";
type Upload = { id:number;filename:string;mimetype:string;aiImage?:string;aiError?:string;genState:GenState;model3d?:string;tripoState?:string;tripoProgress?:number;tripoTaskId?:string;segState?:string;segProgress?:number;segmentedModel?:string; };


function dlUrl(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;a.click();}
function shareOrDl(url:string,name:string,type:string){fetch(url).then(r=>r.blob()).then(blob=>{const file=new File([blob],name,{type});if((navigator as any).canShare?.({files:[file]})){(navigator as any).share({files:[file]}).catch(()=>dlUrl(url,name));}else{dlUrl(url,name);}}).catch(()=>dlUrl(url,name));}


export default function GeneratePage() {
  const router=useRouter();const params=useParams();const projectId=params?.id as string;
  const [tab,setTab]=useState<Tab>("ai");const [uploads,setUploads]=useState<Upload[]>([]);const [selected,setSelected]=useState(0);
  const [prompt,setPrompt]=useState("");const [ready,setReady]=useState(false);const [editingPrompt,setEditingPrompt]=useState(false);
  const uploadsRef=useRef<Upload[]>([]);useEffect(()=>{uploadsRef.current=uploads;},[uploads]);
  useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(d.error)router.replace("/login");});fetch("/api/projects/"+projectId).then(r=>r.json()).then(d=>setPrompt(d.prompt||""));loadUploads();},[projectId,router]);
  async function loadUploads(){const res=await fetch("/api/projects/"+projectId+"/uploads");if(!res.ok)return;const data=await res.json();setUploads(data.map((u:any)=>({id:u.id,filename:u.filename,mimetype:u.mimetype,aiImage:u.ai_image||undefined,model3d:u.model3d_url||undefined,tripoTaskId:u.tripo_task_id||undefined,segmentedModel:u.segmented_model_url||undefined,genState:(u.ai_image?"done":"idle") as GenState,tripoState:u.model3d_url?"done":undefined,segState:u.segmented_model_url?"done":undefined})));setReady(true);}
  async function generateAll(){if(!prompt.trim())return;await Promise.all(uploadsRef.current.map((_,i)=>generateOne(i)));}
  async function generateOne(i:number){if(!prompt.trim())return;setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,genState:"loading"}:x));const u=uploadsRef.current[i];try{const dr=await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data");const{data,mimetype}=await dr.json();const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data,mimeType:mimetype}]})});const json=await res.json();if(json.images?.[0]){const aiImage=json.images[0];await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({aiImage})});setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiImage,genState:"done"}:x));setTab("ai");}else{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiError:json.error||"fel",genState:"error"}:x));}}catch(e){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiError:String(e),genState:"error"}:x));}}
  async function deleteUpload(i:number){const u=uploadsRef.current[i];await fetch("/api/projects/"+projectId+"/uploads/"+u.id,{method:"DELETE"});const next=uploadsRef.current.filter((_,idx)=>idx!==i);setUploads(next);if(selected>=next.length)setSelected(Math.max(0,next.length-1));}
  async function runTripo(i:number){const aiImage=uploadsRef.current[i]?.aiImage;if(!aiImage)return;setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"loading",tripoProgress:0}:x));const u=uploadsRef.current[i];try{const res=await fetch("/api/tripo/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageData:aiImage})});const json=await res.json();if(!json.taskId){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}const taskId=json.taskId;for(let a=0;a<60;a++){await new Promise(r=>setTimeout(r,4000));const pd=await(await fetch("/api/tripo/generate?taskId="+taskId)).json();if(pd.status==="success"&&pd.modelUrl){await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({model3dUrl:pd.modelUrl,tripoTaskId:taskId})});setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,model3d:pd.modelUrl,tripoTaskId:taskId,tripoState:"done"}:x));setTab("3d");return;}if(pd.status==="failed"||pd.status==="cancelled"){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoProgress:pd.progress??0}:x));}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}catch{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}}
  async function runSegmentation(i:number){
    // Använd befintlig tripoTaskId — ingen ny Tripo-kostnad!
    const taskId=uploadsRef.current[i]?.tripoTaskId;
    if(!taskId){alert("Ingen 3D-task hittades. Skapa 3D-modellen först.");return;}
    setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"loading",segProgress:0}:x));
    const u=uploadsRef.current[i];
    try{
      const res=await fetch("/api/tripo/segment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId})});
      const json=await res.json();
      if(!json.taskId){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"error"}:x));return;}
      const segTaskId=json.taskId;
      for(let a=0;a<60;a++){
        await new Promise(r=>setTimeout(r,4000));
        const pd=await(await fetch("/api/tripo/segment?taskId="+segTaskId)).json();

function ModelViewerParts({modelUrl,tripoTaskId,projectId,uploadId}:{modelUrl:string;tripoTaskId?:string;projectId:string;uploadId:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [parts,setParts]=useState<string[]>([]);
  const [selected,setSelectedPart]=useState<string|null>(null);
  const [prompt,setPartPrompt]=useState("");
  const [retexturing,setRetexturing]=useState(false);
  const [currentUrl,setCurrentUrl]=useState(modelUrl);
  const sceneRef=useRef<any>(null);
  const meshMapRef=useRef<Map<string,any>>(new Map());

  useEffect(()=>{
    if(!canvasRef.current)return;
    const proxySrc="/api/proxy?url="+encodeURIComponent(currentUrl);
    // Load Three.js dynamically
    const loadThree=async()=>{
      const THREE=(window as any).THREE;
      if(!THREE){
        const s=document.createElement("script");
        s.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        document.head.appendChild(s);
        await new Promise(r=>s.onload=r);
      }
      const T=(window as any).THREE;
      // GLTFLoader via importmap workaround — fetch GLB manually
      const canvas=canvasRef.current!;
      const w=canvas.clientWidth||600;const h=canvas.clientHeight||360;
      const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
      renderer.setSize(w,h);renderer.setPixelRatio(window.devicePixelRatio);
      renderer.outputEncoding=T.sRGBEncoding;renderer.shadowMap.enabled=true;
      const scene=new T.Scene();scene.background=new T.Color(0xf5e8e5);
      const camera=new T.PerspectiveCamera(45,w/h,0.01,100);
      camera.position.set(0,1,3);
      const ambLight=new T.AmbientLight(0xffffff,0.8);scene.add(ambLight);
      const dirLight=new T.DirectionalLight(0xffffff,1);dirLight.position.set(2,4,3);scene.add(dirLight);
      sceneRef.current=scene;
      // Load GLB
      const {GLTFLoader}=await import("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js" as any);
      const loader=new GLTFLoader();
      // Fetch via proxy as blob
      const resp=await fetch(proxySrc);
      const buf=await resp.arrayBuffer();
      loader.parse(buf,"",(gltf:any)=>{
        const model=gltf.scene;
        const colors=[0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6,0x1abc9c,0xe67e22,0x34495e,0xe91e63,0x00bcd4];
        let ci=0;const partNames:string[]=[];const meshMap=new Map<string,any>();
        model.traverse((child:any)=>{
          if(child.isMesh){
            const name=child.name||("Del "+(ci+1));
            child.userData.partName=name;partNames.push(name);
            child.material=new T.MeshStandardMaterial({color:colors[ci%colors.length]});
            meshMap.set(name,child);ci++;
          }
        });
        meshMapRef.current=meshMap;setParts(partNames);
        // Center model
        const box=new T.Box3().setFromObject(model);
        const center=box.getCenter(new T.Vector3());
        const size=box.getSize(new T.Vector3());
        const maxDim=Math.max(size.x,size.y,size.z);
        model.position.sub(center);camera.position.set(0,maxDim*0.3,maxDim*2);
        camera.lookAt(0,0,0);scene.add(model);
      });
      // OrbitControls-like mouse
      let isDragging=false;let lastMouse={x:0,y:0};
      const euler=new T.Euler(0,0,0,"YXZ");
      window.addEventListener("mouseup",()=>{isDragging=false;});
      canvas.addEventListener("mousemove",e=>{
        if(!isDragging)return;
        const dx=e.clientX-lastMouse.x;const dy=e.clientY-lastMouse.y;
        euler.y+=dx*0.01;euler.x+=dy*0.01;
        scene.rotation.set(euler.x,euler.y,0);
        lastMouse={x:e.clientX,y:e.clientY};
      });
      // Click to select part
      const raycaster=new T.Raycaster();const mouse=new T.Vector2();
      canvas.addEventListener("click",e=>{
        const rect=canvas.getBoundingClientRect();
        mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
        mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
        raycaster.setFromCamera(mouse,camera);
        const objs:any[]=[];scene.traverse((c:any)=>{if(c.isMesh)objs.push(c);});
        const hits=raycaster.intersectObjects(objs);
        if(hits.length>0){
          const name=hits[0].object.userData.partName;
          setSelectedPart(name);
          // Highlight selected, dim others
          meshMapRef.current.forEach((mesh,n)=>{
            mesh.material.opacity=n===name?1:0.3;
            mesh.material.transparent=n!==name;
          });
        }
      });
      // Animate
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";


type Tab = "ai"|"skiss"|"3d";
type GenState = "idle"|"loading"|"done"|"error";
type Upload = { id:number;filename:string;mimetype:string;aiImage?:string;aiError?:string;genState:GenState;model3d?:string;tripoState?:string;tripoProgress?:number;tripoTaskId?:string;segState?:string;segProgress?:number;segmentedModel?:string; };


function dlUrl(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;a.click();}
function shareOrDl(url:string,name:string,type:string){fetch(url).then(r=>r.blob()).then(blob=>{const file=new File([blob],name,{type});if((navigator as any).canShare?.({files:[file]})){(navigator as any).share({files:[file]}).catch(()=>dlUrl(url,name));}else{dlUrl(url,name);}}).catch(()=>dlUrl(url,name));}


export default function GeneratePage() {
  const router=useRouter();const params=useParams();const projectId=params?.id as string;
  const [tab,setTab]=useState<Tab>("ai");const [uploads,setUploads]=useState<Upload[]>([]);const [selected,setSelected]=useState(0);
  const [prompt,setPrompt]=useState("");const [ready,setReady]=useState(false);const [editingPrompt,setEditingPrompt]=useState(false);
  const uploadsRef=useRef<Upload[]>([]);useEffect(()=>{uploadsRef.current=uploads;},[uploads]);
  useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(d=>{if(d.error)router.replace("/login");});fetch("/api/projects/"+projectId).then(r=>r.json()).then(d=>setPrompt(d.prompt||""));loadUploads();},[projectId,router]);
  async function loadUploads(){const res=await fetch("/api/projects/"+projectId+"/uploads");if(!res.ok)return;const data=await res.json();setUploads(data.map((u:any)=>({id:u.id,filename:u.filename,mimetype:u.mimetype,aiImage:u.ai_image||undefined,model3d:u.model3d_url||undefined,tripoTaskId:u.tripo_task_id||undefined,segmentedModel:u.segmented_model_url||undefined,genState:(u.ai_image?"done":"idle") as GenState,tripoState:u.model3d_url?"done":undefined,segState:u.segmented_model_url?"done":undefined})));setReady(true);}
  async function generateAll(){if(!prompt.trim())return;await Promise.all(uploadsRef.current.map((_,i)=>generateOne(i)));}
  async function generateOne(i:number){if(!prompt.trim())return;setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,genState:"loading"}:x));const u=uploadsRef.current[i];try{const dr=await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data");const{data,mimetype}=await dr.json();const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data,mimeType:mimetype}]})});const json=await res.json();if(json.images?.[0]){const aiImage=json.images[0];await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({aiImage})});setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiImage,genState:"done"}:x));setTab("ai");}else{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiError:json.error||"fel",genState:"error"}:x));}}catch(e){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,aiError:String(e),genState:"error"}:x));}}
  async function deleteUpload(i:number){const u=uploadsRef.current[i];await fetch("/api/projects/"+projectId+"/uploads/"+u.id,{method:"DELETE"});const next=uploadsRef.current.filter((_,idx)=>idx!==i);setUploads(next);if(selected>=next.length)setSelected(Math.max(0,next.length-1));}
  async function runTripo(i:number){const aiImage=uploadsRef.current[i]?.aiImage;if(!aiImage)return;setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"loading",tripoProgress:0}:x));const u=uploadsRef.current[i];try{const res=await fetch("/api/tripo/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({imageData:aiImage})});const json=await res.json();if(!json.taskId){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}const taskId=json.taskId;for(let a=0;a<60;a++){await new Promise(r=>setTimeout(r,4000));const pd=await(await fetch("/api/tripo/generate?taskId="+taskId)).json();if(pd.status==="success"&&pd.modelUrl){await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({model3dUrl:pd.modelUrl,tripoTaskId:taskId})});setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,model3d:pd.modelUrl,tripoTaskId:taskId,tripoState:"done"}:x));setTab("3d");return;}if(pd.status==="failed"||pd.status==="cancelled"){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));return;}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoProgress:pd.progress??0}:x));}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}catch{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,tripoState:"error"}:x));}}
  async function runSegmentation(i:number){const taskId=uploadsRef.current[i]?.tripoTaskId;if(!taskId){return;}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"loading",segProgress:0}:x));const u=uploadsRef.current[i];try{const res=await fetch("/api/tripo/segment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId})});const json=await res.json();if(!json.taskId){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"error"}:x));return;}const segTaskId=json.taskId;for(let a=0;a<60;a++){await new Promise(r=>setTimeout(r,4000));const pd=await(await fetch("/api/tripo/segment?taskId="+segTaskId)).json();if(pd.status==="success"&&pd.modelUrl){await fetch("/api/projects/"+projectId+"/uploads/"+u.id+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({segmentedModelUrl:pd.modelUrl})});setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segmentedModel:pd.modelUrl,segState:"done"}:x));setTab("3d");return;}if(pd.status==="failed"||pd.status==="cancelled"){setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"error"}:x));return;}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segProgress:pd.progress??0}:x));}setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"error"}:x));}catch{setUploads(prev=>prev.map((x,idx)=>idx===i?{...x,segState:"error"}:x));}}
  const cur=uploads[selected];const anyLoading=uploads.some(u=>u.genState==="loading");
  async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/login");}
  const btn=(c:string)=>({padding:"7px 14px",background:c,border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"} as const);
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
              <span style={{fontSize:"9px",padding:"2px 5px",borderRadius:"4px",fontWeight:500,background:u.segmentedModel?"#f59e0b22":u.model3d?"#7c3aed22":u.genState==="done"?"#16a34a22":u.genState==="loading"?"#1a56db22":u.genState==="error"?"#c0392b22":"#33333344",color:u.segmentedModel?"#f59e0b":u.model3d?"#a78bfa":u.genState==="done"?"#22c55e":u.genState==="loading"?"#6ea8fe":u.genState==="error"?"#ef4444":"var(--text2)"}}>{u.segState==="loading"?(u.segProgress?u.segProgress+"%":"Seg..."):u.tripoState==="loading"?(u.tripoProgress?u.tripoProgress+"%":"3D..."):u.segmentedModel?"Seg klar":u.model3d?"3D klar":u.genState==="done"?"klar":u.genState==="loading"?"...":u.genState==="error"?"fel":"väntar"}</span>
              <div style={{display:"flex",gap:"3px"}}><button onClick={e=>{e.stopPropagation();generateOne(i);}} style={{background:"#1a56db22",border:"none",borderRadius:"4px",padding:"2px 5px",cursor:"pointer",fontSize:"10px",color:"#6ea8fe"}}>↺</button><button onClick={e=>{e.stopPropagation();deleteUpload(i);}} style={{background:"#c0392b22",border:"none",borderRadius:"4px",padding:"2px 5px",cursor:"pointer",fontSize:"10px",color:"#ef4444"}}>✕</button></div>
            </div>
          </div>))}
        </div>
        <div style={{padding:"10px",borderTop:"1px solid var(--border)"}}><button onClick={logout} style={{width:"100%",padding:"5px 0",background:"transparent",border:"1px solid var(--border2)",borderRadius:"6px",fontSize:"11px",color:"var(--text2)",cursor:"pointer"}}>Logga ut</button></div>
      </aside>
      <div style={{flex:1,background:"#fadcd9",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"10px 16px",borderBottom:"1px solid #e8b8b0",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f5cdc8"}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px",flex:1,minWidth:0}}>{editingPrompt?(<input autoFocus value={prompt} onChange={e=>setPrompt(e.target.value)} onBlur={()=>setEditingPrompt(false)} onKeyDown={e=>e.key==="Enter"&&setEditingPrompt(false)} style={{flex:1,padding:"5px 8px",borderRadius:"6px",border:"1px solid #ccc",fontSize:"12px",background:"white",color:"#111",outline:"none"}}/>):(<p onClick={()=>setEditingPrompt(true)} style={{fontSize:"12px",color:"#444",margin:0,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"text",padding:"5px 0"}}>{prompt||"Klicka för att redigera prompt..."}</p>)}</div>
          <div style={{display:"flex",gap:"6px",flexShrink:0,marginLeft:"10px"}}>
            <button onClick={()=>router.push("/projects/"+projectId+"/qr")} style={{padding:"6px 10px",background:"transparent",border:"1px solid #bbb",borderRadius:"8px",fontSize:"12px",color:"#555",cursor:"pointer"}}>+ Bilder</button>
            <button onClick={generateAll} disabled={anyLoading||uploads.length===0} style={{padding:"6px 14px",background:anyLoading?"#aaa":"#1a56db",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:anyLoading?"not-allowed":"pointer"}}>{anyLoading?"Genererar...":"Generera alla"}</button>
          </div>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
          {!cur?(<p style={{color:"#888",fontSize:"14px"}}>Inga uppladdade bilder</p>
          ):tab==="ai"?(cur.genState==="loading"?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}><div style={{width:"32px",height:"32px",border:"3px solid #1a56db",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{color:"#555",fontSize:"13px"}}>Genererar AI-bild...</p></div>
          ):cur.aiImage?(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
            <img src={cur.aiImage} style={{maxWidth:"100%",maxHeight:"320px",borderRadius:"12px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)"}} alt="AI"/>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
              <button onClick={()=>dlUrl(cur.aiImage!,"ai-bild.jpg")} style={btn("#555")}>⬇ Ladda ner</button>
              <button onClick={()=>shareOrDl(cur.aiImage!,"ai-bild.jpg","image/jpeg")} style={btn("#1a56db")}>↗ Dela</button>
            </div>
            <div style={{display:"flex",gap:"8px",flexWrap:"wrap",justifyContent:"center"}}>
              {cur.model3d?(<>
                <button onClick={()=>setTab("3d")} style={btn("#22c55e")}>Visa 3D →</button>
                {cur.segState==="loading"?(<div style={{display:"flex",alignItems:"center",gap:"6px"}}><div style={{width:"100px",height:"5px",background:"#ddd",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(cur.segProgress||0)+"%",height:"100%",background:"#f59e0b",transition:"width 0.5s"}}/></div><p style={{color:"#f59e0b",fontSize:"11px",margin:0}}>{cur.segProgress||0}%</p></div>
                ):cur.segmentedModel?(<button onClick={()=>setTab("3d")} style={btn("#f59e0b")}>Visa segmenterad →</button>
                ):(<button onClick={()=>runSegmentation(selected)} style={btn("#f59e0b")}>Segmentera 3D ⇒</button>)}
              </>):cur.tripoState==="loading"?(<div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"120px",height:"5px",background:"#ddd",borderRadius:"3px",overflow:"hidden"}}><div style={{width:(cur.tripoProgress||0)+"%",height:"100%",background:"#7c3aed",transition:"width 0.5s"}}/></div><p style={{color:"#7c3aed",fontSize:"11px",margin:0}}>{cur.tripoProgress||0}%</p></div>
              ):cur.tripoState==="error"?(<button onClick={()=>runTripo(selected)} style={btn("#ef4444")}>Försök igen →</button>
              ):(<button onClick={()=>runTripo(selected)} style={btn("#7c3aed")}>Skapa 3D →</button>)}
            </div>
          </div>):cur.genState==="error"?(<div style={{textAlign:"center"}}><p style={{color:"#ef4444",fontSize:"13px",marginBottom:"8px"}}>Fel: {cur.aiError}</p><button onClick={()=>generateOne(selected)} style={btn("#1a56db")}>Försök igen</button></div>
          ):(<div style={{textAlign:"center"}}><p style={{color:"#888",fontSize:"13px",marginBottom:"8px"}}>Ingen AI-bild ännu</p><button onClick={()=>generateOne(selected)} style={btn("#1a56db")}>Generera denna</button></div>)
          ):tab==="skiss"?(<SkissView projectId={projectId} upload={cur}/>
          ):(cur.segmentedModel?<ModelViewerParts modelUrl={cur.segmentedModel} tripoTaskId={cur.tripoTaskId} projectId={projectId} uploadId={cur.id}/>:cur.model3d?<ModelViewer modelUrl={cur.model3d}/>:(<p style={{color:"#888",fontSize:"13px"}}>{cur.aiImage?"Klicka Skapa 3D under AI-bilden":"Generera AI-bild först"}</p>))}
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
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
      <img src={src} style={{maxWidth:"100%",maxHeight:"380px",borderRadius:"12px"}} alt="Skiss"/>
      <div style={{display:"flex",gap:"8px"}}>
        <button onClick={()=>dlUrl(src,"skiss.jpg")} style={{padding:"7px 14px",background:"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>⬇ Ladda ner</button>
        <button onClick={()=>shareOrDl(src,"skiss.jpg","image/jpeg")} style={{padding:"7px 14px",background:"#1a56db",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>↗ Dela</button>
      </div>
    </div>
  );
}

function ModelViewer({modelUrl}:{modelUrl:string}){
  const ref=useRef<HTMLDivElement>(null);
  const proxySrc="/api/proxy?url="+encodeURIComponent(modelUrl);
  useEffect(()=>{
    if(!ref.current)return;
    if(!document.querySelector('script[data-mv]')){const s=document.createElement("script");s.type="module";s.setAttribute("data-mv","1");s.src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";document.head.appendChild(s);}
    const build=()=>{if(!ref.current)return;const mv=document.createElement("model-viewer") as any;mv.setAttribute("src",proxySrc);mv.setAttribute("alt","3D");mv.setAttribute("camera-controls","");mv.setAttribute("shadow-intensity","1");mv.style.cssText="width:100%;height:360px;background:#f5e8e5;";ref.current.innerHTML="";ref.current.appendChild(mv);};
    if(customElements.get("model-viewer")){build();}else{customElements.whenDefined("model-viewer").then(build);setTimeout(build,3000);}
    return()=>{if(ref.current)ref.current.innerHTML="";};
  },[proxySrc]);
  return(
    <div style={{width:"100%",maxWidth:"600px",display:"flex",flexDirection:"column",gap:"10px"}}>
      <div style={{borderRadius:"12px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",background:"#f5e8e5"}}>
        <div ref={ref} style={{width:"100%",height:"360px",background:"#f5e8e5",display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{color:"#999",fontSize:"12px"}}>Laddar 3D-modell...</p></div>
        <p style={{textAlign:"center",fontSize:"11px",color:"#aaa",padding:"6px 0",margin:0}}>Dra för att rotera · Scroll för zoom</p>
      </div>
      <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
        <button onClick={()=>dlUrl(proxySrc,"3d-modell.glb")} style={{padding:"7px 14px",background:"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>⬇ Ladda ner GLB</button>
        <button onClick={()=>{if((navigator as any).share){(navigator as any).share({title:"3D-modell",url:window.location.origin+proxySrc}).catch(()=>dlUrl(proxySrc,"3d-modell.glb"));}else{dlUrl(proxySrc,"3d-modell.glb");}}} style={{padding:"7px 14px",background:"#7c3aed",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>↗ Dela</button>
      </div>
    </div>
  );
}

function ModelViewerParts({modelUrl,tripoTaskId,projectId,uploadId}:{modelUrl:string;tripoTaskId?:string;projectId:string;uploadId:number}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [selectedPart,setSelectedPart]=useState<string|null>(null);
  const [partPrompt,setPartPrompt]=useState("");
  const [retexturing,setRetexturing]=useState(false);
  const [retexProgress,setRetexProgress]=useState(0);
  const [currentUrl,setCurrentUrl]=useState(modelUrl);
  const meshMapRef=useRef<Map<string,any>>(new Map());
  const sceneRef=useRef<any>(null);
  const origColorsRef=useRef<Map<string,number>>(new Map());

  useEffect(()=>{
    if(!canvasRef.current)return;
    const proxySrc="/api/proxy?url="+encodeURIComponent(currentUrl);
    let animId:number;let renderer:any;
    const init=async()=>{
      if(!(window as any).THREE){
        await new Promise<void>(resolve=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";s.onload=()=>resolve();document.head.appendChild(s);});
      }
      const T=(window as any).THREE;
      const canvas=canvasRef.current!;
      const w=canvas.offsetWidth||560;const h=360;
      renderer=new T.WebGLRenderer({canvas,antialias:true});
      renderer.setSize(w,h);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
      renderer.outputEncoding=3001;
      const scene=new T.Scene();scene.background=new T.Color(0xf5e8e5);
      sceneRef.current=scene;
      const camera=new T.PerspectiveCamera(45,w/h,0.01,1000);
      scene.add(new T.AmbientLight(0xffffff,0.9));
      const dl=new T.DirectionalLight(0xffffff,1.2);dl.position.set(3,5,4);scene.add(dl);
      const resp=await fetch(proxySrc);const buf=await resp.arrayBuffer();
      const{GLTFLoader}=await import("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/loaders/GLTFLoader.js" as any);
      new GLTFLoader().parse(buf,"",(gltf:any)=>{
        const COLORS=[0xe74c3c,0x3498db,0x2ecc71,0xf39c12,0x9b59b6,0x1abc9c,0xe67e22,0x34495e,0xe91e63,0x00bcd4,0x8bc34a,0xff5722];
        let ci=0;const meshMap=new Map<string,any>();const colMap=new Map<string,number>();
        gltf.scene.traverse((c:any)=>{if(c.isMesh){const nm=c.name||("Del "+(ci+1));c.userData.partName=nm;const col=COLORS[ci%COLORS.length];c.material=new T.MeshStandardMaterial({color:col});meshMap.set(nm,c);colMap.set(nm,col);ci++;}});
        meshMapRef.current=meshMap;origColorsRef.current=colMap;
        const box=new T.Box3().setFromObject(gltf.scene);const center=box.getCenter(new T.Vector3());const size=box.getSize(new T.Vector3());const maxD=Math.max(size.x,size.y,size.z);
        gltf.scene.position.sub(center);camera.position.set(0,maxD*0.4,maxD*2.2);camera.lookAt(0,0,0);scene.add(gltf.scene);
      });
      // Mouse rotate
      let drag=false;let lx=0;let ly=0;const rot={x:0,y:0};
      canvas.addEventListener("mousedown",e=>{drag=true;lx=e.clientX;ly=e.clientY;});
      window.addEventListener("mouseup",()=>{drag=false;});
      canvas.addEventListener("mousemove",e=>{if(!drag)return;rot.y+=(e.clientX-lx)*0.01;rot.x+=(e.clientY-ly)*0.01;if(sceneRef.current)sceneRef.current.rotation.set(rot.x,rot.y,0);lx=e.clientX;ly=e.clientY;});
      // Click select
      const ray=new T.Raycaster();const mp=new T.Vector2();
      canvas.addEventListener("click",e=>{
        const rect=canvas.getBoundingClientRect();mp.x=((e.clientX-rect.left)/rect.width)*2-1;mp.y=-((e.clientY-rect.top)/rect.height)*2+1;
        ray.setFromCamera(mp,camera);const objs:any[]=[];if(sceneRef.current)sceneRef.current.traverse((c:any)=>{if(c.isMesh)objs.push(c);});
        const hits=ray.intersectObjects(objs,true);
        if(hits.length){const nm=hits[0].object.userData.partName;setSelectedPart(nm);meshMapRef.current.forEach((m,n)=>{m.material.opacity=n===nm?1:0.25;m.material.transparent=n!==nm;});}
      });
      const anim=()=>{animId=requestAnimationFrame(anim);renderer.render(scene,camera);};anim();
    };
    init().catch(()=>{});
    return()=>{cancelAnimationFrame(animId);if(renderer)renderer.dispose();};
  },[currentUrl]);

  async function retexturePart(){
    if(!selectedPart||!partPrompt.trim()||!tripoTaskId)return;
    setRetexturing(true);setRetexProgress(0);
    try{
      const res=await fetch("/api/tripo/retexture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({originalTaskId:tripoTaskId,prompt:selectedPart+": "+partPrompt})});
      const json=await res.json();
      if(!json.taskId){setRetexturing(false);return;}
      for(let a=0;a<60;a++){
        await new Promise(r=>setTimeout(r,4000));
        const pd=await(await fetch("/api/tripo/retexture?taskId="+json.taskId)).json();
        setRetexProgress(pd.progress??0);
        if(pd.status==="success"&&pd.modelUrl){
          await fetch("/api/projects/"+projectId+"/uploads/"+uploadId+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({segmentedModelUrl:pd.modelUrl})});
          setCurrentUrl(pd.modelUrl);setRetexturing(false);setSelectedPart(null);setPartPrompt("");return;
        }
        if(pd.status==="failed"||pd.status==="cancelled"){setRetexturing(false);return;}
      }
      setRetexturing(false);
    }catch{setRetexturing(false);}
  }

  return(
    <div style={{width:"100%",maxWidth:"600px",display:"flex",flexDirection:"column",gap:"10px"}}>
      <div style={{borderRadius:"12px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",position:"relative",background:"#f5e8e5"}}>
        <canvas ref={canvasRef} width={560} height={360} style={{width:"100%",height:"360px",display:"block",cursor:"crosshair"}}/>
        <p style={{position:"absolute",bottom:"6px",left:0,right:0,textAlign:"center",fontSize:"11px",color:"#555",margin:0,background:"rgba(255,255,255,0.75)",padding:"3px"}}>{selectedPart?"Vald: "+selectedPart+" · Klicka annan del för att byta":"Klicka på en del för att redigera textur"}</p>
      </div>
      {selectedPart&&(
        <div style={{background:"white",borderRadius:"10px",padding:"12px",boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>
          <p style={{margin:"0 0 8px",fontSize:"12px",color:"#333"}}>Ändra <strong style={{color:"#f59e0b"}}>{selectedPart}</strong> — resten förblir oförändrat</p>
          <div style={{display:"flex",gap:"8px"}}>
            <input value={partPrompt} onChange={e=>setPartPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&retexturePart()} placeholder={'T.ex. "röda ben" eller "ljust läder"'} style={{flex:1,padding:"7px 10px",borderRadius:"7px",border:"1px solid #ddd",fontSize:"12px",outline:"none"}} disabled={retexturing}/>
            <button onClick={retexturePart} disabled={retexturing||!partPrompt.trim()||!tripoTaskId} style={{padding:"7px 14px",background:retexturing?"#aaa":"#f59e0b",border:"none",borderRadius:"7px",fontSize:"12px",fontWeight:500,color:"white",cursor:retexturing?"not-allowed":"pointer"}}>{retexturing?retexProgress+"%":"Ändra"}</button>
          </div>
          {!tripoTaskId&&<p style={{color:"#ef4444",fontSize:"11px",margin:"6px 0 0"}}>Saknar task-ID — skapa 3D-modellen igen för att aktivera redigering</p>}
        </div>
      )}
    </div>
  );
}
