"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";


export default function PromptPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;


  const [userEmail, setUserEmail] = useState("");
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState("");
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(true);


  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.error) { router.replace("/login"); return; }
        setUserEmail(data.email);
        const t = localStorage.getItem("theme") || "dark";
        setIsDark(t === "dark");
        setReady(true);
      })
      .catch(() => router.replace("/login"));


    fetch("/api/ai/status")
      .then(r => r.json())
      .then(d => setApiOk(d.ok === true))
      .catch(() => setApiOk(false));
  }, [router]);


  function toggleTheme() {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
