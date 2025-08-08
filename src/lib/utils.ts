import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Natural sort: splits strings into digit and non-digit runs so "image2" < "image10"
export function naturalCompare(a: string, b: string): number {
  const ax: Array<{value: string; num: boolean}> = [];
  const bx: Array<{value: string; num: boolean}> = [];
  a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { ax.push({ value: ($1 || $2), num: !!$1 }); return ""; });
  b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => { bx.push({ value: ($1 || $2), num: !!$1 }); return ""; });
  for (let i=0; i<Math.max(ax.length, bx.length); i++) {
    const av = ax[i];
    const bv = bx[i];
    if (!av) return -1;
    if (!bv) return 1;
    if (av.num && bv.num) {
      const diff = parseInt(av.value,10) - parseInt(bv.value,10);
      if (diff) return diff;
    } else if (av.value !== bv.value) {
      return av.value.localeCompare(bv.value);
    }
  }
  return 0;
}

export function naturalSortFiles<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a,b)=>naturalCompare(a.name, b.name));
}
