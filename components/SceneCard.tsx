
import React from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  onGenerate: (sceneId: string) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene, onGenerate }) => {
  // This component is now deprecated by the unified Page layout in App.tsx
  // Keeping it as a simpler fallback or for future grid views
  return (
    <div className="bg-white border-2 border-slate-900 overflow-hidden flex flex-col h-full shadow-lg">
      <div className="relative aspect-video bg-slate-50 flex items-center justify-center overflow-hidden">
        {scene.imageUrl ? (
          <img src={scene.imageUrl} className="w-full h-full object-cover grayscale" />
        ) : (
          <div className="text-center p-6">
            {scene.isGenerating ? (
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <button onClick={() => onGenerate(scene.id)} className="text-[10px] font-bold text-slate-400 uppercase">Sketch</button>
            )}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-slate-200">
        <p className="text-xs text-slate-600 italic line-clamp-2 mb-2">"{scene.action}"</p>
        <p className="text-xs text-slate-900 font-bold">"{scene.dialogue}"</p>
      </div>
    </div>
  );
};
