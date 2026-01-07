
import React, { useState, useRef, useEffect } from 'react';
import { StoryboardData, Scene, Page } from './types';
import { developStoryConcept, generateStoryboardFromText, generatePageImage } from './geminiService';
import { CharacterChip } from './components/CharacterChip';

type AppStep = 'input' | 'development' | 'storyboard';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('input');
  const [mode, setMode] = useState<'quick' | 'creative'>('creative');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [developedStory, setDevelopedStory] = useState<{ story: string; screenplay: string } | null>(null);
  const [data, setData] = useState<StoryboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Customization State - Default 5 pages, 10 panels per page
  const [numPages, setNumPages] = useState(5);
  const [numPanelsPerPage, setNumPanelsPerPage] = useState(10);
  
  // UI State
  const [zoomedPage, setZoomedPage] = useState<string | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState("");

  const storyboardRef = useRef<HTMLDivElement>(null);
  const devRef = useRef<HTMLDivElement>(null);

  const totalPanels = numPages * numPanelsPerPage;

  const handleStartProduction = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);

    try {
      if (mode === 'creative') {
        const result = await developStoryConcept(input, totalPanels);
        setDevelopedStory(result);
        setStep('development');
      } else {
        const result = await generateStoryboardFromText(input, numPages, numPanelsPerPage);
        setData(result);
        setStep('storyboard');
        renderAllPagesSequentially(result);
      }
    } catch (err: any) {
      setError(err.message || 'Production failed. Please refine your vision.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuildManga = async () => {
    if (!developedStory) return;
    setLoading(true);
    setError(null);

    try {
      const result = await generateStoryboardFromText(developedStory.screenplay, numPages, numPanelsPerPage);
      setData(result);
      setStep('storyboard');
      renderAllPagesSequentially(result);
    } catch (err: any) {
      setError(err.message || 'Critical logic error in sequence generation.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generates images page by page to ensure responsiveness and improved perceived speed.
   */
  const renderAllPagesSequentially = async (currentData: StoryboardData) => {
    const pages = [...currentData.pages];
    for (let i = 0; i < pages.length; i++) {
      // Small delay to allow UI to breathe
      await new Promise(r => setTimeout(r, 100));
      await handleGeneratePage(pages[i].id, currentData);
    }
  };

  const handleGeneratePage = async (pageId: string, currentData?: StoryboardData) => {
    const activeData = currentData || data;
    if (!activeData) return;
    
    setData(prev => prev ? {
      ...prev,
      pages: prev.pages.map(p => p.id === pageId ? { ...p, isGenerating: true } : p)
    } : null);

    try {
      const target = activeData.pages.find(p => p.id === pageId);
      if (!target) return;
      const imageUrl = await generatePageImage(target, activeData.characters);
      setData(prev => prev ? {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, imageUrl, isGenerating: false } : p)
      } : null);
    } catch (err) {
      console.error(err);
      setData(prev => prev ? {
        ...prev,
        pages: prev.pages.map(p => p.id === pageId ? { ...p, isGenerating: false } : p)
      } : null);
    }
  };

  const startEditing = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditBuffer(scene.action);
  };

  const saveEdit = () => {
    if (!data || !editingSceneId) return;
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        pages: prev.pages.map(p => ({
          ...p,
          scenes: p.scenes.map(s => s.id === editingSceneId ? { ...s, action: editBuffer } : s)
        }))
      };
    });
    setEditingSceneId(null);
  };

  const zoomPage = data?.pages.find(p => p.id === zoomedPage);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f1a] text-slate-200 selection:bg-indigo-500/40">
      {/* Zoom Modal */}
      {zoomedPage && zoomPage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
          <button onClick={() => setZoomedPage(null)} className="absolute top-6 right-6 text-white/50 hover:text-white text-3xl transition-all z-[110] bg-white/10 w-12 h-12 rounded-full flex items-center justify-center backdrop-blur">
            <i className="fas fa-times"></i>
          </button>
          <div className="max-w-6xl w-full h-full flex flex-col lg:flex-row gap-12 items-center justify-center overflow-hidden">
            <div className="bg-white p-2 md:p-4 rounded-sm shadow-[0_0_100px_rgba(255,255,255,0.1)] aspect-[3/4] h-full max-h-[85vh] relative group ring-1 ring-white/10">
              {zoomPage.imageUrl ? (
                <img src={zoomPage.imageUrl} className="w-full h-full object-contain grayscale contrast-125 brightness-110" alt="Zoomed view" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bebas text-4xl bg-slate-100 italic">No Content</div>
              )}
            </div>
            <div className="flex-1 max-w-md w-full space-y-8 overflow-y-auto max-h-[80vh] pr-4 custom-scrollbar">
              <div className="border-b border-white/10 pb-6">
                <span className="text-indigo-500 font-black text-xs uppercase tracking-[0.5em] mb-2 block">Technical Inspection</span>
                <h3 className="text-5xl font-bebas tracking-widest text-white leading-none">Matrix Page {zoomPage.pageNumber}</h3>
              </div>
              
              <div className="space-y-6">
                {zoomPage.scenes.map(s => (
                  <div key={s.id} className="bg-white/5 p-6 rounded-2xl border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                      <span>Panel {s.sceneNumber}</span>
                      <span className="text-slate-500">{s.location}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{s.action}</p>
                    {s.dialogue && <p className="text-xs text-slate-500 italic border-l border-indigo-500/30 pl-3">"{s.dialogue}"</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="py-4 px-8 border-b border-white/5 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-xl shadow-xl shadow-indigo-600/20">
              <i className="fas fa-video"></i>
            </div>
            <h1 className="text-lg font-bebas tracking-widest uppercase text-white">Director's Matrix Draft</h1>
          </div>
          <nav className="flex items-center gap-8">
            <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all border ${step === 'input' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 border-transparent'}`}>1. Structure</div>
            <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all border ${step === 'development' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 border-transparent'}`}>2. Deep Logic</div>
            <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all border ${step === 'storyboard' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 border-transparent'}`}>3. Draft Matrix</div>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12">
        {step === 'input' && (
          <section className="max-w-5xl mx-auto animate-in fade-in zoom-in duration-500">
            <div className="text-center mb-16">
              <h2 className="text-7xl font-bold text-white mb-6 tracking-tighter">
                Matrix <span className="text-indigo-500 italic">Drafting.</span>
              </h2>
              <p className="text-slate-400 text-xl max-w-2xl mx-auto leading-relaxed">
                Design multi-page cinematic sequences with strict grid logic. Standard 50-panel drafts or massive 150-panel production matrices.
              </p>
            </div>

            <div className="grid lg:grid-cols-[1fr_380px] gap-10">
              <div className="bg-slate-900/40 p-1 rounded-[2.5rem] border border-white/5 shadow-2xl backdrop-blur-sm overflow-hidden flex flex-col">
                <div className="flex border-b border-white/5 p-3 gap-3 bg-black/20">
                  <button onClick={() => setMode('creative')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'creative' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:bg-white/5'}`}>Creative Narrative</button>
                  <button onClick={() => setMode('quick')} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all ${mode === 'quick' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'text-slate-500 hover:bg-white/5'}`}>Rapid Logline</button>
                </div>
                <textarea 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  placeholder={mode === 'creative' ? "Describe the vision, mood, and core sequence beats..." : "Paste summary text to structured..."} 
                  className="w-full h-[400px] bg-transparent p-10 text-slate-200 focus:outline-none resize-none text-xl placeholder:text-slate-800 leading-relaxed" 
                />
                <div className="p-8 bg-black/30 border-t border-white/5 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Status</span>
                    <span className="text-[11px] text-indigo-400 font-bold italic">Technical Drafting Engine Idle</span>
                  </div>
                  <button 
                    onClick={handleStartProduction} 
                    disabled={loading || !input.trim()} 
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center gap-3"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><i className="fas fa-bolt"></i> Initiate Matrix</>}
                  </button>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900/60 p-10 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110"></div>
                  <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
                    <i className="fas fa-sliders"></i> Production Scale
                  </h4>
                  
                  <div className="space-y-12">
                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Page Depth</label>
                        <span className="text-white font-black font-mono text-xl">{numPages}</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="15" 
                        value={numPages} 
                        onChange={(e) => setNumPages(Number(e.target.value))} 
                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500" 
                      />
                      <div className="flex justify-between text-[8px] text-slate-600 font-black uppercase tracking-[0.2em]"><span>1 Min</span><span>15 Max Limit</span></div>
                    </div>

                    <div className="space-y-5">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Panel Density</label>
                        <span className="text-white font-black font-mono text-xl">{numPanelsPerPage}</span>
                      </div>
                      <input 
                        type="range" 
                        min="4" 
                        max="10" 
                        step="1" 
                        value={numPanelsPerPage} 
                        onChange={(e) => setNumPanelsPerPage(Number(e.target.value))} 
                        className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500" 
                      />
                      <div className="flex justify-between text-[8px] text-slate-600 font-black uppercase tracking-[0.2em]"><span>4 Minimal</span><span>10 Technical Std</span></div>
                    </div>

                    <div className="pt-10 border-t border-white/10">
                      <div className="flex justify-between items-end mb-4">
                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Total Output</span>
                        <div className="text-right">
                          <span className="text-white font-black font-mono text-4xl block leading-none">{totalPanels}</span>
                          <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Panels Total</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic border-l-2 border-indigo-900/30 pl-4">
                        Standard flow: 5 Pages / 10 Panels.<br/>
                        Max flow: 15 Pages / 10 Panels.
                      </p>
                    </div>
                  </div>
                </div>
                {error && <div className="bg-red-900/20 border border-red-500/20 p-6 rounded-3xl text-red-400 text-xs font-black uppercase tracking-widest animate-pulse flex items-start gap-4"><i className="fas fa-circle-exclamation mt-0.5"></i> {error}</div>}
              </div>
            </div>
          </section>
        )}

        {step === 'development' && developedStory && (
          <section ref={devRef} className="animate-in fade-in slide-in-from-right-12 duration-700">
            <div className="grid lg:grid-cols-[1fr_420px] gap-12">
              <div className="space-y-12">
                <div>
                  <h3 className="text-3xl font-bebas tracking-[0.2em] text-indigo-500 mb-6 uppercase">Synthesis Summary</h3>
                  <div className="bg-slate-900/40 p-12 rounded-[2.5rem] border border-white/5 text-slate-300 text-xl italic leading-relaxed shadow-2xl ring-1 ring-white/5">{developedStory.story}</div>
                </div>
                <div>
                  <h3 className="text-3xl font-bebas tracking-[0.2em] text-indigo-500 mb-6 uppercase">Production Screenplay</h3>
                  <div className="bg-slate-950 p-12 rounded-[2.5rem] border border-white/10 font-mono text-[11px] text-slate-400 whitespace-pre-wrap min-h-[700px] max-h-[1400px] overflow-y-auto custom-scrollbar shadow-inner shadow-black ring-1 ring-indigo-500/20 relative">
                    <div className="sticky top-0 bg-slate-950/90 backdrop-blur py-4 border-b border-white/5 mb-8 z-10 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.3em]">
                       <span className="text-indigo-500">Master Sequence Draft</span>
                       <span className="text-slate-600">Strict Logic Check Passed</span>
                    </div>
                    {developedStory.screenplay}
                    <div className="mt-12 text-center text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Sequence Termination Buffer</div>
                  </div>
                </div>
              </div>
              <div className="lg:sticky lg:top-24 h-fit bg-slate-900/70 p-10 rounded-[2.5rem] border border-indigo-500/20 space-y-10 shadow-[0_50px_100px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                <div>
                  <h4 className="text-2xl font-bold text-white mb-3">Logic Verified.</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    The sequence is prepared. We will now synthesize a detailed technical matrix: <span className="text-indigo-400 font-bold">{totalPanels} panels</span> across <span className="text-indigo-400 font-bold">{numPages} pages</span>.
                  </p>
                </div>
                
                <div className="space-y-6">
                   <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                     <span>Rendering Scale</span>
                     <span className="text-indigo-400">Page-by-Page Sequence</span>
                   </div>
                   <div className="flex gap-1.5 h-2">
                      {[...Array(numPages)].map((_, i) => <div key={i} className="flex-1 bg-indigo-500/20 rounded-full"></div>)}
                   </div>
                </div>

                <button 
                  onClick={handleBuildManga} 
                  disabled={loading} 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 rounded-[1.5rem] font-black text-white text-xs uppercase tracking-[0.5em] shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 flex items-center justify-center gap-4"
                >
                  {loading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div> : <><i className="fas fa-layer-group"></i> Build Matrix</>}
                </button>
                <button onClick={() => setStep('input')} className="w-full text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-[0.4em] transition-colors py-4 border-t border-white/5 mt-6">Restart Configuration</button>
              </div>
            </div>
          </section>
        )}

        {step === 'storyboard' && data && (
          <div ref={storyboardRef} className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="mb-20 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-12 gap-10">
              <div>
                <span className="text-indigo-500 font-black text-xs uppercase tracking-[0.6em] mb-4 block">Sequence Output Matrix</span>
                <h2 className="text-7xl font-bebas tracking-wider text-white uppercase leading-[0.8]">{data.title}</h2>
              </div>
              <div className="flex flex-wrap gap-4">
                {data.characters.map(char => <CharacterChip key={char.id} character={char} />)}
              </div>
            </div>

            <div className="space-y-48">
              {data.pages.map((page) => (
                <div key={page.id} className="grid lg:grid-cols-[1fr_580px] gap-20 items-start border-b border-white/5 pb-36 last:border-0 relative">
                  <div className="bg-white p-10 md:p-16 shadow-[0_120px_180px_rgba(0,0,0,1)] rounded-sm flex flex-col ring-1 ring-slate-200 relative group transition-all duration-500 hover:ring-indigo-400">
                    <div className="absolute -top-12 left-0 text-[10px] font-black text-indigo-500 uppercase tracking-[0.6em]">TECHNICAL PAGE {page.pageNumber} OF {data.pages.length}</div>
                    
                    <div className="flex justify-between text-[12px] font-black text-slate-300 uppercase tracking-[0.3em] mb-10">
                      <span>PROJECT DRAFT // {data.title.slice(0, 15)}</span>
                      <span>GRID {page.scenes.length} PANEL // LTR ORDER</span>
                    </div>
                    
                    <div className="relative aspect-[3/4] bg-slate-100 border-[6px] border-slate-900 overflow-hidden shadow-2xl">
                      {page.imageUrl ? (
                        <img src={page.imageUrl} className="w-full h-full object-cover filter contrast-150 grayscale brightness-110 transition-transform duration-1000 group-hover:scale-105" alt={`Page ${page.pageNumber}`} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200">
                          {page.isGenerating ? (
                            <div className="flex flex-col items-center gap-8">
                              <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin shadow-[0_0_30px_rgba(79,70,229,0.2)]"></div>
                              <span className="text-[12px] text-slate-500 font-black uppercase tracking-[0.4em] text-center px-20 italic">Rendering Matrix...</span>
                            </div>
                          ) : (
                            <button onClick={() => handleGeneratePage(page.id)} className="text-sm font-black text-slate-900 hover:bg-slate-900 hover:text-white border-[4px] border-slate-900 px-12 py-5 rounded uppercase transition-all tracking-[0.3em] bg-white shadow-xl transform active:scale-95">Inscribe Page</button>
                          )}
                        </div>
                      )}
                      
                      {/* Technical Overlays */}
                      <div className="absolute top-6 right-6 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                         <button onClick={() => setZoomedPage(page.id)} className="bg-slate-900 text-white w-14 h-14 rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-3xl ring-1 ring-white/10" title="Inspect Sequence"><i className="fas fa-search-plus text-lg"></i></button>
                         <button onClick={() => handleGeneratePage(page.id)} className="bg-slate-900 text-white w-14 h-14 rounded-xl flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-3xl ring-1 ring-white/10" title="Regenerate Draft"><i className="fas fa-redo-alt text-lg"></i></button>
                      </div>
                      <div className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay group-hover:opacity-20 transition-opacity">
                         <div className="grid grid-cols-2 grid-rows-5 w-full h-full border border-black/5"></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-6">
                       <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.5em] flex items-center gap-4">
                         <i className="fas fa-list-check"></i> Sequence Breakdown
                       </h4>
                       <span className="bg-indigo-900/40 text-indigo-400 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-500/20">Matrix Segment {page.pageNumber}</span>
                    </div>
                    
                    <div className="grid gap-6 max-h-[1100px] overflow-y-auto pr-4 custom-scrollbar">
                      {page.scenes.map(scene => (
                        <div key={scene.id} className="bg-slate-900/60 p-8 rounded-[2rem] border border-white/5 space-y-5 hover:border-indigo-500/50 transition-all group relative overflow-hidden backdrop-blur-md">
                          <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4 group-hover:text-indigo-400 transition-colors">
                            <span>Panel {scene.sceneNumber} / {numPanelsPerPage}</span>
                            {editingSceneId === scene.id ? (
                               <div className="flex gap-4">
                                  <button onClick={saveEdit} className="text-green-500 hover:text-green-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><i className="fas fa-check"></i> Commit</button>
                                  <button onClick={() => setEditingSceneId(null)} className="text-red-500 hover:text-red-400 font-black uppercase text-[10px] tracking-widest flex items-center gap-2"><i className="fas fa-times"></i> Discard</button>
                               </div>
                            ) : (
                               <button onClick={() => startEditing(scene)} className="text-[10px] text-slate-600 hover:text-indigo-400 font-black uppercase tracking-widest transition-colors flex items-center gap-2"><i className="fas fa-pen text-[8px]"></i> Edit Beat</button>
                            )}
                          </div>
                          
                          {editingSceneId === scene.id ? (
                            <textarea 
                              value={editBuffer} 
                              onChange={(e) => setEditBuffer(e.target.value)} 
                              className="w-full bg-black/60 border border-indigo-500/50 p-6 rounded-2xl text-sm text-slate-300 focus:outline-none focus:ring-2 ring-indigo-500/30 h-32 resize-none font-medium leading-relaxed" 
                              autoFocus
                            />
                          ) : (
                            <p className="text-[15px] text-slate-200 leading-relaxed font-semibold">
                              <span className="text-indigo-600 font-black mr-4 opacity-60 italic">#</span> {scene.action}
                            </p>
                          )}

                          {scene.dialogue && (
                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 mt-2 border-l-4 border-l-indigo-600/60 shadow-inner">
                              <p className="text-[13px] text-slate-400 font-bold italic leading-relaxed">"{scene.dialogue}"</p>
                            </div>
                          )}
                          
                          <div className="flex gap-3 pt-2">
                             <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-white/5 group-hover:text-slate-400 transition-colors">Technical Flow LTR</div>
                             <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-white/5 group-hover:text-slate-400 transition-colors">Camera: Technical</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/50 p-10 rounded-[2.5rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl"><i className="fas fa-compass"></i></div>
                      <span className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.5em] mb-4 block">Spatial Layout Intent</span>
                      <p className="text-slate-300 text-xs leading-relaxed italic border-l-3 border-indigo-500/50 pl-6">{page.pageLayoutDescription}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="py-60 flex flex-col items-center gap-12">
              <div className="text-center space-y-4">
                 <p className="text-indigo-500 text-[12px] font-black uppercase tracking-[1.5em] animate-pulse">Production Cycle Exhausted</p>
                 <div className="w-80 h-[2px] bg-gradient-to-r from-transparent via-indigo-900 to-transparent mx-auto"></div>
              </div>
              <button onClick={() => { setStep('input'); setData(null); setDevelopedStory(null); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-24 py-7 rounded-full font-black text-xs uppercase tracking-[0.6em] transition-all border border-white/10 shadow-[0_40px_80px_rgba(79,70,229,0.5)] transform hover:scale-105 active:scale-95">
                Initiate New Production
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-24 border-t border-white/5 bg-slate-950 text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-slate-700 text-[11px] font-black tracking-[0.8em] uppercase opacity-40">Infinite Vision Studio // Sequence Core v2.0</p>
          <div className="flex justify-center gap-10 opacity-20">
             <i className="fas fa-square-person-confined"></i>
             <i className="fas fa-film"></i>
             <i className="fas fa-cube"></i>
             <i className="fas fa-fingerprint"></i>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
