"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";


type Tab = "ai" | "skiss" | "3d";
type GenState = "idle" | "loading" | "done" | "error";
type Upload = { id: number; filename: string; mimetype: string; aiImage?: string; aiError?: string; genState: GenState; model3d?: string; tripoState?: string; tripoProgress?: number; };


export default function GeneratePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const [tab, setTab] = useState<Tab>("ai");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [prompt, setPrompt] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(false);
  const uploadsRef = useRef<Upload[]>([]);
  useEffect(() => { uploadsRef.current = uploads; }, [uploads]);


  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.error) { router.replace("/login"); return; }
      setUserEmail(d.email);
    });
    fetch("/api/projects/" + projectId).then(r => r.json()).then(d => setPrompt(d.prompt || ""));
    loadUploads();
  }, [projectId, router]);


  async function loadUploads() {
    const res = await fetch("/api/projects/" + projectId + "/uploads");
    if (!res.ok) return;
    const data = await res.json();
    setUploads(data.map((u: Upload) => ({ ...u, genState: "idle" as GenState })));
