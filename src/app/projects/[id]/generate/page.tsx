"use client";
import ThreePartViewer from "./ThreePartViewer";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
type Tab="ai"|"skiss"|"3d";
type GenState="idle"|"loading"|"done"|"error";
type Upload={id:number;filename:string;mimetype:string;aiImage?:string;aiError?:string;genState:GenState;model3d?:string;tripoState?:string;tripoProgress?:number;tripoTaskId?:string;segmentedModel?:string;segTaskId?:string;};
function dlUrl(url:string,name:string){const a=document.createElement("a");a.href=url;a.download=name;a.click();}
function shareOrDl(url:string,name:string,type:string){fetch(url).then(r=>r.blob()).then(blob=>{const f=new File([blob],name,{type});if((navigator as any).canShare?.({files:[f]})){(navigator as any).share({files:[f]}).catch(()=>dlUrl(url,name));}else dlUrl(url,name);}).catch(()=>dlUrl(url,name));}

// ---- AI Image part editor ----
type Rect={x:number;y:number;w:number;h:number};
function AiImageEditor({aiImage,projectId,uploadId,onNewImage}:{aiImage:string;projectId:string;uploadId:number;onNewImage:(img:string)=>void}){
  const imgRef=useRef<HTMLImageElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const[rect,setRect]=useState<Rect|null>(null);
  const[dragging,setDragging]=useState(false);
  const dragStart=useRef<{x:number;y:number}|null>(null);
  const[partPrompt,setPartPrompt]=useState("");
  const[state,setState]=useState<"idle"|"loading"|"done">("idle");
  const[error,setError]=useState("");
  const[resultImg,setResultImg]=useState<string|null>(null);

  function getRelPos(e:React.MouseEvent|React.TouchEvent,el:HTMLElement):{x:number;y:number}{
    const r=el.getBoundingClientRect();
    const cx="touches" in e?(e as React.TouchEvent).touches[0].clientX:(e as React.MouseEvent).clientX;
    const cy="touches" in e?(e as React.TouchEvent).touches[0].clientY:(e as React.MouseEvent).clientY;
    return{x:(cx-r.left)/r.width,y:(cy-r.top)/r.height};
  }

  function onMouseDown(e:React.MouseEvent){
    const img=imgRef.current;if(!img)return;
    e.preventDefault();
    const pos=getRelPos(e,img);
    dragStart.current=pos;
    setDragging(true);
    setRect(null);
    setResultImg(null);
    setError("");
    setState("idle");
  }
  function onMouseMove(e:React.MouseEvent){
    if(!dragging||!dragStart.current||!imgRef.current)return;
    const pos=getRelPos(e,imgRef.current);
    const x=Math.min(dragStart.current.x,pos.x);
    const y=Math.min(dragStart.current.y,pos.y);
    const w=Math.abs(pos.x-dragStart.current.x);
    const h=Math.abs(pos.y-dragStart.current.y);
    setRect({x,y,w,h});
  }
  function onMouseUp(e:React.MouseEvent){
    setDragging(false);
    if(!dragStart.current||!imgRef.current)return;
    const pos=getRelPos(e,imgRef.current);
    const x=Math.min(dragStart.current.x,pos.x);
    const y=Math.min(dragStart.current.y,pos.y);
    const w=Math.abs(pos.x-dragStart.current.x);
    const h=Math.abs(pos.y-dragStart.current.y);
    if(w>0.02&&h>0.02)setRect({x,y,w,h});
    else setRect(null);
    dragStart.current=null;
  }

  async function applyEdit(){
    if(!rect||!partPrompt.trim())return;
    setState("loading");setError("");
    try{
      // Build a mask image: black bg, white rect over the selected region
      const canvas=document.createElement("canvas");
      const natW=imgRef.current?.naturalWidth||512;
      const natH=imgRef.current?.naturalHeight||512;
      canvas.width=natW;canvas.height=natH;
      const ctx=canvas.getContext("2d")!;
      ctx.fillStyle="black";
      ctx.fillRect(0,0,natW,natH);
      ctx.fillStyle="white";
      ctx.fillRect(Math.round(rect.x*natW),Math.round(rect.y*natH),Math.round(rect.w*natW),Math.round(rect.h*natH));
      const maskB64=canvas.toDataURL("image/png").split(",")[1];
      const srcB64=aiImage.includes(",")?aiImage.split(",")[1]:aiImage;
      const prompt="Edit only the highlighted/selected region of this image: "+partPrompt+". The mask image shows the exact region in white that should be changed. Keep everything outside the white mask area identical.";
      const res=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,images:[{data:srcB64,mimeType:"image/jpeg"},{data:maskB64,mimeType:"image/png"}]})});
      if(!res.ok){setError("Fel "+res.status);setState("idle");return;}
      const json=await res.json();
      if(json.images?.[0]){
        setResultImg(json.images[0]);
        setState("done");
      }else{setError(json.error||"Inget resultat");setState("idle");}
    }catch(e2){setError(String(e2));setState("idle");}
  }

  async function confirmResult(){
    if(!resultImg)return;
    await fetch("/api/projects/"+projectId+"/uploads/"+uploadId+"/data",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({aiImage:resultImg})});
    onNewImage(resultImg);
    setResultImg(null);setState("idle");setRect(null);setPartPrompt("");
  }

  const hasRect=rect&&rect.w>0.01&&rect.h>0.01;

  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"12px",maxWidth:"600px",width:"100%"}}>
      <p style={{margin:0,fontSize:"11px",color:"#666",alignSelf:"flex-start"}}>
        {hasRect?"Markering aktiv — skriv vad som ska andras":"Dra pa bilden for att markera ett omrade som ska andras"}
      </p>
      <div style={{position:"relative",width:"100%",userSelect:"none"}}>
        <img
          ref={imgRef}
          src={aiImage}
          draggable={false}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{width:"100%",maxHeight:"340px",objectFit:"contain",borderRadius:"10px",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",cursor:"crosshair",display:"block"}}
          alt="AI"
        />
        {rect&&rect.w>0.005&&rect.h>0.005&&(
          <div style={{
            position:"absolute",
            left:(rect.x*100)+"%",top:(rect.y*100)+"%",
            width:(rect.w*100)+"%",height:(rect.h*100)+"%",
            border:"2px solid #f59e0b",
            background:"rgba(245,158,11,0.18)",
            pointerEvents:"none",
            borderRadius:"3px"
          }}/>
        )}
      </div>
      {hasRect&&state!=="done"&&(
        <div style={{display:"flex",gap:"8px",width:"100%"}}>
          <input
            value={partPrompt}
            onChange={e=>setPartPrompt(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&applyEdit()}
            placeholder="Vad ska andras? (t.ex. rod lader, metallic silver, gront tyg...)"
            style={{flex:1,padding:"8px 10px",borderRadius:"7px",border:"1px solid #ddd",fontSize:"12px",outline:"none"}}
            disabled={state==="loading"}
          />
          <button
            onClick={applyEdit}
            disabled={!partPrompt.trim()||state==="loading"}
            style={{padding:"8px 14px",background:state==="loading"?"#aaa":"#f59e0b",border:"none",borderRadius:"7px",fontSize:"12px",fontWeight:600,color:"white",cursor:state==="loading"?"not-allowed":"pointer",whiteSpace:"nowrap"}}
          >{state==="loading"?"Genererar...":"Andra omradet"}</button>
          <button onClick={()=>{setRect(null);setPartPrompt("");setError("");}} style={{padding:"8px 10px",background:"#f3f4f6",border:"none",borderRadius:"7px",fontSize:"12px",color:"#888",cursor:"pointer"}}>Rensa</button>
        </div>
      )}
      {error&&<p style={{color:"#ef4444",fontSize:"11px",margin:0,alignSelf:"flex-start"}}>{error}</p>}
      {state==="loading"&&<div style={{display:"flex",alignItems:"center",gap:"8px"}}><div style={{width:"18px",height:"18px",border:"2px solid #f59e0b",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/><p style={{margin:0,fontSize:"11px",color:"#888"}}>Genererar andring...</p></div>}
      {state==="done"&&resultImg&&(
        <div style={{width:"100%",display:"flex",flexDirection:"column",gap:"8px"}}>
          <p style={{margin:0,fontSize:"12px",fontWeight:600,color:"#333"}}>Resultat:</p>
          <img src={resultImg.startsWith("data:")?resultImg:"data:image/jpeg;base64,"+resultImg} style={{width:"100%",maxHeight:"300px",objectFit:"contain",borderRadius:"10px",boxShadow:"0 4px 16px rgba(0,0,0,0.12)"}} alt="Resultat"/>
          <div style={{display:"flex",gap:"8px"}}>
            <button onClick={confirmResult} style={{flex:1,padding:"9px",background:"#22c55e",border:"none",borderRadius:"8px",fontSize:"13px",fontWeight:600,color:"white",cursor:"pointer"}}>Spara som ny AI-bild</button>
            <button onClick={()=>{setState("idle");setResultImg(null);}} style={{padding:"9px 12px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"12px",color:"#555",cursor:"pointer"}}>Forsok igen</button>
            <button onClick={()=>{setState("idle");setResultImg(null);setRect(null);setPartPrompt("");}} style={{padding:"9px 12px",background:"#f3f4f6",border:"none",borderRadius:"8px",fontSize:"12px",color:"#888",cursor:"pointer"}}>Avbryt</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ---- end AiImageEditor ----
