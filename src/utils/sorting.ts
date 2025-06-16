// Natural sorting utility function
export function naturalSort(a: string, b: string): number {
  // Convert strings to arrays of chunks (numbers and text)
  const aChunks = a.match(/(\d+|\D+)/g) || [];
  const bChunks = b.match(/(\d+|\D+)/g) || [];
  
  const maxLength = Math.max(aChunks.length, bChunks.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aChunk = aChunks[i] || '';
    const bChunk = bChunks[i] || '';
    
    // Check if both chunks are numbers
    const aIsNumber = /^\d+$/.test(aChunk);
    const bIsNumber = /^\d+$/.test(bChunk);
    
    if (aIsNumber && bIsNumber) {
      // Compare as numbers
      const aNum = parseInt(aChunk, 10);
      const bNum = parseInt(bChunk, 10);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // Compare as strings (case-insensitive)
      const comparison = aChunk.toLowerCase().localeCompare(bChunk.toLowerCase());
      if (comparison !== 0) {
        return comparison;
      }
    }
  }
  
  return 0;
}

// Lexicographical sorting (case-insensitive)
export function lexicographicalSort(a: string, b: string): number {
  return a.toLowerCase().localeCompare(b.toLowerCase());
}
