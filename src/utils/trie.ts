class TrieNode {
  children: Map<string, TrieNode>;
  isEndOfWord: boolean;
  originalStrings: Set<string>; // Store original cased strings

  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.originalStrings = new Set();
  }
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = new TrieNode();
  }

  insert(word: string) {
    if (!word || word.trim() === '') return;
    
    const original = word.trim();
    const lower = original.toLowerCase();
    
    // Insert the full string
    this.insertSuffix(lower, original);

    // Also insert at every word boundary to allow matching from the middle
    // For example: "Snacks - sandwich" -> insert "snacks", "sandwich"
    const words = lower.split(/[^a-z0-9]+/);
    for (const w of words) {
      if (w.length > 0 && w !== lower) {
        this.insertSuffix(w, original);
      }
    }
  }

  private insertSuffix(suffix: string, original: string) {
    let current = this.root;
    for (let i = 0; i < suffix.length; i++) {
      const char = suffix[i];
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }
    
    current.isEndOfWord = true;
    current.originalStrings.add(original);
  }

  // Helper for DFS to collect all terminal strings under a node
  private collectAllWords(node: TrieNode, limit: number, results: Set<string>) {
    if (results.size >= limit) return;
    
    if (node.isEndOfWord) {
      node.originalStrings.forEach(str => {
        if (results.size < limit) {
          results.add(str);
        }
      });
    }

    for (const childNode of node.children.values()) {
      if (results.size >= limit) break;
      this.collectAllWords(childNode, limit, results);
    }
  }

  searchPrefix(prefix: string, limit: number = 10): string[] {
    if (!prefix || prefix.trim() === '') return [];
    
    const lowerPrefix = prefix.trim().toLowerCase();
    let current = this.root;
    
    for (let i = 0; i < lowerPrefix.length; i++) {
      const char = lowerPrefix[i];
      if (!current.children.has(char)) {
        return []; // No matches found for prefix
      }
      current = current.children.get(char)!;
    }
    
    // Found the prefix node, now collect all words below it
    const results = new Set<string>();
    this.collectAllWords(current, limit, results);
    return Array.from(results);
  }
}
