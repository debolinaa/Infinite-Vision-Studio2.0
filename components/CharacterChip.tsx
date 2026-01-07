
import React from 'react';
import { Character } from '../types';

interface CharacterChipProps {
  character: Character;
}

export const CharacterChip: React.FC<CharacterChipProps> = ({ character }) => {
  return (
    <div className="bg-slate-900 border border-white/5 rounded-2xl p-4 hover:border-indigo-500/50 transition-all group cursor-default shadow-lg">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-lg text-indigo-400">
          {character.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-slate-200 text-sm tracking-tight">{character.name}</h3>
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Minimalist Avatar</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 leading-relaxed italic border-t border-white/5 pt-2">
        {character.appearance}
      </p>
    </div>
  );
};
