import { GoogleGenAI, Type } from "@google/genai";
import { Part, SearchResult } from "../types";

// 1. AQUI: Mudamos para GEMINI_API_KEY para bater com o .env e o GitHub
const API_KEY = process.env.GEMINI_API_KEY; 
if (!API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function fileToGenerativePart(file: File) {
  // ... (pode manter igual) ...
}

async function getSearchContext(query: string | File): Promise<{ searchDescription: string; category: string }> {
    // 2. AQUI: Use o nome oficial e estável do modelo
    const model = 'gemini-1.5-flash';

    if (typeof query === 'string') {
        const prompt = `
        Analise a seguinte consulta de busca para uma peça industrial: "${query}".
        Extraia a categoria principal da peça (ex: bomba, válvula, sensor, motor, módulo eletrônico) e retorne a consulta original como descrição.
        Se a categoria não for clara, use "Componente Genérico".
        Retorne um objeto JSON com as chaves "description" e "category".
        `;
        const result = await ai.models.generateContent({
            model,
            contents: prompt,
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
        const responseJson = JSON.parse(result.text);
        return { searchDescription: responseJson.description, category: responseJson.category };
    } else {
        const imagePart = await fileToGenerativePart(query);
        const prompt = `
        Analise esta imagem de uma peça industrial. Seu objetivo é identificá-la para uma busca em um banco de dados.
        Forneça uma descrição técnica concisa e uma única categoria principal para a peça (ex: bomba, válvula, motor, sensor, módulo eletrônico).
        Características a observar:
        - Tipo da peça
        - Texto visível: marcas, modelos, especificações
        - Características físicas: formato, conexões, montagem
        - Provável aplicação industrial.
        Se houver texto, priorize-o. Se não, descreva as características físicas. A categoria é a saída mais importante.
        Retorne um objeto JSON com as chaves "description" e "category".
        `;
        const result = await ai.models.generateContent({
            model,
            contents: { parts: [imagePart, { text: prompt }] },
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
        const responseJson = JSON.parse(result.text);
        return { searchDescription: responseJson.description, category: responseJson.category };
    }
}

// Main function to find matching parts
export const findMatchingParts = async (query: string | File, parts: Part[]): Promise<{ identifiedPartType: string; results: SearchResult[] }> => {
    const { searchDescription, category } = await getSearchContext(query);

    // 3. AQUI: Aquele "gemini-3-flash-preview" ia dar erro 404. Use este:
    const model = 'gemini-1.5-flash';
    const prompt = `
    Você é um assistente especialista em manutenção industrial. Sua tarefa é encontrar peças correspondentes em uma lista fornecida com base em uma consulta de busca.

    REGRAS CRÍTICAS:
    1. COERÊNCIA TÉCNICA É ABSOLUTA: A busca é por um(a) '${category}'. Você NÃO PODE retornar peças de outras categorias. Filtre a lista primeiro com base nesta categoria. Se a descrição do item na base não contiver palavras relacionadas a '${category}', descarte-o.
    2. CORRESPONDÊNCIA INTELIGENTE E NÃO EXATA: As descrições na lista são inconsistentes. Combine por palavras-chave, códigos parciais, marcas e termos técnicos. Por exemplo, 'Bomba hidráulica Rexroth' deve corresponder a 'BOMBA REX 25L'.
    3. FORMATO DE SAÍDA ESTRITO: Retorne um objeto JSON com uma chave 'results', que é um array de peças correspondentes.
    4. RANKING E SIMILARIDADE: Cada item no array deve ter 'code', 'description' (da lista original) e 'similarity' ('Alta', 'Média', 'Baixa').
    5. RESULTADOS LIMITADOS: Retorne no máximo 1 resultado de similaridade 'Alta' e até 5 resultados 'Média' ou 'Baixa'. Ordene-os por similaridade, da maior para a menor. Se nenhum item corresponder, retorne um array vazio.

    Consulta de Busca: '${searchDescription}'
    Categoria da Peça: '${category}'

    Base de Dados de Peças (JSON):
    ${JSON.stringify(parts)}

    Execute a busca e retorne o JSON.
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
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: resultSchema,
            }
        });
        const responseJson = JSON.parse(result.text);
        return { identifiedPartType: category, results: responseJson.results || [] };
    } catch (e) {
        console.error("Gemini API call failed", e);
        throw new Error("A busca inteligente falhou. Pode ser um problema com a API ou a resposta foi inválida.");
    }
};
