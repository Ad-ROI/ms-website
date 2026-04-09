'use strict';
const https = require('https');
const http = require('http');
const url = require('url');
const querystring = require('querystring');

const WP_BASE = 'lz3eqxov2f.wpdns.site';
const USERNAME = 'DavidMoceri';
const PASSWORD = 'MStr!2026#WPadmin$X9k';

// ── helpers ──────────────────────────────────────────────────────────────────

function request(options, body) {
  return new Promise((resolve, reject) => {
    const mod = options.protocol === 'http:' ? http : https;
    const req = mod.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function parseCookies(setCookieHeaders) {
  const jar = {};
  if (!setCookieHeaders) return jar;
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  arr.forEach(h => {
    const part = h.split(';')[0].trim();
    const eq = part.indexOf('=');
    if (eq > 0) jar[part.slice(0, eq)] = part.slice(eq + 1);
  });
  return jar;
}

function cookieString(jar) {
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function followRedirects(options, body, cookieJar, maxRedirects = 10) {
  let opts = { ...options };
  let b = body;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await request(opts, b);
    const newCookies = parseCookies(res.headers['set-cookie']);
    Object.assign(cookieJar, newCookies);
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      const loc = res.headers.location;
      const parsed = url.parse(loc.startsWith('/') ? `https://${opts.hostname}${loc}` : loc);
      opts = {
        hostname: parsed.hostname || opts.hostname,
        path: parsed.path,
        method: res.status === 307 || res.status === 308 ? opts.method : 'GET',
        headers: {
          'Cookie': cookieString(cookieJar),
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        protocol: parsed.protocol || 'https:',
      };
      b = (res.status === 307 || res.status === 308) ? b : null;
    } else {
      return res;
    }
  }
  throw new Error('Too many redirects');
}

// ── login ────────────────────────────────────────────────────────────────────

async function login() {
  const cookieJar = { wordpress_test_cookie: 'WP+Cookie+check' };
  const postBody = querystring.stringify({
    log: USERNAME,
    pwd: PASSWORD,
    'wp-submit': 'Log In',
    redirect_to: '/wp-admin/',
    testcookie: '1',
  });

  const res = await followRedirects({
    hostname: WP_BASE,
    path: '/wp-login.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody),
      'Cookie': cookieString(cookieJar),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    protocol: 'https:',
  }, postBody, cookieJar);

  // Check we have WP auth cookies
  const hasAuth = Object.keys(cookieJar).some(k => k.startsWith('wordpress_logged_in'));
  if (!hasAuth) {
    console.log('Cookie jar:', Object.keys(cookieJar));
    console.log('Response status:', res.status);
    console.log('Body snippet:', res.body.slice(0, 500));
    throw new Error('Login failed — no wordpress_logged_in cookie found');
  }
  console.log('Login successful. Cookies:', Object.keys(cookieJar).join(', '));
  return cookieJar;
}

// ── get nonce ────────────────────────────────────────────────────────────────

async function getNonce(cookieJar) {
  // Try admin-ajax action=rest-nonce
  const res = await request({
    hostname: WP_BASE,
    path: '/wp-admin/admin-ajax.php?action=rest-nonce',
    method: 'GET',
    headers: {
      'Cookie': cookieString(cookieJar),
      'User-Agent': 'Mozilla/5.0',
    },
    protocol: 'https:',
  });

  if (res.status === 200 && res.body && res.body.length < 100 && !res.body.includes('<')) {
    console.log('Nonce via admin-ajax:', res.body.trim());
    return res.body.trim();
  }

  // Fallback: scrape from admin page
  console.log('Scraping nonce from admin page...');
  const adminRes = await request({
    hostname: WP_BASE,
    path: '/wp-admin/',
    method: 'GET',
    headers: {
      'Cookie': cookieString(cookieJar),
      'User-Agent': 'Mozilla/5.0',
    },
    protocol: 'https:',
  });

  const match = adminRes.body.match(/"nonce":"([^"]+)"/);
  const match2 = adminRes.body.match(/wpApiSettings.*?"nonce":"([^"]+)"/);
  const match3 = adminRes.body.match(/rest_nonce['"]\s*:\s*['"]([^'"]+)['"]/);
  const nonce = (match2 && match2[1]) || (match3 && match3[1]) || (match && match[1]);

  if (!nonce) {
    // Try getting it from a known WP REST endpoint
    console.log('Trying /wp-json/ for nonce...');
    const jsonRes = await request({
      hostname: WP_BASE,
      path: '/wp-json/',
      method: 'GET',
      headers: {
        'Cookie': cookieString(cookieJar),
        'User-Agent': 'Mozilla/5.0',
      },
      protocol: 'https:',
    });
    // Use basic auth approach instead
    return null;
  }

  console.log('Nonce scraped:', nonce);
  return nonce;
}

// ── create page ──────────────────────────────────────────────────────────────

async function createPage(cookieJar, nonce, pageData) {
  const bodyStr = JSON.stringify(pageData);
  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(bodyStr),
    'Cookie': cookieString(cookieJar),
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'application/json',
  };

  if (nonce) {
    headers['X-WP-Nonce'] = nonce;
  } else {
    // Use Basic auth as fallback
    const creds = Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64');
    headers['Authorization'] = `Basic ${creds}`;
  }

  const res = await request({
    hostname: WP_BASE,
    path: '/wp-json/wp/v2/pages',
    method: 'POST',
    headers,
    protocol: 'https:',
  }, bodyStr);

  if (res.status === 201) {
    const page = JSON.parse(res.body);
    return { success: true, id: page.id, link: page.link, slug: page.slug };
  } else {
    let errMsg = res.body;
    try { errMsg = JSON.parse(res.body).message || res.body; } catch(e) {}
    return { success: false, status: res.status, error: errMsg };
  }
}

// ── PAGE CONTENT ─────────────────────────────────────────────────────────────

const BRAND_STYLE = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
  :root {
    --navy: #0E1C43;
    --teal: #0785B7;
    --red: #FF000A;
    --white: #ffffff;
    --light: #f4f7fb;
  }
  .ms-page * { box-sizing: border-box; margin: 0; padding: 0; }
  .ms-page { font-family: 'DM Sans', sans-serif; color: #1a1a2e; background: #fff; }
  .ms-page h1, .ms-page h2, .ms-page h3, .ms-page h4 { font-family: 'Poppins', sans-serif; }
  .ms-hero {
    background: linear-gradient(135deg, var(--navy) 0%, #1a2f6e 100%);
    color: white;
    padding: 100px 40px 80px;
    text-align: center;
  }
  .ms-hero h1 { font-size: clamp(2rem, 5vw, 3.5rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
  .ms-hero p { font-size: 1.25rem; opacity: 0.85; max-width: 700px; margin: 0 auto 35px; }
  .ms-hero .teal { color: var(--teal); }
  .ms-hero .red { color: var(--red); }
  .ms-section { padding: 80px 40px; max-width: 1200px; margin: 0 auto; }
  .ms-section h2 { font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 700; color: var(--navy); margin-bottom: 16px; }
  .ms-section .sub { font-size: 1.1rem; color: #555; margin-bottom: 60px; max-width: 700px; }
  .ms-btn {
    display: inline-block;
    background: var(--teal);
    color: white;
    padding: 16px 36px;
    border-radius: 50px;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 1.05rem;
    text-decoration: none;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
  }
  .ms-btn:hover { background: #0669a0; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(7,133,183,0.35); }
  .ms-btn-outline {
    display: inline-block;
    border: 2px solid white;
    color: white;
    padding: 14px 34px;
    border-radius: 50px;
    font-family: 'Poppins', sans-serif;
    font-weight: 600;
    font-size: 1.05rem;
    text-decoration: none;
    margin-left: 16px;
  }
  .ms-grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 28px; }
  .ms-grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; }
  .ms-grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 40px; }
  .ms-card {
    background: white;
    border-radius: 16px;
    padding: 36px 30px;
    box-shadow: 0 4px 24px rgba(14,28,67,0.08);
    border: 1px solid #e8eef7;
    transition: all 0.2s;
  }
  .ms-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(14,28,67,0.14); }
  .ms-card .icon { font-size: 2.2rem; margin-bottom: 16px; }
  .ms-card h3 { font-size: 1.2rem; font-weight: 700; color: var(--navy); margin-bottom: 10px; }
  .ms-card p { color: #555; line-height: 1.65; font-size: 0.95rem; }
  .ms-bg-light { background: var(--light); }
  .ms-bg-navy { background: var(--navy); color: white; }
  .ms-bg-navy .ms-section h2 { color: white; }
  .ms-bg-navy .ms-section .sub { color: rgba(255,255,255,0.75); }
  .ms-tag {
    display: inline-block;
    background: rgba(7,133,183,0.12);
    color: var(--teal);
    padding: 4px 14px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .ms-divider { width: 60px; height: 4px; background: var(--teal); border-radius: 2px; margin: 16px 0 32px; }
  .ms-cta-block {
    background: linear-gradient(135deg, var(--navy) 0%, #1a2f6e 100%);
    color: white;
    text-align: center;
    padding: 80px 40px;
  }
  .ms-cta-block h2 { font-family: 'Poppins', sans-serif; font-size: clamp(1.8rem, 3.5vw, 2.8rem); font-weight: 800; margin-bottom: 16px; }
  .ms-cta-block p { font-size: 1.15rem; opacity: 0.85; margin-bottom: 36px; }
  @media (max-width: 768px) {
    .ms-hero { padding: 70px 24px 60px; }
    .ms-section { padding: 60px 24px; }
    .ms-grid-2 { grid-template-columns: 1fr; }
    .ms-btn-outline { margin-left: 0; margin-top: 12px; display: block; text-align: center; }
  }
</style>
`;

// ── PAGE 1: HOW IT WORKS ──────────────────────────────────────────────────────
const howItWorksContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">The MISTR Method</div>
    <h1>How <span class="teal">MIndSTReam.ing</span> Works</h1>
    <p>Say it once. It gets done. It never gets forgotten. This is how your business runs itself.</p>
    <a href="/contact" class="ms-btn">Get Started</a>
    <a href="/features" class="ms-btn-outline">See All Features</a>
  </div>

  <!-- 4 Steps -->
  <div class="ms-section" style="text-align:center;">
    <div class="ms-tag">4 Simple Steps</div>
    <h2>From Your Words to Executed Results</h2>
    <div class="ms-divider" style="margin:16px auto 48px;"></div>
    <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap:32px; margin-top:20px;">

      <div style="position:relative;">
        <div style="width:64px;height:64px;background:var(--teal);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-family:'Poppins',sans-serif;font-size:1.6rem;font-weight:800;color:white;">1</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:1.25rem;font-weight:700;color:var(--navy);margin-bottom:12px;">Talk to MISTR</h3>
        <p style="color:#555;line-height:1.65;">Tell MISTR what you need — by voice, text, or Slack. No special commands, no forms. Just talk like you would to a brilliant executive assistant who never sleeps.</p>
      </div>

      <div>
        <div style="width:64px;height:64px;background:var(--navy);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-family:'Poppins',sans-serif;font-size:1.6rem;font-weight:800;color:white;">2</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:1.25rem;font-weight:700;color:var(--navy);margin-bottom:12px;">MISTR Creates & Assigns</h3>
        <p style="color:#555;line-height:1.65;">MISTR instantly breaks your request into tasks, assigns them to the right agent or team member, sets priorities, deadlines, and reminders — automatically, with no input from you.</p>
      </div>

      <div>
        <div style="width:64px;height:64px;background:var(--teal);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-family:'Poppins',sans-serif;font-size:1.6rem;font-weight:800;color:white;">3</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:1.25rem;font-weight:700;color:var(--navy);margin-bottom:12px;">PAM Executes</h3>
        <p style="color:#555;line-height:1.65;">The PAM engine runs 24/7 on the cloud. It executes tasks — sending emails, updating CRM records, monitoring campaigns, pulling reports — without you lifting a finger.</p>
      </div>

      <div>
        <div style="width:64px;height:64px;background:var(--navy);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-family:'Poppins',sans-serif;font-size:1.6rem;font-weight:800;color:white;">4</div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:1.25rem;font-weight:700;color:var(--navy);margin-bottom:12px;">Results Reported Back</h3>
        <p style="color:#555;line-height:1.65;">MISTR reports results back to you — what got done, what needs attention, what happened while you were off. Nothing falls through the cracks. Nothing is forgotten. Ever.</p>
      </div>

    </div>
  </div>

  <!-- 4 Interaction Modes -->
  <div class="ms-bg-light">
    <div class="ms-section">
      <div class="ms-tag">Interact Your Way</div>
      <h2>4 Ways to Talk to MISTR</h2>
      <p class="sub">Every interaction mode is built for a different moment in your day. Pick the one that fits — or use all four.</p>
      <div class="ms-grid-4">

        <div class="ms-card">
          <div class="icon">🎙️</div>
          <h3>Voice</h3>
          <p>Hands-free. Talk to MISTR like you'd talk to a chief of staff. Drive, walk, cook — MISTR is always listening and always executing. Powered by Vapi + a custom AI brain.</p>
        </div>

        <div class="ms-card">
          <div class="icon">💬</div>
          <h3>Slack</h3>
          <p>Your team is already in Slack. MISTR lives there too. Send a message in any channel or DM and MISTR handles the rest — silently running in the background without cluttering your workflow.</p>
        </div>

        <div class="ms-card">
          <div class="icon">📱</div>
          <h3>SMS & Text</h3>
          <p>MISTR has your business phone number. Text it from anywhere. Got a client issue at 2am? Text MISTR and it starts working immediately. No app, no login, no friction.</p>
        </div>

        <div class="ms-card">
          <div class="icon">⚡</div>
          <h3>Autopilot</h3>
          <p>Set rules, triggers, and recurring tasks once. MISTR runs them forever without being asked. Lead comes in — MISTR follows up. Report due Friday — MISTR sends it Thursday night.</p>
        </div>

      </div>
    </div>
  </div>

  <!-- Under the Hood -->
  <div class="ms-section">
    <div class="ms-tag">Under the Hood</div>
    <h2>What Powers the System</h2>
    <div class="ms-divider"></div>
    <div class="ms-grid-3">
      <div class="ms-card">
        <h3>MISTR AI Brain</h3>
        <p>Claude + GPT models working in concert. MISTR is trained on your business — your processes, your team, your clients, your language. It knows context. It remembers everything you've said.</p>
      </div>
      <div class="ms-card">
        <h3>PAM Execution Engine</h3>
        <p>PAM runs 24/7 on Google Cloud. It is the muscle behind MISTR — executing tasks through 70+ integrations, never sleeping, never dropping a ball, never asking for a raise.</p>
      </div>
      <div class="ms-card">
        <h3>Living Knowledge Base</h3>
        <p>Everything David and your team knows gets ingested into MISTR's knowledge base. SOPs, client profiles, pricing, playbooks — MISTR reads it all and applies it automatically.</p>
      </div>
    </div>
  </div>

  <div class="ms-cta-block">
    <h2>Ready to See It Live?</h2>
    <p>Book a 20-minute demo and watch MISTR take a real task from your business and execute it in real time.</p>
    <a href="/contact" class="ms-btn">Book Your Demo</a>
  </div>
</div>
`;

// ── PAGE 2: FEATURES ──────────────────────────────────────────────────────────
const featuresContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">Full Feature Set</div>
    <h1>Everything Your Business Needs.<br><span class="teal">In One AI System.</span></h1>
    <p>MISTR is not a chatbot. It's a full AI operating system — 16 capabilities working together so your business runs itself.</p>
    <a href="/contact" class="ms-btn">Get a Demo</a>
  </div>

  <div class="ms-section">
    <div class="ms-tag">16 Core Capabilities</div>
    <h2>Built for Business Owners Who Are Done Doing It All</h2>
    <div class="ms-divider"></div>
    <div class="ms-grid-4">

      <div class="ms-card">
        <div class="icon">🎙️</div>
        <h3>Voice AI</h3>
        <p>Talk to your business. Get answers, issue commands, and receive briefings — all by voice. Powered by real-time AI with multilingual support.</p>
      </div>

      <div class="ms-card">
        <div class="icon">✅</div>
        <h3>Task & Project Management</h3>
        <p>MISTR creates tasks, assigns them, tracks progress, and closes them — automatically. Dart-powered. Zero manual entry. Full visibility at all times.</p>
      </div>

      <div class="ms-card">
        <div class="icon">📧</div>
        <h3>Email Monitoring</h3>
        <p>MISTR watches every inbox. Detects replies, escalates critical messages, triggers follow-up sequences, and ensures nothing is ever missed or dropped.</p>
      </div>

      <div class="ms-card">
        <div class="icon">💬</div>
        <h3>Slack & Team Chat</h3>
        <p>MISTR lives inside your Slack workspace. It reads channels, acts on requests, posts updates, and keeps your team aligned without extra meetings.</p>
      </div>

      <div class="ms-card">
        <div class="icon">📱</div>
        <h3>SMS & Text Interface</h3>
        <p>Text your business phone number to give MISTR instructions from anywhere. No app required. A Twilio-powered direct line to your AI chief of staff.</p>
      </div>

      <div class="ms-card">
        <div class="icon">📊</div>
        <h3>PPC & Ads Agent</h3>
        <p>MISTR monitors your Google, Meta, and TikTok ad accounts. Gets alerts on spend anomalies, underperforming campaigns, and optimization opportunities.</p>
      </div>

      <div class="ms-card">
        <div class="icon">📋</div>
        <h3>SOPs & Playbooks</h3>
        <p>Every process your team follows lives in MISTR's knowledge base. New hire? MISTR trains them. Client onboarding? MISTR runs the playbook automatically.</p>
      </div>

      <div class="ms-card">
        <div class="icon">🎨</div>
        <h3>Creative Director AI</h3>
        <p>Brief MISTR on a campaign, an ad, or a content piece. MISTR writes the copy, generates the brief, and coordinates creative execution with your team.</p>
      </div>

      <div class="ms-card">
        <div class="icon">📞</div>
        <h3>Client Phone Numbers</h3>
        <p>Every client or campaign gets a dedicated Twilio number. Calls and texts route through MISTR, are logged, transcribed, and actioned automatically.</p>
      </div>

      <div class="ms-card">
        <div class="icon">🌐</div>
        <h3>Self-Managing Website</h3>
        <p>Your WordPress site updates itself. MISTR can push blog content, update pages, manage plugins, and monitor uptime — without you touching the backend.</p>
      </div>

      <div class="ms-card">
        <div class="icon">🧠</div>
        <h3>Knowledge Base</h3>
        <p>A living brain that grows with your business. Feed it SOPs, docs, emails, meeting notes — MISTR reads it all and applies it intelligently in every task it executes.</p>
      </div>

      <div class="ms-card">
        <div class="icon">📈</div>
        <h3>Reporting & Analytics</h3>
        <p>Automated weekly and monthly reports across every platform you use — delivered to your inbox, Slack, or spoken aloud via your MISTR voice briefing.</p>
      </div>

      <div class="ms-card">
        <div class="icon">🗺️</div>
        <h3>Live Mind Map</h3>
        <p>Visualize your entire business — departments, projects, agents, tasks — in a living map that updates in real time. See the whole picture at a glance.</p>
      </div>

      <div class="ms-card">
        <div class="icon">🌍</div>
        <h3>Fully Multilingual</h3>
        <p>MISTR speaks your clients' language. English, Spanish, Mandarin, French, German, Japanese — voice and text, all powered by Google WaveNet and GPT-4.</p>
      </div>

      <div class="ms-card">
        <div class="icon">❓</div>
        <h3>Ask Anything</h3>
        <p>Ask MISTR any question about your business — performance, client status, campaign results, team availability. Get instant, accurate answers from live data.</p>
      </div>

      <div class="ms-card">
        <div class="icon">🤵</div>
        <h3>Business Concierge</h3>
        <p>MISTR handles scheduling, vendor communications, research, travel, and miscellaneous ops tasks. The white-glove executive assistant experience — at software pricing.</p>
      </div>

    </div>
  </div>

  <div class="ms-cta-block">
    <h2>One System. Infinite Leverage.</h2>
    <p>Stop juggling 30 tools. MISTR replaces them — and does what none of them can: it actually runs your business.</p>
    <a href="/pricing" class="ms-btn">See Pricing</a>
    <a href="/contact" class="ms-btn-outline" style="margin-left:16px;">Book a Demo</a>
  </div>
</div>
`;

// ── PAGE 3: INTEGRATIONS ──────────────────────────────────────────────────────
const integrationsContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">80+ Native Integrations</div>
    <h1>MISTR Connects to<br><span class="teal">Everything You Already Use</span></h1>
    <p>No rip-and-replace. MISTR plugs into your existing stack and starts running it — intelligently, automatically, immediately.</p>
    <a href="/contact" class="ms-btn">See It in Action</a>
  </div>

  <div class="ms-section" style="text-align:center;">
    <div class="ms-tag">Core Integrations</div>
    <h2>The Platforms MISTR Lives In</h2>
    <div class="ms-divider" style="margin:16px auto 48px;"></div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:24px;margin-bottom:60px;">
      ${[
        ['🔍','Google','Search, Analytics, Ads, Workspace, Gmail'],
        ['💬','Slack','Messages, alerts, commands, team updates'],
        ['📘','Meta','Facebook Ads, Instagram, lead forms'],
        ['📞','Twilio','Voice, SMS, dedicated phone numbers'],
        ['🤖','OpenAI','GPT-4 intelligence layer for all tasks'],
        ['💳','Stripe','Payments, subscriptions, invoicing'],
        ['📨','Mailgun','Email delivery, tracking, sequences'],
        ['📹','Zoom','Meetings, recordings, transcriptions'],
        ['💾','GitHub','Code, deployments, issue tracking'],
        ['🎯','HubSpot','CRM, pipeline, contact management'],
        ['⚡','Zapier','Connect to 5,000+ additional apps'],
        ['📅','Calendly','Booking, scheduling, reminders'],
        ['📓','Notion','Docs, databases, wikis, notes'],
        ['💰','QuickBooks','Accounting, invoices, P&L reports'],
        ['🌐','WordPress','Site content, SEO, plugin management'],
        ['🛒','Shopify','Orders, inventory, customer data'],
        ['✅','ClickUp','Tasks, workflows, team management'],
        ['📊','Airtable','Databases, views, automations'],
      ].map(([icon, name, desc]) => `
      <div class="ms-card" style="text-align:left;">
        <div style="font-size:2rem;margin-bottom:12px;">${icon}</div>
        <h3 style="font-size:1.1rem;">${name}</h3>
        <p style="font-size:0.85rem;">${desc}</p>
      </div>`).join('')}
    </div>

    <div style="display:inline-block;background:linear-gradient(135deg,var(--teal),#0669a0);color:white;padding:18px 40px;border-radius:50px;font-family:'Poppins',sans-serif;font-weight:700;font-size:1.1rem;margin-bottom:60px;">
      + 80 More Integrations Available
    </div>
  </div>

  <div class="ms-bg-light">
    <div class="ms-section">
      <div class="ms-tag">How Integration Works</div>
      <h2>Connect Once. MISTR Does the Rest.</h2>
      <div class="ms-grid-3">
        <div class="ms-card">
          <div class="icon">🔌</div>
          <h3>One-Click Connect</h3>
          <p>During onboarding, MISTR walks you through connecting each platform you use. Most integrations take under 60 seconds. No developer required.</p>
        </div>
        <div class="ms-card">
          <div class="icon">🧠</div>
          <h3>MISTR Learns Your Stack</h3>
          <p>Once connected, MISTR maps your data flows — what goes where, who owns what, how your business actually works. It builds a mental model of your operations.</p>
        </div>
        <div class="ms-card">
          <div class="icon">⚙️</div>
          <h3>Automated Execution</h3>
          <p>MISTR starts acting across all connected platforms immediately. Update a CRM record, fire an email sequence, post a Slack update — all triggered by a single word from you.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="ms-cta-block">
    <h2>Already Using These Platforms?</h2>
    <p>Good — MISTR enhances what you have. Plug it in and watch everything start running itself.</p>
    <a href="/contact" class="ms-btn">Start the Integration</a>
  </div>
</div>
`;

// ── PAGE 4: INDUSTRIES ────────────────────────────────────────────────────────
const industriesContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">Built for Your Industry</div>
    <h1>MISTR Is <span class="teal">Industry-Specific</span><br>Because Business Pain Is Industry-Specific</h1>
    <p>The chaos of running a law firm is different from the chaos of running a home services company. MISTR knows the difference — and solves both.</p>
    <a href="/contact" class="ms-btn">Find Your Use Case</a>
  </div>

  ${[
    {
      icon: '📣',
      title: 'Marketing Agencies',
      color: 'var(--teal)',
      pains: ['Client reporting takes up 30% of your week','Campaign changes fall through the cracks','Account managers spend more time on admin than clients','New hires take months to onboard properly'],
      solutions: ['MISTR auto-generates client reports from live data every Friday','All campaign change requests go into MISTR — executed, tracked, confirmed','Client communication is monitored and flagged — never missed','SOPs live in MISTR. New hires are trained by MISTR from day one'],
    },
    {
      icon: '🔧',
      title: 'Home Services',
      color: '#e67e22',
      pains: ['Missed calls = missed jobs','Scheduling is a logistical nightmare','Follow-up with leads is inconsistent','Crew management eats your evenings'],
      solutions: ['Every call is answered, logged, and scheduled by MISTR','Job assignments optimized by location, availability, and skill','Automated lead follow-up sequences — no lead goes cold','Crew schedules, job updates, and materials requests handled by MISTR'],
    },
    {
      icon: '⚖️',
      title: 'Law Firms',
      color: '#8e44ad',
      pains: ['Client intake is slow and inconsistent','Deadline management is manually tracked','Billing hours are underreported','Client communication falls through cracks'],
      solutions: ['MISTR runs the intake process — forms, follow-up, scheduling, confirmation','Critical deadlines tracked in MISTR with automatic escalation alerts','Time entries captured automatically from MISTR task logs','All client emails monitored, flagged, and escalated when overdue'],
    },
    {
      icon: '🏥',
      title: 'Medical & Dental',
      color: '#e74c3c',
      pains: ['Appointment no-shows cost thousands monthly','Insurance follow-up is a manual slog','Patient recall campaigns are inconsistently run','Staff burnout from administrative overload'],
      solutions: ['Automated appointment reminders via SMS, voice, and email — no shows drop 40%+','MISTR tracks every insurance follow-up, escalates aged claims automatically','Patient recall sequences run on autopilot — reactivate lapsed patients without lifting a finger','Administrative tasks handled by MISTR so clinical staff focus on patients'],
    },
    {
      icon: '🏡',
      title: 'Real Estate',
      color: var(--navy),
      pains: ['Lead response time determines who gets the deal','Transaction coordination is chaotic','Marketing consistency is hard to maintain','Referral follow-up gets forgotten'],
      solutions: ['MISTR responds to every lead within 60 seconds — 24/7','Transaction timelines tracked, parties notified, nothing dropped','Automated content marketing — listings, market updates, neighborhood guides','Post-close referral sequence runs automatically for every closed deal'],
    },
    {
      icon: '🛒',
      title: 'E-Commerce',
      color: '#27ae60',
      pains: ['Customer service volume is overwhelming','Returns and refunds are handled inconsistently','Email marketing requires constant attention','Inventory alerts and reorders are manual'],
      solutions: ['MISTR handles Tier 1 customer service — order status, returns, FAQs — automatically','Consistent refund and return workflows enforced by MISTR every time','Email campaigns triggered by behavior — browse abandonment, post-purchase, win-back','Low inventory alerts and reorder triggers wired into MISTR autopilot'],
    },
  ].map((ind, i) => `
  <div class="${i % 2 === 1 ? 'ms-bg-light' : ''}">
    <div class="ms-section">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center;" class="ms-industry-grid">
        <div ${i % 2 === 1 ? 'style="order:2"' : ''}>
          <div style="font-size:3rem;margin-bottom:16px;">${ind.icon}</div>
          <div class="ms-tag">${ind.title}</div>
          <h2 style="margin-bottom:24px;">The ${ind.title} Problem</h2>
          <ul style="list-style:none;padding:0;">
            ${ind.pains.map(p => `<li style="display:flex;gap:12px;margin-bottom:12px;"><span style="color:var(--red);font-size:1.2rem;flex-shrink:0;">✗</span><span style="color:#555;">${p}</span></li>`).join('')}
          </ul>
        </div>
        <div ${i % 2 === 1 ? 'style="order:1"' : ''}>
          <h3 style="font-family:'Poppins',sans-serif;font-size:1.4rem;font-weight:700;color:var(--navy);margin-bottom:20px;">How MISTR Solves It</h3>
          <ul style="list-style:none;padding:0;">
            ${ind.solutions.map(s => `<li style="display:flex;gap:12px;margin-bottom:14px;"><span style="color:var(--teal);font-size:1.2rem;flex-shrink:0;">✓</span><span style="color:#333;">${s}</span></li>`).join('')}
          </ul>
          <a href="/contact" class="ms-btn" style="margin-top:24px;">Get a ${ind.title} Demo</a>
        </div>
      </div>
    </div>
  </div>
  `).join('')}

  <style>
    @media (max-width: 768px) {
      .ms-industry-grid { grid-template-columns: 1fr !important; }
      .ms-industry-grid > div[style*="order:2"] { order: 1 !important; }
      .ms-industry-grid > div[style*="order:1"] { order: 2 !important; }
    }
  </style>

  <div class="ms-cta-block">
    <h2>Don't See Your Industry?</h2>
    <p>MISTR has been deployed in over 12 industries. If your business has operations, MISTR can run them.</p>
    <a href="/contact" class="ms-btn">Talk to MISTR</a>
  </div>
</div>
`;

// ── PAGE 5: PRICING ───────────────────────────────────────────────────────────
const pricingContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">Simple, Transparent Pricing</div>
    <h1>One Decision.<br><span class="teal">Replace an Entire Operations Team.</span></h1>
    <p>Every enterprise pays $38,000+ a month for what MISTR does for $997. The math is not subtle.</p>
  </div>

  <div class="ms-section" style="text-align:center;">
    <div class="ms-tag">Choose Your Plan</div>
    <h2>Pricing Built for Business Owners, Not Enterprise Budgets</h2>
    <div class="ms-divider" style="margin:16px auto 48px;"></div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px;align-items:start;">

      <!-- The Old Way -->
      <div class="ms-card" style="border:2px solid #e0e0e0;opacity:0.8;">
        <div style="text-align:center;padding:10px 0 24px;">
          <div style="font-size:0.85rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#999;margin-bottom:16px;">The Old Way</div>
          <div style="font-size:3rem;font-weight:800;color:#999;text-decoration:line-through;font-family:'Poppins',sans-serif;">$38,000<span style="font-size:1.2rem;">/mo</span></div>
          <p style="color:#999;margin-top:8px;font-size:0.9rem;">Traditional Staff + Tools</p>
        </div>
        <ul style="list-style:none;padding:0;text-align:left;">
          ${['Operations Manager — $8,000/mo','Executive Assistant — $5,000/mo','Marketing Manager — $7,000/mo','Customer Service Staff — $4,500/mo','Project Manager — $6,500/mo','Software Stack (30+ tools) — $3,000/mo','Training & Onboarding — $4,000 one-time'].map(item => `
          <li style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;color:#999;font-size:0.9rem;">
            <span style="color:#ccc;">✗</span> ${item}
          </li>`).join('')}
        </ul>
      </div>

      <!-- MISTR Pro - Most Popular -->
      <div class="ms-card" style="border:3px solid var(--teal);position:relative;transform:scale(1.02);box-shadow:0 20px 60px rgba(7,133,183,0.2);">
        <div style="position:absolute;top:-16px;left:50%;transform:translateX(-50%);background:var(--teal);color:white;padding:6px 24px;border-radius:20px;font-family:'Poppins',sans-serif;font-size:0.85rem;font-weight:700;">MOST POPULAR</div>
        <div style="text-align:center;padding:20px 0 24px;">
          <div style="font-size:0.85rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--teal);margin-bottom:16px;">MISTR Pro</div>
          <div style="font-size:3.5rem;font-weight:800;color:var(--navy);font-family:'Poppins',sans-serif;">$997<span style="font-size:1.2rem;font-weight:500;">/mo</span></div>
          <p style="color:#555;margin-top:8px;font-size:0.9rem;">Full AI Operating System</p>
        </div>
        <ul style="list-style:none;padding:0;text-align:left;margin-bottom:32px;">
          ${[
            'MISTR AI Brain (unlimited conversations)',
            'Voice interface — phone + Slack + SMS',
            'PAM execution engine (24/7 automation)',
            'Task & project management (Dart)',
            'Email monitoring & follow-up automation',
            'CRM automation via 1Dash.Pro',
            'Knowledge base (unlimited ingestion)',
            '16+ AI capabilities included',
            '80+ platform integrations',
            'Weekly performance reports',
            'White-glove onboarding (2 sessions)',
            'Monthly strategy call with MISTR team',
          ].map(item => `
          <li style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;color:#333;font-size:0.9rem;">
            <span style="color:var(--teal);font-weight:700;">✓</span> ${item}
          </li>`).join('')}
        </ul>
        <a href="/contact" class="ms-btn" style="width:100%;text-align:center;display:block;">Start with MISTR Pro</a>
      </div>

      <!-- MISTR Agency -->
      <div class="ms-card" style="border:2px solid var(--navy);">
        <div style="text-align:center;padding:10px 0 24px;">
          <div style="font-size:0.85rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--navy);margin-bottom:16px;">MISTR Agency</div>
          <div style="font-size:3rem;font-weight:800;color:var(--navy);font-family:'Poppins',sans-serif;">Custom</div>
          <p style="color:#555;margin-top:8px;font-size:0.9rem;">For Agencies & Multi-Location Businesses</p>
        </div>
        <ul style="list-style:none;padding:0;text-align:left;margin-bottom:32px;">
          ${[
            'Everything in MISTR Pro',
            'Sub-accounts for each client location',
            'White-label your MISTR instance',
            'Client-facing MISTR AI (named by client)',
            'Multi-location reporting dashboard',
            'Custom integrations & workflows',
            'Dedicated MISTR success manager',
            'Priority support (4-hour response)',
            'Custom onboarding for your team',
            'Quarterly business review sessions',
          ].map(item => `
          <li style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0;color:#333;font-size:0.9rem;">
            <span style="color:var(--navy);font-weight:700;">✓</span> ${item}
          </li>`).join('')}
        </ul>
        <a href="/contact" class="ms-btn" style="width:100%;text-align:center;display:block;background:var(--navy);">Contact for Pricing</a>
      </div>

    </div>
  </div>

  <!-- FAQ Pricing -->
  <div class="ms-bg-light">
    <div class="ms-section">
      <div class="ms-tag">Common Questions</div>
      <h2>Pricing FAQs</h2>
      <div class="ms-grid-2" style="margin-top:40px;">
        ${[
          ['Is there a setup fee?','No setup fee. Onboarding is included in your first month. We get you live, integrated, and running within 7 business days.'],
          ['Can I cancel anytime?','Yes. Monthly subscription. No contracts. No lock-in. If MISTR isn\'t delivering, cancel with 30 days notice.'],
          ['What\'s the ROI?','Replace one operations manager and you\'ve paid for MISTR for 8 months. Most clients see positive ROI in the first 30 days.'],
          ['Does MISTR replace my team?','No. MISTR handles the operations layer so your team can focus on high-value work. It\'s leverage, not replacement.'],
        ].map(([q, a]) => `
        <div class="ms-card">
          <h3 style="margin-bottom:12px;">${q}</h3>
          <p>${a}</p>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="ms-cta-block">
    <h2>$997/mo vs. $38,000/mo.<br>The Decision Makes Itself.</h2>
    <p>Book a 20-minute demo. If MISTR can't demonstrate clear ROI for your business, you walk away with zero obligation.</p>
    <a href="/contact" class="ms-btn">Book Your Zero-Risk Demo</a>
  </div>
</div>
`;

// ── PAGE 6: ABOUT ─────────────────────────────────────────────────────────────
const aboutContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">Our Story</div>
    <h1>Built From Pain.<br><span class="teal">Deployed as the Answer.</span></h1>
    <p>"Say it once. It gets done. It never gets forgotten." — This didn't come from a whiteboard. It came from $284,000 in losses and 7 years of failure that turned into the answer key.</p>
  </div>

  <!-- David's Story -->
  <div class="ms-section">
    <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:80px;align-items:start;" class="ms-about-grid">
      <div>
        <div style="width:100%;aspect-ratio:3/4;background:linear-gradient(135deg,var(--navy),#1a2f6e);border-radius:20px;display:flex;align-items:center;justify-content:center;color:white;font-size:5rem;">👤</div>
        <div style="text-align:center;margin-top:20px;">
          <div style="font-family:'Poppins',sans-serif;font-size:1.3rem;font-weight:700;color:var(--navy);">David Moceri</div>
          <div style="color:var(--teal);font-size:0.95rem;margin-top:4px;">Founder & CEO, MindStream.ing</div>
        </div>
      </div>
      <div>
        <div class="ms-tag">The Founder's Journey</div>
        <h2>The $284,000 Answer Key</h2>
        <div class="ms-divider"></div>
        <p style="font-size:1.05rem;line-height:1.8;color:#333;margin-bottom:24px;">David Moceri didn't build MindStream.ing in a comfortable office. He built it after losing $284,000. After investors walked. After the health toll of sleepless nights managing 30 tools, 8 contractors, and an agency that was supposed to run itself but ran him instead.</p>
        <p style="font-size:1.05rem;line-height:1.8;color:#333;margin-bottom:24px;">Like Slumdog Millionaire — every failure, every loss, every missed family dinner was not baggage. It was the answer key. Because David has lived every problem his clients face. The stress. The health toll. The fear that the business will fall apart the moment you take a vacation.</p>
        <p style="font-size:1.05rem;line-height:1.8;color:#333;margin-bottom:24px;">7 years building, testing, failing, rebuilding. Hundreds of automations. Dozens of AI experiments. Until one day, the system was more reliable than any human he'd ever hired. That system became MISTR.</p>
        <blockquote style="border-left:4px solid var(--teal);padding:20px 24px;background:var(--light);border-radius:0 12px 12px 0;margin:32px 0;">
          <p style="font-size:1.15rem;font-style:italic;color:var(--navy);line-height:1.7;font-family:'Poppins',sans-serif;font-weight:600;">"I was selling hope. Getting back your sanctity. Less stress. Less health problems. More family time. That is what every business owner actually wants — they just don't know how to say it."</p>
          <cite style="display:block;margin-top:12px;color:var(--teal);font-size:0.9rem;font-style:normal;font-weight:600;">— David Moceri</cite>
        </blockquote>
      </div>
    </div>
  </div>

  <!-- Mission -->
  <div class="ms-bg-light">
    <div class="ms-section" style="text-align:center;">
      <div class="ms-tag">Our Mission</div>
      <h2>"Your Business, Running Itself."</h2>
      <div class="ms-divider" style="margin:16px auto 32px;"></div>
      <p style="font-size:1.15rem;color:#555;max-width:750px;margin:0 auto 60px;line-height:1.8;">We are not selling software. We are selling outcomes. Hope. Happiness. Family time. Less stress. Less health problems. Less heartache. Every problem a client brings to MISTR is a symptom of a business that is NOT running itself. We fix the root cause.</p>

      <div class="ms-grid-3">
        <div class="ms-card" style="text-align:left;">
          <div class="icon">🎯</div>
          <h3>Say It Once</h3>
          <p>The most powerful sentence in business is: "I said it once and it got done." MISTR is built around that promise. You speak, it acts, you move on.</p>
        </div>
        <div class="ms-card" style="text-align:left;">
          <div class="icon">♾️</div>
          <h3>Never Forgotten</h3>
          <p>The entire product collapses if MISTR forgets things. So it doesn't. Every task, every instruction, every client note — captured, tracked, executed. Forever.</p>
        </div>
        <div class="ms-card" style="text-align:left;">
          <div class="icon">🏠</div>
          <h3>Getting Back Your Life</h3>
          <p>David built MISTR because he wanted his life back. Every client we serve is on the same journey. MISTR is the vehicle. Freedom is the destination.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Company -->
  <div class="ms-section">
    <div class="ms-tag">The Company</div>
    <h2>Ad ROI / MindStream.ing</h2>
    <div class="ms-divider"></div>
    <div class="ms-grid-2">
      <div>
        <p style="font-size:1.05rem;line-height:1.8;color:#333;margin-bottom:20px;">MindStream.ing is the AI platform and technology arm of Ad ROI, LLC — a Nevada corporation. The parent company also operates Ad ROI Marketing (agency), 1Dash.Pro (agency SaaS platform), and PlushPink Agency (AI models and digital influencers).</p>
        <p style="font-size:1.05rem;line-height:1.8;color:#333;">MindStream.ing is named by design. Hidden inside the name are the capital letters M-I-ST-R — spelling MISTR. The AI itself is embedded in the brand at the spelling level. That is intentional architecture.</p>
      </div>
      <div>
        <h3 style="font-family:'Poppins',sans-serif;font-size:1.3rem;font-weight:700;color:var(--navy);margin-bottom:20px;">By the Numbers</h3>
        ${[
          ['7+','Years Building AI-Powered Operations'],
          ['$284K','Lost Before the System Was Born'],
          ['80+','Platform Integrations'],
          ['24/7','PAM Execution Engine Uptime'],
        ].map(([num, label]) => `
        <div style="display:flex;gap:20px;align-items:center;padding:16px 0;border-bottom:1px solid #eee;">
          <div style="font-family:'Poppins',sans-serif;font-size:2rem;font-weight:800;color:var(--teal);min-width:80px;">${num}</div>
          <div style="color:#555;">${label}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <style>
    @media (max-width: 768px) {
      .ms-about-grid { grid-template-columns: 1fr !important; }
    }
  </style>

  <div class="ms-cta-block">
    <h2>You've Lived the Problem.<br>We Built the Solution.</h2>
    <p>If any part of David's story sounds familiar — the stress, the dropped balls, the feeling that you're the only one keeping it together — MISTR was built for you.</p>
    <a href="/contact" class="ms-btn">Talk to MISTR Today</a>
  </div>
</div>
`;

// ── PAGE 7: WHAT YOU GET ──────────────────────────────────────────────────────
const whatYouGetContent = BRAND_STYLE + `
<div class="ms-page">
  <div class="ms-hero">
    <div class="ms-tag">Everything Included</div>
    <h1>What You Get With <span class="teal">MISTR</span></h1>
    <p>Not a chatbot. Not another tool. A full AI operating system — the complete stack that replaces an operations team and runs your business while you sleep.</p>
    <a href="/pricing" class="ms-btn">See Pricing</a>
    <a href="/contact" class="ms-btn-outline">Book a Demo</a>
  </div>

  <!-- The Full Stack -->
  <div class="ms-section">
    <div class="ms-tag">The Full Stack</div>
    <h2>Every Layer of MISTR, Explained</h2>
    <div class="ms-divider"></div>

    ${[
      {
        title: 'The MISTR AI Brain',
        icon: '🧠',
        color: 'var(--teal)',
        items: [
          'Powered by Claude + GPT-4 — the best AI models working in concert',
          'Trained on your business: your voice, your processes, your clients',
          'Persistent memory — remembers everything you\'ve said, every instruction given',
          'Multi-modal: voice, text, Slack, SMS — all channels, one brain',
          'Multilingual: English, Spanish, Mandarin, French, German, Japanese, Korean',
          'Continuous learning: the more you use it, the smarter it gets',
        ],
      },
      {
        title: 'PAM — 24/7 Execution Engine',
        icon: '⚡',
        color: 'var(--navy)',
        items: [
          'Runs on Google Cloud Run — always on, always executing',
          'Receives tasks from MISTR, executes them through 80+ integrations',
          'Never sleeps, never calls in sick, never asks for a vacation day',
          'Executes: emails, CRM updates, reports, follow-ups, scheduling, and more',
          'Self-monitoring: if blocked, escalates via phone call to you immediately',
          'Full audit trail — every action logged, timestamped, reportable',
        ],
      },
      {
        title: 'Task & Project Management',
        icon: '✅',
        color: '#27ae60',
        items: [
          'Powered by Dart AI — enterprise task management built for AI execution',
          'MISTR creates tasks the moment you speak — no manual entry',
          'Auto-assigns to the right team member or AI agent',
          'Priority, due dates, dependencies all set automatically',
          'Real-time status updates posted back to Slack or email',
          'Full project history searchable by MISTR at any time',
        ],
      },
      {
        title: 'Voice + Text + Slack Interface',
        icon: '💬',
        color: '#8e44ad',
        items: [
          'Voice: Vapi-powered phone line — call your business number and talk to MISTR',
          'Slack: MISTR lives in your workspace — DM or mention in any channel',
          'SMS: Text your Twilio number from anywhere — MISTR responds and executes',
          'All channels converge to the same brain — context shared across all interfaces',
          'TTS (text-to-speech) responses: MISTR speaks to you in real-time via voice',
          'Response time: under 2 seconds across all channels',
        ],
      },
      {
        title: 'Living Knowledge Base',
        icon: '📚',
        color: '#e67e22',
        items: [
          'Ingest any document: SOPs, client profiles, pricing sheets, meeting notes',
          'Auto-routed by MISTR: content goes to the right KB domain automatically',
          'Vertex AI RAG Engine powers semantic search across all knowledge',
          'MISTR reads your KB before every task execution — it knows context',
          '12+ KB categories: Brand, Sales, Clients, Staff, Analytics, SOPs, and more',
          'Continuous update: every MISTR interaction can trigger a KB update',
        ],
      },
      {
        title: 'CRM & Marketing Automation',
        icon: '🎯',
        color: 'var(--teal)',
        items: [
          'Powered by 1Dash.Pro — full CRM, pipelines, email sequences, funnels',
          'Leads captured automatically — MISTR creates the contact, starts the sequence',
          'Follow-up automation: every lead gets touched at the right time, every time',
          'Pipeline management: MISTR moves deals through stages based on activity',
          'Email + SMS campaigns triggered by behavior, not by your memory',
          'Full reporting: who engaged, who converted, what campaigns drove revenue',
        ],
      },
      {
        title: 'Integrations (80+)',
        icon: '🔌',
        color: '#e74c3c',
        items: [
          'Google (Workspace, Ads, Analytics, Gmail, Calendar)',
          'Slack, Twilio, Meta, Stripe, Mailgun, Zoom, GitHub',
          'HubSpot, Zapier, Calendly, Notion, QuickBooks, Shopify',
          'WordPress, ClickUp, Airtable, and 60+ more via Zapier/Activepieces',
          'One-click connect during onboarding — no developer required',
          'All connections monitored by MISTR — broken integrations auto-flagged',
        ],
      },
      {
        title: 'White-Glove Onboarding',
        icon: '🤵',
        color: var(--navy),
        items: [
          '2 live onboarding sessions with the MISTR team',
          'Full integration setup: all your platforms connected and tested',
          'Custom KB ingestion: your SOPs, docs, and knowledge loaded in',
          'Voice setup: your phone number configured, voice tested, tone calibrated',
          'Workflow mapping: MISTR\'s autopilot configured for your top 5 recurring tasks',
          'Go-live within 7 business days — you start getting ROI in week one',
        ],
      },
    ].map((section, i) => `
    <div style="margin-bottom:48px;padding:36px;background:${i % 2 === 0 ? 'white' : 'var(--light)'};border-radius:20px;border:1px solid #e8eef7;">
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;">
        <div style="min-width:280px;flex:1;">
          <div style="font-size:2.5rem;margin-bottom:12px;">${section.icon}</div>
          <h3 style="font-family:'Poppins',sans-serif;font-size:1.4rem;font-weight:700;color:var(--navy);margin-bottom:8px;">${section.title}</h3>
          <div style="width:40px;height:3px;background:${section.color};border-radius:2px;"></div>
        </div>
        <div style="flex:2;min-width:280px;">
          <ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;">
            ${section.items.map(item => `
            <li style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;">
              <span style="color:${section.color};font-size:1rem;flex-shrink:0;margin-top:2px;">✓</span>
              <span style="color:#333;font-size:0.95rem;line-height:1.5;">${item}</span>
            </li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
    `).join('')}
  </div>

  <!-- The Promise -->
  <div class="ms-bg-navy">
    <div class="ms-section" style="text-align:center;">
      <div style="font-size:3rem;margin-bottom:24px;">🏆</div>
      <h2 style="color:white;font-size:clamp(2rem,4vw,3rem);margin-bottom:20px;">The MISTR Promise</h2>
      <p style="color:rgba(255,255,255,0.8);font-size:1.2rem;max-width:700px;margin:0 auto 40px;line-height:1.8;">Say it once. It gets done. It never gets forgotten. If MISTR drops a ball, we fix it. If MISTR fails to deliver clear value in your first 30 days, we refund you. No questions. No contracts. Just results.</p>
      <a href="/contact" class="ms-btn">Start Today</a>
    </div>
  </div>

  <div class="ms-cta-block" style="background:linear-gradient(135deg, #0785B7, #0669a0);">
    <h2>Ready to See Everything in Action?</h2>
    <p>Book a 20-minute demo. We'll take a real task from your business and execute it live — so you can see exactly what you're getting.</p>
    <a href="/contact" class="ms-btn" style="background:white;color:var(--teal);">Book Your Live Demo</a>
  </div>
</div>
`;

// ── MAIN ──────────────────────────────────────────────────────────────────────

const PAGES = [
  { title: 'How It Works', slug: 'how-it-works', content: howItWorksContent },
  { title: 'Features', slug: 'features', content: featuresContent },
  { title: 'Integrations', slug: 'integrations', content: integrationsContent },
  { title: 'Industries', slug: 'industries', content: industriesContent },
  { title: 'Pricing', slug: 'pricing', content: pricingContent },
  { title: 'About', slug: 'about', content: aboutContent },
  { title: 'What You Get', slug: 'what-you-get', content: whatYouGetContent },
];

async function main() {
  console.log('=== MindStream.ing Inner Page Builder ===\n');

  // Step 1: Login
  console.log('Step 1: Logging in...');
  const cookieJar = await login();

  // Step 2: Get nonce
  console.log('\nStep 2: Getting wp_rest nonce...');
  const nonce = await getNonce(cookieJar);
  if (nonce) {
    console.log('Nonce obtained:', nonce);
  } else {
    console.log('No nonce obtained — will use Basic Auth fallback');
  }

  // Step 3: Create pages
  console.log('\nStep 3: Creating pages...\n');
  const results = [];

  for (const page of PAGES) {
    console.log(`Creating: "${page.title}" (/${page.slug})...`);
    const result = await createPage(cookieJar, nonce, {
      title: page.title,
      slug: page.slug,
      content: page.content,
      status: 'publish',
      template: '',
    });
    results.push({ ...result, title: page.title, slug: page.slug });
    if (result.success) {
      console.log(`  ✓ Created — ID: ${result.id} | URL: ${result.link}`);
    } else {
      console.log(`  ✗ FAILED — Status: ${result.status} | Error: ${result.error}`);
    }
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  // Summary
  console.log('\n=== RESULTS SUMMARY ===');
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  console.log(`\nSucceeded: ${succeeded.length}/${PAGES.length}`);
  succeeded.forEach(r => console.log(`  ✓ ${r.title} — ID ${r.id} — ${r.link}`));
  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}`);
    failed.forEach(r => console.log(`  ✗ ${r.title} (${r.slug}) — ${r.error}`));
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
