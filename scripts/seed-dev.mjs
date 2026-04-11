#!/usr/bin/env node
/**
 * Academyflo — Comprehensive Development Seed Script
 *
 * Seeds the database with realistic dummy data across ALL modules:
 * - Owner signup + academy setup
 * - Staff members (5)
 * - Batches (4)
 * - Students (25)
 * - Student-batch assignments
 * - Student attendance (past 30 days)
 * - Staff attendance (past 30 days)
 * - Holidays (3)
 * - Fee dues (via MongoDB — the cron engine path)
 * - Some fees marked as paid
 * - Settings (receipt prefix, due date)
 *
 * Usage: node scripts/seed-dev.mjs
 */

import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

const API = 'http://localhost:3001/api/v1';
// The API falls back to localhost:27017/__placeholder when MONGODB_URI is not loaded by NestJS config.
const MONGODB_URI = process.env.SEED_MONGODB_URI || 'mongodb://localhost:27017/__placeholder';

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

  if (!res.ok) {
    // Return error details but don't crash — some endpoints may conflict on re-run
    return { _error: true, status: res.status, ...json };
  }
  return json;
}

function today() {
  const d = new Date();
  return fmtDate(d);
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtDate(d);
}

function currentMonth() {
  return today().substring(0, 7);
}


function log(icon, msg) {
  console.log(`  ${icon}  ${msg}`);
}

// ── Owner Data ───────────────────────────────────────────────────────────────

const OWNER = {
  fullName: 'Rajesh Kumar',
  email: 'owner@playconnect.dev',
  phoneNumber: '+919876500001',
  password: 'Owner@123',
  deviceId: 'seed-device-owner',
};

const ACADEMY = {
  academyName: 'Academyflo Sports Academy',
  address: {
    line1: '42 MG Road',
    line2: 'Near City Mall',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
    country: 'India',
  },
};

// ── Staff Data ───────────────────────────────────────────────────────────────

const STAFF = [
  { fullName: 'Amit Sharma',    email: 'amit@playconnect.dev',   phoneNumber: '+919876500010', password: 'Staff@123' },
  { fullName: 'Priya Patel',    email: 'priya@playconnect.dev',  phoneNumber: '+919876500011', password: 'Staff@123' },
  { fullName: 'Vikram Singh',   email: 'vikram@playconnect.dev', phoneNumber: '+919876500012', password: 'Staff@123' },
  { fullName: 'Sneha Reddy',    email: 'sneha@playconnect.dev',  phoneNumber: '+919876500013', password: 'Staff@123' },
  { fullName: 'Rahul Verma',    email: 'rahul@playconnect.dev',  phoneNumber: '+919876500014', password: 'Staff@123' },
];

// ── Batch Data ───────────────────────────────────────────────────────────────

const BATCHES = [
  { batchName: 'Morning Beginners',  days: ['MON', 'WED', 'FRI'],        notes: 'Ages 5-8, beginner level' },
  { batchName: 'Morning Advanced',   days: ['MON', 'WED', 'FRI'],        notes: 'Ages 9-14, advanced skills' },
  { batchName: 'Evening Batch',      days: ['TUE', 'THU', 'SAT'],        notes: 'Mixed age group, 5pm-7pm' },
  { batchName: 'Weekend Warriors',   days: ['SAT', 'SUN'],               notes: 'Weekend-only batch, all levels' },
];

// ── Student Data ─────────────────────────────────────────────────────────────

const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh',
  'Ayaan', 'Krishna', 'Ishaan', 'Ananya', 'Saanvi', 'Aanya', 'Aadhya', 'Aarohi',
  'Diya', 'Myra', 'Sara', 'Kiara', 'Riya', 'Kabir', 'Dhruv', 'Rohan', 'Arnav', 'Laksh'];

const LAST_NAMES = ['Gupta', 'Sharma', 'Singh', 'Patel', 'Kumar', 'Reddy', 'Verma',
  'Nair', 'Iyer', 'Joshi', 'Das', 'Mehta', 'Rao', 'Chauhan', 'Mishra'];

