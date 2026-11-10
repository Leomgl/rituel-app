/* RITUEL push endpoint, public (never put secrets here).
   Set this after deploying push-worker in Cloudflare Workers.
   Example: window.RITUEL_PUSH_API = 'https://rituel-push.your-subdomain.workers.dev'; */
window.RITUEL_PUSH_API = location.origin==='https://rituel-web.q9pfwtztsc.workers.dev' ? location.origin : 'https://rituel-app.q9pfwtztsc.workers.dev';
