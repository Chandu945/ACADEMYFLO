'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/application/auth/use-auth';

type EnquiryListItem = { id: string; prospectName: string; mobileNumber: string; source: string | null; status: string; nextFollowUpDate: string | null; createdAt: string };
type EnquiryDetail = EnquiryListItem & { guardianName: string | null; whatsappNumber: string | null; email: string | null; address: string | null; interestedIn: string | null; notes: string | null; closureReason: string | null; convertedStudentId: string | null; followUps: { id: string; date: string; notes: string; nextFollowUpDate: string | null; createdAt: string }[]; updatedAt: string };
type EnquirySummary = { total: number; active: number; closed: number; todayFollowUp: number };

export function useEnquiries(filters: Record<string, string | undefined> = {}) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EnquiryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const cancelRef = useRef(0);

  const filtersKey = JSON.stringify(filters);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    const id = ++cancelRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const currentFilters = JSON.parse(filtersKey) as Record<string, string | undefined>;
      Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await fetch(`/api/enquiries?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (id !== cancelRef.current) return;
      if (res.ok) { const json = await res.json(); setData(json.data ?? json.items ?? []); }
    } finally { if (id === cancelRef.current) setLoading(false); }
  }, [accessToken, filtersKey]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useEnquirySummary() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EnquirySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/enquiries?type=summary', { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) setData(await res.json());
    } finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export function useEnquiryDetail(id: string | null) {
  const { accessToken } = useAuth();
  const [data, setData] = useState<EnquiryDetail | null>(null);
  const [loading, setLoading] = useState(!!id);
  const cancelRef = useRef(0);

  useEffect(() => { setData(null); }, [id]);

  const fetch_ = useCallback(async () => {
    if (!id || !accessToken) return;
    const reqId = ++cancelRef.current;
    setLoading(true);
    try {
      const res = await fetch(`/api/enquiries/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (reqId !== cancelRef.current) return;
      if (res.ok) setData(await res.json());
    } finally { if (reqId === cancelRef.current) setLoading(false); }
  }, [accessToken, id]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, refetch: fetch_ };
}

export async function createEnquiry(body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function updateEnquiry(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/enquiries/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function addFollowUp(enquiryId: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/enquiries/${enquiryId}/follow-ups`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}

export async function closeEnquiry(id: string, reason: string, accessToken?: string | null) {
  const res = await fetch(`/api/enquiries/${id}/close`, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ closureReason: reason }) });
  if (!res.ok) { const json = await res.json(); return { ok: false as const, error: json.message }; }
  return { ok: true as const };
}

export async function convertEnquiry(id: string, body: Record<string, unknown>, accessToken?: string | null) {
  const res = await fetch(`/api/enquiries/${id}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify(body) });
  const json = await res.json();
  return res.ok ? { ok: true as const, data: json } : { ok: false as const, error: json.message };
}
