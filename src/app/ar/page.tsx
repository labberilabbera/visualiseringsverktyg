"use client";
import { useEffect, useState, useRef } from "react";

export default function ARPage() {
  const[code,setCode]=useState("");
  const[status,setStatus]=useState<"enter"|"loading"|"ready"|"ar"|"error">("enter");
  const[modelUrl,setModelUrl]=useState("");
  const[errorMsg,setErrorMsg]=useState("");
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const sceneRef=useRef<any>(null);

  async function loadModel(){
    if(code.length!==3)return;
    setStatus("loading");
    try{
      const res=await fetch("/api/vr?code="+code);
      const json=await res.json();
      if(json.error){setErrorMsg("Ogiltig kod");setStatus("error");return;}
      setModelUrl(json.modelUrl);
      setStatus("ready");
    }catch(e){setErrorMsg("Nätverksfel");setStatus("error");}
  }

  async function startAR(){
    if(!modelUrl)return;
    setStatus("ar");
    // Ladda Three.js och GLTFLoader dynamiskt
    const THREE=await import("three" as any).catch(()=>null);
    if(!THREE){setErrorMsg("Three.js ej tillgängligt");setStatus("error");return;}
    // Kontrollera WebXR AR-stöd
    if(!(navigator as any).xr){setErrorMsg("WebXR stöds ej på denna enhet");setStatus("error");return;}
    const supported=await (navigator as any).xr.isSessionSupported("immersive-ar").catch(()=>false);
    if(!supported){setErrorMsg("AR stöds ej — öppna i Meta Quest Browser");setStatus("error");return;}
    // Sätt upp Three.js renderer
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth,window.innerHeight);
    renderer.xr.enabled=true;
    renderer.xr.setReferenceSpaceType("local");
    document.body.appendChild(renderer.domElement);
    renderer.domElement.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;";
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(70,window.innerWidth/window.innerHeight,0.01,100);
    const light=new THREE.HemisphereLight(0xffffff,0xbbbbff,1);
    scene.add(light);
    const dLight=new THREE.DirectionalLight(0xffffff,0.8);
    dLight.position.set(1,1,1);
    scene.add(dLight);
    // Ladda GLB-modell
    const proxyUrl="/api/proxy?url="+encodeURIComponent(modelUrl);
    const {GLTFLoader}=await import("three/examples/jsm/loaders/GLTFLoader.js" as any);
    const loader=new GLTFLoader();
    let model:any=null;
    let placed=false;
    loader.load(proxyUrl,(gltf:any)=>{
      model=gltf.scene;
      // Skala modellen till rimlig storlek (~0.5m)
      const box=new THREE.Box3().setFromObject(model);
      const size=box.getSize(new THREE.Vector3());
      const maxDim=Math.max(size.x,size.y,size.z);
      const scale=0.5/maxDim;
      model.scale.setScalar(scale);
      model.visible=false;
      scene.add(model);
    });
    // Hit-test för att placera på golv
    let hitTestSource:any=null;
    let hitTestSourceRequested=false;
    const reticle=new THREE.Mesh(
      new THREE.RingGeometry(0.06,0.08,32).rotateX(-Math.PI/2),
      new THREE.MeshBasicMaterial({color:0xf59e0b,side:THREE.DoubleSide})
    );
    reticle.matrixAutoUpdate=false;
    reticle.visible=false;
    scene.add(reticle);
    // Starta AR-session
    const session=await (navigator as any).xr.requestSession("immersive-ar",{
      requiredFeatures:["hit-test","local"],
      optionalFeatures:["dom-overlay"],
      domOverlay:{root:document.body}
    });
    renderer.xr.setSession(session);
    session.addEventListener("end",()=>{
      renderer.domElement.remove();
      setStatus("ready");
    });
    // Overlay-knapp för att avsluta
    const exitBtn=document.createElement("button");
    exitBtn.textContent="✕ Avsluta AR";
    exitBtn.style.cssText="position:fixed;top:20px;right:20px;z-index:10000;background:#333;color:white;border:none;padding:12px 20px;border-radius:8px;font-size:16px;cursor:pointer;";
    exitBtn.onclick=()=>session.end();
    document.body.appendChild(exitBtn);
    // Placera-knapp
    const placeBtn=document.createElement("button");
    placeBtn.textContent="Placera objekt";
    placeBtn.style.cssText="position:fixed;bottom:40px;left:50%;transform:translateX(-50%);z-index:10000;background:#f59e0b;color:white;border:none;padding:16px 32px;border-radius:12px;font-size:18px;cursor:pointer;";
    placeBtn.onclick=()=>{
      if(reticle.visible&&model){
        model.matrix.copy(reticle.matrix);
        model.visible=true;
        placed=true;
        placeBtn.textContent="Flytta objekt";
      }
    };
    document.body.appendChild(placeBtn);
    renderer.setAnimationLoop((_:any,frame:any)=>{
      if(!frame)return;
      const refSpace=renderer.xr.getReferenceSpace();
      const session=(renderer.xr as any).getSession();
      if(!hitTestSourceRequested){
        session.requestReferenceSpace("viewer").then((vs:any)=>{
          session.requestHitTestSource({space:vs}).then((hs:any)=>{hitTestSource=hs;});
        });
        hitTestSourceRequested=true;
      }
      if(hitTestSource){
        const results=frame.getHitTestResults(hitTestSource);
        if(results.length>0){
          const hit=results[0];
          const pose=hit.getPose(refSpace!);
          if(pose){reticle.visible=true;reticle.matrix.fromArray(pose.transform.matrix);}
        }else{reticle.visible=false;}
      }
      renderer.render(scene,camera);
    });
    sceneRef.current={renderer,session,exitBtn,placeBtn};
  }

  return(<main style={{minHeight:"100vh",background:"#0a0a0a",fontFamily:"system-ui,sans-serif",color:"white",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
    <div style={{maxWidth:"400px",width:"100%",textAlign:"center"}}>
      <div style={{fontSize:"48px",marginBottom:"16px"}}>🥽</div>
      <h1 style={{fontSize:"24px",fontWeight:700,marginBottom:"8px"}}>Mixed Reality Viewer</h1>
      <p style={{fontSize:"13px",color:"#888",marginBottom:"32px"}}>Öppna i Meta Quest Browser för AR</p>
      {status==="enter"&&(<>
        <p style={{fontSize:"14px",color:"#aaa",marginBottom:"16px"}}>Ange 3-siffrig kod</p>
        <div style={{display:"flex",gap:"12px",justifyContent:"center",marginBottom:"24px"}}>
          {[0,1,2].map(i=>(<input key={i} maxLength={1} value={code[i]||""} onChange={e=>{const d=e.target.value.replace(/D/,"");const c=code.split("");c[i]=d;setCode(c.join("").substring(0,3));}} onKeyDown={e=>{if(e.key==="Backspace"&&!code[i]&&i>0){const c=code.split("");c[i-1]="";setCode(c.join(""));}}} style={{width:"60px",height:"72px",fontSize:"36px",fontWeight:700,textAlign:"center",background:"#1a1a1a",border:"2px solid #333",borderRadius:"12px",color:"white",outline:"none"}} inputMode="numeric"/>))}
        </div>
        <button onClick={loadModel} disabled={code.length!==3} style={{width:"100%",padding:"14px",background:code.length===3?"#f59e0b":"#333",border:"none",borderRadius:"12px",fontSize:"16px",fontWeight:600,color:"white",cursor:code.length===3?"pointer":"not-allowed"}}>Ladda modell →</button>
      </>)}
      {status==="loading"&&(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px"}}><div style={{width:"32px",height:"32px",border:"3px solid #f59e0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{color:"#aaa"}}>Laddar modell...</p></div>)}
      {status==="ready"&&(<><p style={{color:"#22c55e",marginBottom:"24px",fontSize:"14px"}}>✓ Modell inladdad</p><button onClick={startAR} style={{width:"100%",padding:"16px",background:"#f59e0b",border:"none",borderRadius:"12px",fontSize:"18px",fontWeight:600,color:"white",cursor:"pointer"}}>🥽 Starta MR</button><p style={{fontSize:"11px",color:"#555",marginTop:"12px"}}>Klicka för att placera objektet i rummet</p></>)}
      {status==="error"&&(<><p style={{color:"#ef4444",marginBottom:"16px"}}>{errorMsg}</p><button onClick={()=>{setStatus("enter");setCode("");setErrorMsg("");}} style={{padding:"10px 24px",background:"#333",border:"none",borderRadius:"8px",color:"white",cursor:"pointer"}}>Försök igen</button></>)}
    </div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </main>);
}
