import { Sun, Moon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { SearchBar } from "./SearchBar";
import { SortDropdown } from "./SortDropdown";

interface TopBarProps {
  folderPath: string;
  onFolderChange: (folderPath: string) => void;
  fileCount: number;
  onSearch: (query: string) => void;
  sortKey: 'name'|'date'|'size';
  sortDir: 'asc'|'desc';
  onChangeSortKey: (k: 'name'|'date'|'size') => void;
  onChangeSortDir: () => void;
}

export function TopBar({ folderPath, onFolderChange, fileCount, onSearch, sortKey, sortDir, onChangeSortKey, onChangeSortDir }: TopBarProps) {
  const [theme, setTheme] = useState<string>("dark");
  const folderName = folderPath.split(/[/\\]/).pop() || folderPath;
  const [bgIndexing, setBgIndexing] = useState(false);
  const [bgMessage, setBgMessage] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const settings = await invoke<any>("get_settings");
        if (settings?.theme) {
          const incoming = settings.theme === 'dark' ? 'dark' : 'light';
          applyTheme(incoming);
          setTheme(incoming);
        }
      } catch {}
    })();
  }, []);

  // Background indexing progress listener (non-blocking)
  useEffect(() => {
    let unsubs: Array<() => void> = [];
    (async () => {
      try {
        const u1 = await listen("indexing-started", () => { setBgIndexing(true); setBgMessage("Indexing..."); });
        const u2 = await listen("indexing-progress", (e) => { if (typeof e.payload === 'string') setBgMessage(e.payload); });
        const u3 = await listen("indexing-completed", () => { setBgIndexing(false); setBgMessage(""); });
        unsubs = [u1, u2, u3];
      } catch {}
    })();
    return () => { unsubs.forEach(u => u()); };
  }, []);

  const applyTheme = (t: string) => {
    const root = document.documentElement;
  const isDark = t === 'dark';
    if (isDark) root.classList.add('dark'); else root.classList.remove('dark');
  };

  const cycleTheme = () => {
  const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    invoke("update_settings", { settings: { theme: next, thumbnail_size: 200, default_folder: null, cache_location: null } }).catch(()=>{});
  };

  return (
    <header className="flex flex-col border-b bg-card">
      <div className="flex items-center justify-between px-4 py-3 h-14">
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-base font-semibold shrink-0">Local Gallery</h1>
        <div className="flex flex-col min-w-0">
          <span className="text-xs text-muted-foreground">{fileCount} images</span>
          <span className="text-[10px] text-muted-foreground truncate max-w-40" title={folderPath}>{folderName}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SortDropdown
          sortKey={sortKey}
          sortDir={sortDir}
          onChangeSortKey={onChangeSortKey}
          onChangeSortDir={d => onChangeSortDir()}
        />
        <div className="w-64"><SearchBar onSearch={onSearch} /></div>
        <Button variant="ghost" size="icon" onClick={cycleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Moon className="w-4 h-4"/> : <Sun className="w-4 h-4"/>}
        </Button>
      </div>
      </div>
      {bgIndexing && (
        <div className="px-4 pb-2">
          <div className="w-full h-1.5 bg-muted rounded overflow-hidden">
            <div className="h-full bg-primary w-2/5 animate-pulse" />
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 truncate" title={bgMessage}>{bgMessage}</div>
        </div>
      )}
    </header>
  );
}

export default TopBar;
