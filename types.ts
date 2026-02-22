
export type Machine = {
  id: string;
  name: string;
  classe: string;
  speed: number;
  speedMajor: number;
  cofs: number;
  active: boolean;
};

export type SpeedFactor = {
  id: string;
  min: number;
  max: number;
  value: number;
};

export type ComplexityFactor = {
  id: string;
  label: string;
  value: number;
};

export type StandardTime = {
  id: string;
  label: string;
  value: number;
  unit: 'min' | 'sec';
};

export type Guide = {
  id: string;
  name: string;
  category: string;
  machineType: string;
  description: string;
  useCase: string;
};

export type Operation = {
  id: string;
  order: number;
  description: string;
  machineId: string;
  machineName?: string;
  length?: number;
  manualTime?: number;
  forcedTime?: number;
  time: number;
  predecessors?: string[];
  stitchCount?: number;
  rpm?: number;
  speedFactor?: number;
  guideFactor?: number;
  endPrecision?: number;
  startStop?: number;
  majoration?: number;
  guideId?: string;
  guideName?: string;
  groupId?: string; // Link operations together (visual grouping)
  targetOperationId?: string; // New: Defines the destination flow (Preparation -> Montage)
  side?: 'G' | 'D' | 'GD'; // New: Side of operation (Gauche, Droite, Gauche/Droite)
};

export type AutoMachine = {
  id: string;
  name: string;
  rpm: number;
  length: number;
  density: number;
  handlingTime: number;
  efficiency: number;
};

export type Poste = {
  id: string;
  originalId?: string; // Links split physical posts (P1.1, P1.2) back to logical group (P1)
  name: string;
  machine: string;
  operatorName?: string;
  notes?: string;
  timeOverride?: number;
  length?: number;
  isPlaced?: boolean; // New field for manual mode state
  colorName?: string; // New field for persistent color assignment
  // Free Mode Props
  x?: number; 
  y?: number;
  rotation?: number; // Rotation in degrees
  shape?: 'rect' | 'circle' | 'zone'; // Visual shape
  width?: number; // For resizing (future)
  height?: number; // For resizing (future)
};

export type ManualLink = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type SavedLayout = {
  id: string;
  name: string;
  date: string;
  postes: Poste[];
  manualLinks?: ManualLink[];
};

export type FicheData = {
  date: string;
  client: string;
  category: string;
  designation: string;
  color: string;
  quantity: number;
  chaine: string;
  targetEfficiency: number;
  unitCost: number;
  clientPrice: number;
  observations: string;
  costMinute: number;
};

// --- NEW TYPES FOR COST CALCULATOR ---

export interface Material {
  id: number;
  name: string;
  unitPrice: number;
  qty: number;
  unit: string;
  threadMeters: number;
  threadCapacity: number;
}

export interface PurchasingData extends Material {
  totalRaw: number;
  totalWithWaste: number;
  qtyToBuy: number;
  lineCost: number;
}

export interface AppSettings {
  costMinute: number;
  useCostMinute: boolean; // New toggle field
  cutRate: number;
  packRate: number;
  marginAtelier: number;
  tva: number;
  marginBoutique: number;
}

export interface PdfSettings {
  orientation: 'portrait' | 'landscape';
  colorMode: 'color' | 'grayscale';
  scale: number;
}

export interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

// --- NEW TYPE FOR LIBRARY ---
export interface ModelData {
  id: string;
  filename: string;
  image?: string | null; // Thumbnail (Front)
  images?: { front: string | null; back: string | null }; // NEW: Store both images fully
  meta_data: {
    nom_modele: string;
    category?: string; // Added Category for search and display
    date_creation: string;
    date_lancement?: string; // Added Launch Date
    total_temps: number; // in minutes
    effectif: number;
  };
  gamme_operatoire: Operation[];
  // Added for Implantation persistence
  implantation?: {
    postes: Poste[];
    assignments: Record<string, string[]>;
    layoutMemory?: Record<string, { id: string, x?: number, y?: number, isPlaced?: boolean, rotation?: number }[]>;
    activeLayout?: 'zigzag' | 'snake' | 'grid' | 'wheat' | 'free' | 'line'; // NEW: Persist active layout
    savedPlantations?: { id: string, name: string, date: string, layoutType: string, postes: { id: string, x?: number, y?: number, isPlaced?: boolean, rotation?: number }[] }[]; // NEW: Manual saves
  };
}