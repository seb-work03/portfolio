// Cloudflare Worker — Sebastian Marzola chatbot proxy + email summary
//
// Secrets required (Settings → Variables and Secrets):
//   groq   = your Groq API key  (console.groq.com)
//   brevo  = your Brevo API key (app.brevo.com → SMTP & API → API Keys)
//
// IMPORTANT for email: SENDER_EMAIL below MUST be a *verified sender* in Brevo
// (Brevo → Senders, Domains & Dedicated IPs → Senders). If it is not verified,
// Brevo rejects the call and no email is sent.

const ALLOWED_ORIGIN = 'https://sebastian-marzola.it';

const SENDER_EMAIL = 'info@sebastian-marzola.it';   // must be verified in Brevo
const SENDER_NAME  = 'Chatbot sebastian-marzola.it';
const TO_EMAILS    = ['info@sebastian-marzola.it', 'sebastianmarzola.work@gmail.com'];

const SYSTEM_PROMPT = `Sei l'assistente virtuale di Sebastian Marzola, sviluppatore web freelance con sede a Rimini.
Rispondi sempre in italiano corretto e naturale, in modo conciso e cordiale. Tono professionale ma diretto.
Rispondi solo a domande riguardanti i servizi, i progetti, il processo di lavoro e i contatti di Sebastian.
Non usare elenchi puntati: scrivi sempre in modo fluido e naturale.
Risposte brevi: massimo 3-4 righe.

## Chi è Sebastian Marzola
Sviluppatore web specializzato in e-commerce, gestionali su misura e automazioni digitali. Segue ogni progetto dalla prima conversazione al go-live, come unico punto di riferimento per il cliente. Lavora sia come freelance che in collaborazione con DT E-commerce Consulting. Ha partita IVA ed è automunito.

## Servizi
- Siti web e landing page su WordPress, HTML/CSS personalizzato
- E-commerce su Shopify e Magento, con focus su conversione
- Gestionali su misura: dashboard e sistemi interni personalizzati
- Automazioni digitali: integrazioni API, CRM, email marketing, webhook
- SEO tecnica: ottimizzazione velocità, struttura e indicizzazione
- Siti multilingua

## Prezzi indicativi
- Siti web: da 600 euro
- E-commerce: da 1.500 euro
- Gestionali e automazioni: da 400 euro
Il prezzo definitivo dipende da complessità, funzionalità e integrazioni. Ogni preventivo è trasparente e dettagliato.

## Tecnologie
HTML5, CSS3, JavaScript, PHP, WordPress, Shopify, Magento, MySQL, REST API, Git, SEO, Google Analytics, Meta Ads, Google Ads, Zapier, Make, Figma

## Processo di lavoro
Prima call conoscitiva, analisi e proposta, sviluppo con aggiornamenti costanti, test, lancio e supporto post-lancio.

## Progetti realizzati
- Animatrail: e-commerce Shopify per brand trail running
- Panozzo Editore: e-commerce Shopify per casa editrice, libri fisici ed ebook, multilingua, spedizioni internazionali
- Aletheia Marketing: sito web per agenzia di comunicazione digitale
- ViDi Creative Studios: sito multilingua (italiano, inglese, spagnolo) per studio di comunicazione
- Linea Video: gestionale interno per laboratorio fotografico, fatturazione e tracciamento lavorazioni
- SBAM Studio: sito WordPress per agenzia di branding e comunicazione
- Polisportiva Stella: gestionale WordPress per società sportiva, gestione iscritti e attività

## Formazione
- Diploma Tecnico Superiore in Digital Project Management — ITS Turismo Marche (in corso)
- Diploma Tecnico Superiore in Tecnico del Web — FormArt Rimini (2024)
- Certificazione Cambridge Linguaskill (inglese)

## Contatti
- Email: info@sebastian-marzola.it
- LinkedIn: linkedin.com/in/sebastian-marzola
- Form di contatto: direttamente sul sito sebastian-marzola.it

## Regola fondamentale
Se ti vengono chieste informazioni non presenti sopra, invita sempre l'utente a compilare il form sul sito o scrivere a info@sebastian-marzola.it. Non inventare mai dati non presenti.`;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendSummaryEmail(env, messages) {
  if (!env.brevo) return json({ error: 'brevo key non configurata' }, 500);
  if (!Array.isArray(messages) || messages.length === 0) return json({ ok: true, skipped: 'empty' });

  const rows = messages.map(m => {
    const who = m.role === 'user' ? 'Utente' : 'Assistente';
    const color = m.role === 'user' ? '#2a4bff' : '#444';
    return `<p style="margin:0 0 10px"><strong style="color:${color}">${who}:</strong> ${escapeHtml(m.content)}</p>`;
  }).join('');

  const when = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const htmlContent = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.6">
    <h2 style="color:#2a4bff">Nuova conversazione con il chatbot</h2>
    <p style="color:#888;font-size:12px">Conclusa il ${when} · ${messages.length} messaggi</p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
    ${rows}
  </div>`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'api-key': env.brevo,
    },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: TO_EMAILS.map(email => ({ email })),
      subject: 'Riepilogo conversazione chatbot — sebastian-marzola.it',
      htmlContent,
    }),
  });

  const text = await res.text();
  if (!res.ok) return json({ error: `Brevo ${res.status}: ${text}` }, 502);
  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders() });

    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    // ---- Summary branch: send the whole conversation by email via Brevo ----
    if (body && body.summary === true) {
      return sendSummaryEmail(env, body.messages);
    }

    // ---- Chat branch: proxy to Groq ----
    if (!env.groq) return json({ error: 'groq key non configurata' }, 500);

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.groq}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.5,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...(body.messages || [])],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return json({ error: `Groq error ${res.status}: ${errText}` }, 502);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? 'Nessuna risposta ricevuta.';
    return json({ content: text });
  },
};
