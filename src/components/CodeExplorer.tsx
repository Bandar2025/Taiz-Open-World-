import React, { useState } from 'react';
import { cppFiles } from '../data/cppCode';
import { CppFile } from '../types';
import { FileCode, Folder, Copy, Check, Download, Info, Search, Code2 } from 'lucide-react';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CppFile>(cppFiles[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Filter files by query
  const filteredFiles = cppFiles.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([selectedFile.code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = selectedFile.name;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Group files by Category
  const categories: { [key: string]: CppFile[] } = {
    'Core': cppFiles.filter(f => f.category === 'Core'),
    'Characters': cppFiles.filter(f => f.category === 'Characters'),
    'Systems': cppFiles.filter(f => f.category === 'Systems'),
    'UI': cppFiles.filter(f => f.category === 'UI'),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[800px] bg-[#0A0A0C]">
      {/* File Tree Sidebar */}
      <div className="lg:col-span-4 bg-[#121214] border border-[#232329] rounded-xl flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b border-[#232329] bg-[#0E0E10]">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" />
            UE 5.6 Source Explorer
          </h3>
          <p className="text-[11px] text-gray-400 mt-1">Navigate actual compilable game systems</p>
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Search source files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1A1A1E] border border-[#2A2A32] text-xs text-gray-200 pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {searchQuery ? (
            <div className="space-y-1">
              {filteredFiles.map(file => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-all duration-150 cursor-pointer ${
                    selectedFile.id === file.id
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium'
                      : 'text-gray-400 hover:bg-[#1A1A1E] border border-transparent hover:text-gray-300'
                  }`}
                >
                  <FileCode className={`w-3.5 h-3.5 ${file.type === 'header' ? 'text-blue-400' : 'text-purple-400'}`} />
                  <div className="truncate">
                    <p className="font-mono text-xs">{file.name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{file.path}</p>
                  </div>
                </button>
              ))}
              {filteredFiles.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No matching C++ files found</p>
              )}
            </div>
          ) : (
            Object.entries(categories).map(([category, items]) => (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1">
                  <Folder className="w-3.5 h-3.5 text-amber-500/60" />
                  <span className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase">{category} Systems</span>
                </div>
                <div className="space-y-0.5 pl-3 border-l border-[#232329] ml-3">
                  {items.map(file => (
                    <button
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left text-xs transition-all duration-150 cursor-pointer ${
                        selectedFile.id === file.id
                          ? 'bg-amber-500/10 text-amber-400 font-medium border-l-2 border-l-amber-500'
                          : 'text-gray-400 hover:bg-[#1A1A1E] hover:text-gray-300'
                      }`}
                    >
                      <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${file.type === 'header' ? 'text-sky-400' : 'text-indigo-400'}`} />
                      <span className="font-mono truncate">{file.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Code Editor Window */}
      <div className="lg:col-span-8 bg-[#121214] border border-[#232329] rounded-xl flex flex-col overflow-hidden h-full">
        {/* Editor Title Bar */}
        <div className="px-5 py-4 border-b border-[#232329] bg-[#0E0E10] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code2 className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-xs text-gray-400 block font-mono">{selectedFile.path}</span>
              <h2 className="text-sm font-semibold text-gray-100 flex items-center gap-1.5">
                {selectedFile.name}
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded uppercase ${
                  selectedFile.type === 'header' ? 'bg-sky-950 text-sky-400 border border-sky-900/40' : 'bg-indigo-950 text-indigo-400 border border-indigo-900/40'
                }`}>
                  {selectedFile.type}
                </span>
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 bg-[#1C1C22] border border-[#2D2D38] hover:bg-[#23232D] text-gray-300 hover:text-white rounded-lg transition-all duration-200 cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="p-2 bg-[#1C1C22] border border-[#2D2D38] hover:bg-[#23232D] text-gray-300 hover:text-white rounded-lg transition-all duration-200 cursor-pointer"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Editor Info Bar */}
        <div className="px-5 py-3.5 bg-amber-500/5 border-b border-amber-500/10 flex gap-2.5 items-start">
          <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/95 leading-relaxed">
            <span className="font-semibold">Architectural Purpose:</span> {selectedFile.purpose}
          </p>
        </div>

        {/* Code Viewport with Synthesizer Line Numbers */}
        <div className="flex-1 overflow-auto bg-[#070709] p-5 font-mono text-xs leading-relaxed text-gray-300 relative">
          <pre className="overflow-x-auto select-text whitespace-pre">
            <code>
              {selectedFile.code.split('\n').map((line, idx) => (
                <div key={idx} className="flex hover:bg-[#121216] py-0.5">
                  <span className="w-8 text-right pr-4 text-gray-600 select-none text-[10px]">{idx + 1}</span>
                  <span className={getHighlightedLineClass(line)}>{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

// Helper to provide subtle, high-performance syntax-based line colors in pure TS/CSS (avoids loading massive plugins)
function getHighlightedLineClass(line: string): string {
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return 'text-emerald-500/80 italic'; // Comments
  }
  if (trimmed.startsWith('#')) {
    return 'text-amber-500 font-semibold'; // Preprocessor directives
  }
  if (trimmed.includes('UCLASS(') || trimmed.includes('GENERATED_BODY()') || trimmed.includes('UPROPERTY(') || trimmed.includes('UFUNCTION(') || trimmed.includes('UENUM(')) {
    return 'text-amber-400 font-bold'; // Unreal Reflection macros
  }
  if (trimmed.startsWith('class') || trimmed.startsWith('struct') || trimmed.startsWith('enum class')) {
    return 'text-sky-400 font-semibold'; // Core class declarations
  }
  return 'text-gray-300';
}
