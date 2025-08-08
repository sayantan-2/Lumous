import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/Button';
import { ArrowUpDown, ArrowUp, ArrowDown, Calendar, FileText, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';

export type SortKey = 'name' | 'date' | 'size';
export type SortDir = 'asc' | 'desc';

interface SortDropdownProps {
  sortKey: SortKey;
  sortDir: SortDir;
  onChangeSortKey: (k: SortKey) => void;
  onChangeSortDir: (d: SortDir) => void;
}

const OPTIONS: Array<{ key: SortKey; label: string; icon: JSX.Element; desc: string; }>= [
  { key: 'name', label: 'Name (Natural)', icon: <FileText className="w-4 h-4"/>, desc: 'image2 before image10' },
  { key: 'date', label: 'Date Modified', icon: <Calendar className="w-4 h-4"/>, desc: 'Newest or oldest first' },
  { key: 'size', label: 'File Size', icon: <HardDrive className="w-4 h-4"/>, desc: 'By bytes on disk' },
];

export function SortDropdown({ sortKey, sortDir, onChangeSortKey, onChangeSortDir }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement|null>(null);
  const btnRef = useRef<HTMLButtonElement|null>(null);

  const toggle = () => setOpen(o=>!o);
  const close = () => setOpen(false);

  useEffect(()=>{
    if (!open) return; 
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      close();
    };
    window.addEventListener('mousedown', handler);
    return ()=> window.removeEventListener('mousedown', handler);
  }, [open]);

  const handleKey = useCallback((e: React.KeyboardEvent)=>{
    if (!open) return;
    if (e.key === 'Escape') { close(); btnRef.current?.focus(); }
  }, [open]);

  const current = OPTIONS.find(o=>o.key===sortKey);
  const nextDir = sortDir === 'asc' ? 'desc' : 'asc';

  return (
    <div className="relative" onKeyDown={handleKey}>
      <Button
        ref={btnRef as any}
        variant="ghost"
        size="sm"
        onClick={toggle}
        title={`Sort: ${current?.label} (${sortDir})`}
        className="h-8 px-2 gap-1"
      >
        <ArrowUpDown className="w-4 h-4"/>
        <span className="hidden sm:inline text-xs font-medium truncate max-w-[7rem]">{current?.label}</span>
        {sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 opacity-70"/> : <ArrowDown className="w-3.5 h-3.5 opacity-70"/>}
      </Button>
      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-1 w-56 rounded-md border bg-popover shadow-lg p-1 z-40 animate-in fade-in zoom-in-95"
        >
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Sort By</div>
          {OPTIONS.map(o => {
            const active = o.key === sortKey;
            return (
              <button
                key={o.key}
                onClick={()=>{ onChangeSortKey(o.key); }}
                className={cn(
                  'w-full flex items-start gap-2 px-2 py-2 rounded-md text-xs text-left',
                  active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                )}
              >
                <span className="mt-0.5 text-muted-foreground">{o.icon}</span>
                <span className="flex-1 overflow-hidden">
                  <span className="block font-medium truncate">{o.label}</span>
                  <span className="block text-[10px] text-muted-foreground truncate">{o.desc}</span>
                </span>
              </button>
            );
          })}
          <div className="h-px bg-border my-1" />
          <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Direction</div>
          <button
            onClick={()=>{ onChangeSortDir(nextDir); }}
            className="w-full flex items-center justify-between px-2 py-2 rounded-md text-xs hover:bg-muted"
          >
            <span className="flex items-center gap-2">{sortDir === 'asc' ? <ArrowUp className="w-4 h-4"/> : <ArrowDown className="w-4 h-4"/>} {sortDir === 'asc' ? 'Ascending' : 'Descending'}</span>
            <span className="text-[10px] text-muted-foreground">Toggle</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default SortDropdown;
