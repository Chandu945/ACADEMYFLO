#!/usr/bin/env node
/**
 * Academyflo — Expanded Development Seed Script
 *
 * Adds 50 new students + 6 months of comprehensive data across ALL features:
 *   - 50 students (total ~75 with existing)
 *   - 4 new batches (total ~8)
 *   - 6 months of student & staff attendance
 *   - 6 months of fee dues & transaction logs
 *   - Payment requests (PENDING/APPROVED/REJECTED/CANCELLED)
 *   - Expense categories & 60+ expenses
 *   - 15 events (past & future)
 *   - 20 enquiries with follow-ups
 *   - 12 holidays
 *   - 100+ audit logs
 *
 * Prerequisites:
 *   1. Run seed-dev.mjs first (creates owner, staff, initial batches/students)
 *   2. API server must be running on localhost:3001
 *
 * Usage:
 *   SEED_MONGODB_URI=mongodb://localhost:27017/playconnect_dev node scripts/seed-expand.mjs
 */

import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const API = 'http://localhost:3001/api/v1';
const MONGODB_URI =
  process.env.SEED_MONGODB_URI || 'mongodb://localhost:27017/playconnect_dev';

// ── Owner credentials (must match seed-dev.mjs) ─────────────────────────────

const OWNER = {
  email: 'owner@playconnect.dev',
  password: 'Owner@123',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

let TOKEN = '';

async function api(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { _error: true, status: res.status, ...json };
  return json;
}

function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtDate(d);
}
function today() {
  return fmtDate(new Date());
}
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`);
}

/** Deterministic pseudo-random from seed (for consistent absent patterns) */
function hashInt(a, b) {
  let h = ((a * 2654435761) ^ (b * 2246822519)) >>> 0;
  return h % 100;
}

/** Generate date string N months ago from today */
function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

// ── Student data ─────────────────────────────────────────────────────────────

const MALE_NAMES = [
  'Pranav', 'Harsh', 'Dev', 'Shaurya', 'Yash', 'Atharv', 'Advait', 'Rudra',
  'Aarush', 'Vedant', 'Darsh', 'Parth', 'Manav', 'Sahil', 'Nikhil',
  'Karthik', 'Varun', 'Tanmay', 'Gaurav', 'Akash', 'Rishabh', 'Siddharth',
  'Kunal', 'Tushar', 'Abhishek',
];

const FEMALE_NAMES = [
  'Navya', 'Isha', 'Prisha', 'Tanvi', 'Amaira', 'Zara', 'Mihika', 'Nandini',
  'Tara', 'Kavya', 'Meera', 'Avni', 'Siya', 'Pari', 'Anvi', 'Pooja',
  'Shruti', 'Neha', 'Ridhi', 'Aisha', 'Mahira', 'Tvisha', 'Jiya', 'Divya',
  'Ishita',
];

const LAST_NAMES = [
  'Agarwal', 'Thakur', 'Kapoor', 'Tiwari', 'Pandey', 'Kulkarni', 'Bhat',
  'Patil', 'Hegde', 'Saxena', 'Malhotra', 'Khanna', 'Tripathi', 'Bose',
  'Sen', 'Srinivasan', 'Krishnan', 'Banerjee', 'Ghosh', 'Mukherjee',
  'Naidu', 'Deshpande', 'Swamy', 'Rajan', 'Sethi', 'Pillai', 'Menon',
  'Bhatt', 'Deshmukh', 'Chowdhury',
];

const CITIES_STATES = [
  ['Bangalore', 'Karnataka', '560'],
  ['Mumbai', 'Maharashtra', '400'],
  ['Hyderabad', 'Telangana', '500'],
  ['Pune', 'Maharashtra', '411'],
  ['Chennai', 'Tamil Nadu', '600'],
  ['Delhi', 'Delhi', '110'],
  ['Kolkata', 'West Bengal', '700'],
  ['Ahmedabad', 'Gujarat', '380'],
  ['Jaipur', 'Rajasthan', '302'],
  ['Lucknow', 'Uttar Pradesh', '226'],
];

const CASTES = ['General', 'OBC', 'SC', 'ST', null, null, null]; // mostly null

const MONTHLY_FEES = [500, 800, 1000, 1200, 1500, 1800, 2000, 2500];

function makeExpandedStudent(i) {
  const isMale = i < 25;
  const firstName = isMale ? MALE_NAMES[i] : FEMALE_NAMES[i - 25];
  const lastName = LAST_NAMES[i % LAST_NAMES.length];
  const gender = isMale ? 'MALE' : 'FEMALE';
  const [city, state, pinPrefix] = CITIES_STATES[i % CITIES_STATES.length];
  const fee = MONTHLY_FEES[i % MONTHLY_FEES.length];

  // Spread joining dates over 6 months: Sep 2025 - Feb 2026
  const joinMonthOffset = Math.floor(i / 9); // 0-5
  const joinMonth = new Date(2025, 8 + Math.min(joinMonthOffset, 5), 1 + (i % 28));
  const joiningDate = fmtDate(joinMonth);

  // DOB: ages 5-16 (born 2010-2021)
  const birthYear = 2010 + (i % 12);
  const birthMonth = ((i * 3 + 7) % 12) + 1;
  const birthDay = (i % 28) + 1;
  const dob = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

  const student = {
    fullName: `${firstName} ${lastName}`,
    dateOfBirth: dob,
    gender,
    address: {
      line1: `${200 + i} ${['MG Road', 'Park Street', 'Lake View', 'Nehru Nagar', 'Gandhi Chowk'][i % 5]}`,
      line2: i % 3 === 0 ? `Near ${['City Mall', 'Railway Station', 'Bus Stand', 'Hospital'][i % 4]}` : undefined,
      city,
      state,
      pincode: `${pinPrefix}${String(10 + (i % 90)).padStart(3, '0')}`,
    },
    guardian: {
      name: `${isMale ? 'Mr.' : 'Mrs.'} ${lastName}`,
      mobile: `+91987651${String(100 + i).padStart(4, '0')}`,
      email: `parent.exp${i + 1}@test.com`,
    },
    joiningDate,
    monthlyFee: fee,
  };

  // Optional fields (added directly when creating via API won't work, we'll add via MongoDB later)
  student._extraFields = {};
  if (i % 3 === 0) student._extraFields.fatherName = `Mr. ${lastName} Sr.`;
  if (i % 4 === 0) student._extraFields.motherName = `Mrs. ${lastName}`;
  if (i % 5 === 0)
    student._extraFields.aadhaarNumber = `${String(1000 + i * 37).slice(0, 4)} ${String(2000 + i * 53).slice(0, 4)} ${String(3000 + i * 71).slice(0, 4)}`;
  if (i % 7 === 0) student._extraFields.caste = CASTES[i % CASTES.length];
  if (i % 3 === 1) student._extraFields.whatsappNumber = `+91987653${String(100 + i).padStart(4, '0')}`;

  return student;
}

// ── New batch data ───────────────────────────────────────────────────────────

const NEW_BATCHES = [
  {
    batchName: 'Afternoon Juniors',
    days: ['TUE', 'THU', 'SAT'],
    startTime: '14:00',
    endTime: '15:30',
    maxStudents: 20,
    notes: 'Young learners age 5-8, post-school session',
  },
  {
    batchName: 'Elite Training',
    days: ['MON', 'WED', 'FRI'],
    startTime: '06:00',
    endTime: '07:30',
    maxStudents: 15,
    notes: 'Competitive athletes, advanced drills',
  },
  {
    batchName: 'Fitness Boot Camp',
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    startTime: '05:30',
    endTime: '06:30',
    maxStudents: 25,
    notes: 'High-intensity fitness training for ages 12+',
  },
  {
    batchName: 'Sunday Special',
    days: ['SUN'],
    startTime: '08:00',
    endTime: '10:00',
    maxStudents: 30,
    notes: 'Relaxed weekend batch, all skill levels welcome',
  },
];

// ── Holiday data (6 months: Sep 2025 – Mar 2026) ────────────────────────────

const HOLIDAYS = [
  { date: '2025-09-17', reason: 'Milad-un-Nabi' },
  { date: '2025-10-02', reason: 'Gandhi Jayanti' },
  { date: '2025-10-12', reason: 'Dussehra' },
  { date: '2025-10-20', reason: 'Diwali' },
  { date: '2025-11-01', reason: 'Kannada Rajyotsava' },
  { date: '2025-11-05', reason: 'Guru Nanak Jayanti' },
  { date: '2025-12-25', reason: 'Christmas' },
  { date: '2026-01-14', reason: 'Makar Sankranti' },
  { date: '2026-01-26', reason: 'Republic Day' },
  { date: '2026-02-26', reason: 'Maha Shivaratri' },
  { date: '2026-03-06', reason: 'Holi' },
  { date: '2026-03-14', reason: 'Ugadi' },
];

// ── Expense categories ───────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  'Rent',
  'Equipment & Supplies',
  'Staff Salaries',
  'Utilities',
  'Transport',
  'Miscellaneous',
];

// ── Event data ───────────────────────────────────────────────────────────────

function makeEvents(batchIds) {
  return [
    // Past events (COMPLETED)
    {
      title: 'Inter-School Cricket Tournament',
      description: 'Annual inter-school cricket tournament hosted by the academy. Teams from 8 schools participated.',
      eventType: 'TOURNAMENT',
      startDate: new Date('2025-10-15'),
      endDate: new Date('2025-10-17'),
      startTime: '08:00',
      endTime: '17:00',
      isAllDay: false,
      location: 'City Sports Complex',
      targetAudience: 'STUDENTS',
      batchIds: batchIds.slice(0, 2),
      status: 'COMPLETED',
    },
    {
      title: 'Demo Class — New Admissions',
      description: 'Free demo class for prospective students and parents.',
      eventType: 'DEMO_CLASS',
      startDate: new Date('2025-10-25'),
      endDate: null,
      startTime: '10:00',
      endTime: '11:30',
      isAllDay: false,
      location: 'Academy Ground',
      targetAudience: 'ALL',
      batchIds: [],
      status: 'COMPLETED',
    },
    {
      title: 'Parent-Teacher Meeting',
      description: 'Monthly progress review with parents. Individual slots for each student.',
      eventType: 'MEETING',
      startDate: new Date('2025-11-10'),
      endDate: null,
      startTime: '09:00',
      endTime: '13:00',
      isAllDay: false,
      location: 'Academy Hall',
      targetAudience: 'PARENTS',
      batchIds: [],
      status: 'COMPLETED',
    },
    {
      title: 'Annual Sports Day 2025',
      description: 'Track and field events, team sports, prize distribution. Chief guest: District Sports Officer.',
      eventType: 'ANNUAL_DAY',
      startDate: new Date('2025-12-20'),
      endDate: new Date('2025-12-21'),
      startTime: '08:00',
      endTime: '16:00',
      isAllDay: false,
      location: 'Academy Ground & Auditorium',
      targetAudience: 'ALL',
      batchIds: batchIds.slice(0, 4),
      status: 'COMPLETED',
    },
    {
      title: 'New Year Celebration',
      description: 'Fun games, snacks, and award ceremony for best performers of 2025.',
      eventType: 'OTHER',
      startDate: new Date('2026-01-01'),
      endDate: null,
      isAllDay: true,
      location: 'Academy Ground',
      targetAudience: 'ALL',
      batchIds: [],
      status: 'COMPLETED',
    },
    {
      title: 'Inter-Academy Friendly Match',
      description: 'Friendly cricket match against Sunrise Sports Academy.',
      eventType: 'TOURNAMENT',
      startDate: new Date('2026-02-08'),
      endDate: null,
      startTime: '09:00',
      endTime: '15:00',
      isAllDay: false,
      location: 'Sunrise Academy Ground',
      targetAudience: 'STUDENTS',
      batchIds: batchIds.slice(1, 3),
      status: 'COMPLETED',
    },
    {
      title: 'Staff Training Workshop',
      description: 'Coaching techniques and child safety workshop for all staff.',
      eventType: 'TRAINING_CAMP',
      startDate: new Date('2026-02-22'),
      endDate: new Date('2026-02-23'),
      startTime: '10:00',
      endTime: '16:00',
      isAllDay: false,
      location: 'Academy Hall',
      targetAudience: 'STAFF',
      batchIds: [],
      status: 'COMPLETED',
    },
    // Current/ongoing
    {
      title: 'Fitness Assessment Week',
      description: 'Weekly fitness assessments for all students — stamina, flexibility, strength tests.',
      eventType: 'OTHER',
      startDate: new Date('2026-03-10'),
      endDate: new Date('2026-03-15'),
      startTime: '07:00',
      endTime: '12:00',
      isAllDay: false,
      location: 'Academy Ground',
      targetAudience: 'STUDENTS',
      batchIds: batchIds.slice(0, 4),
      status: 'ONGOING',
    },
    // Future events (UPCOMING)
    {
      title: 'Summer Camp 2026',
      description: 'Two-week intensive summer training camp with swimming, athletics, and team sports.',
      eventType: 'TRAINING_CAMP',
      startDate: new Date('2026-04-15'),
      endDate: new Date('2026-04-30'),
      startTime: '06:00',
      endTime: '11:00',
      isAllDay: false,
      location: 'Academy + City Pool',
      targetAudience: 'STUDENTS',
      batchIds: [],
      status: 'UPCOMING',
    },
    {
      title: 'Annual Day 2026',
      description: 'Annual day celebrations with cultural programs, sports exhibitions, and awards.',
      eventType: 'ANNUAL_DAY',
      startDate: new Date('2026-04-25'),
      endDate: null,
      isAllDay: true,
      location: 'City Auditorium',
      targetAudience: 'ALL',
      batchIds: [],
      status: 'UPCOMING',
    },
    {
      title: 'Swimming Workshop',
      description: 'Basic swimming coaching for non-swimmers. Professional instructors from City Swim Club.',
      eventType: 'TRAINING_CAMP',
      startDate: new Date('2026-04-10'),
      endDate: new Date('2026-04-12'),
      startTime: '07:00',
      endTime: '09:00',
      isAllDay: false,
      location: 'City Swimming Pool',
      targetAudience: 'STUDENTS',
      batchIds: batchIds.slice(0, 2),
      status: 'UPCOMING',
    },
    {
      title: 'Cricket League Season 2',
      description: 'Internal league tournament — 4 teams competing over 3 weekends.',
      eventType: 'TOURNAMENT',
      startDate: new Date('2026-05-03'),
      endDate: new Date('2026-05-18'),
      startTime: '08:00',
      endTime: '17:00',
      isAllDay: false,
      location: 'Academy Ground',
      targetAudience: 'STUDENTS',
      batchIds: batchIds,
      status: 'UPCOMING',
    },
    {
      title: 'Parent Orientation — New Admissions',
      description: 'Orientation session for parents of newly admitted students.',
      eventType: 'MEETING',
      startDate: new Date('2026-03-22'),
      endDate: null,
      startTime: '10:00',
      endTime: '12:00',
      isAllDay: false,
      location: 'Academy Hall',
      targetAudience: 'PARENTS',
      batchIds: [],
      status: 'UPCOMING',
    },
    {
      title: 'Republic Day Celebration',
      description: 'Flag hoisting ceremony and march-past. Special drill performance by senior batch.',
      eventType: 'OTHER',
      startDate: new Date('2026-01-26'),
      endDate: null,
      startTime: '07:30',
      endTime: '10:00',
      isAllDay: false,
      location: 'Academy Ground',
      targetAudience: 'ALL',
      batchIds: [],
      status: 'COMPLETED',
    },
    {
      title: 'Cancelled: Night Cricket Match',
      description: 'Floodlit cricket match — cancelled due to ground maintenance.',
      eventType: 'TOURNAMENT',
      startDate: new Date('2026-03-01'),
      endDate: null,
      startTime: '18:00',
      endTime: '22:00',
      isAllDay: false,
      location: 'Academy Ground',
      targetAudience: 'STUDENTS',
      batchIds: [],
      status: 'CANCELLED',
    },
  ];
}

// ── Enquiry data ─────────────────────────────────────────────────────────────

function makeEnquiries(academyId, ownerUserId, staffIds, convertibleStudentIds) {
  const now = new Date();
  const sources = ['WALK_IN', 'PHONE', 'REFERRAL', 'SOCIAL_MEDIA', 'WEBSITE', 'OTHER'];

  const raw = [
    // ACTIVE enquiries with follow-ups
    { name: 'Ravi Shankar', guardian: 'Mr. Shankar', mob: '+919876600001', source: 'WALK_IN', interested: 'Cricket Coaching', status: 'ACTIVE', daysAgo: 5 },
    { name: 'Sneha Puri', guardian: 'Mrs. Puri', mob: '+919876600002', source: 'PHONE', interested: 'Morning Batch', status: 'ACTIVE', daysAgo: 12 },
    { name: 'Rahul Dubey', guardian: 'Mr. Dubey', mob: '+919876600003', source: 'SOCIAL_MEDIA', interested: 'Fitness Camp', status: 'ACTIVE', daysAgo: 3 },
    { name: 'Anika Mathur', guardian: 'Mrs. Mathur', mob: '+919876600004', source: 'REFERRAL', interested: 'Weekend Batch', status: 'ACTIVE', daysAgo: 20 },
    { name: 'Vikrant Rao', guardian: 'Mr. Rao', mob: '+919876600005', source: 'WEBSITE', interested: 'Elite Training', status: 'ACTIVE', daysAgo: 8 },
    // CONVERTED enquiries
    { name: 'Pranav Agarwal', guardian: 'Mr. Agarwal', mob: '+919876600006', source: 'WALK_IN', interested: 'Morning Batch', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 90 },
    { name: 'Navya Pillai', guardian: 'Mrs. Pillai', mob: '+919876600007', source: 'REFERRAL', interested: 'Evening Batch', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 75 },
    { name: 'Harsh Thakur', guardian: 'Mr. Thakur', mob: '+919876600008', source: 'PHONE', interested: 'Cricket Coaching', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 120 },
    { name: 'Isha Menon', guardian: 'Mrs. Menon', mob: '+919876600009', source: 'SOCIAL_MEDIA', interested: 'Fitness Boot Camp', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 60 },
    { name: 'Atharv Kulkarni', guardian: 'Mr. Kulkarni', mob: '+919876600010', source: 'WALK_IN', interested: 'Sunday Special', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 100 },
    { name: 'Kavya Patil', guardian: 'Mrs. Patil', mob: '+919876600011', source: 'REFERRAL', interested: 'Afternoon Juniors', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 85 },
    { name: 'Manav Tripathi', guardian: 'Mr. Tripathi', mob: '+919876600012', source: 'WEBSITE', interested: 'Elite Training', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 55 },
    { name: 'Tanvi Deshmukh', guardian: 'Mrs. Deshmukh', mob: '+919876600013', source: 'WALK_IN', interested: 'Morning Beginners', status: 'CLOSED', closure: 'CONVERTED', daysAgo: 45 },
    // NOT_INTERESTED
    { name: 'Deepak Shetty', guardian: 'Mr. Shetty', mob: '+919876600014', source: 'PHONE', interested: 'Cricket', status: 'CLOSED', closure: 'NOT_INTERESTED', daysAgo: 40 },
    { name: 'Megha Jain', guardian: 'Mrs. Jain', mob: '+919876600015', source: 'WALK_IN', interested: 'Swimming', status: 'CLOSED', closure: 'NOT_INTERESTED', daysAgo: 70 },
    { name: 'Amit Chauhan', guardian: 'Mr. Chauhan', mob: '+919876600016', source: 'SOCIAL_MEDIA', interested: 'Evening Batch', status: 'CLOSED', closure: 'NOT_INTERESTED', daysAgo: 95 },
    { name: 'Pallavi Nair', guardian: 'Mrs. Nair', mob: '+919876600017', source: 'REFERRAL', interested: 'Morning Advanced', status: 'CLOSED', closure: 'NOT_INTERESTED', daysAgo: 30 },
    // OTHER closure
    { name: 'Arjun Batra', guardian: 'Mr. Batra', mob: '+919876600018', source: 'PHONE', interested: 'Coaching', status: 'CLOSED', closure: 'OTHER', daysAgo: 110 },
    { name: 'Simran Kaur', guardian: 'Mrs. Kaur', mob: '+919876600019', source: 'WEBSITE', interested: 'Morning Batch', status: 'CLOSED', closure: 'OTHER', daysAgo: 50 },
    { name: 'Nitin Goel', guardian: 'Mr. Goel', mob: '+919876600020', source: 'WALK_IN', interested: 'Weekend', status: 'CLOSED', closure: 'OTHER', daysAgo: 65 },
  ];

  return raw.map((r, idx) => {
    const createdAt = new Date(now.getTime() - r.daysAgo * 86400000);
    const createdBy = idx % 3 === 0 ? ownerUserId : (staffIds[idx % staffIds.length] || ownerUserId);

    const followUps = [];
    if (r.status === 'ACTIVE' || r.closure === 'CONVERTED') {
      // Add 1-3 follow-ups
      const count = 1 + (idx % 3);
      for (let f = 0; f < count; f++) {
        const fDate = new Date(createdAt.getTime() + (f + 1) * 5 * 86400000);
        followUps.push({
          _id: randomUUID(),
          date: fDate,
          notes: [
            'Called parent. Interested but wants to visit first.',
            'Parent visited. Liked the facilities. Will confirm by weekend.',
            'Confirmed admission. Completing registration formalities.',
            'Followed up on WhatsApp. Requested fee details.',
            'Parent asked about timing flexibility. Shared batch schedule.',
          ][(idx + f) % 5],
          nextFollowUpDate:
            f < count - 1 ? new Date(fDate.getTime() + 5 * 86400000) : null,
          createdBy,
          createdAt: fDate,
        });
      }
    }

    return {
      _id: randomUUID(),
      academyId,
      prospectName: r.name,
      guardianName: r.guardian,
      mobileNumber: r.mob,
      whatsappNumber: idx % 2 === 0 ? r.mob : null,
      email: idx % 3 === 0 ? `enquiry${idx + 1}@test.com` : null,
      address: idx % 4 === 0 ? `${100 + idx}, Local Area, Bangalore` : null,
      interestedIn: r.interested,
      source: r.source,
      notes: idx % 2 === 0 ? `Referred by ${['social media ad', 'existing parent', 'Google search', 'newspaper ad'][idx % 4]}` : null,
      status: r.status,
      closureReason: r.closure || null,
      convertedStudentId: r.closure === 'CONVERTED' ? (convertibleStudentIds[idx % convertibleStudentIds.length] || null) : null,
      nextFollowUpDate: r.status === 'ACTIVE' && followUps.length > 0 ? new Date(now.getTime() + 3 * 86400000) : null,
      followUps,
      createdBy,
      version: 1,
      createdAt,
      updatedAt: new Date(Math.max(createdAt.getTime(), ...(followUps.map((f) => f.createdAt.getTime())))),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  Academyflo — Expanded Seed (50 students + 6 mo)');
  console.log('══════════════════════════════════════════════\n');

  // ── Phase 1: Login & fetch existing data ─────────────────────────────────

  console.log('[1/15] Logging in as Owner...');
  const deviceId = `seed-expand-${Date.now()}`;
  let res = await api('POST', '/auth/login', {
    identifier: OWNER.email,
    password: OWNER.password,
    deviceId,
  });
  if (res._error) {
    console.error('FATAL: Cannot login. Ensure seed-dev.mjs has been run and API is up.');
    console.error(JSON.stringify(res));
    process.exit(1);
  }
  TOKEN = res.data.accessToken;
  const ownerUserId = res.data.user.id;
  log('✓', `Logged in as ${OWNER.email} (${ownerUserId})`);

  // We'll resolve existing IDs from MongoDB later (API list endpoints can be unreliable with large pageSize)
  let allStaffIds = [];
  let allStaff = [];
  let existingBatchIds = [];
  let allBatchIds = [];

  // ── Phase 2: Create new batches ──────────────────────────────────────────

  console.log('\n[2/15] Creating 4 new batches...');
  const newBatchIds = [];
  for (const b of NEW_BATCHES) {
    res = await api('POST', '/batches', b);
    if (res._error && res.statusCode === 409) {
      log('↩', `Batch "${b.batchName}" already exists`);
    } else if (res._error) {
      log('✗', `Failed: ${b.batchName}: ${JSON.stringify(res)}`);
    } else {
      newBatchIds.push(res.data.id);
      log('✓', `Batch: ${b.batchName} (${res.data.id})`);
    }
  }

  // ── Phase 3: Create 50 new students ──────────────────────────────────────

  console.log('\n[3/15] Creating 50 new students...');
  const newStudentIds = [];
  const newStudentData = [];
  for (let i = 0; i < 50; i++) {
    const student = makeExpandedStudent(i);
    const apiPayload = { ...student };
    delete apiPayload._extraFields;

    res = await api('POST', '/students', apiPayload);
    if (res._error && res.statusCode === 409) {
      log('↩', `Student "${student.fullName}" may already exist`);
    } else if (res._error) {
      log('✗', `Failed: ${student.fullName}: ${res.message || JSON.stringify(res)}`);
    } else {
      newStudentIds.push(res.data.id);
      newStudentData.push({ id: res.data.id, ...student });
      if (i % 10 === 0 || i === 49) log('✓', `Student ${i + 1}/50: ${student.fullName}`);
    }
  }
  log('✓', `New students created: ${newStudentIds.length}`);

  // ── Phase 4: Assign new students to batches ──────────────────────────────

  console.log('\n[4/15] Assigning new students to batches...');
  if (allBatchIds.length > 0 && newStudentIds.length > 0) {
    for (let i = 0; i < newStudentIds.length; i++) {
      const batchAssignment = [allBatchIds[i % allBatchIds.length]];
      // ~33% get a second batch
      if (i % 3 === 0 && allBatchIds.length > 1) {
        batchAssignment.push(allBatchIds[(i + 2) % allBatchIds.length]);
      }
      res = await api('PUT', `/students/${newStudentIds[i]}/batches`, { batchIds: batchAssignment });
      if (res._error) {
        // Silent — not critical
      }
    }
    log('✓', `Assigned ${newStudentIds.length} students to batches`);
  }

  // ── Phase 5: Connect to MongoDB & resolve all IDs ─────────────────────

  console.log('\n[5/15] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Resolve academyId
  const usersCol = db.collection('users');
  const ownerDoc = await usersCol.findOne({ _id: ownerUserId });
  let academyId = ownerDoc?.academyId;
  if (!academyId) {
    const acCol = db.collection('academies');
    const acDoc = await acCol.findOne({ ownerUserId });
    if (!acDoc) {
      console.error('FATAL: Cannot find academyId');
      process.exit(1);
    }
    academyId = acDoc._id;
  }
  log('✓', `Academy ID: ${academyId}`);

  // Resolve ALL student IDs, fees, and join dates from MongoDB directly
  const studentsCol = db.collection('students');
  const allStudentDocs = await studentsCol
    .find({ academyId, deletedAt: null }, { projection: { _id: 1, monthlyFee: 1, joiningDate: 1, fullName: 1 } })
    .toArray();
  const allStudentIds = allStudentDocs.map((s) => s._id);
  const studentFeeMap = {};
  const studentJoinDateMap = {};
  for (const s of allStudentDocs) {
    studentFeeMap[s._id] = s.monthlyFee || 1000;
    const jd = s.joiningDate instanceof Date ? fmtDate(s.joiningDate) : (s.joiningDate || '2024-01-01');
    studentJoinDateMap[s._id] = jd;
  }
  log('✓', `Total students (from DB): ${allStudentIds.length}`);

  // Resolve staff IDs from MongoDB
  const staffDocs = await usersCol
    .find({ academyId, role: 'STAFF', deletedAt: null }, { projection: { _id: 1, fullName: 1 } })
    .toArray();
  allStaffIds = staffDocs.map((s) => s._id);
  allStaff = staffDocs.map((s) => ({ id: s._id, fullName: s.fullName }));
  log('✓', `Total staff (from DB): ${allStaffIds.length}`);

  // Resolve batch IDs from MongoDB
  const batchesCol = db.collection('batches');
  const batchDocs = await batchesCol
    .find({ academyId }, { projection: { _id: 1 } })
    .toArray();
  allBatchIds = batchDocs.map((b) => b._id);
  log('✓', `Total batches (from DB): ${allBatchIds.length}`);

  // ── Phase 6: Update optional student fields & status changes ─────────────

  console.log('\n[6/15] Enriching student records & status changes...');

  // Add optional fields
  let enriched = 0;
  for (const sd of newStudentData) {
    const extra = sd._extraFields;
    if (!extra || Object.keys(extra).length === 0) continue;
    const $set = {};
    for (const [k, v] of Object.entries(extra)) {
      if (v !== undefined) $set[k] = v;
    }
    if (Object.keys($set).length > 0) {
      await studentsCol.updateOne({ _id: sd.id }, { $set });
      enriched++;
    }
  }
  log('✓', `Enriched ${enriched} students with optional fields`);

  // Mark 3 students as INACTIVE, 2 as LEFT
  const statusChanges = [
    { idx: 5, status: 'INACTIVE', reason: 'Taking a break for exams' },
    { idx: 15, status: 'INACTIVE', reason: 'Seasonal break' },
    { idx: 30, status: 'INACTIVE', reason: 'Health issues — will rejoin next month' },
    { idx: 8, status: 'LEFT', reason: 'Family relocated to another city' },
    { idx: 42, status: 'LEFT', reason: 'Joined another academy closer to home' },
  ];
  for (const sc of statusChanges) {
    if (!newStudentIds[sc.idx]) continue;
    const sid = newStudentIds[sc.idx];
    const changedAt = new Date(Date.now() - (sc.status === 'LEFT' ? 60 : 20) * 86400000);
    await studentsCol.updateOne(
      { _id: sid },
      {
        $set: {
          status: sc.status,
          statusChangedAt: changedAt,
          statusChangedBy: ownerUserId,
        },
        $push: {
          statusHistory: {
            fromStatus: 'ACTIVE',
            toStatus: sc.status,
            changedBy: ownerUserId,
            changedAt,
            reason: sc.reason,
          },
        },
      },
    );
    log('✓', `Student ${sid.slice(0, 8)}… → ${sc.status}`);
  }

  // Track which students are active (for attendance & dues)
  const inactiveStudentIds = new Set(
    statusChanges.filter((sc) => newStudentIds[sc.idx]).map((sc) => newStudentIds[sc.idx]),
  );

  // ── Phase 7: Declare holidays ────────────────────────────────────────────

  console.log('\n[7/15] Declaring 12 holidays...');
  const holidaysCol = db.collection('holidays');
  const holidayDatesSet = new Set();
  let hCount = 0;

  for (const h of HOLIDAYS) {
    holidayDatesSet.add(h.date);
    try {
      await holidaysCol.insertOne({
        _id: randomUUID(),
        academyId,
        date: h.date,
        reason: h.reason,
        declaredByUserId: ownerUserId,
        version: 1,
        createdAt: new Date(h.date + 'T00:00:00+05:30'),
        updatedAt: new Date(h.date + 'T00:00:00+05:30'),
      });
      hCount++;
    } catch (e) {
      if (e.code === 11000) log('↩', `Holiday ${h.date} already exists`);
      else log('✗', `Holiday error: ${e.message}`);
    }
  }
  log('✓', `Holidays created: ${hCount}`);

  // ── Phase 8: Student attendance (6 months — ABSENT-only) ─────────────────

  console.log('\n[8/15] Creating student attendance (6 months)...');
  const studentAttCol = db.collection('studentAttendance');
  let saCount = 0;

  // Go from 180 days ago to 1 day ago
  for (let d = 180; d >= 1; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const dateStr = fmtDate(dt);
    const dayOfWeek = dt.getDay(); // 0=Sun

    // Skip Sundays (most academies closed) and holidays
    if (dayOfWeek === 0 || holidayDatesSet.has(dateStr)) continue;

    for (let si = 0; si < allStudentIds.length; si++) {
      const sid = allStudentIds[si];

      // Skip inactive/left students (only after their status change date)
      if (inactiveStudentIds.has(sid)) continue;

      // Skip if student hasn't joined yet
      const joinDate = studentJoinDateMap[sid];
      if (joinDate && dateStr < joinDate) continue;

      // ~16% absent rate
      if (hashInt(d, si + allStudentIds.length * 3) < 16) {
        try {
          await studentAttCol.insertOne({
            _id: randomUUID(),
            academyId,
            studentId: sid,
            date: dateStr,
            markedByUserId: si % 5 === 0 ? ownerUserId : (allStaffIds[si % allStaffIds.length] || ownerUserId),
            version: 1,
            createdAt: new Date(dateStr + 'T09:00:00+05:30'),
            updatedAt: new Date(dateStr + 'T09:00:00+05:30'),
          });
          saCount++;
        } catch (e) {
          if (e.code !== 11000) log('✗', `Att error: ${e.message}`);
        }
      }
    }
  }
  log('✓', `Student absence records: ${saCount}`);

  // ── Phase 9: Staff attendance (6 months — ABSENT-only) ───────────────────

  console.log('\n[9/15] Creating staff attendance (6 months)...');
  const staffAttCol = db.collection('staffAttendance');
  let stfCount = 0;

  for (let d = 180; d >= 1; d--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - d);
    const dateStr = fmtDate(dt);

    // Staff attendance is required even on holidays & Sundays (per project rules)
    for (let si = 0; si < allStaffIds.length; si++) {
      // ~12% absent
      if (hashInt(d * 7, si * 13 + 999) < 12) {
        try {
          await staffAttCol.insertOne({
            _id: randomUUID(),
            academyId,
            staffUserId: allStaffIds[si],
            date: dateStr,
            markedByUserId: ownerUserId,
            version: 1,
            createdAt: new Date(dateStr + 'T09:00:00+05:30'),
            updatedAt: new Date(dateStr + 'T09:00:00+05:30'),
          });
          stfCount++;
        } catch (e) {
          if (e.code !== 11000) { /* skip duplicates */ }
        }
      }
    }
  }
  log('✓', `Staff absence records: ${stfCount}`);

  // ── Phase 10: Fee dues (6 months) ────────────────────────────────────────

  console.log('\n[10/15] Creating fee dues (6 months for all students)...');
  const feeDuesCol = db.collection('fee_dues');
  const transLogCol = db.collection('transaction_logs');

  // Months: Oct 2025 through Mar 2026
  const feeMonths = [];
  for (let m = 5; m >= 0; m--) {
    const d = monthsAgo(m);
    feeMonths.push(monthKey(d));
  }
  log('→', `Fee months: ${feeMonths.join(', ')}`);

  const dueDateDay = 5;
  let duesCreated = 0;
  let duesPaid = 0;
  const paidDueRecords = []; // for transaction logs & payment requests

  for (const mk of feeMonths) {
    const dueDate = `${mk}-${String(dueDateDay).padStart(2, '0')}`;
    const dueDateObj = new Date(dueDate + 'T00:00:00+05:30');
    const isCurrentMonth = mk === monthKey(new Date());
    const monthIndex = feeMonths.indexOf(mk); // 0 = oldest, 5 = current

    for (const sid of allStudentIds) {
      const fee = studentFeeMap[sid] || 1000;
      const joinDate = studentJoinDateMap[sid];

      // Don't create dues for months before the student joined
      if (joinDate) {
        const joinMk = joinDate.substring(0, 7);
        if (mk < joinMk) continue;
      }

      // Determine status
      let status;
      let paidSource = null;
      let paidByUserId = null;
      let collectedByUserId = null;
      let approvedByUserId = null;
      let paymentLabel = null;

      if (isCurrentMonth) {
        // Current month: 20% DUE (past due date), 80% UPCOMING
        const pastDueDate = new Date() >= dueDateObj;
        status = pastDueDate ? 'DUE' : 'UPCOMING';
      } else {
        // Historical months: payment rates decline for recent months
        // monthIndex 0 (oldest) = 90% paid, 4 (last month) = 60% paid
        const paidRate = 90 - monthIndex * 6;
        const h = hashInt(sid.charCodeAt(0) + sid.charCodeAt(1), monthIndex * 31);

        if (h < paidRate) {
          status = 'PAID';

          // Variety in payment sources
          const srcHash = hashInt(sid.charCodeAt(2) || 0, monthIndex * 17);
          if (srcHash < 50) {
            paidSource = 'OWNER_DIRECT';
            paidByUserId = ownerUserId;
            approvedByUserId = ownerUserId;
            paymentLabel = srcHash < 20 ? 'CASH' : srcHash < 35 ? 'UPI' : 'ONLINE';
          } else if (srcHash < 80) {
            paidSource = 'STAFF_APPROVED';
            const staffIdx = (sid.charCodeAt(0) + monthIndex) % allStaffIds.length;
            collectedByUserId = allStaffIds[staffIdx] || ownerUserId;
            paidByUserId = ownerUserId;
            approvedByUserId = ownerUserId;
            paymentLabel = srcHash < 60 ? 'CASH' : 'UPI';
          } else {
            paidSource = 'MANUAL';
            paidByUserId = ownerUserId;
            approvedByUserId = ownerUserId;
            paymentLabel = 'CASH';
          }
        } else {
          status = 'DUE';
        }
      }

      const dueId = randomUUID();
      const paidAt = status === 'PAID'
        ? new Date(dueDateObj.getTime() + (1 + hashInt(sid.charCodeAt(0), monthIndex) % 15) * 86400000)
        : null;

      const doc = {
        _id: dueId,
        academyId,
        studentId: sid,
        monthKey: mk,
        dueDate,
        amount: fee,
        status,
        paidAt,
        paidByUserId,
        paidSource,
        paymentLabel,
        collectedByUserId,
        approvedByUserId,
        paymentRequestId: null, // filled for STAFF_APPROVED later
        lateFeeApplied: null,
        lateFeeConfigSnapshot: null,
        version: 1,
        createdAt: new Date(dueDateObj.getTime() - 5 * 86400000),
        updatedAt: paidAt || new Date(dueDateObj.getTime() - 5 * 86400000),
      };

      try {
        await feeDuesCol.insertOne(doc);
        duesCreated++;
        if (status === 'PAID') {
          duesPaid++;
          paidDueRecords.push(doc);
        }
      } catch (e) {
        if (e.code !== 11000) log('✗', `Fee due error: ${e.message}`);
      }
    }
  }
  log('✓', `Fee dues created: ${duesCreated} (${duesPaid} paid)`);

  // ── Phase 11: Transaction logs for paid dues ─────────────────────────────

  console.log('\n[11/15] Creating transaction logs...');

  // Get max existing receipt number
  let receiptNum = 1;
  const maxReceipt = await transLogCol
    .find({ academyId })
    .sort({ receiptNumber: -1 })
    .limit(1)
    .toArray();
  if (maxReceipt.length > 0) {
    const match = maxReceipt[0].receiptNumber?.match(/\d+$/);
    if (match) receiptNum = parseInt(match[0], 10) + 1;
  }

  let txnCount = 0;
  for (const due of paidDueRecords) {
    try {
      const txnDoc = {
        _id: randomUUID(),
        academyId,
        feeDueId: due._id,
        studentId: due.studentId,
        source: due.paidSource === 'STAFF_APPROVED' ? 'PAYMENT_REQUEST' : 'MANUAL',
        monthKey: due.monthKey,
        amount: due.amount,
        collectedByUserId: due.collectedByUserId || due.paidByUserId || ownerUserId,
        approvedByUserId: due.approvedByUserId || ownerUserId,
        receiptNumber: `PC-${String(receiptNum++).padStart(5, '0')}`,
        version: 1,
        createdAt: due.paidAt || new Date(),
        updatedAt: due.paidAt || new Date(),
      };
      // Omit paymentRequestId (sparse unique index)
      await transLogCol.insertOne(txnDoc);
      txnCount++;
    } catch (e) {
      if (e.code !== 11000) log('✗', `Txn error: ${e.message}`);
    }
  }
  log('✓', `Transaction logs: ${txnCount} (receipts PC-00001 → PC-${String(receiptNum - 1).padStart(5, '0')})`);

  // ── Phase 12: Payment requests ───────────────────────────────────────────

  console.log('\n[12/15] Creating payment requests...');
  const payReqCol = db.collection('payment_requests');
  let prCount = 0;

  // Get DUE fee dues for payment requests
  const dueFees = await feeDuesCol
    .find({ academyId, status: 'DUE' })
    .limit(15)
    .toArray();

  // Also use some PAID (STAFF_APPROVED) dues for APPROVED requests
  const staffPaidDues = paidDueRecords
    .filter((d) => d.paidSource === 'STAFF_APPROVED')
    .slice(0, 10);

  // APPROVED payment requests (linked to staff-paid dues)
  for (let i = 0; i < Math.min(staffPaidDues.length, 10); i++) {
    const due = staffPaidDues[i];
    const staffId = due.collectedByUserId || allStaffIds[i % allStaffIds.length];
    const prId = randomUUID();
    const createdAt = new Date(due.paidAt.getTime() - 2 * 86400000);

    try {
      await payReqCol.insertOne({
        _id: prId,
        academyId,
        studentId: due.studentId,
        feeDueId: due._id,
        monthKey: due.monthKey,
        amount: due.amount,
        staffUserId: staffId,
        staffNotes: [
          'Collected cash from parent during pick-up.',
          'Parent paid via UPI during home visit.',
          'Fee collected at the academy counter.',
          'Cash payment received during practice session.',
          'Parent handed over payment envelope.',
        ][i % 5],
        status: 'APPROVED',
        reviewedByUserId: ownerUserId,
        reviewedAt: new Date(createdAt.getTime() + 86400000),
        rejectionReason: null,
        version: 1,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 86400000),
      });

      // Link payment request to the fee due
      await feeDuesCol.updateOne(
        { _id: due._id },
        { $set: { paymentRequestId: prId } },
      );
      prCount++;
    } catch (e) {
      if (e.code !== 11000) log('✗', `PR error: ${e.message}`);
    }
  }

  // PENDING payment requests (for DUE fees)
  for (let i = 0; i < Math.min(dueFees.length, 5); i++) {
    const due = dueFees[i];
    const staffId = allStaffIds[i % allStaffIds.length] || ownerUserId;
    try {
      await payReqCol.insertOne({
        _id: randomUUID(),
        academyId,
        studentId: due.studentId,
        feeDueId: due._id,
        monthKey: due.monthKey,
        amount: due.amount,
        staffUserId: staffId,
        staffNotes: [
          'Collected fee from student during morning session.',
          'Parent paid cash at the gate.',
          'Fee received during batch class.',
          'Cash collected during evening session.',
          'Payment handed over by guardian.',
        ][i % 5],
        status: 'PENDING',
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
        version: 1,
        createdAt: new Date(Date.now() - (3 - i) * 86400000),
        updatedAt: new Date(Date.now() - (3 - i) * 86400000),
      });
      prCount++;
    } catch (e) {
      if (e.code !== 11000) { /* skip */ }
    }
  }

  // REJECTED payment requests
  for (let i = 5; i < Math.min(dueFees.length, 10); i++) {
    const due = dueFees[i];
    const staffId = allStaffIds[i % allStaffIds.length] || ownerUserId;
    const createdAt = new Date(Date.now() - (20 + i) * 86400000);
    try {
      await payReqCol.insertOne({
        _id: randomUUID(),
        academyId,
        studentId: due.studentId,
        feeDueId: due._id,
        monthKey: due.monthKey,
        amount: due.amount,
        staffUserId: staffId,
        staffNotes: 'Cash collected from parent at academy entrance.',
        status: 'REJECTED',
        reviewedByUserId: ownerUserId,
        reviewedAt: new Date(createdAt.getTime() + 86400000),
        rejectionReason: [
          'Amount does not match the due amount.',
          'Wrong month key — please resubmit.',
          'Student has already paid via online mode.',
          'Receipt not provided. Please collect and retry.',
          'Duplicate request — already processed.',
        ][i % 5],
        version: 1,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 86400000),
      });
      prCount++;
    } catch (e) {
      if (e.code !== 11000) { /* skip */ }
    }
  }

  // CANCELLED payment requests
  for (let i = 10; i < Math.min(dueFees.length, 15); i++) {
    const due = dueFees[i];
    const staffId = allStaffIds[i % allStaffIds.length] || ownerUserId;
    const createdAt = new Date(Date.now() - (30 + i) * 86400000);
    try {
      await payReqCol.insertOne({
        _id: randomUUID(),
        academyId,
        studentId: due.studentId,
        feeDueId: due._id,
        monthKey: due.monthKey,
        amount: due.amount,
        staffUserId: staffId,
        staffNotes: 'Payment collected but parent wants to pay online instead.',
        status: 'CANCELLED',
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
        version: 1,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 2 * 86400000),
      });
      prCount++;
    } catch (e) {
      if (e.code !== 11000) { /* skip */ }
    }
  }
  log('✓', `Payment requests: ${prCount}`);

  // ── Phase 13: Expense categories & expenses ──────────────────────────────

  console.log('\n[13/15] Creating expenses (6 months)...');
  const expCatCol = db.collection('expense_categories');
  const expCol = db.collection('expenses');

  const categoryIds = {};
  for (const catName of EXPENSE_CATEGORIES) {
    const catId = randomUUID();
    try {
      await expCatCol.insertOne({
        _id: catId,
        academyId,
        name: catName,
        createdBy: ownerUserId,
        createdAt: new Date('2025-09-01'),
        updatedAt: new Date('2025-09-01'),
      });
      categoryIds[catName] = catId;
    } catch (e) {
      if (e.code === 11000) {
        // Already exists — find it
        const existing = await expCatCol.findOne({ academyId, name: catName });
        if (existing) categoryIds[catName] = existing._id;
      }
    }
  }
  log('✓', `Expense categories: ${Object.keys(categoryIds).length}`);

  // Generate expenses over 6 months
  const expenseTemplates = [
    // Monthly recurring
    { cat: 'Rent', amount: [15000, 18000, 20000], notes: 'Monthly academy ground rent' },
    { cat: 'Staff Salaries', amount: [55000, 60000, 65000, 70000], notes: 'Monthly salary disbursement' },
    { cat: 'Utilities', amount: [2500, 3000, 3500, 4000], notes: 'Electricity and water bills' },
    // Periodic
    { cat: 'Equipment & Supplies', amount: [3000, 5000, 8000, 12000, 15000], notes: null },
    { cat: 'Transport', amount: [2000, 3500, 5000, 7000], notes: null },
    { cat: 'Miscellaneous', amount: [500, 1000, 1500, 2000, 3000], notes: null },
  ];

  const equipmentNotes = [
    'Cricket bats (3 nos.)', 'Tennis balls (2 boxes)', 'Practice stumps',
    'First aid kit refill', 'Cones and markers', 'Batting gloves (5 pairs)',
    'Score board repair', 'Kit bags', 'Water cooler maintenance', 'Nets replacement',
  ];
  const transportNotes = [
    'Student transport — tournament', 'Bus hire for sports day', 'Auto fare — equipment pickup',
    'Fuel for academy van', 'Travel to inter-academy match',
  ];
  const miscNotes = [
    'Printing certificates', 'Tea & snacks for meeting', 'Stationery supplies',
    'Photography — annual day', 'Banner printing', 'Trophies & medals',
  ];

  let expCount = 0;
  for (let m = 5; m >= 0; m--) {
    const baseDate = monthsAgo(m);
    const mk = monthKey(baseDate);

    // Recurring expenses (rent, salaries, utilities) — once per month
    for (const tmpl of expenseTemplates.slice(0, 3)) {
      const catId = categoryIds[tmpl.cat];
      if (!catId) continue;
      const amt = tmpl.amount[m % tmpl.amount.length];
      const day = tmpl.cat === 'Rent' ? 1 : tmpl.cat === 'Staff Salaries' ? 28 : 15;
      const expDate = `${mk}-${String(Math.min(day, 28)).padStart(2, '0')}`;

      try {
        await expCol.insertOne({
          _id: randomUUID(),
          academyId,
          date: expDate,
          categoryId: catId,
          category: tmpl.cat,
          amount: amt,
          notes: tmpl.notes,
          createdBy: ownerUserId,
          deletedAt: null,
          deletedBy: null,
          version: 1,
          createdAt: new Date(expDate + 'T10:00:00+05:30'),
          updatedAt: new Date(expDate + 'T10:00:00+05:30'),
        });
        expCount++;
      } catch (e) {
        if (e.code !== 11000) log('✗', `Expense error: ${e.message}`);
      }
    }

    // Ad-hoc expenses: 2-4 per month
    const adHocCount = 2 + (m % 3);
    for (let a = 0; a < adHocCount; a++) {
      const catIdx = 3 + (a % 3); // Equipment, Transport, Misc
      const tmpl = expenseTemplates[catIdx];
      const catId = categoryIds[tmpl.cat];
      if (!catId) continue;

      const amt = tmpl.amount[(m + a) % tmpl.amount.length];
      const day = 5 + a * 7 + (m % 5);
      const expDate = `${mk}-${String(Math.min(day, 28)).padStart(2, '0')}`;

      let notes;
      if (tmpl.cat === 'Equipment & Supplies') notes = equipmentNotes[(m * 3 + a) % equipmentNotes.length];
      else if (tmpl.cat === 'Transport') notes = transportNotes[(m * 2 + a) % transportNotes.length];
      else notes = miscNotes[(m * 2 + a) % miscNotes.length];

      try {
        await expCol.insertOne({
          _id: randomUUID(),
          academyId,
          date: expDate,
          categoryId: catId,
          category: tmpl.cat,
          amount: amt,
          notes,
          createdBy: ownerUserId,
          deletedAt: null,
          deletedBy: null,
          version: 1,
          createdAt: new Date(expDate + 'T14:00:00+05:30'),
          updatedAt: new Date(expDate + 'T14:00:00+05:30'),
        });
        expCount++;
      } catch (e) {
        if (e.code !== 11000) { /* skip */ }
      }
    }
  }
  log('✓', `Expenses created: ${expCount}`);

  // ── Phase 14: Events & Enquiries ─────────────────────────────────────────

  console.log('\n[14/15] Creating events & enquiries...');
  const eventsCol = db.collection('events');
  const enquiriesCol = db.collection('enquiries');

  // Events
  const events = makeEvents(allBatchIds);
  let evCount = 0;
  for (const evt of events) {
    try {
      await eventsCol.insertOne({
        // Let MongoDB generate ObjectId for events
        academyId,
        title: evt.title,
        description: evt.description,
        eventType: evt.eventType,
        startDate: evt.startDate,
        endDate: evt.endDate,
        startTime: evt.startTime || null,
        endTime: evt.endTime || null,
        isAllDay: evt.isAllDay || false,
        location: evt.location,
        targetAudience: evt.targetAudience,
        batchIds: evt.batchIds,
        status: evt.status,
        createdBy: ownerUserId,
        createdAt: new Date(evt.startDate.getTime() - 7 * 86400000),
        updatedAt: new Date(evt.startDate.getTime() - 7 * 86400000),
      });
      evCount++;
    } catch (e) {
      log('✗', `Event error: ${e.message}`);
    }
  }
  log('✓', `Events created: ${evCount}`);

  // Enquiries
  const convertibleIds = newStudentIds.slice(0, 8); // first 8 new students as "converted" enquiries
  const enquiries = makeEnquiries(academyId, ownerUserId, allStaffIds, convertibleIds);
  let enqCount = 0;
  for (const enq of enquiries) {
    try {
      await enquiriesCol.insertOne(enq);
      enqCount++;
    } catch (e) {
      if (e.code !== 11000) log('✗', `Enquiry error: ${e.message}`);
    }
  }
  log('✓', `Enquiries created: ${enqCount}`);

  // ── Phase 15: Audit logs ─────────────────────────────────────────────────

  console.log('\n[15/15] Creating comprehensive audit logs...');
  const auditCol = db.collection('audit_logs');
  let alCount = 0;

  const auditEntries = [];

  // Student created entries (for all new students)
  for (let i = 0; i < Math.min(newStudentIds.length, 50); i++) {
    auditEntries.push({
      action: 'STUDENT_CREATED',
      entityType: 'STUDENT',
      entityId: newStudentIds[i],
      actor: i % 3 === 0 ? ownerUserId : (allStaffIds[i % allStaffIds.length] || ownerUserId),
      context: { fullName: newStudentData[i]?.fullName || 'Student' },
      daysAgo: 180 - Math.floor(i * 3),
    });
  }

  // Student updates
  for (let i = 0; i < 15; i++) {
    const sid = allStudentIds[i % allStudentIds.length];
    auditEntries.push({
      action: 'STUDENT_UPDATED',
      entityType: 'STUDENT',
      entityId: sid,
      actor: ownerUserId,
      context: { field: ['monthlyFee', 'address', 'guardian.mobile', 'gender', 'dateOfBirth'][i % 5] },
      daysAgo: 10 + i * 8,
    });
  }

  // Status changes
  for (const sc of statusChanges) {
    if (!newStudentIds[sc.idx]) continue;
    auditEntries.push({
      action: 'STUDENT_STATUS_CHANGED',
      entityType: 'STUDENT',
      entityId: newStudentIds[sc.idx],
      actor: ownerUserId,
      context: { from: 'ACTIVE', to: sc.status, reason: sc.reason.slice(0, 120) },
      daysAgo: sc.status === 'LEFT' ? 60 : 20,
    });
  }

  // Batch created
  for (let i = 0; i < NEW_BATCHES.length; i++) {
    auditEntries.push({
      action: 'BATCH_CREATED',
      entityType: 'BATCH',
      entityId: allBatchIds[existingBatchIds.length + i] || `batch-new-${i}`,
      actor: ownerUserId,
      context: { batchName: NEW_BATCHES[i].batchName },
      daysAgo: 175 - i * 10,
    });
  }

  // Attendance edits
  for (let i = 0; i < 20; i++) {
    auditEntries.push({
      action: 'STUDENT_ATTENDANCE_EDITED',
      entityType: 'STUDENT_ATTENDANCE',
      entityId: allStudentIds[i % allStudentIds.length],
      actor: i % 2 === 0 ? ownerUserId : (allStaffIds[i % allStaffIds.length] || ownerUserId),
      context: { date: daysAgo(5 + i * 7), status: 'ABSENT' },
      daysAgo: 5 + i * 7,
    });
  }

  // Staff attendance
  for (let i = 0; i < 10; i++) {
    auditEntries.push({
      action: 'STAFF_ATTENDANCE_CHANGED',
      entityType: 'STAFF_ATTENDANCE',
      entityId: allStaffIds[i % allStaffIds.length] || 'staff-0',
      actor: ownerUserId,
      context: { date: daysAgo(3 + i * 12), status: 'ABSENT' },
      daysAgo: 3 + i * 12,
    });
  }

  // Fee paid events
  for (let i = 0; i < 30; i++) {
    const due = paidDueRecords[i % paidDueRecords.length];
    if (!due) continue;
    auditEntries.push({
      action: 'FEE_PAID',
      entityType: 'FEE_DUE',
      entityId: due._id,
      actor: due.paidByUserId || ownerUserId,
      context: { studentId: due.studentId, monthKey: due.monthKey, amount: String(due.amount) },
      daysAgo: Math.max(1, 150 - i * 5),
    });
  }

  // Payment request events
  auditEntries.push(
    ...Array.from({ length: 8 }, (_, i) => ({
      action: i % 2 === 0 ? 'PAYMENT_REQUEST_APPROVED' : 'PAYMENT_REQUEST_REJECTED',
      entityType: 'PAYMENT_REQUEST',
      entityId: randomUUID(),
      actor: ownerUserId,
      context: { staffName: allStaff[i % allStaff.length]?.fullName || 'Staff' },
      daysAgo: 10 + i * 15,
    })),
  );

  // Holiday declarations
  for (const h of HOLIDAYS) {
    auditEntries.push({
      action: 'HOLIDAY_DECLARED',
      entityType: 'HOLIDAY',
      entityId: h.date,
      actor: ownerUserId,
      context: { reason: h.reason, date: h.date },
      daysAgo: Math.max(1, Math.floor((new Date() - new Date(h.date)) / 86400000) + 1),
    });
  }

  // Expense events
  for (let i = 0; i < 10; i++) {
    auditEntries.push({
      action: i < 8 ? 'EXPENSE_CREATED' : 'EXPENSE_UPDATED',
      entityType: 'EXPENSE',
      entityId: randomUUID(),
      actor: ownerUserId,
      context: { category: EXPENSE_CATEGORIES[i % EXPENSE_CATEGORIES.length], amount: String(1000 + i * 500) },
      daysAgo: 5 + i * 15,
    });
  }

  // Event created entries
  for (let i = 0; i < events.length; i++) {
    auditEntries.push({
      action: 'EVENT_CREATED',
      entityType: 'EVENT',
      entityId: randomUUID(),
      actor: ownerUserId,
      context: { title: events[i].title.slice(0, 120) },
      daysAgo: Math.max(1, Math.floor((new Date() - events[i].startDate) / 86400000) + 7),
    });
  }

  // Monthly dues engine runs
  for (let m = 5; m >= 0; m--) {
    const d = monthsAgo(m);
    auditEntries.push({
      action: 'MONTHLY_DUES_ENGINE_RAN',
      entityType: 'FEE_DUE',
      entityId: academyId,
      actor: 'SYSTEM',
      context: { month: monthKey(d), created: String(allStudentIds.length), flippedToDue: String(Math.floor(allStudentIds.length * 0.3)) },
      daysAgo: Math.max(1, Math.floor((new Date() - d) / 86400000)),
    });
  }

  // Write all audit entries
  for (const entry of auditEntries) {
    try {
      await auditCol.insertOne({
        _id: randomUUID(),
        academyId,
        actorUserId: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        context: entry.context || null,
        createdAt: new Date(Date.now() - entry.daysAgo * 86400000),
      });
      alCount++;
    } catch (e) {
      // skip
    }
  }
  log('✓', `Audit logs created: ${alCount}`);

  // ── Disconnect & summary ─────────────────────────────────────────────────

  await mongoose.disconnect();

  console.log('\n══════════════════════════════════════════════');
  console.log('  EXPANDED SEED COMPLETE!');
  console.log('══════════════════════════════════════════════');
  console.log(`
  Summary:
    Students (new):     ${newStudentIds.length}
    Batches (new):      ${newBatchIds.length}
    Holidays:           ${hCount}
    Student absences:   ${saCount}
    Staff absences:     ${stfCount}
    Fee dues:           ${duesCreated} (${duesPaid} paid)
    Transaction logs:   ${txnCount}
    Payment requests:   ${prCount}
    Expenses:           ${expCount}
    Events:             ${evCount}
    Enquiries:          ${enqCount}
    Audit logs:         ${alCount}

  Total students:     ${allStudentIds.length}
  Total batches:      ${allBatchIds.length}

  Login credentials:
    Owner:  ${OWNER.email} / ${OWNER.password}
    Staff:  amit@playconnect.dev / Staff@123
  `);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
