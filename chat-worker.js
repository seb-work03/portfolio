// Cloudflare Worker — Sebastian Marzola Chatbot
// Deploy su: https://sebastian-chat.sebastianmarzola-work.workers.dev/
// Variabile ambiente richiesta: ANTHROPIC_API_KEY

const ALLOWED_ORIGIN = 'https://sebastian-marzola.it';

const SYSTEM_PROMPT = `Sei l'assistente virtuale di Sebastian Marzola, sviluppatore web freelance con sede a Rimini.
Rispondi sempre in italiano, in modo conciso e cordiale. Tono professionale ma diretto.
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
- Siti web: da €600
- E-commerce: da €1.500
- Gestionali e automazioni: da €400
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
- SBAM Studio: sito WordPress per agenzia di branding e comunicazione (con DT E-commerce Consulting)
- Polisportiva Stella: gestionale WordPress per società sportiva, gestione iscritti e attività (con DT E-commerce Consulting)

## Formazione
- Diploma Tecnico Superiore in Digital Project Management — ITS Turismo Marche (in corso)
- Diploma Tecnico Superiore in Tecnico del Web — FormArt Rimini (2024)
- Certificazione Cambridge Linguaskill (inglese)

## Contatti
- Email: info@sebastian-marzola.it
- LinkedIn: linkedin.com/in/sebastian-marzola
- Form di contatto: direttamente sul sito sebastian-marzola.it

## Regola fondamentale
Se ti vengono chieste informazioni non presenti sopra (preventivi precisi, disponibilità, domande personali), invita sempre l'utente a compilare il form sul sito o scrivere a info@sebastian-marzola.it. Non inventare mai dati non presenti.`;

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let messages;
    try {
      ({ messages } = await request.json());
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'API error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? '';

    return new Response(JSON.stringify({ content: text }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
