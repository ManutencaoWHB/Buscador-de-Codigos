import { GoogleGenAI, Type } from "@google/genai";
import { Part, SearchResult } from "../types";

// 1. CONFIGURAÇÃO DA CHAVE
const API_KEY = process.env.GEMINI_API_KEY; 
if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// 2. FUNÇÃO DE CONVERSÃO DE IMAGEM (Robustecida)
async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      if (!base64String) {
        reject(new Error("Falha ao converter imagem para Base64"));
        return;
      }
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

// 3. FUNÇÃO DE CONTEXTO (Identifica o que é a peça)
async function getSearchContext(query: string | File): Promise<{ searchDescription: string; category: string }> {
    const model = 'gemini-1.5-flash';

    if (typeof query === 'string') {
        const prompt = `
        Analise a seguinte consulta de busca para uma peça industrial: "${query}".
        Extraia a categoria principal da peça (ex: bomba, válvula, sensor, motor, módulo eletrônico) e retorne a consulta original como descrição.
        Se a categoria não for clara, use "Componente Genérico".
        Retorne um objeto JSON com as chaves "description" e "category".
        `;
        
        try {
            const result = await ai.models.generateContent({
                model,
                contents: {
                    role: "user",
                    parts: [{ text: prompt }]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            category: { type: Type.STRING },
                        }
                    }
                }
            });
            
            const text = result.text(); 
            const responseJson = JSON.parse(text);
            return { searchDescription: responseJson.description, category: responseJson.category };
        } catch (error) {
            console.error("Erro na análise de texto:", error);
            // Fallback simples caso a IA falhe
            return { searchDescription: query, category: "Peça Industrial" };
        }

    } else {
        // FLUXO DE IMAGEM
        try {
            const imagePart = await fileToGenerativePart(query);
            
            const prompt = `
            Analise esta imagem de uma peça industrial. Identifique-a para busca no banco de dados.
            Priorize texto visível (marcas, modelos). Se não houver, descreva formato e conexões.
            Retorne JSON com "description" e "category".
            `;
            
            const result = await ai.models.generateContent({
                model,
                contents: { 
                    role: "user",
                    parts: [imagePart, { text: prompt }] 
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            category: { type: Type.STRING },
                        }
                    }
                }
            });

            const text = result.text();
            const responseJson = JSON.parse(text);
            return { searchDescription: responseJson.description, category: responseJson.category };
        } catch (error) {
            console.error("Erro na análise de imagem:", error);
            throw new Error("Não foi possível analisar a imagem. Tente uma foto mais clara.");
        }
    }
}

// 4. FUNÇÃO PRINCIPAL (Busca na lista)
export const findMatchingParts = async (query: string | File, parts: Part[]): Promise<{ identifiedPartType: string; results: SearchResult[] }> => {
    const { searchDescription, category } = await getSearchContext(query);
    const model = 'gemini-1.5-flash';

    const prompt = `
    Atue como especialista em manutenção. Busque peças na lista abaixo compatíveis com:
    Busca: '${searchDescription}'
    Categoria Obrigatória: '${category}'

    Regras:
    1. Filtre rigorosamente pela categoria '${category}'.
    2. Use match flexível (ex: 'Rexroth' bate com 'REX').
    3. Retorne JSON com array 'results'.
    4. Cada item deve ter: 'code', 'description' (original), 'similarity' ('Alta', 'Média', 'Baixa').
    5. Máximo 6 resultados.

    Base de Dados:
    ${JSON.stringify(parts)}
    `;
    
    const resultSchema = {
        type: Type.OBJECT,
        properties: {
            results: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        code: { type: Type.STRING },
                        description: { type: Type.STRING },
                        similarity: { type: Type.STRING, enum: ['Alta', 'Média', 'Baixa'] }
                    },
                    required: ['code', 'description', 'similarity']
                }
            }
        }
    };
    
    try {
        const result = await ai.models.generateContent({
            model,
            contents: {
                role: "user",
                parts: [{ text: prompt }]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: resultSchema,
            }
        });

        const text = result.text();
        const responseJson = JSON.parse(text);
        return { identifiedPartType: category, results: responseJson.results || [] };
    } catch (e) {
        console.error("Erro final na busca:", e);
        throw new Error("Erro ao processar a busca inteligente.");
    }
};
