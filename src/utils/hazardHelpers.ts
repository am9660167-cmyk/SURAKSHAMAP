import {
  Coordinates,
  HazardCategory,
  HazardReport,
  HazardSeverity,
  ReportStatus,
} from '../types/safety';
import { haversineDistanceKm } from './location';

export interface CategoryMeta {
  name: HazardCategory;
  color: string;
  bgTint: string;
  textColor: string;
  iconKey:
    | 'waves'
    | 'lightbulb-off'
    | 'circle-alert'
    | 'construction'
    | 'car'
    | 'moon'
    | 'trees'
    | 'zap'
    | 'hard-hat'
    | 'trash-2'
    | 'droplets'
    | 'shield-alert';
  shortDesc: string;
}

export const HAZARD_CATEGORIES: CategoryMeta[] = [
  {
    name: 'Flooded Roads',
    color: '#0284C7',
    bgTint: '#E0F2FE',
    textColor: '#0369A1',
    iconKey: 'waves',
    shortDesc: 'Waterlogged streets, flash flooding, or submerged crossings',
  },
  {
    name: 'Broken Streetlights',
    color: '#CA8A04',
    bgTint: '#FEF9C3',
    textColor: '#854D0E',
    iconKey: 'lightbulb-off',
    shortDesc: 'Non-functional lamps creating low-visibility road zones',
  },
  {
    name: 'Open Manholes',
    color: '#DC2626',
    bgTint: '#FEE2E2',
    textColor: '#B91C1C',
    iconKey: 'circle-alert',
    shortDesc: 'Uncovered or broken utility shafts posing severe fall risks',
  },
  {
    name: 'Damaged Roads',
    color: '#EA580C',
    bgTint: '#FFEDD5',
    textColor: '#C2410C',
    iconKey: 'construction',
    shortDesc: 'Deep potholes, collapsed asphalt, or uneven road shoulders',
  },
  {
    name: 'Accident-Prone Areas',
    color: '#B91C1C',
    bgTint: '#FEE2E2',
    textColor: '#991B1B',
    iconKey: 'car',
    shortDesc: 'Blind turns, signal failures, or frequent collision junctions',
  },
  {
    name: 'Unsafe Locations at Night',
    color: '#7C3AED',
    bgTint: '#EDE9FE',
    textColor: '#6D28D9',
    iconKey: 'moon',
    shortDesc: 'Isolated stretches with poor lighting or low foot traffic',
  },
  {
    name: 'Fallen Trees',
    color: '#15803D',
    bgTint: '#DCFCE7',
    textColor: '#166534',
    iconKey: 'trees',
    shortDesc: 'Uprooted trees or heavy branches obstructing lanes or paths',
  },
  {
    name: 'Electric Wire Hazards',
    color: '#D97706',
    bgTint: '#FEF3C7',
    textColor: '#B45309',
    iconKey: 'zap',
    shortDesc: 'Low-hanging cables, exposed junction boxes, or sparking poles',
  },
  {
    name: 'Construction Obstacles',
    color: '#F97316',
    bgTint: '#FFEDD5',
    textColor: '#C2410C',
    iconKey: 'hard-hat',
    shortDesc: 'Unmarked excavation, debris, or blocked pedestrian walkways',
  },
  {
    name: 'Garbage Issues',
    color: '#65A30D',
    bgTint: '#ECFCCB',
    textColor: '#4D7C0F',
    iconKey: 'trash-2',
    shortDesc: 'Overflowing waste blocking drains, lanes, or visibility',
  },
  {
    name: 'Water Leakage',
    color: '#0891B2',
    bgTint: '#CFFAFE',
    textColor: '#0E7490',
    iconKey: 'droplets',
    shortDesc: 'Burst mains causing slick surfaces or pavement erosion',
  },
  {
    name: 'Other Hazards',
    color: '#475569',
    bgTint: '#F1F5F9',
    textColor: '#334155',
    iconKey: 'shield-alert',
    shortDesc: 'Additional civic or environmental safety concerns',
  },
];

export const SEVERITY_OPTIONS: HazardSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

export function getCategoryMeta(category: HazardCategory): CategoryMeta {
  return (
    HAZARD_CATEGORIES.find((c) => c.name === category) ??
    HAZARD_CATEGORIES[HAZARD_CATEGORIES.length - 1]
  );
}

