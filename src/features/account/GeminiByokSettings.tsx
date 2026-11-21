import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';

/** Personal Gemini BYOK: never persist or echo the secret in browser storage. */
export function GeminiByokSettings() {
  const [available,setAvailable] = useState(false);
  const [connected,setConnected] = useState(false);
  const [key,setKey] = useState('');
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('Gemini BYOK-Status wird geprüft.');
  const readStatus = async(signal?:AbortSignal) => {
    const response = await fetch('/api/chat-buddy/gemini',{
      credentials:'same-origin',cache:'no-store',signal,headers:{Accept:'application/json'},
    });
    if (!response.ok) throw new Error('NOT_ADMITTED');
    const body: { connected?:boolean; model?:string } = await response.json();
    return body;
  };
  useEffect(() => {
    const ctrl = new AbortController();
    readStatus(ctrl.signal).then(body=>{
      if (ctrl.signal.aborted) return;
      setAvailable(true);setConnected(body.connected===true);
      setMessage(body.connected ? 'Schlüssel verschlüsselt in diesem Browser hinterlegt (nicht providerseitig verifiziert).' : 'Noch kein Gemini-Schlüssel verbunden.');
    }).catch(()=>{
      if(!ctrl.signal.aborted){setAvailable(false);setMessage('Gemini BYOK ist erst nach serverseitiger Sicherheits- und Kostenfreigabe verfügbar.');}
    });
    return ()=>ctrl.abort();
  },[]);
  const save = async(event:FormEvent) => {
    event.preventDefault();
    if(!available || !key.trim())return;
    setBusy(true);
    try{
      const response=await fetch('/api/chat-buddy/gemini',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key.trim()}),
      });
      if(!response.ok)throw new Error('SAVE_FAILED');
      setConnected(true);
      setMessage('Schlüssel verschlüsselt gespeichert. Erst die bewusste Auswahl von Gemini im Buddy kann externe Anfragen auslösen.');
    }catch{setMessage('Der Schlüssel wurde nicht gespeichert. Prüfe Format, Anmeldung und Runtime-Freigabe.');}
    finally{setKey('');setBusy(false);}
  };
  const remove = async() => {
    setBusy(true);
    try{
      const response=await fetch('/api/chat-buddy/gemini',{method:'DELETE',credentials:'same-origin'});
      if(!response.ok)throw new Error('DELETE_FAILED');
      setConnected(false);setKey('');setMessage('Gemini-Verbindung aus diesem Browser entfernt.');
    }catch{setMessage('Verbindung konnte nicht entfernt werden.');}
    finally{setBusy(false);}
  };
  return <section aria-labelledby="gemini-byok-title" className="mt-5 rounded-2xl border border-pink-300/30 bg-[#100b22] p-4 md:col-span-3">
    <h2 id="gemini-byok-title" className="flex items-center gap-2 text-base font-bold text-pink-100"><KeyRound className="h-5 w-5" aria-hidden="true"/> JaJa Buddy · Gemini BYOK</h2>
    <p className="mt-2 text-sm text-slate-200">Eigenen Google-AI-Studio-API-Key für das angemeldete Profil hinterlegen. Keine Speicherung in Local Storage, GitHub oder Logs; verschlüsseltes HttpOnly-Cookie, nur in diesem Browser. Schlüssel werden nie zurückgegeben.</p>
    <p className="mt-2 text-xs text-amber-200">Kosten und Nutzungsbedingungen gelten für das eigene Google-Projekt. Keine automatische Aktivierung und keine Anfrage allein durch das Speichern. Modellzugriff und Kontingent werden erst bei einer bewussten Anfrage geprüft.</p>
    <form onSubmit={save} className="mt-4 space-y-3">
      <label htmlFor="profile-gemini-key" className="block text-sm font-semibold">Persönlicher Gemini API-Key</label>
      <input id="profile-gemini-key" type="password" name="geminiApiKey" autoComplete="off" spellCheck={false} maxLength={200}
        value={key} disabled={!available||busy} onChange={event=>setKey(event.target.value)}
        placeholder={available?'API-Key einfügen':'Serverfreigabe ausstehend'}
        className="min-h-11 w-full rounded-xl border border-pink-300/30 bg-slate-950 px-3 text-sm text-white disabled:opacity-50" />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!available||busy||!key.trim()} className="min-h-11 rounded-xl bg-pink-300 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">Gemini-Schlüssel speichern</button>
        {connected && <button type="button" disabled={busy} onClick={()=>void remove()} className="min-h-11 rounded-xl border border-red-300/40 px-4 text-sm font-semibold text-red-100">Schlüssel entfernen</button>}
      </div>
    </form>
    <p role="status" className="mt-3 flex items-start gap-2 text-xs text-slate-200"><ShieldCheck className="h-4 w-4 shrink-0 text-pink-300" aria-hidden="true"/>{message}</p>
  </section>;
}
