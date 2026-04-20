# Performance Runbook

Diagnosing and resolving performance issues in Academyflo.

## 1. Interpreting Slow Query Logs

### Enable MongoDB Profiling (Staging)

```javascript
// Connect to MongoDB shell
db.setProfilingLevel(1, { slowms: 100 });

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(20).pretty();

// Check for queries without index usage
db.system.profile
  .find({
    planSummary: 'COLLSCAN',
  })
  .sort({ ts: -1 })
  .limit(10);
```

### Key Fields to Check

| Field                     | What to look for                                          |
| ------------------------- | --------------------------------------------------------- |
| `millis`                  | Execution time > 100ms is concerning, > 500ms is critical |
| `planSummary`             | `COLLSCAN` means no index used — needs fix                |
| `nscanned` vs `nreturned` | High ratio means inefficient query                        |
| `ns`                      | Which collection is affected                              |
| `query`                   | The actual query shape                                    |

### Atlas Performance Advisor

If using Atlas, check the Performance Advisor tab for:

- Suggested indexes
- Slow query patterns
- Connection pool utilization

## 2. Verifying Indexes in Staging

Connect to the staging database and verify indexes exist for common query patterns:

```javascript
// Students collection
db.students.getIndexes();
// Expected: { academyId: 1, status: 1 }, { academyId: 1, fullName: 1 }

// Attendance collection
db.student_attendances.getIndexes();
// Expected: { studentId: 1, date: 1 }, { academyId: 1, date: 1 }

// Fee dues collection
db.fee_dues.getIndexes();
// Expected: { studentId: 1, month: 1 }, { academyId: 1, month: 1, status: 1 }

// Subscriptions collection
db.subscriptions.getIndexes();
// Expected: { academyId: 1 }

// Audit logs collection
db.audit_logs.getIndexes();
// Expected: { academyId: 1, timestamp: -1 }, { entityType: 1, entityId: 1 }

// Academies collection
db.academies.getIndexes();
// Expected: { ownerId: 1 }

// Users collection
db.users.getIndexes();
// Expected: { email: 1 }, { phoneNumber: 1 }, { academyId: 1 }
```

## 3. Typical Hotspots

### Student List + Fee Filter Aggregations

**Endpoint:** `GET /api/v1/students` with fee status filters

**Why it's slow:**

- Joins students with fee_dues collection
- Applies fee status filters across months
- Paginated but aggregation scans all matching docs first

**Mitigation:**

- Ensure compound index on `fee_dues` for `{ academyId, month, status }`
- Limit the date range for fee filters
- Use the `StudentQueryRepository` which optimizes the aggregation pipeline

### Attendance Daily View

**Endpoint:** `GET /api/v1/attendance/students`

**Why it's slow:**

- Loads all students for an academy
- Cross-references with attendance records for the requested date
- Cross-references with holidays

**Mitigation:**

- Ensure index on `student_attendances` for `{ academyId, date }`
- Ensure index on `holidays` for `{ academyId, date }`
- Paginate if student count is high (> 100)

### Dues Engine Cron

**Process:** Monthly fee due generation

**Why it's slow:**

- Iterates all active students across all academies
- Creates fee_due records for each student
- Runs as a background process

**Mitigation:**

- Process academies in batches
- Use bulk insert operations
- Schedule during low-traffic hours (e.g., 2 AM IST)

### Admin Academies List Aggregation

**Endpoint:** `GET /api/v1/admin/academies`

**Why it's slow:**

- Aggregates data across academies, subscriptions, students, fees
- Applies search/filter/pagination

**Mitigation:**

- Ensure indexes on commonly filtered fields (`status`, `tierKey`)
- Limit search to indexed text fields
- Cache results if query patterns are repetitive

## 4. Mitigation Steps

### Adding an Index

1. **Justify the index** — show the slow query and explain which queries benefit
2. **Test in staging first:**

   ```javascript
   db.collection.createIndex({ field1: 1, field2: 1 }, { background: true });
   ```

3. **Measure improvement:**

   ```javascript
   db.collection.find({ field1: 'value' }).explain('executionStats');
   ```

4. **Apply to production** during low-traffic window
5. **Monitor** for any write performance impact (indexes slow writes)

### Reducing Payload

- Use projection to return only needed fields
- Avoid returning large nested arrays in list endpoints
- Paginate all list responses (default pageSize: 20, max: 100)

### Tightening Pagination

- Enforce maximum `pageSize` in DTO validation
- Use cursor-based pagination for large collections if offset pagination becomes slow
- Return `totalItems` and `totalPages` in meta to help clients paginate efficiently

## 5. Performance Monitoring Checklist

| Check                                | Frequency                 | Tool                          |
| ------------------------------------ | ------------------------- | ----------------------------- |
| Slow query log review                | Weekly                    | MongoDB profiler / Atlas      |
| Index coverage for new queries       | Every PR with new queries | Code review                   |
| API response times (p50, p95, p99)   | Daily                     | Metrics endpoint / monitoring |
| Database connection pool utilization | Daily                     | Atlas / MongoDB stats         |
| Memory usage of API containers       | Daily                     | `docker stats`                |
| Disk usage on backup volumes         | Weekly                    | `df -h`                       |

## 6. Emergency: Performance Degradation in Production

1. **Check health endpoints:**

   ```bash
   curl -s https://academyflo.com/api/v1/health/readiness | jq .
   ```

2. **Check container resource usage:**

   ```bash
   docker stats --no-stream
   ```

3. **Check MongoDB connection count:**

   ```javascript
   db.serverStatus().connections;
   ```

4. **Check for long-running operations:**

   ```javascript
   db.currentOp({ secs_running: { $gt: 5 } });
   ```

5. **If a specific query is causing issues, kill it:**

   ```javascript
   db.killOp(opId);
   ```

6. **If the API is overwhelmed**, scale horizontally by adding more API containers or reduce rate limits temporarily
