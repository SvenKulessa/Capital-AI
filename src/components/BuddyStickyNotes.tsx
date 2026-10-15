import React, { useState, useEffect } from 'react';

type Note = {
  id: string;
  text: string;
  color: string;
  checked: boolean;
  summary?: string;
  summarizeOn: boolean;
};

const COLORS = ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff'];

export function BuddyStickyNotes({ initialText = '' }: { initialText?: string }) {
  const [notes, setNotes] = useState<Note[]>(() => {
    try { return JSON.parse(localStorage.getItem('capital-ai-buddy-notes') || '[]'); } catch { return []; }
  });
  const [draft, setDraft] = useState(initialText);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    localStorage.setItem('capital-ai-buddy-notes', JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!draft.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      text: draft.trim(),
      color,
      checked: false,
      summarizeOn: false,
    };
    setNotes(prev => [note, ...prev]);
    setDraft('');
  };

  const toggleCheck = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, checked: !n.checked } : n));
  };

  const toggleSummarize = (id: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== id) return n;
      const on = !n.summarizeOn;
      const summary = on ? extractiveSummary(n.text) : undefined;
      return { ...n, summarizeOn: on, summary };
    }));
  };

  const remove = (id: string) => setNotes(prev => prev.filter(n => n.id !== id));

  return (
    <div className="space-y-3 text-xs">
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Notiz oder Vokabel aus Chat" className="flex-1 rounded border border-slate-600 bg-slate-900 px-2 py-1" />
        <select value={color} onChange={e => setColor(e.target.value)} className="rounded border border-slate-600 bg-slate-900">
          {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" onClick={addNote} className="rounded bg-amber-400 px-2 text-black">Notiz</button>
      </div>
      <div className="grid gap-2">
        {notes.map(note => (
          <div key={note.id} className="rounded border p-2" style={{ backgroundColor: note.color, color: '#111' }}>
            <div className="flex items-start gap-2">
              <input type="checkbox" checked={note.checked} onChange={() => toggleCheck(note.id)} aria-label="Erledigt" />
              <div className="flex-1">
                <p className={note.checked ? 'line-through' : ''}>{note.text}</p>
                {note.summarizeOn && note.summary && <p className="mt-1 text-[10px] italic">Zusammenfassung: {note.summary}</p>}
              </div>
              <button type="button" onClick={() => toggleSummarize(note.id)} className="text-[10px] underline" aria-pressed={note.summarizeOn}>
                {note.summarizeOn ? 'Zusammenfassung aus' : 'Zusammenfassen'}
              </button>
              <button type="button" onClick={() => remove(note.id)} aria-label="Löschen" className="text-red-600">×</button>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">Notizen bleiben lokal im Browser. Keine Übertragung. Zusammenfassung ist extraktiv und lokal.</p>
    </div>
  );
}

function extractiveSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '...' : '');
}