const CITIES = ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad'];
const STATES = ['Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Telangana'];
const GENDERS = ['MALE', 'FEMALE'];

function makeStudent(i) {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length];
  const ln = LAST_NAMES[i % LAST_NAMES.length];
  const gender = GENDERS[i % 2];
  const city = CITIES[i % CITIES.length];
  const state = STATES[i % STATES.length];
  const fee = [500, 800, 1000, 1200, 1500][i % 5];
  const dob = `${2010 + (i % 8)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`;
  const joiningDate = `2024-${String((i % 6) + 1).padStart(2, '0')}-01`;

  return {
    fullName: `${fn} ${ln}`,
    dateOfBirth: dob,
    gender,
    address: {
      line1: `${100 + i} Main Road`,
      city,
      state,
      pincode: `${500000 + i}`,
    },
    guardian: {
      name: `${ln} Parent`,
      mobile: `+91987650${String(100 + i)}`,
      email: `parent${i + 1}@test.com`,
    },
    joiningDate,
    monthlyFee: fee,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n==========================================');
  console.log('  Academyflo Dev Seed Script');
  console.log('==========================================\n');

  // ── Step 1: Owner Signup ───────────────────────────────────────────────────
  console.log('[1/12] Owner Signup...');
  const deviceId = `seed-${Date.now()}`;
  let res = await api('POST', '/auth/owner/signup', { ...OWNER, deviceId });
  if (res._error && (res.statusCode === 409 || res.statusCode === 500)) {
    log('↩', 'Owner already exists, logging in...');
    res = await api('POST', '/auth/login', {
      identifier: OWNER.email,
      password: OWNER.password,
      deviceId,
    });
  }
  if (res._error) {
    console.error('FATAL: Could not authenticate owner:', JSON.stringify(res));
    process.exit(1);
  }
  TOKEN = res.data.accessToken;
  const ownerUserId = res.data.user.id;
  log('✓', `Owner: ${OWNER.fullName} (${ownerUserId})`);

  // ── Step 2: Academy Setup ──────────────────────────────────────────────────
  console.log('[2/12] Academy Setup...');
  res = await api('POST', '/academy/setup', ACADEMY);
  if (res._error && res.statusCode === 409) {
    log('↩', 'Academy already set up');
  } else if (res._error) {
    console.error('Academy setup failed:', JSON.stringify(res));
  } else {
    log('✓', `Academy: ${ACADEMY.academyName}`);
  }

  // Re-login with a fresh deviceId to get a new session after academy setup
  res = await api('POST', '/auth/login', {
    identifier: OWNER.email,
    password: OWNER.password,
    deviceId: `seed-device-${Date.now()}`,
  });
  if (res._error) {
    log('↩', 'Re-login failed, using existing token');
  } else {
    TOKEN = res.data.accessToken;
  }

  // We'll resolve academyId from MongoDB later when we connect
  let academyId = null;

  // ── Step 3: Update Settings ────────────────────────────────────────────────
  console.log('[3/12] Academy Settings...');
  res = await api('PUT', '/settings/academy', {
    defaultDueDateDay: 5,
    receiptPrefix: 'PC',
  });
  if (!res._error) {
    log('✓', 'Settings: due date day=5, receipt prefix=PC');
  } else {
    log('↩', 'Settings update skipped');
  }

  // ── Step 4: Create Staff ───────────────────────────────────────────────────
  console.log('[4/12] Creating Staff (5 members)...');
  const staffIds = [];
  for (const s of STAFF) {
    res = await api('POST', '/staff', s);
    if (res._error && res.statusCode === 409) {
      log('↩', `Staff ${s.fullName} already exists`);
      // Try to find them by listing
    } else if (res._error) {
      log('✗', `Failed to create ${s.fullName}: ${res.message}`);
    } else {
      staffIds.push(res.data.id);
      log('✓', `Staff: ${s.fullName} (${res.data.id})`);
    }
  }

  // Fetch staff list to get all IDs (in case some already existed)
  res = await api('GET', '/staff?page=1&pageSize=50');
  const allStaff = res.data?.data || [];
  const allStaffIds = allStaff.map((s) => s.id);
  log('✓', `Total staff found: ${allStaffIds.length}`);

  // ── Step 5: Create Batches ─────────────────────────────────────────────────
  console.log('[5/12] Creating Batches (4)...');
  const batchIds = [];
  for (const b of BATCHES) {
    res = await api('POST', '/batches', b);
    if (res._error && res.statusCode === 409) {
      log('↩', `Batch ${b.batchName} already exists`);
    } else if (res._error) {
      log('✗', `Failed to create ${b.batchName}: ${res.message}`);
    } else {
      batchIds.push(res.data.id);
      log('✓', `Batch: ${b.batchName} (${res.data.id})`);
    }
  }

  // Fetch batch list to get all IDs
  res = await api('GET', '/batches?page=1&pageSize=50');
  const allBatches = res.data?.data || [];
  const allBatchIds = allBatches.map((b) => b.id);
  log('✓', `Total batches found: ${allBatchIds.length}`);

  // ── Step 6: Create Students ────────────────────────────────────────────────
  console.log('[6/12] Creating Students (25)...');
  const studentIds = [];
  for (let i = 0; i < 25; i++) {
    const student = makeStudent(i);
    res = await api('POST', '/students', student);
    if (res._error && res.statusCode === 409) {
      log('↩', `Student ${student.fullName} may already exist`);
    } else if (res._error) {
      log('✗', `Failed: ${student.fullName}: ${res.message}`);
    } else {
      studentIds.push(res.data.id);
      if (i === 0 || i === 24) log('✓', `Student: ${student.fullName} (${res.data.id})`);
    }
  }

  // Fetch student list to get all IDs
  res = await api('GET', '/students?page=1&pageSize=100');
  const allStudents = res.data?.data || [];
  const allStudentIds = allStudents.map((s) => s.id);
  log('✓', `Total students found: ${allStudentIds.length}`);

  // ── Step 7: Assign Students to Batches ─────────────────────────────────────
  console.log('[7/12] Assigning Students to Batches...');
  if (allBatchIds.length > 0 && allStudentIds.length > 0) {
    for (let i = 0; i < allStudentIds.length; i++) {
      // Assign each student to 1-2 batches
      const assignedBatches = [allBatchIds[i % allBatchIds.length]];
      if (i % 3 === 0 && allBatchIds.length > 1) {
        assignedBatches.push(allBatchIds[(i + 1) % allBatchIds.length]);
      }
      res = await api('PUT', `/students/${allStudentIds[i]}/batches`, { batchIds: assignedBatches });
      if (res._error) {
        log('✗', `Failed assignment for student ${i}`);
      }
    }
    log('✓', `Assigned ${allStudentIds.length} students to batches`);
  }

  // ── Step 8: Declare Holidays ───────────────────────────────────────────────
  console.log('[8/12] Declaring Holidays...');
  const holidays = [
    { date: daysAgo(14), reason: 'Republic Day' },
    { date: daysAgo(7),  reason: 'Academy Annual Day' },
    { date: daysAgo(21), reason: 'Festival Holiday' },
  ];
  for (const h of holidays) {
    res = await api('POST', '/attendance/holidays', h);
    if (res._error && res.statusCode === 409) {
      log('↩', `Holiday ${h.date} already declared`);
    } else if (res._error) {
      log('✗', `Failed holiday ${h.date}: ${res.message}`);
    } else {
      log('✓', `Holiday: ${h.date} — ${h.reason}`);
    }
  }

  // ── Step 9: Mark Student Attendance (past 30 days) ─────────────────────────
  console.log('[9/12] Marking Student Attendance (30 days)...');
  const holidayDates = new Set(holidays.map((h) => h.date));
  let attendanceCount = 0;

  for (let d = 1; d <= 30; d++) {
    const date = daysAgo(d);
    if (holidayDates.has(date)) continue;

    // Mark ~15-20% of students as absent each day
    const absentIds = allStudentIds.filter((_, i) => {
      const hash = (d * 31 + i * 17) % 100;
      return hash < 18; // ~18% absent rate
    });

    if (absentIds.length > 0) {
      res = await api('PUT', `/attendance/students/bulk?date=${date}`, {
        absentStudentIds: absentIds,
      });
      if (!res._error) attendanceCount++;
    }
  }
  log('✓', `Attendance marked for ${attendanceCount} days`);

  // ── Step 10: Mark Staff Attendance (past 30 days) ──────────────────────────
  console.log('[10/12] Marking Staff Attendance (30 days)...');
  let staffAttCount = 0;

  for (let d = 1; d <= 30; d++) {
    const date = daysAgo(d);

    // Mark 0-2 staff as absent per day
    for (let si = 0; si < allStaffIds.length; si++) {
      const hash = (d * 13 + si * 29) % 100;
      const isAbsent = hash < 15; // ~15% absent
      if (isAbsent) {
        res = await api('PUT', `/staff-attendance/${allStaffIds[si]}?date=${date}`, {
          status: 'ABSENT',
        });
        if (!res._error) staffAttCount++;
      }
    }
  }
  log('✓', `Staff absences marked: ${staffAttCount} records`);

  // ── Step 11: Create Fee Dues via MongoDB ───────────────────────────────────
  console.log('[11/12] Creating Fee Dues (MongoDB direct)...');
  try {
    await mongoose.connect(MONGODB_URI);
    log('✓', 'MongoDB connected');

    const db = mongoose.connection.db;

    // Resolve academyId from the owner's user document
    const usersCollection = db.collection('users');
    const ownerDoc = await usersCollection.findOne({ _id: ownerUserId });
    if (ownerDoc && ownerDoc.academyId) {
      academyId = ownerDoc.academyId;
    } else {
      // Fallback: find academy by owner
      const academiesCollection = db.collection('academies');
      const academyDoc = await academiesCollection.findOne({ ownerUserId });
      if (academyDoc) academyId = academyDoc._id;
    }
    log('✓', `Academy ID: ${academyId}`);

    const feeDuesCollection = db.collection('fee_dues');

    // Generate fee dues for past 3 months + current month
    const months = [];
    for (let m = 3; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    let duesCreated = 0;
    let duesPaid = 0;

    // First, get all students from the API response (we have allStudents)
    // We need their monthlyFee. Let's fetch full details if needed.
    // Actually allStudents from the list endpoint should have monthlyFee.
    const studentFeeMap = {};
    for (const s of allStudents) {
      studentFeeMap[s.id] = s.monthlyFee || 1000;
    }

    for (const monthKey of months) {
      const dueDateDay = 5;
      const dueDate = `${monthKey}-${String(dueDateDay).padStart(2, '0')}`;
      const now = new Date();
      const dueDateObj = new Date(dueDate + 'T00:00:00Z');
      const isPast = dueDateObj < now;

      for (const studentId of allStudentIds) {
        const fee = studentFeeMap[studentId] || 1000;
        const id = randomUUID();

        // Determine status (only UPCOMING, DUE, PAID — no OVERDUE in the entity)
        let status;
        const monthIdx = months.indexOf(monthKey);
        if (monthIdx === months.length - 1) {
          // Current month: UPCOMING or DUE
          status = isPast ? 'DUE' : 'UPCOMING';
        } else if (monthIdx <= 1) {
          // Old months: mix of PAID and DUE
          const hash = (studentId.charCodeAt(0) + monthIdx * 7) % 100;
          if (hash < 70) {
            status = 'PAID';
          } else {
            status = 'DUE';
          }
        } else {
          // Middle months: mix
          const hash = (studentId.charCodeAt(0) + monthIdx * 11) % 100;
          if (hash < 50) {
            status = 'PAID';
          } else {
            status = 'DUE';
          }
        }

        const doc = {
          _id: id,
          academyId,
          studentId,
          monthKey,
          dueDate,
          amount: fee,
          status,
          paidAt: status === 'PAID' ? new Date(dueDateObj.getTime() + 3 * 86400000) : null,
          paidByUserId: status === 'PAID' ? ownerUserId : null,
          paidSource: status === 'PAID' ? 'OWNER_DIRECT' : null,
          paymentLabel: null,
          collectedByUserId: null,
          approvedByUserId: null,
          paymentRequestId: null,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        try {
          await feeDuesCollection.insertOne(doc);
          duesCreated++;
          if (status === 'PAID') duesPaid++;
        } catch (e) {
          if (e.code === 11000) {
            // Duplicate key — fee due already exists for this student+month
          } else {
            log('✗', `Fee due insert error: ${e.message}`);
          }
        }
      }
    }
    log('✓', `Fee dues created: ${duesCreated} (${duesPaid} paid)`);

    // ── Step 11b: Create Transaction Logs for paid dues ──────────────────────
    const transactionLogsCollection = db.collection('transaction_logs');
    const paidDues = await feeDuesCollection.find({ academyId, status: 'PAID' }).toArray();
    let txnCount = 0;
    let receiptNum = 1;

    // Get current max receipt number to avoid conflicts
    const maxReceipt = await transactionLogsCollection
      .find({ academyId })
      .sort({ receiptNumber: -1 })
      .limit(1)
      .toArray();
    if (maxReceipt.length > 0) {
      const match = maxReceipt[0].receiptNumber?.match(/\d+$/);
      if (match) receiptNum = parseInt(match[0], 10) + 1;
    }

    for (const due of paidDues) {
      const txnId = randomUUID();
      try {
        // Omit paymentRequestId entirely (sparse unique index treats null as a value)
        await transactionLogsCollection.insertOne({
          _id: txnId,
          academyId,
          feeDueId: due._id,
          studentId: due.studentId,
          source: 'MANUAL',
          monthKey: due.monthKey,
          amount: due.amount,
          collectedByUserId: ownerUserId,
          approvedByUserId: ownerUserId,
          receiptNumber: `PC-${String(receiptNum++).padStart(5, '0')}`,
          version: 1,
          createdAt: due.paidAt || new Date(),
          updatedAt: due.paidAt || new Date(),
        });
        txnCount++;
      } catch (e) {
        if (e.code !== 11000) log('✗', `Txn log error: ${e.message}`);
      }
    }
    log('✓', `Transaction logs created: ${txnCount}`);

    // ── Step 11c: Create Subscription (trial) ────────────────────────────────
    const subscriptionsCollection = db.collection('subscriptions');
    const subId = randomUUID();
    try {
      await subscriptionsCollection.insertOne({
        _id: subId,
        academyId,
        trialStartAt: new Date(),
        trialEndAt: new Date(Date.now() + 30 * 86400000),
        paidStartAt: null,
        paidEndAt: null,
        tierKey: null,
        pendingTierKey: null,
        pendingTierEffectiveAt: null,
        activeStudentCountSnapshot: allStudentIds.length,
        manualNotes: null,
        paymentReference: null,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      log('✓', `Subscription: 30-day trial created`);
    } catch (e) {
      if (e.code === 11000) {
        log('↩', 'Subscription already exists');
      } else {
        log('✗', `Subscription error: ${e.message}`);
      }
    }

    // ── Step 11d: Create Audit Logs ──────────────────────────────────────────
    const auditLogsCollection = db.collection('audit_logs');
    const auditActions = [
      { action: 'STUDENT_CREATED', entityType: 'STUDENT', entityId: allStudentIds[0], context: { fullName: allStudents[0]?.fullName || 'Student' } },
      { action: 'STUDENT_CREATED', entityType: 'STUDENT', entityId: allStudentIds[1], context: { fullName: allStudents[1]?.fullName || 'Student' } },
      { action: 'STUDENT_UPDATED', entityType: 'STUDENT', entityId: allStudentIds[0], context: { field: 'monthlyFee' } },
      { action: 'STAFF_CREATED', entityType: 'STAFF', entityId: allStaffIds[0] || 'staff-1', context: { fullName: STAFF[0].fullName } },
      { action: 'BATCH_CREATED', entityType: 'BATCH', entityId: allBatchIds[0] || 'batch-1', context: { batchName: BATCHES[0].batchName } },
      { action: 'HOLIDAY_DECLARED', entityType: 'HOLIDAY', entityId: holidays[0].date, context: { reason: holidays[0].reason } },
      { action: 'FEE_PAID', entityType: 'FEE_DUE', entityId: allStudentIds[0], context: { monthKey: months[0] } },
      { action: 'STUDENT_ATTENDANCE_EDITED', entityType: 'STUDENT', entityId: allStudentIds[2], context: { date: daysAgo(3) } },
      { action: 'MONTHLY_DUES_ENGINE_RAN', entityType: 'FEE_DUE', entityId: academyId, context: { created: '25', flippedToDue: '0' } },
    ];

    let auditCount = 0;
    for (let i = 0; i < auditActions.length; i++) {
      const a = auditActions[i];
      try {
        await auditLogsCollection.insertOne({
          _id: randomUUID(),
          academyId,
          actorUserId: i < 3 ? ownerUserId : (allStaffIds[0] || ownerUserId),
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          context: a.context,
          createdAt: new Date(Date.now() - i * 3600000),
        });
        auditCount++;
      } catch (e) {
        // Ignore duplicates
      }
    }
    log('✓', `Audit logs created: ${auditCount}`);

    await mongoose.disconnect();
  } catch (err) {
    console.error('MongoDB error:', err.message);
  }

  // ── Step 12: Verify seeded data ────────────────────────────────────────────
  console.log('[12/12] Verification...');

  res = await api('GET', '/students?page=1&pageSize=1');
  log('✓', `Students: ${res.data?.meta?.totalItems || '?'}`);

  res = await api('GET', '/staff?page=1&pageSize=1');
  log('✓', `Staff: ${res.data?.meta?.totalItems || '?'}`);

  res = await api('GET', '/batches?page=1&pageSize=1');
  log('✓', `Batches: ${res.data?.meta?.totalItems || '?'}`);

  res = await api('GET', `/attendance/students?date=${today()}&page=1&pageSize=1`);
  log('✓', `Today's attendance view: ${res.data?.meta?.totalItems || '?'} students`);

  res = await api('GET', `/attendance/reports/daily?date=${daysAgo(2)}`);
  log('✓', `Daily report (${daysAgo(2)}): P=${res.data?.presentCount || '?'}, A=${res.data?.absentCount || '?'}`);

  res = await api('GET', `/attendance/reports/monthly/summary?month=${currentMonth()}&page=1&pageSize=1`);
  log('✓', `Monthly summary: ${res.data?.meta?.totalItems || '?'} students`);

  res = await api('GET', `/staff-attendance?date=${daysAgo(2)}&page=1&pageSize=1`);
  log('✓', `Staff attendance view: ${res.data?.meta?.totalItems || '?'} staff`);

  res = await api('GET', `/staff-attendance/reports/daily?date=${daysAgo(2)}`);
  log('✓', `Staff daily report: P=${res.data?.presentCount || '?'}, A=${res.data?.absentCount || '?'}`);

  res = await api('GET', `/staff-attendance/reports/monthly?month=${currentMonth()}&page=1&pageSize=1`);
  log('✓', `Staff monthly summary: ${res.data?.meta?.totalItems || '?'} staff`);

  res = await api('GET', `/attendance/holidays?month=${currentMonth()}`);
  log('✓', `Holidays this month: ${Array.isArray(res.data) ? res.data.length : '?'}`);

  res = await api('GET', `/fees/dues?month=${currentMonth()}`);
  log('✓', `Fee dues (${currentMonth()}): ${Array.isArray(res.data) ? res.data.length : '?'}`);

  console.log('\n==========================================');
  console.log('  SEED COMPLETE!');
  console.log('==========================================');
  console.log(`\n  Login credentials:`);
  console.log(`  Owner:  ${OWNER.email} / ${OWNER.password}`);
  console.log(`  Staff:  ${STAFF[0].email} / ${STAFF[0].password}`);
  console.log('');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
