import { authFetch } from '../auth/session';


async function readJson(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(data?.detail || data?.message || `请求失败 (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function lifeRequest(path, options = {}) {
  const response = await authFetch(`/api/life${path}`, options);
  return readJson(response);
}

export async function loadLifeDashboard({ signal } = {}) {
  const summary = await lifeRequest('/offline-summary', { signal });
  const [status, eventPage, arcPage, relationshipPage, choicePage, intentionPage] = await Promise.all([
    lifeRequest('/status', { signal }),
    lifeRequest('/events?limit=40', { signal }),
    lifeRequest('/arcs?status=active&limit=3', { signal }),
    lifeRequest('/relationships?limit=6', { signal }),
    lifeRequest('/choices?status=pending&limit=1', { signal }),
    lifeRequest('/intentions?limit=3', { signal }),
  ]);
  return {
    profile: status.profile,
    state: status.state,
    summary,
    events: eventPage.items || [],
    arcs: arcPage.items || [],
    relationships: relationshipPage.items || [],
    choices: choicePage.items || [],
    intentions: intentionPage.items || [],
  };
}

export async function resolveLifeChoice(choiceId, optionId, { signal } = {}) {
  return lifeRequest(`/choices/${encodeURIComponent(choiceId)}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ option_id: optionId }),
    signal,
  });
}

export async function updateLifeSettings(settings, { signal } = {}) {
  return lifeRequest('/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
    signal,
  });
}

export async function submitProactiveFeedback(deliveryId, reaction, { signal } = {}) {
  return lifeRequest('/proactive-feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delivery_id: deliveryId, reaction }),
    signal,
  });
}

export async function loadProactiveStatus({ signal } = {}) {
  return lifeRequest('/proactive-status', { signal });
}

export async function loadNpcActors({ signal } = {}) {
  const page = await lifeRequest('/actors?role=friend', { signal });
  return page.items || [];
}

export async function loadNpcActorDebug(actorId, { signal } = {}) {
  const id = encodeURIComponent(actorId);
  const [life, events, interactions, relationships, intentions, suggestions] = await Promise.all([
    lifeRequest(`/actors/${id}/life`, { signal }),
    lifeRequest(`/actors/${id}/events?limit=50`, { signal }),
    lifeRequest(`/actors/${id}/interactions?limit=50`, { signal }),
    lifeRequest(`/actors/${id}/relationships?limit=30`, { signal }),
    lifeRequest(`/actors/${id}/intentions?limit=30`, { signal }),
    lifeRequest(`/actors/${id}/suggestions?limit=30`, { signal }),
  ]);
  return {
    ...life,
    events: events.items || [],
    interactions: interactions.items || [],
    relationships: relationships.items || [],
    intentions: intentions.items || life.intentions || [],
    suggestions: suggestions.items || [],
  };
}

export async function loadLifeAcceptanceStatus({ signal } = {}) {
  try {
    return await lifeRequest('/acceptance/status', { signal });
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function resetLifeAcceptance({ seed, scenario }, { signal } = {}) {
  return lifeRequest('/acceptance/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seed, scenario }),
    signal,
  });
}

export async function advanceLifeAcceptance(hours, { signal } = {}) {
  return lifeRequest('/acceptance/advance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours }),
    signal,
  });
}

export async function releaseLifeAcceptance({ signal } = {}) {
  return lifeRequest('/acceptance/release', { method: 'POST', signal });
}

export async function evaluateLifeQuality(seeds, days, { signal } = {}) {
  return lifeRequest('/acceptance/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seeds, days }),
    signal,
  });
}

export async function auditLifeContent(limits = {}, { signal } = {}) {
  return lifeRequest('/acceptance/content-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      post_limit: limits.postLimit || 50,
      diary_limit: limits.diaryLimit || 30,
      chat_limit: limits.chatLimit || 100,
    }),
    signal,
  });
}

export async function evaluateContentSafety({ signal } = {}) {
  return lifeRequest('/acceptance/safety-evaluate', {
    method: 'POST',
    signal,
  });
}
