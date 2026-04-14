import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiPost } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const studentIds = body['studentIds'];
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ message: 'studentIds must be a non-empty array' }, { status: 400 });
  }

  const results = await Promise.allSettled(
    studentIds.map((studentId) =>
      apiPost(
        `/api/v1/batches/${encodeURIComponent(id)}/students/${encodeURIComponent(String(studentId))}`,
        {},
        { accessToken },
      ).then((result) => ({ studentId: String(studentId), result })),
    ),
  );

  const errors: string[] = [];
  const succeeded: string[] = [];

  for (const entry of results) {
    if (entry.status === 'fulfilled' && entry.value.result.ok) {
      succeeded.push(entry.value.studentId);
    } else {
      const sid = entry.status === 'fulfilled' ? entry.value.studentId : 'unknown';
      errors.push(`Failed to add student ${sid}`);
    }
  }

  if (succeeded.length === 0 && errors.length > 0) {
    return NextResponse.json({ message: 'Failed to add students', errors }, { status: 500 });
  }

  return NextResponse.json({ ok: true, added: succeeded.length, errors }, { status: 201 });
}
