import { create } from 'zustand';

export const useGameStore = create((set) => ({
  gameState: 'MENU', // MENU, INTRO, PLAYING, OUTRO
  currentMap: 'maparea0',
  playerPosition: { x: 0, y: 0 },
  
  // Game progress state
  hasVisitedMap0: false,
  hasVisitedMap1: false,
  hasVisitedMapX: false,
  
  // Game seed for consistent map generation within a game session
  // This gets randomized on each new game but persists for the entire session
  gameSeed: Math.floor(Math.random() * 2147483647), // Random 32-bit integer
  
  // Actions
  setGameState: (state) => set({ gameState: state }),
  setCurrentMap: (map) => set({ currentMap: map }),
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  recordMapVisit: (mapId) => set((state) => ({
    [`hasVisited${mapId}`]: true
  })),
  
  // Generate a new game seed for a fresh game
  generateNewGameSeed: () => set(() => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    console.log(`🎲 New game seed generated: ${newSeed} - Maps will have new layouts!`);
    return {
      gameSeed: newSeed,
      // Reset map visit tracking when starting new game
      hasVisitedMap0: false,
      hasVisitedMap1: false,
      hasVisitedMapX: false,
    };
  }),
}));