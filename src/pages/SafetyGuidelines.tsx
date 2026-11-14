import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Car,
  Moon,
  PhoneCall,
  ShieldAlert,
  Waves,
  Zap,
} from 'lucide-react';
import { SidebarLayout } from '../components/Sidebar';

interface GuidelineSection {
  title: string;
  category: string;
  color: string;
  icon: React.FC<{ size?: number }>;
  summary: string;
  checklist: string[];
}

const GUIDELINES: GuidelineSection[] = [
  {
    title: 'Flood Safety',
    category: 'Monsoon & Waterlogging',
    color: '#0284C7',
    icon: Waves,
    summary:
      'Standing water conceals open manholes, deep potholes, and downed utility lines.',
    checklist: [
      'Never walk or drive through moving floodwater or submerged underpasses.',
      'Watch for submerged manhole covers where swirling water or missing grates appear.',
      'Move to higher ground and report impassable corridors on SurakshaMap for nearby commuters.',
      'Avoid touching metal poles, bus shelters, or junction boxes standing in water.',
    ],
  },
  {
    title: 'Road Safety',
    category: 'Pavement & Obstructions',
    color: '#EA580C',
    icon: Car,
    summary:
      'Sudden swerves around damaged asphalt or unmarked construction cause preventable crashes.',
    checklist: [
      'Scan 30–50 meters ahead for potholes, loose gravel, or encroaching construction barriers.',
      'Maintain safe following distance behind heavy vehicles so road craters remain visible.',
      'Use designated cycle lanes or shoulders when clear; report obstructed paths immediately.',
      'Slow down before blind merges, unlit speed bumps, and school crossings.',
    ],
  },
  {
    title: 'Night Travel Awareness',
    category: 'Low-Visibility Corridors',
    color: '#7C3AED',
    icon: Moon,
    summary:
      'Dark stretches with broken streetlights elevate pedestrian and two-wheeler vulnerability.',
    checklist: [
      'Review SurakshaMap for broken streetlight clusters and isolated underpasses before departure.',
      'Prefer well-lit arterial streets with active storefronts or regular transit traffic.',
      'Wear reflective gear or keep phone flashlight accessible on unlit residential stretches.',
      'Share live trip ETA with a trusted contact when traveling late.',
    ],
  },
  {
    title: 'Electrical Safety',
    category: 'Wires & Transformers',
    color: '#D97706',
    icon: Zap,
    summary:
      'Low-hanging or snapped power cables remain dangerous even when no sparks are visible.',
    checklist: [
      'Keep at least 10 meters away from downed or sagging overhead cables.',
      'Assume every hanging wire is energized—never attempt to move cables with sticks.',
      'Warn approaching pedestrians and vehicles from a safe distance and alert utility crews.',
      'Mark the exact spot on SurakshaMap with Critical severity so nearby travelers route around it.',
    ],
  },
  {
    title: 'Accident Prevention',
    category: 'Intersection Vigilance',
    color: '#DC2626',
    icon: ShieldAlert,
    summary:
      'Malfunctioning signals, missing convex mirrors, and fallen branches create sudden pinch points.',
    checklist: [
      'Treat intersections with dark traffic signals as all-way stops and verify cross-traffic.',
      'Give wide clearance around storm-fallen tree limbs and downed signage.',
      'Avoid sudden braking on wet or leaked-water patches where moss reduces traction.',
      'Confirm resolved hazards once municipal teams clear the road so map accuracy stays fresh.',
    ],
  },
  {
    title: 'Emergency Awareness',
    category: 'Immediate Response',
    color: '#16A34A',
    icon: PhoneCall,
    summary:
      'Community maps complement—never replace—official emergency dispatch services.',
    checklist: [
      'Call national/local emergency services (112 / 100 / 108 / 101) first for active danger or injuries.',
      'Move out of live traffic lanes before photographing or logging a street hazard.',
      'Record clear landmarks and coordinates so municipal responders locate the issue quickly.',
      'Keep an offline emergency contact card and basic first-aid kit in your vehicle.',
    ],
  },
];

export const SafetyGuidelines: React.FC = () => {
  return (
    <SidebarLayout title="Safety Guidelines">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-[#14213D] dark:text-white">
              Community Safety & Hazard Prevention Playbook
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Practical precautions for navigating urban roads, weather disruptions,
              nighttime travel, and infrastructure risks safely.
            </p>
          </div>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <AlertTriangle size={14} />
            Report a Hazard
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {GUIDELINES.map((guide) => {
            const Icon = guide.icon;
            return (
              <section
                key={guide.title}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: guide.color }}
                  >
                    <Icon size={19} />
                  </span>
                  <div>
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {guide.category}
                    </div>
                    <h3 className="text-base font-bold text-[#14213D] dark:text-white">
                      {guide.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {guide.summary}
                </p>

                <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-300">
                  {guide.checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: guide.color }}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </SidebarLayout>
  );
};
