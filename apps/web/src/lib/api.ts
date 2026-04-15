const API = process.env.NEXT_PUBLIC_API_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string> | undefined),
    },
    ...options,
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data.error ?? data.message ?? message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export async function getAbtestList(game: string) {
  return apiFetch<{ rows: any[] }>(`/api/abtest-list?game=${encodeURIComponent(game)}`);
}

export async function getAbtestAnalysisList(game: string) {
  return apiFetch<{ rows: any[] }>(`/api/abtest-analysis-list?game=${encodeURIComponent(game)}`);
}

export async function postSlackAbtest(body: {
  testIds: string[];
  testName: string;
  startDate?: string;
  endDate?: string;
}) {
  return apiFetch<{ threads: any[] }>('/api/slack-abtest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getAbtestManual(key: string) {
  return apiFetch<{ announcement: any; analysisItems: any[]; outcome: any }>(
    `/api/abtest-manual?key=${encodeURIComponent(key)}`
  );
}

export async function postManualAnnouncement(body: { key: string; slackUrl: string; testIds: any[] }) {
  return apiFetch<any>('/api/abtest-manual/announcement', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteManualAnnouncement(body: { key: string }) {
  return apiFetch<any>('/api/abtest-manual/announcement', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

export async function postManualAnalysis(body: { key: string; slackUrl: string; testIds: any[] }) {
  return apiFetch<any>('/api/abtest-manual/analysis', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteManualAnalysis(body: { key: string; id: string }) {
  return apiFetch<any>('/api/abtest-manual/analysis', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

export async function postManualAnalysisReorder(body: { key: string; orderedIds: string[] }) {
  return apiFetch<any>('/api/abtest-manual/analysis-reorder', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function postManualOutcome(body: { key: string; slackUrl: string; testIds: any[] }) {
  return apiFetch<any>('/api/abtest-manual/outcome', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function deleteManualOutcome(body: { key: string }) {
  return apiFetch<any>('/api/abtest-manual/outcome', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

export async function deleteManualAll(body: { key: string }) {
  return apiFetch<any>('/api/abtest-manual/all', {
    method: 'DELETE',
    body: JSON.stringify(body),
  });
}

export async function postAbtestConclusion(primaryId: string, conclusion: string | null) {
  return apiFetch<any>('/api/abtest-conclusion', {
    method: 'POST',
    body: JSON.stringify({ primaryId, conclusion }),
  });
}

export async function getProductConfig(key: string) {
  return apiFetch<{ productTypes: string[] }>(
    `/api/abtest-product-config?key=${encodeURIComponent(key)}`
  );
}

export async function setProductConfig(key: string, productTypes: string[]) {
  return apiFetch<any>('/api/abtest-product-config', {
    method: 'POST',
    body: JSON.stringify({ key, productTypes }),
  });
}

export async function clearProductConfig(key: string) {
  return apiFetch<any>('/api/abtest-product-config', {
    method: 'DELETE',
    body: JSON.stringify({ key }),
  });
}

export async function runAbtestAnalysis(abTestId: string, gameCode: string) {
  return apiFetch<any>('/api/abtest-analysis/run', {
    method: 'POST',
    body: JSON.stringify({ abTestId, gameCode }),
  });
}

export async function deleteAnalysisCache(abTestId: string, gameCode: string) {
  return apiFetch<any>('/api/abtest-analysis/cache', {
    method: 'DELETE',
    body: JSON.stringify({ abTestId, gameCode }),
  });
}

export async function deleteAllAnalysisCache() {
  return apiFetch<any>('/api/abtest-analysis/cache/all', {
    method: 'DELETE',
  });
}
