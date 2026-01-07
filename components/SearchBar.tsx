
import React, { useState } from 'react';
import { SearchIcon, ImageIcon, TextIcon, ResetIcon } from './Icons';

interface SearchBarProps {
  onSearch: (query: string | File) => void;
  databaseSize: number;
  onReset: () => void;
  disabled?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, databaseSize, onReset, disabled = false }) => {
  const [searchMode, setSearchMode] = useState<'text' | 'image'>('text');
  const [textQuery, setTextQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;

    if (searchMode === 'text' && textQuery.trim()) {
      onSearch(textQuery.trim());
    } else if (searchMode === 'image' && imageFile) {
      onSearch(imageFile);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-800/50 border border-slate-700 rounded-xl p-4 sm:p-6 shadow-lg mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-sky-300">2. Buscar Peça</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Base: {databaseSize} itens</span>
          <button onClick={onReset} title="Carregar nova base" className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50" disabled={disabled}>
            <ResetIcon className="w-4 h-4" />
            Resetar
          </button>
        </div>
      </div>
      
      {/* Search Mode Toggle */}
      <div className="flex bg-slate-900 p-1 rounded-lg mb-4">
        <button onClick={() => setSearchMode('text')} className={`w-1/2 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${searchMode === 'text' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
          <TextIcon className="w-5 h-5" />
          Busca por Texto
        </button>
        <button onClick={() => setSearchMode('image')} className={`w-1/2 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${searchMode === 'image' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
          <ImageIcon className="w-5 h-5" />
          Busca por Imagem
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {searchMode === 'text' ? (
          <div className="relative">
            <input
              type="text"
              value={textQuery}
              onChange={(e) => setTextQuery(e.target.value)}
              placeholder="Ex: 'bomba hidráulica Rexroth 25L'"
              className="w-full pl-4 pr-12 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition"
              disabled={disabled}
            />
             <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-full w-full object-contain p-2 rounded-lg" />
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <ImageIcon className="w-8 h-8 mb-2 text-slate-500" />
                  <p className="text-sm text-slate-400"><span className="font-semibold text-sky-400">Clique para selecionar uma imagem</span></p>
                </div>
              )}
              <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} disabled={disabled}/>
            </label>
          </div>
        )}

        <button type="submit" className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-3 px-4 rounded-lg hover:from-sky-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={disabled || (searchMode === 'text' && !textQuery.trim()) || (searchMode === 'image' && !imageFile)}>
          <SearchIcon className="w-5 h-5" />
          Buscar Código
        </button>
      </form>
    </div>
  );
};

export default SearchBar;
