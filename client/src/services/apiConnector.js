/**
 * Generic API connector using native fetch.
 * All requests include credentials (cookies) for httpOnly JWT support.
 */
export const apiConnector = async (method, url, bodyData = null, headers = null, params = null) => {
  let finalUrl = url;

  if (params) {
    const queryString = new URLSearchParams(params).toString();
    finalUrl = `${finalUrl}?${queryString}`;
  }

  const config = {
    method: method.toUpperCase(),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // Attach Authorization header from localStorage if available
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  // Attach body for non-GET requests
  if (bodyData && config.method !== "GET") {
    config.body = typeof bodyData === "object" ? JSON.stringify(bodyData) : bodyData;
  }

  const response = await fetch(finalUrl, config);

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw {
      status: response.status,
      statusText: response.statusText,
      data: data,
    };
  }

  return data;
};
