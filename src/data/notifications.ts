import { NotificationItem } from '../types/safety';

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'Critical Hazard Alert',
    title: 'Critical waterlogging reported 0.8 km away',
    message:
      'MG Road Underpass has active knee-deep waterlogging verified by 18 community members.',
    hazardId: 'haz-101',
    createdAt: minsAgo(25),
    read: false,
    severity: 'Critical',
  },
  {
    id: 'notif-2',
    type: 'Critical Hazard Alert',
    title: 'Open manhole alert on 100 Feet Road',
    message:
      'Uncovered utility shaft reported on Indiranagar sidewalk. Exercise caution if walking.',
    hazardId: 'haz-102',
    createdAt: minsAgo(90),
    read: false,
    severity: 'Critical',
  },
  {
    id: 'notif-3',
    type: 'Verified Report',
    title: 'Your report was verified by moderators',
    message:
      '"Four consecutive streetlights out along Cubbon Park perimeter" is now marked Verified.',
    hazardId: 'haz-103',
    createdAt: minsAgo(240),
    read: false,
    severity: 'High',
  },
  {
    id: 'notif-4',
    type: 'Nearby Hazard Alert',
    title: 'Fallen tree branch obstructing Koramangala 80ft Rd',
    message:
      'Eastbound curb lane partially blocked near 4th Block. Expect slower travel.',
    hazardId: 'haz-105',
    createdAt: minsAgo(180),
    read: true,
    severity: 'High',
  },
  {
    id: 'notif-5',
    type: 'Resolved Report',
    title: 'Burst water main marked Resolved',
    message:
      'Utility crews completed repairs near Lalbagh West Gate Road. Thank you for reporting.',
    hazardId: 'haz-109',
    createdAt: minsAgo(600),
    read: true,
    severity: 'Medium',
  },
  {
    id: 'notif-6',
    type: 'New Report',
    title: 'New electrical wire hazard submitted in Ejipura',
    message:
      'Low-hanging power cable reported near Inner Ring Road signal. Community confirmation requested.',
    hazardId: 'haz-106',
    createdAt: minsAgo(55),
    read: false,
    severity: 'Critical',
  },
];
