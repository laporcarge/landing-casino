// /api/meta-capi.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const {
      event_name = "Contact",
      event_source_url = "",
      event_id,
      fbp,
      fbc,
      value = 0,
      currency = "ARS",
      test_event_code: bodyTestCode,
    } = req.body || {};

    const PIXEL_ID = process.env.META_PIXEL_ID;
    const ACCESS_TOKEN = process.env.META_CAPI_TOKEN;

    // test_event_code puede venir por query, body o env
    const TEST_EVENT_CODE =
      (req.query && req.query.test_event_code) ||
      bodyTestCode ||
      process.env.TEST_EVENT_CODE ||
      "";

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      return res.status(500).json({ error: "Missing META env vars" });
    }

    const client_ip_address =
      (req.headers["x-forwarded-for"] || "").split(",")[0]?.trim() ||
      req.socket?.remoteAddress || "";
    const client_user_agent = req.headers["user-agent"] || "";

    const eid =
      event_id || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const payload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url,
          event_id: eid,
          user_data: {
            client_ip_address,
            client_user_agent,
            fbp: fbp || undefined,
            fbc: fbc || undefined,
          },
          custom_data: { value, currency },
        },
      ],
    };

    // Construye la URL a Graph con test_event_code si está presente
    let url = `https://graph.facebook.com/v18.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    if (TEST_EVENT_CODE) {
      url += `&test_event_code=${encodeURIComponent(TEST_EVENT_CODE)}`;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();

    if (!resp.ok) {
      return res.status(400).json({ error: "Meta CAPI error", meta: json });
    }
    return res.status(200).json({ ok: true, event_id: eid, meta: json });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
