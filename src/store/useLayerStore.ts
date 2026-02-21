import { create } from 'zustand';
import type { Layer } from '../types/domain';

interface LayerTemplate {
  id: string;
  name: string;
  layerIds: string[];
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
}

interface LayerStore {
  layers: Layer[];
  canvasWidth: number;
  canvasHeight: number;
  templates: LayerTemplate[];
  addText: () => void;
  addShape: () => void;
  addAssetLayer: (assetId: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;
  setZOrder: (id: string, direction: 'up' | 'down') => void;
  setCanvasSize: (canvasWidth: number, canvasHeight: number) => void;
  saveTemplate: (name: string) => void;
}

export const useLayerStore = create<LayerStore>((set, get) => ({
  layers: [],
  canvasWidth: 1920,
  canvasHeight: 1080,
  templates: [],
  addText: () => set((s) => ({
    layers: [...s.layers, { id: `text-${Date.now()}`, kind: 'text', name: `Text ${s.layers.length + 1}`, text: 'New Text Layer', x: 32, y: 64, zIndex: s.layers.length, opacity: 100, color: '#ffffff', size: 56 }],
  })),
  addShape: () => set((s) => ({
    layers: [...s.layers, { id: `shape-${Date.now()}`, kind: 'shape', name: `Shape ${s.layers.length + 1}`, x: 120, y: 120, zIndex: s.layers.length, opacity: 100, width: 320, height: 120, fill: '#1d4ed8' }],
  })),
  addAssetLayer: (assetId) => set((s) => ({
    layers: [...s.layers, { id: `asset-${Date.now()}`, kind: 'asset', name: `Asset ${s.layers.length + 1}`, assetId, x: 0, y: 0, zIndex: s.layers.length, opacity: 100, width: s.canvasWidth, height: s.canvasHeight }],
  })),
  updateLayer: (id, patch) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)) })),
  renameLayer: (id, name) => set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)) })),
  deleteLayer: (id) => set((s) => ({ layers: s.layers.filter((l) => l.id !== id).map((l, i) => ({ ...l, zIndex: i })) })),
  setZOrder: (id, direction) => set((s) => {
    const sorted = [...s.layers].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex((l) => l.id === id);
    const t = direction === 'up' ? idx + 1 : idx - 1;
    if (idx < 0 || t < 0 || t >= sorted.length) return s;
    [sorted[idx], sorted[t]] = [sorted[t], sorted[idx]];
    return { layers: sorted.map((l, i) => ({ ...l, zIndex: i })) };
  }),
  setCanvasSize: (canvasWidth, canvasHeight) => set({ canvasWidth, canvasHeight }),
  saveTemplate: (name) => set((s) => ({
    templates: [{ id: `tpl-${Date.now()}`, name, layerIds: s.layers.map((l) => l.id), canvasWidth: s.canvasWidth, canvasHeight: s.canvasHeight, createdAt: new Date().toISOString() }, ...s.templates],
  })),
}));
