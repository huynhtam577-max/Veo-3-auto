import React, { useState, useRef } from 'react';
import { AspectRatio, InputType, JobConfig, ModelType, Resolution } from '../types';

interface JobFormProps {
  onAddJob: (config: JobConfig, count: number) => void;
}

const JobForm: React.FC<JobFormProps> = ({ onAddJob }) => {
  const [prompt, setPrompt] = useState('');
  const [inputType, setInputType] = useState<InputType>(InputType.TEXT);
  const [model, setModel] = useState<ModelType>(ModelType.VEO_FAST);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.RATIO_16_9);
  const [resolution, setResolution] = useState<Resolution>(Resolution.RES_720P); // Defaulting to 720p for better compatibility
  const [count, setCount] = useState(1);
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [imageName, setImageName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix (data:image/jpeg;base64,)
        const base64Data = base64String.split(',')[1];
        setImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // Create the config
    const config: JobConfig = {
        prompt,
        inputType,
        model,
        aspectRatio,
        resolution,
        imageBase64,
        imageMimeType: 'image/png' // Simplifying for demo, ideally detect mime type
    };

    onAddJob(config, count);
    
    // Reset basic fields, keep image if bulk adding? No, reset for fresh start usually.
    // prompt kept? Maybe useful. Let's reset prompt to indicate action taken.
    // setPrompt(''); 
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-lg mb-8">
      <h2 className="text-xl font-bold mb-4 text-blue-400">Create New Job Batch</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Row 1: Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Describe the video you want to generate..."
            rows={3}
            required
          />
        </div>

        {/* Row 2: Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Input Type */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Input Type</label>
                <select 
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value as InputType)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                >
                    {Object.values(InputType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {/* Model */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Model</label>
                <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value as ModelType)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                >
                    <option value={ModelType.VEO_FAST}>Veo 3 Fast</option>
                    <option value={ModelType.VEO_HQ}>Veo 3 HQ</option>
                </select>
            </div>

             {/* Aspect Ratio */}
             <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Aspect Ratio</label>
                <select 
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                >
                    {Object.values(AspectRatio).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>

            {/* Resolution */}
            <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Resolution</label>
                <select 
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as Resolution)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                >
                    {Object.values(Resolution).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
        </div>

        {/* Row 3: Image Input (Conditional) */}
        {inputType === InputType.IMAGE && (
            <div className="p-4 bg-gray-700/50 rounded border border-gray-600 border-dashed">
                <label className="block text-sm font-medium text-gray-300 mb-2">Reference Image</label>
                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-600 file:text-white
                        hover:file:bg-blue-700
                    "
                />
                {imageName && <p className="mt-2 text-xs text-green-400">Selected: {imageName}</p>}
            </div>
        )}

        {/* Row 4: Quantity and Submit */}
        <div className="flex items-end gap-4">
             <div className="w-32">
                <label className="block text-sm font-medium text-gray-400 mb-1">Batch Size</label>
                <input 
                    type="number" 
                    min={1} 
                    max={50}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                />
            </div>
            <button 
                type="submit" 
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2 px-6 rounded transition-all transform active:scale-95"
            >
                Add {count} Job(s) to Queue
            </button>
        </div>

      </form>
    </div>
  );
};

export default JobForm;
