import { create } from 'zustand';

export const useGameStore = create((set) => ({
  gameState: 'MENU', // MENU, INTRO, PLAYING, OUTRO
  currentMap: 'maparea0',
  playerPosition: { x: 0, y: 0 },
  
  // Game progress state
  hasVisitedMap0: false,
  hasVisitedMap1: false,
  hasVisitedMapX: false,
  
  // Actions
  setGameState: (state) => set({ gameState: state }),
  setCurrentMap: (map) => set({ currentMap: map }),
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  recordMapVisit: (mapId) => set((state) => ({
    [`hasVisited${mapId}`]: true
  })),
}));