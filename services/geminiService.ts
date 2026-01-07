import { Part, SearchResult } from "../types";

// URL do seu Worker criado no Passo 1
// COLOQUE AQUI A URL QUE O CLOUDFLARE TE DEU (ex: https://api-buscador.seu-usuario.workers.dev)
const WORKER_URL = "buscador-de-codigos.luanfprz.workers.dev
"; 

// Interface da resposta esperada do Worker
interface GeminiResponse {
  identifiedPartType: string;
  results: SearchResult[];
}

// Converte arquivo para Base64 (sem o prefixo data:image/...)
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove o cabeçalho "data:image/png;base64," para enviar só os dados
      const base64Clean = result.split(',')[1];
      resolve(base64Clean);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const findMatchingParts = async (query: string | File, parts: Part[]): Promise<GeminiResponse> => {
  let queryData: string;
  let queryType: 'text' | 'image';

  // Prepara os dados para envio
  if (typeof query === 'string') {
    queryData = query;
    queryType = 'text';
  } else {
    queryData = await fileToBase64(query);
    queryType = 'image';
  }

  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: queryData,
        queryType: queryType,
        parts: parts // Enviamos a base de dados lida do Excel
      })
    });

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data;

  } catch (e) {
    console.error("Erro na busca:", e);
    throw new Error("Erro de conexão com o servidor de inteligência artificial.");
  }
};