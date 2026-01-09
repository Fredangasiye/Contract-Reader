// Import the Express server
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Since we're using Node.js code (Express), we need to use the npm: specifier
// But Supabase Edge Functions run on Deno, so we'll need to adapt the approach

// For now, let's create a simple proxy that forwards requests to the Express backend
serve(async (req) => {
  const url = new URL(req.url)

  // Forward the request to your Express backend
  // You'll need to deploy the Express backend separately (e.g., on Render, Railway, or Vercel)
  // and set the BACKEND_URL environment variable

  const backendUrl = Deno.env.get("BACKEND_URL") || "http://localhost:8080"

  try {
    const response = await fetch(`${backendUrl}${url.pathname}${url.search}`, {
      method: req.method,
      headers: req.headers,
      body: req.body,
    })

    return response
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
