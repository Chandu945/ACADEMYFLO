import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { apiGet } from '@/infra/http/api-client';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { toErrorResponse } from '@/infra/http/error-mapper';
import { serverEnv } from '@/infra/env';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const result = await apiGet(`/api/v1/events/${encodeURIComponent(id)}/gallery`, { accessToken });
  if (!result.ok) return toErrorResponse(result.error);
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let incomingForm: FormData;
  try {
    incomingForm = await request.formData();
  } catch {
    return NextResponse.json({ message: 'Invalid form data' }, { status: 400 });
  }

  const file = incomingForm.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ message: 'File is required' }, { status: 400 });
  }

  const outgoingForm = new FormData();
  outgoingForm.append('file', file);

  const caption = incomingForm.get('caption');
  if (caption && typeof caption === 'string') {
    outgoingForm.append('caption', caption);
  }

  const { API_BASE_URL } = serverEnv();
  const url = `${API_BASE_URL}/api/v1/events/${encodeURIComponent(id)}/gallery`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: outgoingForm,
    });
  } catch {
    return NextResponse.json({ message: 'Network error' }, { status: 502 });
  }

  let json: Record<string, unknown>;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    if (!res.ok) return NextResponse.json({ message: 'Upload failed' }, { status: res.status });
    return NextResponse.json({});
  }

  if (!res.ok) {
    return NextResponse.json(
      { message: (json['message'] as string) || 'Upload failed' },
      { status: res.status },
    );
  }

  const data = json['data'] ?? json;
  return NextResponse.json(data, { status: 201 });
}
