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
    if(!document.querySelector('script[data-mv]')){
      const s=document.createElement("script");s.type="module";s.setAttribute("data-mv","1");
      s.src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js";
      document.head.appendChild(s);
    }
    const build=()=>{
      if(!ref.current)return;
      const mv=document.createElement("model-viewer") as any;
      mv.setAttribute("src",proxySrc);mv.setAttribute("alt","3D");
      mv.setAttribute("camera-controls","");
      mv.setAttribute("shadow-intensity","1");
      mv.style.cssText="width:100%;height:360px;background:#f5e8e5;";
      ref.current.innerHTML="";ref.current.appendChild(mv);
    };
    if(customElements.get("model-viewer")){build();}
    else{customElements.whenDefined("model-viewer").then(build);setTimeout(build,3000);}
    return()=>{if(ref.current)ref.current.innerHTML="";};
  },[proxySrc]);
  return(
    <div style={{width:"100%",maxWidth:"600px",display:"flex",flexDirection:"column",gap:"10px"}}>
      <div style={{borderRadius:"12px",overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",background:"#f5e8e5"}}>
        <div ref={ref} style={{width:"100%",height:"360px",background:"#f5e8e5",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <p style={{color:"#999",fontSize:"12px"}}>Laddar 3D-modell...</p>
        </div>
        <p style={{textAlign:"center",fontSize:"11px",color:"#aaa",padding:"6px 0",margin:0}}>Dra för att rotera · Scroll för zoom</p>
      </div>
      <div style={{display:"flex",gap:"8px",justifyContent:"center"}}>
        <button onClick={()=>dlUrl(proxySrc,"3d-modell.glb")} style={{padding:"7px 14px",background:"#555",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>⬇ Ladda ner GLB</button>
        <button onClick={()=>{if((navigator as any).share){(navigator as any).share({title:"3D-modell",url:window.location.origin+proxySrc}).catch(()=>dlUrl(proxySrc,"3d-modell.glb"));}else{dlUrl(proxySrc,"3d-modell.glb");}}} style={{padding:"7px 14px",background:"#7c3aed",border:"none",borderRadius:"8px",fontSize:"12px",fontWeight:500,color:"white",cursor:"pointer"}}>↗ Dela</button>
      </div>
    </div>
  );
}

