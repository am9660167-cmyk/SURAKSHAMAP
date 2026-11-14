import React from 'react';
import {
  Car,
  CircleAlert,
  Construction,
  Droplets,
  HardHat,
  LightbulbOff,
  Moon,
  ShieldAlert,
  Trash2,
  Trees,
  Waves,
  Zap,
} from 'lucide-react';
import { HazardCategory } from '../types/safety';
import { getCategoryMeta } from '../utils/hazardHelpers';

interface CategoryIconProps {
  category: HazardCategory;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 16,
  className = '',
}) => {
  const meta = getCategoryMeta(category);

  switch (meta.iconKey) {
    case 'waves':
      return <Waves size={size} className={className} />;
    case 'lightbulb-off':
      return <LightbulbOff size={size} className={className} />;
    case 'circle-alert':
      return <CircleAlert size={size} className={className} />;
    case 'construction':
      return <Construction size={size} className={className} />;
    case 'car':
      return <Car size={size} className={className} />;
    case 'moon':
      return <Moon size={size} className={className} />;
    case 'trees':
      return <Trees size={size} className={className} />;
    case 'zap':
      return <Zap size={size} className={className} />;
    case 'hard-hat':
      return <HardHat size={size} className={className} />;
    case 'trash-2':
      return <Trash2 size={size} className={className} />;
    case 'droplets':
      return <Droplets size={size} className={className} />;
    default:
      return <ShieldAlert size={size} className={className} />;
  }
};
