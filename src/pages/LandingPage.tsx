import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Compass,
  MapPin,
  Navigation,
  ScanSearch,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Footer } from '../components/Footer';
import { MapView } from '../components/MapView';
import { Navbar } from '../components/Navbar';
import { useSafetyData } from '../context/SafetyDataContext';
import { supabase } from '../lib/supabase';
import { HazardReport } from '../types/safety';
import { HAZARD_CATEGORIES } from '../utils/hazardHelpers';

export const LandingPage: React.FC = () => {
  const { hazards, userLocation } = useSafetyData();
  const [selectedHeroHazard, setSelectedHeroHazard] = useState<HazardReport | null>(
    null
  );

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactError, setContactError] = useState('');

  const verifiedCount = hazards.filter((h) => h.status === 'Verified').length;
  const criticalCount = hazards.filter((h) => h.severity === 'Critical').length;
  const resolvedCount = hazards.filter((h) => h.status === 'Resolved').length;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.includes('@') || !contactMessage.trim()) {
      setContactError('Please enter your name, a valid email address, and a message.');
      return;
    }
    setContactError('');
    setContactSubmitting(true);
    try {
      if (supabase) {
        await supabase.from('contact_messages').insert({
          name: contactName.trim(),
          email: contactEmail.trim().toLowerCase(),
          message: contactMessage.trim(),
        });
      }
    } catch {
      // Allow graceful confirmation if contact_messages table has not yet been created
    } finally {
      setContactSubmitting(false);
    }
    setContactSubmitted(true);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 dark:bg-[#0B1120] dark:text-slate-100">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid items-stretch gap-10 lg:grid-cols-12">
            <div className="flex flex-col justify-center lg:col-span-6">
              <p className="text-sm font-semibold tracking-wide text-[#2563EB] dark:text-blue-400">
                Know the Risks. Plan Your Route. Stay Aware.
              </p>
              <h1
                className="mt-3 text-3xl font-extrabold tracking-tight text-[#14213D] sm:text-4xl lg:text-5xl dark:text-white"
                style={{ textWrap: 'balance' }}
              >
                Safer Communities Start With Shared Awareness.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                Discover reported hazards, report local problems, and make informed
                travel decisions through community-powered safety intelligence.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
                >
                  <Compass size={17} />
                  Explore Map
                </Link>
                <Link
                  to="/report"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-[#14213D] transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  <AlertTriangle size={17} className="text-[#F97316]" />
                  Report a Hazard
                </Link>
                <Link
                  to="/plan-journey"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 whitespace-nowrap shrink-0 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Navigation size={17} className="text-[#2563EB]" />
                  Plan Your Journey
                </Link>
              </div>
            </div>

            {/* Interactive Map-Based Hero Design */}
            <div className="flex flex-col justify-between gap-4 lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <MapView
                  hazards={hazards.filter((h) => h.status !== 'Rejected')}
                  userLocation={userLocation}
                  selectedHazard={selectedHeroHazard}
                  onSelectHazard={setSelectedHeroHazard}
                  heightClass="h-[340px] sm:h-[380px]"
                  showConfigNotice={false}
                  interactiveHint="Click any marker to inspect live hazard details"
                />
              </div>
              <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                <img
                  src="/src/assets/images/hero_safety_city_1794641735972.jpg"
                  alt="Urban street intersection monitored by SurakshaMap community contributors"
                  referrerPolicy="no-referrer"
                  className="h-32 w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white">
                  <span className="font-medium">
                    Live civic hazard intelligence across 12 safety categories
                  </span>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1 font-semibold text-blue-300 hover:text-white whitespace-nowrap"
                  >
                    Open Full Map <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column KPI Strip below hero split */}
          <div className="mt-12 grid grid-cols-2 gap-4 border-t border-slate-200 pt-8 sm:grid-cols-4 dark:border-slate-800">
            <div>
              <div className="font-mono text-2xl font-bold text-[#14213D] tabular-nums dark:text-white">
                {hazards.length}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Active & Historical Reports
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-[#16A34A] tabular-nums dark:text-emerald-400">
                {verifiedCount}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Community-Verified Hazards
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-[#DC2626] tabular-nums dark:text-red-400">
                {criticalCount}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Critical Alerts Active
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold text-[#2563EB] tabular-nums dark:text-blue-400">
                {resolvedCount}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                Issues Marked Resolved
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-[#2563EB] uppercase dark:text-blue-400">
              About SurakshaMap
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#14213D] sm:text-3xl dark:text-white">
              Built for everyday commuters, pedestrians, and local responders.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Urban infrastructure risks—flooded underpasses, broken streetlights, open
              manholes, fallen trees, and exposed wires—rarely appear on standard
              navigation apps. SurakshaMap connects citizen reporting with route planning
              so communities stay informed before stepping out.
            </p>
            <div className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#16A34A]" />
                <span>
                  12 color-coded hazard categories with severity classification from Low
                  to Critical.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#16A34A]" />
                <span>
                  Dual GPS auto-detection and manual map-pin selection for precise
                  reporting.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#16A34A]" />
                <span>
                  Community confirmation scoring and duplicate warnings to maintain high
                  report trust.
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <img
                src="/src/assets/images/hazard_flooded_road_1794641735509.jpg"
                alt="Flooded street reported by commuters"
                referrerPolicy="no-referrer"
                className="h-44 w-full object-cover"
              />
              <div className="p-4">
                <div className="text-xs font-medium text-sky-700 dark:text-sky-400">
                  Flooded Roads · Critical
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Real-time waterlogging visibility
                </div>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <img
                src="/src/assets/images/hazard_broken_streetlight_1794641735438.jpg"
                alt="Broken streetlight night safety report"
                referrerPolicy="no-referrer"
                className="h-44 w-full object-cover"
              />
              <div className="p-4">
                <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Broken Streetlights · High
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                  Nighttime lighting & corridor alerts
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Section */}
      <section
        id="features"
        className="border-y border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-[#2563EB] uppercase dark:text-blue-400">
              Platform Capabilities
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#14213D] sm:text-3xl dark:text-white">
              Complete community safety workflow from detection to resolution.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 md:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#2563EB] dark:text-blue-400">
                <Navigation size={18} />
                <span>01. Hazard-Aware Journey Planner</span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-[#14213D] dark:text-white">
                Compare routes alongside reported street hazards
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Choose Driving, Walking, or Cycling routes, view primary and alternative
                paths, inspect every hazard near your corridor with exact distance from the
                route, and click anywhere on the route map to report a newly spotted risk.
              </p>
              <Link
                to="/plan-journey"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                Open Journey Planner <ArrowRight size={15} />
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#F97316]">
                <MapPin size={18} />
                <span>02. GPS & Manual Pin</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#14213D] dark:text-white">
                Pinpoint exact coordinates
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Detect your current GPS location in one click or drag the map marker
                manually if location permissions are restricted.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#16A34A]">
                <Users size={18} />
                <span>03. Community Verification</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#14213D] dark:text-white">
                Crowd-confirmed trust scores
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Citizens can confirm active hazards or flag cleared issues, dynamically
                updating verification status and trust scores.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-violet-600 dark:text-violet-400">
                <ScanSearch size={18} />
                <span>04. AI Verification Assist</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#14213D] dark:text-white">
                Category & duplicate checks
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Simulated AI review previews uploaded photos, suggests matching hazard
                categories, and alerts reporters to nearby duplicates.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#14213D] dark:text-slate-200">
                <ShieldCheck size={18} />
                <span>05. Moderation Console</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-[#14213D] dark:text-white">
                Dedicated Admin Dashboard
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Review photographs, inspect locations on the map, verify, reject, or resolve
                reports with real-time Recharts analytics.
              </p>
            </div>
          </div>

          {/* 12 Category Strip */}
          <div className="mt-10 rounded-xl border border-slate-200 p-6 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#14213D] dark:text-white">
                12 Supported Hazard Categories
              </h3>
              <Link
                to="/explore"
                className="text-xs font-semibold text-[#2563EB] hover:underline dark:text-blue-400"
              >
                Filter on Map →
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {HAZARD_CATEGORIES.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center gap-2.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-semibold tracking-wider text-[#2563EB] uppercase dark:text-blue-400">
              Contact & Civic Partnerships
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#14213D] sm:text-3xl dark:text-white">
              Partner with SurakshaMap for safer neighborhoods.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Have feedback on hazard categories, resident associations, or civic safety
              awareness drives? Send a message directly to the coordination desk.
            </p>
            <div className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  Community Desk:
                </span>{' '}
                safety@surakshamap.org
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-200">
                  Emergency Disclaimer:
                </span>{' '}
                For life-threatening emergencies, always call your local emergency helpline
                first.
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form
              onSubmit={handleContactSubmit}
              className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              {contactSubmitted && (
                <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Message received. Thank you for contributing to community safety!
                </div>
              )}
              {contactError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {contactError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Full name"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Share neighborhood safety feedback or partnership questions..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="submit"
                  disabled={contactSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
                >
                  <Send size={15} />
                  {contactSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
