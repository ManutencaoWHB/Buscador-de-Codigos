
import React from 'react';
import { SearchResult, Similarity } from '../types';
import Spinner from './Spinner';
import { CheckCircleIcon, CubeIcon, ExclamationIcon, SearchIcon as SearchIconAlt } from './Icons';

interface ResultsDisplayProps {
  state: 'searching' | 'results_found' | 'no_results' | 'data_loaded';
  results: SearchResult[];
  identifiedPartType: string | null;
}

const SimilarityBadge: React.FC<{ similarity: Similarity }> = ({ similarity }) => {
  const baseClasses = "px-2.5 py-0.5 text-xs font-semibold rounded-full";
  const styles = {
    'Alta': "bg-green-500/20 text-green-300",
    'Média': "bg-yellow-500/20 text-yellow-300",
    'Baixa': "bg-orange-500/20 text-orange-300",
  };
  return <span className={`${baseClasses} ${styles[similarity]}`}>{similarity}</span>;
};

const ResultCard: React.FC<{ result: SearchResult, isPrimary: boolean }> = ({ result, isPrimary }) => {
    return (
        <div className={`p-4 rounded-lg transition-all duration-300 ${isPrimary ? 'bg-sky-900/50 border-2 border-sky-500' : 'bg-slate-800 border border-slate-700'}`}>
            <div className="flex justify-between items-start gap-4">
                <div>
                    <h4 className="font-bold text-lg text-slate-100">{result.code}</h4>
                    <p className="text-slate-400 text-sm">{result.description}</p>
                </div>
                <SimilarityBadge similarity={result.similarity} />
            </div>
        </div>
    );
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ state, results, identifiedPartType }) => {

  const renderContent = () => {
    switch (state) {
      case 'searching':
        return (
          <div className="text-center p-8">
            <Spinner />
            <p className="mt-4 text-lg text-slate-300 animate-pulse">Analisando e buscando na base de dados...</p>
            <p className="text-sm text-slate-500">A IA está trabalhando para encontrar a melhor correspondência.</p>
          </div>
        );
      case 'results_found':
        const primaryResult = results[0];
        const alternativeResults = results.slice(1);
        return (
          <div>
            <div className="text-center mb-6 p-4 bg-slate-800 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-200">Tipo de Peça Identificada: <span className="text-sky-400 font-bold">{identifiedPartType || 'Não especificado'}</span></h3>
            </div>
            
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-green-400 mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-6 h-6"/>
                    Melhor Correspondência
                </h3>
                <ResultCard result={primaryResult} isPrimary={true} />
            </div>

            {alternativeResults.length > 0 && (
                <div>
                    <h3 className="text-xl font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                        <CubeIcon className="w-6 h-6"/>
                        Alternativas
                    </h3>
                    <div className="space-y-3">
                        {alternativeResults.map((res, index) => (
                           <ResultCard key={`${res.code}-${index}`} result={res} isPrimary={false} />
                        ))}
                    </div>
                </div>
            )}
          </div>
        );
      case 'no_results':
        return (
          <div className="text-center p-8 bg-slate-800/50 border border-slate-700 rounded-xl">
             <ExclamationIcon className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
             <h3 className="text-xl font-bold text-yellow-400">Nenhuma correspondência confiável encontrada</h3>
             {identifiedPartType && <p className="text-slate-300 mt-2">Tipo de Peça Identificada: <span className="font-semibold">{identifiedPartType}</span>.</p>}
             <p className="text-slate-400 mt-2">Tente uma busca diferente, uma imagem mais nítida ou verifique sua base de dados.</p>
          </div>
        );
      case 'data_loaded':
         return (
          <div className="text-center p-8 bg-slate-800/50 border border-slate-700 rounded-xl">
             <SearchIconAlt className="w-12 h-12 mx-auto text-sky-500 mb-4" />
             <h3 className="text-xl font-bold text-sky-400">Pronto para a busca</h3>
             <p className="text-slate-400 mt-2">Utilize a barra de busca acima para encontrar peças por texto ou imagem.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="w-full max-w-2xl mx-auto mt-4">{renderContent()}</div>;
};

export default ResultsDisplay;
