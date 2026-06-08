import React from 'react';

// Re-export everything from lucide-react so this module acts as a drop-in replacement/extension
export * from 'lucide-react';

// Custom Pistol Icon (Handgun) matching Lucide design guidelines
export const Pistol = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<'svg'> & { size?: number | string }>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 6h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H8" />
      <path d="M8 12v3a1.5 1.5 0 0 0 1.5 1.5H12a1.5 1.5 0 0 0 1.5-1.5v-3" />
      <path d="M10 12v2" />
      <path d="M12.5 12l2.5 7.5a1.5 1.5 0 0 0 1.4 1h2.2a1 1 0 0 0 .9-1.3l-2.5-7.2" />
    </svg>
  )
);
Pistol.displayName = 'Pistol';

// Custom Rifle Icon matching Lucide design guidelines
export const Rifle = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<'svg'> & { size?: number | string }>(
  ({ size = 24, color = 'currentColor', strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 9h6" />
      <path d="M3 9V7" />
      <path d="M8 8h6v2H8z" />
      <path d="M14 8h6v3h-6z" />
      <path d="M15 11l-1 5" />
      <path d="M18 11l1 3.5" />
      <path d="M20 9h3v4.5l-3-2.5" />
    </svg>
  )
);
Rifle.displayName = 'Rifle';

// Unified list of icons for flags + tags (existing unique ones + 38 brand new icons)
export const ALL_ICONS = [
  // Existing Flag icons (FlagManagerModal)
  'Flag', 'AlertCircle', 'CheckCircle2', 'Info', 'Star', 'User', 'Shield', 'ShieldAlert', 
  'ShieldCheck', 'Clock', 'Zap', 'Heart', 'Award', 'Trophy', 'UserCheck', 'UserX', 
  'UserMinus', 'UserPlus', 'Flame', 'Ghost', 'Crown', 'Gem', 'Hammer', 'Key',
  
  // Existing Tag icons (ColumnsModal)
  'ShieldPlus', 'Cross', 'BriefcaseMedical', 'HeartPulse', 'Stethoscope', 'Activity', 
  'LifeBuoy', 'Briefcase', 'Target', 'Tool',

  // 38 Brand New Icons (including custom ones)
  'Pistol', 'Rifle', 'Gavel', 'Scale', 'Siren', 'Helicopter', 'Binoculars', 'Eye', 'EyeOff', 
  'Skull', 'Swords', 'Sword', 'Crosshair', 'HeartCrack', 'Syringe', 'Pill', 'Cigarette', 
  'GlassWater', 'Wine', 'Beer', 'DollarSign', 'Coins', 'MapPin', 'Megaphone', 'GraduationCap', 
  'BookOpen', 'Fingerprint', 'Wrench', 'Anchor', 'Plane', 'Car', 'Truck', 'Radio', 'FileText', 
  'Compass', 'Search', 'Mail', 'Phone'
];
