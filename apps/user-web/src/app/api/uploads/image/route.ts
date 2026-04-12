import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveAccessToken } from '@/infra/auth/bff-auth';
import { isOriginValid } from '@/infra/auth/csrf';
import { serverEnv } from '@/infra/env';

export async function POST(request: NextRequest) {
  if (!isOriginValid(request)) return NextResponse.json({ message: 'Invalid origin' }, { status: 403 });
  const accessToken = await resolveAccessToken(request);
  if (!accessToken) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

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

  const { API_BASE_URL } = serverEnv();
  const url = `${API_BASE_URL}/api/v1/profile/photo`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: outgoingForm,
    });
  } catch {
    return NextResponse.json({ message: 'Upload failed. Please try again.' }, { status: 502 });
  }

  const data = await res.json().catch(() => null);
  return NextResponse.json(data ?? { message: 'Upload failed' }, { status: res.status });
}
