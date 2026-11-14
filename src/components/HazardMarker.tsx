import React from 'react';
import { HazardReport } from '../types/safety';
import { getCategoryMeta } from '../utils/hazardHelpers';
import { CategoryIcon } from './CategoryIcon';

interface HazardMarkerProps {
  hazard: HazardReport;
  selected?: boolean;
  onClick?: () => void;
}

export const HazardMarkerBadge: React.FC<HazardMarkerProps> = ({
  hazard,
  selected = false,
  onClick,
}) => {
  const meta = getCategoryMeta(hazard.category);
  const isCritical = hazard.severity === 'Critical';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      title={`${hazard.category}: ${hazard.title}`}
      aria-label={`${hazard.category} hazard: ${hazard.title}`}
      className={`group relative flex items-center justify-center rounded-full border-2 border-white shadow-md transition-transform duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:border-slate-900 ${
        selected ? 'scale-125 z-20 ring-4 ring-blue-500/30' : 'hover:scale-110 z-10'
      }`}
      style={{
        width: isCritical ? 36 : 32,
        height: isCritical ? 36 : 32,
        backgroundColor: meta.color,
        color: '#FFFFFF',
      }}
    >
      <CategoryIcon category={hazard.category} size={isCritical ? 17 : 15} />
    </button>
  );
};
