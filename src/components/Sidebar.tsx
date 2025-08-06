import { Grid, Heart, Folder, Tags, Star } from "lucide-react";
import { Button } from "./ui/Button";

interface SidebarProps {
  currentView: "grid" | "albums";
  onViewChange: (view: "grid" | "albums") => void;
  folderPath: string;
}

export function Sidebar({ currentView, onViewChange, folderPath }: SidebarProps) {
  const getFolderName = (path: string) => {
    return path.split(/[/\\]/).pop() || path;
  };

  return (
    <aside className="w-64 bg-card border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Current Folder
        </h2>
        <p className="mt-1 text-sm truncate" title={folderPath}>
          {getFolderName(folderPath)}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
            Views
          </h3>
          
          <Button
            variant={currentView === "grid" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("grid")}
          >
            <Grid className="w-4 h-4 mr-2" />
            All Images
          </Button>
          
          <Button
            variant={currentView === "albums" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onViewChange("albums")}
          >
            <Folder className="w-4 h-4 mr-2" />
            Albums
          </Button>
        </div>

        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2">
            Quick Filters
          </h3>
          
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Star className="w-4 h-4 mr-2" />
            Favorites
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Heart className="w-4 h-4 mr-2" />
            Recently Added
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start"
          >
            <Tags className="w-4 h-4 mr-2" />
            Tagged
          </Button>
        </div>
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          <p>Indexing complete</p>
          <p className="mt-1">Ready for browsing</p>
        </div>
      </div>
    </aside>
  );
}
