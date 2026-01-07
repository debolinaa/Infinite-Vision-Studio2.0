
export interface Character {
  id: string;
  name: string;
  appearance: string;
}

export interface Scene {
  id: string;
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  action: string;
  dialogue?: string;
  visualPrompt: string;
  // Fix: Added optional property to satisfy SceneCard component requirements
  imageUrl?: string;
  // Fix: Added optional property to satisfy SceneCard component requirements
  isGenerating?: boolean;
}

export interface Page {
  id: string;
  pageNumber: number;
  scenes: Scene[];
  imageUrl?: string;
  isGenerating?: boolean;
  pageLayoutDescription: string;
}

export interface StoryboardData {
  title: string;
  characters: Character[];
  pages: Page[];
}
