import type { CodeFile } from "../lib/types";

interface FileTreeProps {
  files: CodeFile[];
  changedFiles: string[];
  activeFile: string;
  onSelect: (path: string) => void;
}

// Group flat file paths into a folder→files map for display
function groupByFolder(files: CodeFile[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const f of files) {
    const slash = f.path.lastIndexOf("/");
    const folder = slash === -1 ? "" : f.path.slice(0, slash);
    const name   = slash === -1 ? f.path : f.path.slice(slash + 1);
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push(name);
  }
  return map;
}

const EXT_ICONS: Record<string, string> = {
  go:   "go",
  ts:   "ts",
  tsx:  "tsx",
  js:   "js",
  json: "{}",
  md:   "md",
  mod:  "mod",
  sum:  "sum",
  css:  "css",
  html: "html",
};

function fileIcon(name: string): string {
  const ext = name.split(".").pop() ?? "";
  return EXT_ICONS[ext] ?? "·";
}

export default function FileTree({ files, changedFiles, activeFile, onSelect }: FileTreeProps) {
  const changedSet = new Set(changedFiles);
  const groups = groupByFolder(files);
  const folders = Array.from(groups.keys()).sort();

  return (
    <div className="file-tree">
      {folders.map((folder) => {
        const names = groups.get(folder)!;
        return (
          <div key={folder} className="file-tree-group">
            {folder && (
              <div className="file-tree-folder">
                <span className="file-tree-folder-icon">▾</span>
                {folder}
              </div>
            )}
            {names.map((name) => {
              const fullPath = folder ? `${folder}/${name}` : name;
              const isActive  = fullPath === activeFile;
              const isChanged = changedSet.has(fullPath);
              return (
                <button
                  key={fullPath}
                  className={`file-tree-item${isActive ? " file-tree-item--active" : ""}${isChanged ? " file-tree-item--changed" : ""}`}
                  onClick={() => onSelect(fullPath)}
                  style={folder ? { paddingLeft: "28px" } : undefined}
                >
                  <span className="file-tree-icon">{fileIcon(name)}</span>
                  <span className="file-tree-name">{name}</span>
                  {isChanged && <span className="file-tree-dot" />}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
