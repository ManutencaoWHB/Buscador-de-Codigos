
import { Part } from '../types';

// The XLSX variable is globally available from the script tag in index.html
declare var XLSX: any;

export const parseExcel = (file: File): Promise<Part[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error("Failed to read file data.");
        }
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON, explicitly mapping columns A and B
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
        
        const parts: Part[] = json
          .map((row: any[]) => ({
            code: row[0] ? String(row[0]).trim() : '',
            description: row[1] ? String(row[1]).trim() : '',
          }))
          .filter(part => part.code && part.description); // Ensure both code and description exist

        if (parts.length === 0) {
            reject(new Error("Nenhuma peça válida encontrada no arquivo. Verifique se as colunas A (Código) e B (Descrição) estão preenchidas."));
            return;
        }

        resolve(parts);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(new Error("Falha ao analisar o arquivo Excel. Verifique se o formato está correto."));
      }
    };

    reader.onerror = (error) => {
      reject(new Error("Falha ao ler o arquivo."));
    };

    reader.readAsBinaryString(file);
  });
};
