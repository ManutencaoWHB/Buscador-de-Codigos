/* SUBSTITUA TODO O CONTEÚDO DE: src/services/geminiService.ts
   USANDO A BIBLIOTECA ESTÁVEL (@google/generative-ai)
*/

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Part, SearchResult } from "../types";

// 1. Configuração da Chave
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

// Inicializa a biblioteca ESTÁVEL
const genAI = new GoogleGenerativeAI(API_KEY);

// 2. Função Auxiliar de Conversão de Imagem
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

// 3. Função de Contexto (Identifica a peça)
async function getSearchContext(query: string | File): Promise<{ searchDescription: string; category: string }> {
  // O modelo Flash é muito rápido e barato. Na lib estável, usamos assim:
  const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      // Forçamos a resposta em JSON para facilitar a leitura
      generationConfig: { responseMimeType: "application/json" }
  });

  let result;
  
  try {
      if (typeof query === 'string') {
        // FLUXO DE TEXTO
        const prompt = `
        Analise a consulta: "${query}".
        Extraia a "category" (ex: bomba, válvula, sensor) e use a consulta original como "description".
        Retorne JSON: { "description": string, "category": string }
        `;
        result = await model.generateContent(prompt);

      } else {
        // FLUXO DE IMAGEM
        const imagePart = await fileToGenerativePart(query);
        const prompt = `
        Analise a imagem. Identifique a peça industrial.
        Retorne JSON: { "description": "descrição técnica breve", "category": "categoria única da peça" }
        `;
        result = await model.generateContent([prompt, imagePart]);
      }

      const responseText = result.response.text();
      const json = JSON.parse(responseText);
      return { searchDescription: json.description, category: json.category };

  } catch (error) {
      console.error("Erro na identificação:", error);
      // Fallback para não travar o app
      return { searchDescription: typeof query === 'string' ? query : "Peça não identificada", category: "Geral" };
  }
}

// 4. Função Principal (Busca na Lista)
export const findMatchingParts = async (query: string | File, parts: Part[]): Promise<{ identifiedPartType: string; results: SearchResult[] }> => {
  const { searchDescription, category } = await getSearchContext(query);

  const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
  Contexto: Especialista em manutenção industrial.
  Tarefa: Buscar peças na lista JSON abaixo.
  
  Entrada:
  - Busco por: "${searchDescription}"
  - Categoria Obrigatória: "${category}"
  
  Regras:
  1. Filtre itens que sejam da categoria "${category}".
  2. Use busca "fuzzy" (aproximada). Ex: "Valvula" encontra "VALV".
  3. Retorne JSON com propriedade "results" (array).
  4. Cada item deve ter: "code", "description", "similarity" ("Alta", "Média", "Baixa").
  
  Lista de Peças:
  ${JSON.stringify(parts)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const json = JSON.parse(responseText);
    
    return { identifiedPartType: category, results: json.results || [] };
  } catch (e) {
    console.error("Erro na busca final:", e);
    throw new Error("Erro ao processar a busca com IA.");
  }
};
