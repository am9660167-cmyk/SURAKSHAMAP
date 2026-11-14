import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  Loader2,
  MapPin,
  ScanSearch,
  Upload,
  X,
} from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { MapView } from '../components/MapView';
import { PlaceSearchInput } from '../components/PlaceSearchInput';
import { SidebarLayout } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useSafetyData } from '../context/SafetyDataContext';
import {
  Coordinates,
  HazardCategory,
  HazardReport,
  HazardSeverity,
} from '../types/safety';
import {
  formatRelativeDate,
  getCategoryMeta,
  getStatusColor,
  HAZARD_CATEGORIES,
  SEVERITY_OPTIONS,
  simulateAiVerification,
} from '../utils/hazardHelpers';
import { formatCoords, reverseGeocodeOsm } from '../utils/location';

const SAMPLE_PHOTOS = [
  {
    label: 'Flooded Street',
    url: '/src/assets/images/hazard_flooded_road_1794641735509.jpg',
  },
  {
    label: 'Damaged Road',
    url: '/src/assets/images/hazard_damaged_road_1794641735857.jpg',
  },
  {
    label: 'Broken Streetlight',
    url: '/src/assets/images/hazard_broken_streetlight_1794641735438.jpg',
  },
  {
    label: 'Fallen Tree',
    url: '/src/assets/images/hazard_fallen_tree_1794641736815.jpg',
  },
];

