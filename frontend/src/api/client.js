const API_BASE = "/api";

async function request(path) {
  const response = await fetch(`${API_BASE}${path}`);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch {
      // response body wasn't JSON — keep default message
    }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function fetchProperties(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, value);
    }
  });
  const qs = query.toString();
  return request(`/properties${qs ? `?${qs}` : ""}`);
}

export function fetchPropertyDetail(id) {
  return request(`/properties/${encodeURIComponent(id)}`);
}

export function fetchPropertyOpenHouses(id) {
  return request(`/properties/${encodeURIComponent(id)}/openhouses`);
}
