
import React, { useState, useCallback } from 'react';
import { Part, SearchResult } from './types';
import { parseExcel } from './services/excelParser';
import { findMatchingParts } from './services/geminiService';
import FileUpload from './components/FileUpload';
import SearchBar from './components/SearchBar';
import ResultsDisplay from './components/ResultsDisplay';
import { GithubIcon } from './components/Icons';

type AppState = 'initial' | 'data_loaded' | 'searching' | 'results_found' | 'no_results';

function App() {
  const [parts, setParts] = useState<Part[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [identifiedPartType, setIdentifiedPartType] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('initial');
  const [error, setError] = useState<string | null>(null);

  const handleFileLoad = async (file: File) => {
    setAppState('searching');
    setError(null);
    try {
      const parsedParts = await parseExcel(file);
      if (parsedParts.length === 0) {
        throw new Error("O arquivo Excel está vazio ou em um formato inválido. Verifique se a Coluna A contém códigos e a Coluna B contém descrições.");
      }
      setParts(parsedParts);
      setAppState('data_loaded');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido ao processar o arquivo.");
      setAppState('initial');
    }
  };

  const handleSearch = useCallback(async (query: string | File) => {
    if (parts.length === 0) {
      setError("Nenhuma base de dados de peças foi carregada. Por favor, importe um arquivo Excel primeiro.");
      return;
    }
    setAppState('searching');
    setError(null);
    setSearchResults([]);
    setIdentifiedPartType(null);

    try {
      const result = await findMatchingParts(query, parts);
      setIdentifiedPartType(result.identifiedPartType);
      
      if (result.results && result.results.length > 0) {
        setSearchResults(result.results);
        setAppState('results_found');
      } else {
        setAppState('no_results');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ocorreu um erro na busca. A API pode estar indisponível ou a requisição falhou.");
      setAppState('data_loaded');
    }
  }, [parts]);

  const handleReset = () => {
    setParts([]);
    setSearchResults([]);
    setIdentifiedPartType(null);
    setError(null);
    setAppState('initial');
  };

  const renderContent = () => {
    switch (appState) {
      case 'initial':
        return <FileUpload onFileLoad={handleFileLoad} error={error} />;
      case 'data_loaded':
      case 'results_found':
      case 'no_results':
        return (
          <>
            <SearchBar onSearch={handleSearch} databaseSize={parts.length} onReset={handleReset} />
            <ResultsDisplay
              state={appState}
              results={searchResults}
              identifiedPartType={identifiedPartType}
            />
          </>
        );
      case 'searching':
        return (
           <>
            <SearchBar onSearch={handleSearch} databaseSize={parts.length} onReset={handleReset} disabled={true} />
            <ResultsDisplay
              state={appState}
              results={[]}
              identifiedPartType={null}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
            Buscador Inteligente de Peças
          </h1>
          <p className="mt-2 text-slate-400">
            Encontre códigos de peças por texto ou imagem com IA.
          </p>
        </header>
        
        <main className="w-full">
          {renderContent()}
        </main>

        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Powered by Gemini API</p>
           <a href="https://github.com/google/genai-js" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-sky-400 transition-colors">
            <GithubIcon className="w-4 h-4" />
            genai-js
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
