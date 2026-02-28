import { create } from 'zustand';

export type DemoStat = 'pitch.velocity' | 'pitch.type' | 'bat.exitvelo' | 'score.home';

const DEFAULT_SPONSOR = 'Renderless Sports';

interface DemoSessionStore {
  selectedPlayer: string;
  selectedStat: DemoStat;
  selectedSponsor: string;
  sponsorChoices: string[];
  initialized: boolean;
  initializeSession: () => void;
  resetDemoSession: () => void;
  updateSelections: (next: { player?: string; stat?: DemoStat; sponsor?: string }) => void;
  setSelectedPlayer: (player: string) => void;
  setSelectedStat: (stat: DemoStat) => void;
  setSelectedSponsor: (sponsor: string) => void;
}

export const useDemoSessionStore = create<DemoSessionStore>((set, get) => ({
  selectedPlayer: 'A. Jones',
  selectedStat: 'pitch.velocity',
  selectedSponsor: DEFAULT_SPONSOR,
  sponsorChoices: [DEFAULT_SPONSOR, 'Orbit Cola', 'Velocity Bank'],
  initialized: false,
  initializeSession: () => {
    if (get().initialized) return;
    set({ initialized: true });
  },
  resetDemoSession: () => set({
    selectedPlayer: 'A. Jones',
    selectedStat: 'pitch.velocity',
    selectedSponsor: DEFAULT_SPONSOR,
    initialized: true,
  }),
  updateSelections: (next) => {
    const state = get();
    const selectedPlayer = typeof next.player === 'string' && next.player.trim() ? next.player.trim() : state.selectedPlayer;
    const selectedStat = next.stat ?? state.selectedStat;
    const candidateSponsor = typeof next.sponsor === 'string' && next.sponsor.trim() ? next.sponsor.trim() : state.selectedSponsor;
    const selectedSponsor = state.sponsorChoices.includes(candidateSponsor) ? candidateSponsor : DEFAULT_SPONSOR;
    set({ selectedPlayer, selectedStat, selectedSponsor });
  },
  setSelectedPlayer: (player) => {
    const trimmed = player.trim();
    if (!trimmed) return;
    set({ selectedPlayer: trimmed });
  },
  setSelectedStat: (stat) => set({ selectedStat: stat }),
  setSelectedSponsor: (sponsor) => {
    const state = get();
    const trimmed = sponsor.trim();
    if (!trimmed) return;
    if (!state.sponsorChoices.includes(trimmed)) {
      console.warn(`[demo-session] Sponsor \"${trimmed}\" unavailable. Falling back to default sponsor.`);
      set({ selectedSponsor: DEFAULT_SPONSOR });
      return;
    }
    set({ selectedSponsor: trimmed });
  },
}));
