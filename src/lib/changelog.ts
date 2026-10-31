import changelog from "../../CHANGELOG.md?raw";

export interface ChangeGroup {
  heading: string;
  items: string[];
}

/** The entries for one version of the changelog, grouped under Added, Fixed and so on. */
export function changesFor(version: string, source: string = changelog): ChangeGroup[] {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
  if (start < 0) return [];
  const groups: ChangeGroup[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    if (line.startsWith("### ")) groups.push({ heading: line.slice(4).trim(), items: [] });
    else if (line.startsWith("- ") && groups.length) groups[groups.length - 1].items.push(line.slice(2).trim());
  }
  return groups.filter((g) => g.items.length > 0);
}
