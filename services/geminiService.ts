import { GoogleGenerativeAI } from "@google/generative-ai";
import { Part, SearchResult } from "../types";

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Função Auxiliar de Conversão
async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Função para pegar o modelo (Tenta o Flash, se der erro, tenta o Pro)
function getModel() {
    // Tente usar o nome exato da versão "latest" para evitar erros de alias
    return genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        generationConfig: { responseMimeType: "application/json" }
    });
}

async function getSearchContext(query: string | File): Promise<{ searchDescription: string; category: string }> {
  const model = getModel();
  let result;
  
  try {
      if (typeof query === 'string') {
        const prompt = `Analise a consulta: "${query}". Extraia a "category" (ex: bomba, válvula, sensor) e use a consulta original como "description". Retorne JSON: { "description": string, "category": string }`;
        result = await model.generateContent(prompt);
      } else {
        const imagePart = await fileToGenerativePart(query);
        const prompt = `Analise a imagem. Identifique a peça industrial. Retorne JSON: { "description": "descrição técnica breve", "category": "categoria única da peça" }`;
        result = await model.generateContent([prompt, imagePart]);
      }

      const responseText = result.response.text();
      const json = JSON.parse(responseText);
      return { searchDescription: json.description, category: json.category };

  } catch (error) {
      console.error("Erro na identificação:", error);
      // Fallback simples
      return { searchDescription: typeof query === 'string' ? query : "Peça Industrial", category: "Geral" };
  }
}

export const findMatchingParts = async (query: string | File, parts: Part[]): Promise<{ identifiedPartType: string; results: SearchResult[] }> => {
  const { searchDescription, category } = await getSearchContext(query);
  const model = getModel();

  const prompt = `
  Atue como especialista. Busque peças na lista JSON abaixo.
  Busca: "${searchDescription}"
  Categoria: "${category}"
  
  Regras:
  1. Filtre pela categoria "${category}".
  2. Retorne JSON com array 'results'.
  3. Cada item: "code", "description", "similarity" ("Alta", "Média", "Baixa").
  
  Lista:
  ${JSON.stringify(parts)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const json = JSON.parse(responseText);
    return { identifiedPartType: category, results: json.results || [] };
  } catch (e) {
    console.error("Erro na busca:", e);
    throw new Error("Erro ao processar a busca com IA.");
  }
};
