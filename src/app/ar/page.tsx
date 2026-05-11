"use client";
import { useEffect, useState, useRef } from "react";

export default function ARPage() {
  const[code,setCode]=useState(["","",""]);
  const[status,setStatus]=useState<"enter"|"loading"|"ready"|"error">("enter");
  const[modelUrl,setModelUrl]=useState("");
  const[errorMsg,setErrorMsg]=useState("");
  const viewerRef=useRef<HTMLDivElement>(null);

  const fullCode=code.join("");

  async function loadModel(){
    if(fullCode.length!==3)return;
    setStatus("loading");
    try{
      const res=await fetch("/api/vr?code="+fullCode);
      const json=await res.json();
      if(json.error){setErrorMsg("Ogiltig eller utgången kod");setStatus("error");return;}
      setModelUrl(json.modelUrl);
      setStatus("ready");
    }catch(e){setErrorMsg("Nätverksfel — kontrollera anslutningen");setStatus("error");}
  }

  useEffect(()=>{
    if(status!=="ready"||!modelUrl||!viewerRef.current)return;
    // Ladda model-viewer med AR-stöd
    if(!document.querySelector('script[data-mv]')){
      const s=document.createElement("script");
      s.type="module";s.setAttribute("data-mv","1");
      s.src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
      document.head.appendChild(s);
    }
    const proxySrc="/api/proxy?url="+encodeURIComponent(modelUrl);
    const build=()=>{
      if(!viewerRef.current)return;
      const mv=document.createElement("model-viewer") as any;
      mv.setAttribute("src",proxySrc);
      mv.setAttribute("alt","3D modell");
      mv.setAttribute("ar","");
      mv.setAttribute("ar-modes","webxr scene-viewer quick-look");
      mv.setAttribute("camera-controls","");
      mv.setAttribute("shadow-intensity","1");
      mv.setAttribute("ar-placement","floor");
      mv.style.cssText="width:100%;height:400px;background:#111;border-radius:12px;";
      // AR-knapp
      const btn=document.createElement("button");
      btn.setAttribute("slot","ar-button");
      btn.style.cssText="position:absolute;bottom:16px;right:16px;background:#f59e0b;color:white;border:none;padding:12px 20px;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;";
      btn.textContent="🥽 Visa i MR";
      mv.appendChild(btn);
      viewerRef.current.innerHTML="";
      viewerRef.current.appendChild(mv);
    };
    if(customElements.get("model-viewer"))build();
    else{customElements.whenDefined("model-viewer").then(build);setTimeout(build,3000);}
  },[status,modelUrl]);

  function setDigit(i:number,val:string){
    const d=val.replace(/\D/,"").slice(-1);
    const c=[...code];c[i]=d;setCode(c);
    // Auto-fokus nästa fält
    if(d&&i<2){const next=document.getElementById("digit-"+(i+1));if(next)next.focus();}
  }

  return(<main style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"system-ui,sans-serif",color:"white",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
    <div style={{maxWidth:"440px",width:"100%",textAlign:"center"}}>
      <div style={{fontSize:"56px",marginBottom:"8px"}}>🥽</div>
      <h1 style={{fontSize:"26px",fontWeight:700,marginBottom:"6px"}}>Mixed Reality Viewer</h1>
      <p style={{fontSize:"13px",color:"#666",marginBottom:"32px"}}>Ange koden som visas i appen</p>

      {status==="enter"&&(<>
        <div style={{display:"flex",gap:"16px",justifyContent:"center",marginBottom:"28px"}}>
          {[0,1,2].map(i=>(<input key={i} id={"digit-"+i} maxLength={1} value={code[i]} inputMode="numeric"
            onChange={e=>setDigit(i,e.target.value)}
            onKeyDown={e=>{if(e.key==="Backspace"&&!code[i]&&i>0){const c=[...code];c[i-1]="";setCode(c);document.getElementById("digit-"+(i-1))?.focus();}
              if(e.key==="Enter"&&fullCode.length===3)loadModel();}}
            style={{width:"72px",height:"88px",fontSize:"44px",fontWeight:700,textAlign:"center",background:"#1a1a1a",border:"2px solid "+(code[i]?"#f59e0b":"#333"),borderRadius:"14px",color:"white",outline:"none",transition:"border-color 0.2s"}}/>))}
        </div>
        <button onClick={loadModel} disabled={fullCode.length!==3}
          style={{width:"100%",padding:"16px",background:fullCode.length===3?"#f59e0b":"#222",border:"none",borderRadius:"12px",fontSize:"17px",fontWeight:600,color:fullCode.length===3?"white":"#555",cursor:fullCode.length===3?"pointer":"not-allowed",transition:"all 0.2s"}}>
          Ladda modell →
        </button>
      </>)}

      {status==="loading"&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"16px"}}>
        <div style={{width:"40px",height:"40px",border:"4px solid #f59e0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
        <p style={{color:"#aaa",fontSize:"15px"}}>Laddar modell...</p>
      </div>)}

      {status==="ready"&&(<>
        <p style={{color:"#22c55e",marginBottom:"16px",fontSize:"14px"}}>✓ Modell inladdad</p>
        <div ref={viewerRef} style={{marginBottom:"16px",position:"relative"}}/>
        <p style={{fontSize:"12px",color:"#555",marginTop:"8px"}}>Klicka på "🥽 Visa i MR" för att placera objektet i rummet via Meta Quest</p>
        <button onClick={()=>{setStatus("enter");setCode(["","",""]);setModelUrl("");}}
          style={{marginTop:"16px",padding:"10px 24px",background:"#222",border:"none",borderRadius:"8px",color:"#aaa",fontSize:"13px",cursor:"pointer"}}>
          ← Ny kod
        </button>
      </>)}

      {status==="error"&&(<>
        <p style={{color:"#ef4444",marginBottom:"20px",fontSize:"14px"}}>{errorMsg}</p>
        <button onClick={()=>{setStatus("enter");setCode(["","",""]);setErrorMsg("");}}
          style={{padding:"12px 28px",background:"#222",border:"none",borderRadius:"8px",color:"white",fontSize:"14px",cursor:"pointer"}}>
          Försök igen
        </button>
      </>)}
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus{border-color:#f59e0b!important;}`}</style>
  </main>);
}
