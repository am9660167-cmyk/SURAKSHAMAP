export type HazardCategory =
  | 'Flooded Roads'
  | 'Broken Streetlights'
  | 'Open Manholes'
  | 'Damaged Roads'
  | 'Accident-Prone Areas'
  | 'Unsafe Locations at Night'
  | 'Fallen Trees'
  | 'Electric Wire Hazards'
  | 'Construction Obstacles'
  | 'Garbage Issues'
  | 'Water Leakage'
  | 'Other Hazards';

export type HazardSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type ReportStatus = 'Pending' | 'Verified' | 'Resolved' | 'Rejected';

export type TravelMode = 'DRIVING' | 'WALKING' | 'BICYCLING';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface HazardReport {
  id: string;
  title: string;
  category: HazardCategory;
  description: string;
  severity: HazardSeverity;
  status: ReportStatus;
  location: Coordinates;
  address: string;
  photoUrl?: string;
  reportedAt: string;
  reportedBy: string;
  reporterId: string;
  confirmations: number;
  notPresentReports: number;
  confirmedByUserIds: string[];
  notPresentByUserIds: string[];
  trustScore: number;
  aiVerification?: {
    suggestedCategory: HazardCategory;
    confidenceLabel: string;
    status: 'Consistent' | 'Needs Review' | 'Potential Duplicate';
    duplicateNote?: string;
  };
}

export type NotificationType =
  | 'Nearby Hazard Alert'
  | 'New Report'
  | 'Critical Hazard Alert'
  | 'Verified Report'
  | 'Resolved Report';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  hazardId?: string;
  createdAt: string;
  read: boolean;
  severity?: HazardSeverity;
}

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'admin';
  avatarUrl: string;
  joinedAt: string;
  password?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  nearbyAlerts: boolean;
  criticalAlerts: boolean;
  verifiedUpdates: boolean;
  locationPermission: 'granted' | 'prompt' | 'denied';
  shareApproximateLocation: boolean;
  anonymousReporting: boolean;
  alertRadiusKm: number;
}

export interface JourneyRequest {
  originLabel: string;
  originCoords: Coordinates;
  destinationLabel: string;
  destinationCoords: Coordinates;
  travelMode: TravelMode;
}
