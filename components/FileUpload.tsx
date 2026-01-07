
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileLoad: (file: File) => void;
  error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad, error }) => {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx')) {
        setFileName(file.name);
        onFileLoad(file);
      } else {
        alert("Por favor, selecione um arquivo Excel (.xlsx).");
      }
    }
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragging(true);
    } else if (e.type === 'dragleave') {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [onFileLoad]);

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-800/50 border border-slate-700 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-semibold text-center text-sky-300 mb-2">1. Importar Base de Dados</h2>
      <p className="text-center text-slate-400 mb-6">Comece carregando seu arquivo Excel (.xlsx) com códigos e descrições das peças.</p>
      
      <label
        htmlFor="excel-upload"
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${dragging ? 'border-sky-400 bg-slate-700' : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800'}`}
        onDragEnter={handleDragEvents}
        onDragOver={handleDragEvents}
        onDragLeave={handleDragEvents}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon className={`w-10 h-10 mb-3 transition-colors ${dragging ? 'text-sky-400' : 'text-slate-500'}`} />
          <p className="mb-2 text-sm text-slate-400">
            <span className="font-semibold text-sky-400">Clique para carregar</span> ou arraste e solte
          </p>
          <p className="text-xs text-slate-500">Arquivo Excel (.xlsx)</p>
        </div>
        <input id="excel-upload" type="file" className="hidden" accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => handleFileChange(e.target.files)} />
      </label>

      {fileName && (
        <p className="text-center mt-4 text-green-400">Arquivo selecionado: {fileName}</p>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-md text-sm">
          <strong>Erro:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