export function getSeverityColor(severity: HazardSeverity): {
  hex: string;
  textClass: string;
  dotClass: string;
} {
  switch (severity) {
    case 'Critical':
      return {
        hex: '#DC2626',
        textClass: 'text-red-600 dark:text-red-400',
        dotClass: 'bg-red-600',
      };
    case 'High':
      return {
        hex: '#F97316',
        textClass: 'text-orange-600 dark:text-orange-400',
        dotClass: 'bg-orange-500',
      };
    case 'Medium':
      return {
        hex: '#CA8A04',
        textClass: 'text-amber-600 dark:text-amber-400',
        dotClass: 'bg-amber-500',
      };
    case 'Low':
      return {
        hex: '#16A34A',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        dotClass: 'bg-emerald-600',
      };
  }
}

export function getStatusColor(status: ReportStatus): string {
  switch (status) {
    case 'Verified':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'Pending':
      return 'text-amber-700 dark:text-amber-400';
    case 'Resolved':
      return 'text-blue-700 dark:text-blue-400';
    case 'Rejected':
      return 'text-red-700 dark:text-red-400';
  }
}

export function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function findPossibleDuplicates(
  candidateLocation: Coordinates,
  candidateCategory: HazardCategory,
  existingReports: HazardReport[],
  excludeId?: string
): HazardReport[] {
  return existingReports.filter((report) => {
    if (excludeId && report.id === excludeId) return false;
    if (report.status === 'Rejected' || report.status === 'Resolved') return false;
    const distanceM = haversineDistanceKm(candidateLocation, report.location) * 1000;
    const sameCategory = report.category === candidateCategory;
    return (sameCategory && distanceM <= 350) || distanceM <= 90;
  });
}

export function simulateAiVerification(params: {
  title: string;
  description: string;
  selectedCategory: HazardCategory;
  hasPhoto: boolean;
  photoName?: string;
  location: Coordinates;
  existingReports: HazardReport[];
}): NonNullable<HazardReport['aiVerification']> {
  const text = `${params.title} ${params.description} ${params.photoName ?? ''}`.toLowerCase();

  const keywordMap: Array<{ category: HazardCategory; words: string[] }> = [
    { category: 'Flooded Roads', words: ['flood', 'waterlog', 'submerged', 'rain', 'puddle', 'inundated'] },
    { category: 'Broken Streetlights', words: ['light', 'lamp', 'dark', 'bulb', 'unlit', 'outage'] },
    { category: 'Open Manholes', words: ['manhole', 'drain cover', 'open pit', 'sewer', 'lid missing'] },
    { category: 'Damaged Roads', words: ['pothole', 'crack', 'asphalt', 'road damage', 'crater', 'broken road'] },
    { category: 'Accident-Prone Areas', words: ['accident', 'collision', 'crash', 'blind spot', 'signal'] },
    { category: 'Unsafe Locations at Night', words: ['night', 'unsafe', 'isolated', 'alley', 'harassment'] },
    { category: 'Fallen Trees', words: ['tree', 'branch', 'limb', 'foliage', 'uprooted'] },
    { category: 'Electric Wire Hazards', words: ['wire', 'cable', 'electric', 'spark', 'transformer', 'live'] },
    { category: 'Construction Obstacles', words: ['construction', 'excavation', 'barricade', 'debris', 'scaffolding'] },
    { category: 'Garbage Issues', words: ['garbage', 'trash', 'waste', 'dump', 'litter'] },
    { category: 'Water Leakage', words: ['leak', 'pipe', 'burst', 'main', 'seepage'] },
  ];

  let suggestedCategory: HazardCategory = params.selectedCategory;
  for (const entry of keywordMap) {
    if (entry.words.some((w) => text.includes(w))) {
      suggestedCategory = entry.category;
      break;
    }
  }

  const duplicates = findPossibleDuplicates(
    params.location,
    suggestedCategory,
    params.existingReports
  );

  if (duplicates.length > 0) {
    return {
      suggestedCategory,
      confidenceLabel: params.hasPhoto ? 'High visual + spatial match' : 'Spatial match detected',
      status: 'Potential Duplicate',
      duplicateNote: `Similar active report "${duplicates[0].title}" exists within ${Math.round(
        haversineDistanceKm(params.location, duplicates[0].location) * 1000
      )}m.`,
    };
  }

  if (suggestedCategory !== params.selectedCategory) {
    return {
      suggestedCategory,
      confidenceLabel: params.hasPhoto ? 'Visual context suggests category adjustment' : 'Description keywords suggest category adjustment',
      status: 'Needs Review',
    };
  }

  return {
    suggestedCategory,
    confidenceLabel: params.hasPhoto ? 'Photo and description match category' : 'Description aligns with category',
    status: params.hasPhoto ? 'Consistent' : 'Needs Review',
  };
}
