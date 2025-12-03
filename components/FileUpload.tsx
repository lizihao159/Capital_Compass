import React, { useRef } from 'react';
import { Upload, FileText, Files } from 'lucide-react';

interface FileUploadProps {
  onDataLoaded: (contents: string[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filePromises = Array.from(files).map((file: File) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result;
          if (typeof text === 'string') {
            resolve(text);
          } else {
            resolve("");
          }
        };
        reader.readAsText(file);
      });
    });

    const contents = await Promise.all(filePromises);
    const validContents = contents.filter(c => c.length > 0);
    
    if (validContents.length > 0) {
      onDataLoaded(validContents);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10 p-8 border-2 border-dashed border-slate-300 rounded-xl bg-white hover:bg-slate-50 transition-colors text-center cursor-pointer group"
         onClick={() => fileInputRef.current?.click()}>
      <input 
        type="file" 
        accept=".csv" 
        multiple
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-blue-50 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
          <Upload size={32} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Upload Dataset(s)</h3>
          <p className="text-sm text-slate-500 mt-1">Drag and drop or click to select one or multiple CSV files</p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
           <Files size={12} />
           <span>Supports multiple Research Capstone formatted CSVs</span>
        </div>
      </div>
    </div>
  );
};