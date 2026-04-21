import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visualiseringsverktyg",
  description: "AI-drivet visualiseringsverktyg för kreativa workshops",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}`
        }}/>
        <style dangerouslySetInnerHTML={{ __html: `
          :root,:root[data-theme="dark"]{--bg:#0f0f0f;--bg2:#1a1a1a;--bg3:#222;--border:#2a2a2a;--border2:#444;--text:#ffffff;--text2:#999;--text3:#555;--accent:#1a56db;}
          :root[data-theme="light"]{--bg:#f5f5f5;--bg2:#ffffff;--bg3:#e8e8e8;--border:#e0e0e0;--border2:#bbb;--text:#111111;--text2:#555;--text3:#999;--accent:#1a56db;}
          *{box-sizing:border-box;margin:0;padding:0;}
          body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;}
          input,textarea,select,button{font-family:inherit;}
        `}}/>
      </head>
      <body>{children}</body>
    </html>
  );
}
