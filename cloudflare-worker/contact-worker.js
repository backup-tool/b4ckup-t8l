// Cloudflare Worker for B4cKuP T8L Contact Form
// Deploy this as a Worker on Cloudflare Dashboard

const TURNSTILE_SECRET = "0x4AAAAAAC8nIteyqY5ooQnQKlkbtgQUFtU";
const TO_EMAIL = "contact@backup-tool.app";

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://backup-tool.app",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const { name, email, message, token } = await request.json();

      // Validate Turnstile token
      const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${TURNSTILE_SECRET}&response=${token}`,
      });
      const turnstileData = await turnstileRes.json();

      if (!turnstileData.success) {
        return new Response(JSON.stringify({ error: "Captcha failed" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send email via MailChannels (free for Cloudflare Workers)
      const emailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: TO_EMAIL }] }],
          from: { email: "noreply@backup-tool.app", name: "B4cKuP T8L Contact Form" },
          reply_to: { email: email, name: name },
          subject: `Contact Form: ${name}`,
          content: [
            {
              type: "text/plain",
              value: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
            },
          ],
        }),
      });

      if (emailRes.status === 202 || emailRes.ok) {
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Email failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
