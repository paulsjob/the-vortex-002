import { create } from 'zustand';
import type { Layer } from '../types/domain';

interface LayerStore {
  layers: Layer[];
  addText: () => void;
  addShape: () => void;
  addAssetLayer: (assetId: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  setZOrder: (id: string, direction: 'up' | 'down') => void;
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [],
  addText: () => set((s) => ({
    layers: [...s.layers, { id: `text-${Date.now()}`, kind: 'text', name: 'Text Layer', text: 'New Text', x: 80, y: 80, zIndex: s.layers.length, opacity: 100, color: '#ffffff', size: 52 }],
  })),
  addShape: () => set((s) => ({
    layers: [...s.layers, { id: `shape-${Date.now()}`, kind: 'shape', name: 'Shape Layer', x: 120, y: 120, zIndex: s.layers.length, opacity: 100, width: 280, height: 120, fill: '#22c55e' }],
  })),
  addAssetLayer: (assetId) => set((s) => ({
    layers: [...s.layers, { id: `asset-${Date.now()}`, kind: 'asset', name: 'Asset Layer', assetId, x: 0, y: 0, zIndex: s.layers.length, opacity: 100, width: 1920, height: 1080 }],
  })),
  updateLayer: (id, patch) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l)) })),
  deleteLayer: (id) => set((s) => ({ layers: s.layers.filter((l) => l.id !== id) })),
  setZOrder: (id, direction) => set((s) => {
    const sorted = [...s.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((l) => l.id === id);
    const t = direction === 'up' ? idx + 1 : idx - 1;
    if (idx < 0 || t < 0 || t >= sorted.length) return s;
    [sorted[idx], sorted[t]] = [sorted[t], sorted[idx]];
    return { layers: sorted.map((l, i) => ({ ...l, zIndex: i })) };
  }),
}));
