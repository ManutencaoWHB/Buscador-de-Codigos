
export interface Part {
  code: string;
  description: string;
}

export type Similarity = 'Alta' | 'Média' | 'Baixa';

export interface SearchResult {
  code: string;
  description: string;
  similarity: Similarity;
}
