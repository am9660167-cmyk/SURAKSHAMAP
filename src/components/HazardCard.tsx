import React, { useState } from 'react';
import { CheckCircle2, MapPin, ShieldCheck, ThumbsDown, ThumbsUp } from 'lucide-react';
import { HazardReport } from '../types/safety';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';
import {
  formatRelativeDate,
  getCategoryMeta,
  getSeverityColor,
  getStatusColor,
} from '../utils/hazardHelpers';
import { formatDistance, haversineDistanceKm } from '../utils/location';
import { CategoryIcon } from './CategoryIcon';

interface HazardCardProps {
  hazard: HazardReport;
  onSelectOnMap?: (hazard: HazardReport) => void;
  distanceFromRouteKm?: number;
  compact?: boolean;
}

export const HazardCard: React.FC<HazardCardProps> = ({
  hazard,
  onSelectOnMap,
  distanceFromRouteKm,
  compact = false,
}) => {
  const { user } = useAuth();
  const { userLocation, confirmHazard, reportNotPresent } = useSafetyData();
  const [imgError, setImgError] = useState(false);

  const actorId = user?.id ?? 'guest-citizen';
  const hasConfirmed = hazard.confirmedByUserIds.includes(actorId);
  const hasReportedAbsent = hazard.notPresentByUserIds.includes(actorId);

  const meta = getCategoryMeta(hazard.category);
  const sev = getSeverityColor(hazard.severity);
  const statusClass = getStatusColor(hazard.status);
  const distanceKm =
    distanceFromRouteKm ?? haversineDistanceKm(userLocation, hazard.location);

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
              style={{ backgroundColor: meta.color }}
              aria-hidden="true"
            >
              <CategoryIcon category={hazard.category} size={13} />
            </span>
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
              {hazard.category}
            </span>
            <span aria-hidden="true">·</span>
            <span className={`font-semibold ${sev.textClass}`}>{hazard.severity}</span>
          </div>
          <span className={`shrink-0 font-semibold ${statusClass}`}>{hazard.status}</span>
        </div>

        <h3 className="text-base font-semibold leading-snug text-slate-900 dark:text-slate-100">
          {hazard.title}
        </h3>

        {!compact && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {hazard.description}
          </p>
        )}

        {hazard.photoUrl && !compact && !imgError && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 bg-slate-100 dark:border-slate-800 dark:bg-slate-800">
            <img
              src={hazard.photoUrl}
              alt={hazard.title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-40 w-full object-cover"
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} aria-hidden="true" />
            <span className="max-w-[180px] truncate">{hazard.address}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">{formatDistance(distanceKm)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelativeDate(hazard.reportedAt)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 dark:border-slate-800">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
            {hazard.confirmations} confirmed
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <ShieldCheck size={13} className="text-blue-600 dark:text-blue-400" />
            Trust {hazard.trustScore}%
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => confirmHazard(hazard.id, actorId)}
            disabled={hasConfirmed}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              hasConfirmed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ThumbsUp size={12} />
            {hasConfirmed ? 'Confirmed' : 'Confirm'}
          </button>

          <button
            type="button"
            onClick={() => reportNotPresent(hazard.id, actorId)}
            disabled={hasReportedAbsent}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              hasReportedAbsent
                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-400'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
            title="Report hazard is no longer present"
          >
            <ThumbsDown size={12} />
            Cleared
          </button>

          {onSelectOnMap && (
            <button
              type="button"
              onClick={() => onSelectOnMap(hazard)}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Locate
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