async function readAndCompressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read selected image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  if (file.size <= 350 * 1024) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 1280;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const ReportHazard: React.FC = () => {
  const { user } = useAuth();
  const {
    hazards,
    userLocation,
    hasDetectedGps,
    detectUserLocation,
    useApproximateLocation,
    gpsStatus,
    gpsNotice,
    gpsError,
    addHazardReport,
  } = useSafetyData();

  const [category, setCategory] = useState<HazardCategory>('Damaged Roads');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<HazardSeverity>('High');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoName, setPhotoName] = useState<string>('');
  const [locationMode, setLocationMode] = useState<'gps' | 'manual'>('manual');
  const [pickedCoords, setPickedCoords] = useState<Coordinates>(userLocation);
  const [addressQuery, setAddressQuery] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    description?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<HazardReport | null>(null);

  const topBannerRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const hasManuallyPickedRef = useRef(false);

  // If background GPS detects location before the user picks a spot manually, center pin there
  useEffect(() => {
    if (hasDetectedGps && !hasManuallyPickedRef.current) {
      setPickedCoords(userLocation);
    }
  }, [hasDetectedGps, userLocation.lat, userLocation.lng]);

  const actorId = user?.id ?? 'guest-citizen';
  const mySubmittedReports = useMemo(
    () =>
      hazards.filter(
        (h) => h.reporterId === actorId || h.reporterId === 'guest-citizen'
      ),
    [hazards, actorId]
  );

  const aiPreview = useMemo(() => {
    return simulateAiVerification({
      title,
      description,
      selectedCategory: category,
      hasPhoto: Boolean(photoUrl),
      photoName,
      location: pickedCoords,
      existingReports: hazards,
    });
  }, [title, description, category, photoUrl, photoName, pickedCoords, hazards]);

  const handleCaptureGps = async () => {
    hasManuallyPickedRef.current = true;
    setLocationMode('gps');
    const coords = await detectUserLocation();
    if (coords) {
      setPickedCoords(coords);
      setAddressQuery(`GPS Detected (${formatCoords(coords)})`);
      const resolved = await reverseGeocodeOsm(coords);
      if (resolved) {
        setAddressQuery(resolved);
      }
    } else {
      setLocationMode('manual');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (PNG, JPG, or WebP).');
      return;
    }
    setError('');
    setPhotoName(file.name);
    try {
      const processedUrl = await readAndCompressImage(file);
      setPhotoUrl(processedUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to process selected photo.'
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError('');
    setFieldErrors({});

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (trimmedTitle.length < 3) {
      const msg = 'Please enter a hazard title (at least 3 characters).';
      setError(msg);
      setFieldErrors({ title: msg });
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      titleInputRef.current?.focus();
      return;
    }

    if (trimmedDesc.length < 5) {
      const msg =
        'Please enter a short description of the hazard (at least 5 characters).';
      setError(msg);
      setFieldErrors({ description: msg });
      descriptionInputRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      descriptionInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addHazardReport({
        title: trimmedTitle,
        category,
        description: trimmedDesc,
        severity,
        location: pickedCoords,
        address:
          addressQuery.trim() || `Selected Location (${formatCoords(pickedCoords)})`,
        photoUrl,
        photoName,
        reportedBy: user?.fullName ?? 'Guest Citizen',
        reporterId: user?.id ?? 'guest-citizen',
      });

      setSubmittedReport(created);
      setTitle('');
      setDescription('');
      setPhotoUrl(undefined);
      setPhotoName('');
      setFieldErrors({});
      setError('');

      window.requestAnimationFrame(() => {
        topBannerRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not submit hazard report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SidebarLayout title="Report a Hazard">
      <div ref={topBannerRef} className="mx-auto max-w-6xl space-y-6">
        {submittedReport && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/50">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <div>
                <h2 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  Hazard Report Saved Permanently to Community Map
                </h2>
                <p className="mt-0.5 text-xs text-emerald-800 dark:text-emerald-300">
                  "{submittedReport.title}" is now visible on the map as{' '}
                  <strong>{submittedReport.status}</strong> and will stay on the map until an Admin marks it Resolved.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/explore"
                className="rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
              >
                View on Map
              </Link>
              <Link
                to="/my-reports"
                className="rounded-lg border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200"
              >
                My Reports
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Hazard Details */}
          <div className="space-y-6 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                01. Hazard Classification & Details
              </h2>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </div>
              )}

              {/* Category Selection Grid */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hazard Category
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {HAZARD_CATEGORIES.map((cat) => {
                    const active = category === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setCategory(cat.name)}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-xs font-medium transition-colors ${
                          active
                            ? 'border-[#2563EB] bg-blue-50 text-[#14213D] dark:bg-blue-950/50 dark:text-white'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          <CategoryIcon category={cat.name} size={13} />
                        </span>
                        <span className="truncate">{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Hazard Title <span className="text-red-500">*</span>
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                  placeholder="e.g., Deep pothole near school crosswalk"
                  className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:outline-none dark:bg-slate-950 dark:text-white ${
                    fieldErrors.title
                      ? 'border-red-500 focus:border-red-600 dark:border-red-500'
                      : 'border-slate-200 focus:border-blue-600 dark:border-slate-700'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  ref={descriptionInputRef}
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }}
                  placeholder="Describe what commuters, cyclists, or pedestrians should watch out for..."
                  className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm focus:outline-none dark:bg-slate-950 dark:text-white ${
                    fieldErrors.description
                      ? 'border-red-500 focus:border-red-600 dark:border-red-500'
                      : 'border-slate-200 focus:border-blue-600 dark:border-slate-700'
                  }`}
                />
                {fieldErrors.description && (
                  <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* Severity */}
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Severity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITY_OPTIONS.map((sev) => {
                    const active = severity === sev;
                    const activeColor =
                      sev === 'Critical'
                        ? 'border-red-600 bg-red-600 text-white'
                        : sev === 'High'
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : sev === 'Medium'
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-emerald-600 bg-emerald-600 text-white';
                    return (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setSeverity(sev)}
                        className={`rounded-lg border py-2 text-xs font-semibold transition-colors ${
                          active
                            ? activeColor
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'
                        }`}
                      >
                        {sev}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Photo Upload + AI Verification UI */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                02. Upload Photograph & AI Verification Assist
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/70 p-5 text-center transition-colors hover:border-blue-500 dark:border-slate-700 dark:bg-slate-950/60">
                  <Upload size={22} className="text-[#2563EB]" />
                  <span className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Upload Hazard Photo
                  </span>
                  <span className="mt-0.5 text-[11px] text-slate-500">
                    PNG, JPG up to 5MB
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Camera size={13} /> Or choose a sample civic photo:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SAMPLE_PHOTOS.map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(sample.url);
                          setPhotoName(sample.label);
                        }}
                        className={`rounded-md border px-2 py-1.5 text-left text-[11px] font-medium transition-colors ${
                          photoUrl === sample.url
                            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI-Assisted Verification Panel */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#14213D] dark:text-white">
                    <ScanSearch size={14} className="text-[#2563EB]" />
                    <span>AI-Assisted Pre-Verification Preview</span>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      aiPreview.status === 'Consistent'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : aiPreview.status === 'Potential Duplicate'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {aiPreview.status}
                  </span>
                </div>

                <div className="mt-3 grid gap-4 sm:grid-cols-12 sm:items-center">
                  <div className="relative sm:col-span-4">
                    {photoUrl ? (
                      <>
                        <img
                          src={photoUrl}
                          alt="Uploaded hazard preview"
                          referrerPolicy="no-referrer"
                          className="h-24 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPhotoUrl(undefined);
                            setPhotoName('');
                          }}
                          title="Remove photo"
                          aria-label="Remove photo"
                          className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/75 p-1 text-white hover:bg-slate-900"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                        No photo attached
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs sm:col-span-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500">Suggested Category:</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {aiPreview.suggestedCategory}
                      </span>
                      {aiPreview.suggestedCategory !== category && (
                        <button
                          type="button"
                          onClick={() => setCategory(aiPreview.suggestedCategory)}
                          className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                        >
                          Apply suggestion
                        </button>
                      )}
                    </div>

                    <div className="text-slate-600 dark:text-slate-400">
                      Assessment: {aiPreview.confidenceLabel}
                    </div>

                    {aiPreview.duplicateNote && (
                      <div className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <span>Possible Duplicate: {aiPreview.duplicateNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: GPS & Manual Map Location Picker */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                03. Location Selection (GPS or Manual)
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Detect your device GPS or click/drag the pin directly on the map.
              </p>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCaptureGps()}
                  disabled={gpsStatus === 'detecting'}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${
                    locationMode === 'gps' && gpsStatus === 'granted'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  {gpsStatus === 'detecting' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Crosshair size={14} />
                  )}
                  Use My Current Location
                </button>

                <button
                  type="button"
                  onClick={() => setLocationMode('manual')}
                  className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition-colors ${
                    locationMode === 'manual'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                  }`}
                >
                  <MapPin size={14} />
                  Select Manually
                </button>
              </div>

              {gpsError && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <span>{gpsError}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void useApproximateLocation().then(async (coords) => {
                        if (!coords) return;
                        setPickedCoords(coords);
                        setAddressQuery(`Approximate Location (${formatCoords(coords)})`);
                        const resolved = await reverseGeocodeOsm(coords);
                        if (resolved) setAddressQuery(resolved);
                      })
                    }
                    className="font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
                  >
                    Use Approximate Location
                  </button>
                </div>
              )}

              {gpsNotice && !gpsError && (
                <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                  {gpsNotice}
                </p>
              )}

              <div className="mt-4">
                <PlaceSearchInput
                  label="Search Landmark / Address"
                  value={addressQuery}
                  onChange={setAddressQuery}
                  onSelectPlace={(place) => {
                    hasManuallyPickedRef.current = true;
                    setPickedCoords(place.coords);
                    setAddressQuery(place.address);
                  }}
                />
              </div>

              <div className="mt-4">
                <MapView
                  hazards={hazards.filter(
                    (h) => h.status !== 'Rejected' && h.status !== 'Resolved'
                  )}
                  center={pickedCoords}
                  userLocation={userLocation}
                  pickerPosition={pickedCoords}
                  onPickerChange={(coords) => {
                    hasManuallyPickedRef.current = true;
                    setPickedCoords(coords);
                    if (!addressQuery) {
                      setAddressQuery(`Pin at ${formatCoords(coords)}`);
                    }
                  }}
                  heightClass="h-[300px]"
                  showConfigNotice={false}
                  interactiveHint="Click map or drag blue pin to set exact hazard spot"
                />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950">
                <span className="font-medium text-slate-600 dark:text-slate-400">
                  Coordinates:
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {formatCoords(pickedCoords)}
                </span>
              </div>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {error}
                </div>
              )}

              {submittedReport && !error && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    Report "{submittedReport.title}" added to the live map!
                  </span>
                  <Link
                    to="/explore"
                    className="font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    View on Map →
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting Report...
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    Submit Hazard Report
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {mySubmittedReports.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-[#14213D] dark:text-white">
                  Your Submitted Hazard Reports
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Saved permanently on the live map until resolved by Admin.
                </p>
              </div>
              <Link
                to="/my-reports"
                className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                View all in My Reports →
              </Link>
            </div>

            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {mySubmittedReports.slice(0, 5).map((report) => {
                const meta = getCategoryMeta(report.category);
                const statusColor = getStatusColor(report.status);
                return (
                  <div
                    key={report.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
                        style={{ backgroundColor: meta.color }}
                      >
                        <CategoryIcon category={report.category} size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                          {report.title}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{report.category}</span>
                          <span>·</span>
                          <span className={`font-bold ${statusColor}`}>{report.status}</span>
                          <span>·</span>
                          <span>{formatRelativeDate(report.reportedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {report.status === 'Resolved'
                        ? 'Resolved & Removed from Map'
                        : report.status === 'Rejected'
                        ? 'Rejected by Admin'
                        : 'Active on Map'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};
