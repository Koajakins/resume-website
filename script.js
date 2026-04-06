'use strict';

// ─── Console easter egg ───────────────────────────────────────────────────────

console.log('%c TH ', 'background:#38bdf8;color:#0f172a;font-size:20px;font-weight:800;padding:4px 12px;border-radius:4px;');
console.log('%c Thomas Haggath — Senior AWS Cloud Engineer', 'color:#f1f5f9;font-size:13px;font-weight:600;');
console.log('%c UK-based, Chicago-bound. Open to U.S. security engineering roles.', 'color:#94a3b8;font-size:12px;');
console.log('%c ', '');
console.log('%c You found the console. That\'s a good sign.', 'color:#38bdf8;font-size:12px;');
console.log('%c Press Ctrl+K (or Cmd+K) to open the command palette.', 'color:#5a7191;font-size:12px;');

// ─── CV / Resume localisation ─────────────────────────────────────────────────

if (navigator.language === 'en-US') {
  document.querySelectorAll('.cv-term').forEach(el => { el.textContent = 'Resume'; });
}

// ─── Year ─────────────────────────────────────────────────────────────────────

document.getElementById('year').textContent = new Date().getFullYear();

// ─── Email assembly ───────────────────────────────────────────────────────────

(function () {
  const email = ['tom', 'haggath.re'].join('@');
  document.querySelectorAll('[data-email-link]').forEach(el => {
    el.href = 'mailto:' + email;
  });
  document.querySelectorAll('[data-email-display]').forEach(el => {
    el.textContent = email;
  });
  document.querySelectorAll('[data-email-copy]').forEach(el => {
    el.dataset.copy = email;
  });
})();

// ─── Theme toggle ─────────────────────────────────────────────────────────────

const themeToggle = document.getElementById('themeToggle');

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  applyTheme(savedTheme);
} else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
  applyTheme('light');
} else {
  applyTheme('dark');
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// ─── Progress bar + scroll handlers ──────────────────────────────────────────

const progressBar = document.getElementById('progress-bar');
const navbar      = document.getElementById('navbar');
const backToTop   = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  const y     = window.scrollY;
  const docH  = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
  navbar.classList.toggle('scrolled', y > 10);
  backToTop.classList.toggle('visible', y > 400);
}, { passive: true });

backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ─── Nav logo scroll to top ───────────────────────────────────────────────────

document.querySelector('.nav-logo').addEventListener('click', e => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── Typed text animation ─────────────────────────────────────────────────────

const typedEl  = document.getElementById('typed-text');
const phrases  = ['Senior AWS Cloud Engineer', 'AWS Incident Responder', 'Detection Engineer'];
let phraseIdx  = 0;
let charIdx    = phrases[0].length;
let deleting   = false;

typedEl.textContent = phrases[0];

function type() {
  const current = phrases[phraseIdx];
  typedEl.textContent = deleting
    ? current.slice(0, charIdx--)
    : current.slice(0, ++charIdx);

  if (!deleting && charIdx === current.length) {
    setTimeout(() => { deleting = true; type(); }, 2200);
    return;
  }
  if (deleting && charIdx < 0) {
    deleting  = false;
    phraseIdx = (phraseIdx + 1) % phrases.length;
    charIdx   = 0;
    setTimeout(type, 350);
    return;
  }
  setTimeout(type, deleting ? 35 : 65);
}

if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setTimeout(() => { deleting = true; type(); }, 2200);
}

// ─── Active nav link ──────────────────────────────────────────────────────────

const sections   = document.querySelectorAll('main section[id]');
const navAnchors = document.querySelectorAll('.nav-links a');
const navHeight  = getComputedStyle(document.documentElement).getPropertyValue('--nav-height').trim();

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      navAnchors.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, {
  rootMargin: `-${navHeight} 0px -55% 0px`,
  threshold: 0,
});

sections.forEach(s => sectionObserver.observe(s));

// ─── Mobile nav toggle ────────────────────────────────────────────────────────

const navToggle  = document.getElementById('navToggle');
const navLinksEl = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navLinksEl.classList.toggle('open', !expanded);
});

navLinksEl.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navLinksEl.classList.remove('open');
  });
});

// ─── Scroll reveal ────────────────────────────────────────────────────────────

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });

document.querySelectorAll(
  '.timeline-item, .edu-card, .skill-group, .stat-card, .about-text, .about-stats, .contact-intro, .contact-links, #contact-form, .contact-content .btn-lg'
).forEach(el => {
  el.setAttribute('data-reveal', '');
});

document.querySelectorAll('[data-reveal]').forEach(el => {
  const siblings = Array.from(el.parentElement.querySelectorAll('[data-reveal]'));
  const idx = siblings.indexOf(el);
  if (idx > 0) el.style.transitionDelay = `${idx * 70}ms`;
  revealObserver.observe(el);
});

// ─── Animated counters ────────────────────────────────────────────────────────

function animateCounter(el) {
  const match = el.textContent.trim().match(/^(\d+)(.*)$/);
  if (!match) return;
  const target   = parseInt(match[1], 10);
  const suffix   = match[2];
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = target + suffix;
    return;
  }
  const duration = 1200;
  const start    = performance.now();
  (function tick(now) {
    const p     = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  })(start);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-number').forEach(el => counterObserver.observe(el));

// ─── Copy button ──────────────────────────────────────────────────────────────

document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.classList.add('copied');
      btn.setAttribute('aria-label', 'Copied!');
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.setAttribute('aria-label', 'Copy email address');
      }, 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = btn.dataset.copy;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.classList.add('copied');
      setTimeout(() => btn.classList.remove('copied'), 2000);
    }
  });
});

// ─── Contact form ─────────────────────────────────────────────────────────────

(function () {
  const form      = document.getElementById('contact-form');
  const submitBtn = form.querySelector('button[type="submit"]');
  const status    = document.getElementById('form-status');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    formData.append('access_key', 'dedb1847-188d-4387-a324-63e93dfbf244');

    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending\u2026';
    submitBtn.disabled = true;
    status.hidden = true;
    status.className = 'form-status';

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        status.textContent = 'Message sent — I\'ll be in touch soon.';
        status.classList.add('success');
        form.reset();
      } else {
        status.textContent = data.message || 'Submission failed. Please try again.';
        status.classList.add('error');
      }
    } catch {
      status.textContent = 'Something went wrong. Please try again.';
      status.classList.add('error');
    } finally {
      status.hidden = false;
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });
})();

// ─── Command palette ──────────────────────────────────────────────────────────

const cmdPalette  = document.getElementById('cmdPalette');
const cmdBackdrop = document.getElementById('cmdBackdrop');
const cmdInput    = document.getElementById('cmdInput');
const cmdList     = document.getElementById('cmdList');
const cmdEmpty    = document.getElementById('cmdEmpty');

function getItems() {
  return [...cmdList.querySelectorAll('.cmd-item:not([hidden])')];
}

function setActive(item) {
  cmdList.querySelectorAll('.cmd-item').forEach(i => i.classList.remove('active'));
  if (item) {
    item.classList.add('active');
    item.scrollIntoView({ block: 'nearest' });
  }
}

function openPalette() {
  cmdPalette.classList.add('is-open');
  cmdInput.value = '';
  filterItems('');
  cmdInput.focus();
}

function closePalette() {
  cmdPalette.classList.remove('is-open');
}

function filterItems(query) {
  const q = query.trim().toLowerCase();
  let anyVisible = false;
  cmdList.querySelectorAll('.cmd-item').forEach(item => {
    const match = !q || item.textContent.toLowerCase().includes(q);
    item.hidden = !match;
    if (match) anyVisible = true;
  });
  cmdEmpty.hidden = anyVisible;
  cmdList.querySelectorAll('.cmd-group-label').forEach(label => {
    const next = label.nextElementSibling;
    label.hidden = !next || next.classList.contains('cmd-group-label') || next.hidden;
  });
  setActive(getItems()[0] || null);
}

function activateItem(item) {
  const href   = item.dataset.href;
  const action = item.dataset.action;
  closePalette();
  if (href) {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (action === 'download') {
    document.querySelector('a[download]').click();
  } else if (action === 'email') {
    document.querySelector('.copy-btn').click();
  } else if (action === 'top') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (action === 'terminal') {
    termToggle.click();
  }
}

document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    cmdPalette.classList.contains('is-open') ? closePalette() : openPalette();
    return;
  }
  if (!cmdPalette.classList.contains('is-open')) return;

  if (e.key === 'Escape') { closePalette(); return; }

  const items = getItems();
  const active = cmdList.querySelector('.cmd-item.active');
  const idx = items.indexOf(active);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setActive(items[Math.min(idx + 1, items.length - 1)]);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setActive(items[Math.max(idx - 1, 0)]);
  } else if (e.key === 'Enter' && active) {
    e.preventDefault();
    activateItem(active);
  }
});

cmdInput.addEventListener('input', () => filterItems(cmdInput.value));
cmdBackdrop.addEventListener('click', closePalette);
cmdList.querySelectorAll('.cmd-item').forEach(item => {
  item.addEventListener('click', () => activateItem(item));
});

// ─── Terminal toggle ──────────────────────────────────────────────────────────

const termToggle  = document.getElementById('termToggle');
const termSection = document.getElementById('terminal');

termToggle.addEventListener('click', e => {
  e.preventDefault();
  const opening = termSection.hidden;
  termSection.hidden = !opening;
  if (opening) {
    termSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('term-input')?.focus();
  }
});

document.querySelectorAll('.hero-term-link').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    termSection.hidden = false;
    termSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.getElementById('term-input')?.focus();
  });
});

// ─── Terminal ─────────────────────────────────────────────────────────────────

(function () {
  const termBody  = document.getElementById('term-body');
  const termInput = document.getElementById('term-input');
  const termWin   = document.querySelector('.term-window');
  if (!termBody || !termInput) return;

  const cmdHistory = [];
  let histIdx = -1;

  const COMMANDS = {
    help() {
      return [
        { text: 'Available commands:', cls: 'term-ok' },
        { text: '  whoami      — about me' },
        { text: '  skills      — technical skills' },
        { text: '  experience  — work history' },
        { text: '  projects    — personal projects' },
        { text: '  contact     — get in touch' },
        { text: '  ls          — list directory' },
        { text: '  cat cv.pdf  — download CV' },
        { text: '  clear       — clear terminal' },
      ];
    },
    whoami() {
      return [
        { text: 'Thomas Haggath' },
        { text: 'Senior AWS Cloud Engineer' },
        { text: '7+ years · Security incident response & detection engineering' },
        { text: 'Wiltshire, UK — Chicago-bound, open to U.S. roles broadly' },
        { text: 'Happy to discuss H-1B / L-1 sponsorship', cls: 'term-ok' },
      ];
    },
    skills() {
      return [
        { text: 'Cloud (AWS):   CloudTrail, GuardDuty, Security Hub, Macie, IAM, KMS' },
        { text: '               VPC Flow Logs, AWS Config, Control Tower' },
        { text: 'Detection/IR:  Alert Triage, Containment, RCA, NIST 800-61, Runbooks' },
        { text: 'Monitoring:    Splunk (SPL), CloudWatch, EventBridge, Log Analysis' },
        { text: 'Automation:    Python, PowerShell, Bash, Terraform' },
        { text: 'Tooling:       CrowdStrike, Trend Micro IPS/IDS, Nessus' },
        { text: 'Vuln & Risk:   Vulnerability Management, Patch Management, Compliance' },
      ];
    },
    experience() {
      return [
        { text: '2024–Present  Cloud Support Engineer II  · Amazon Web Services' },
        { text: '2024          InfoSec Compliance Analyst · InfoSum Ltd' },
        { text: '2021–2024     Cloud Support Engineer II  · Amazon Web Services' },
        { text: '2020–2021     Cloud Support Engineer I   · Amazon Web Services' },
        { text: '2019–2020     Cloud Support Associate    · Amazon Web Services' },
        { text: '2017–2018     Software Tester Intern     · Evidence Talks Ltd' },
      ];
    },
    projects() {
      return [
        { text: 'SecurityObservatory  github.com/Koalatyyy/aws-security-siem' },
        { text: '                     AI-powered threat detection across 12+ AWS services', cls: 'term-muted' },
        { text: 'PacketTracer         github.com/Koalatyyy/PacketTracer' },
        { text: '                     Real-time packet capture with topology visualisation', cls: 'term-muted' },
        { text: 'A-LiME               github.com/Koalatyyy/A-LiME' },
        { text: '                     Automated Linux memory extraction tooling', cls: 'term-muted' },
        { text: 'haggath.re           haggath.re' },
        { text: '                     This site', cls: 'term-muted' },
      ];
    },
    contact() {
      return [
        { text: 'Email:     tom@haggath.re' },
        { text: 'LinkedIn:  linkedin.com/in/thomas-haggath' },
        { text: 'GitHub:    github.com/Koalatyyy' },
        { text: '' },
        { text: 'Or scroll down to #contact to send a message.', cls: 'term-muted' },
      ];
    },
    ls() {
      return [
        { text: 'about/       experience/       skills/       projects/       faq/       contact/' },
        { text: 'Type a directory name to explore, or run help for all commands.', cls: 'term-muted' },
      ];
    },
    'cat cv.pdf'() {
      setTimeout(() => document.querySelector('a[download]')?.click(), 300);
      return [{ text: 'Initiating download...', cls: 'term-ok' }];
    },
    clear() {
      termBody.innerHTML = '';
      return null;
    },
    sudo() {
      return [{ text: 'Permission denied. This incident will be reported.', cls: 'term-error' }];
    },
    'sudo rm -rf /'() {
      return [{ text: 'Permission denied. Nice try.', cls: 'term-error' }];
    },
  };

  function printLines(lines) {
    lines.forEach(({ text, cls }) => {
      const el = document.createElement('div');
      el.className = 'term-line' + (cls ? ` ${cls}` : '');
      el.textContent = text ?? '';
      termBody.appendChild(el);
    });
    termBody.scrollTop = termBody.scrollHeight;
  }

  function printPrompt(cmd) {
    const el = document.createElement('div');
    el.className = 'term-line term-cmd';
    el.textContent = `tom@haggath.re:~$ ${cmd}`;
    termBody.appendChild(el);
  }

  function run(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;
    cmdHistory.unshift(raw);
    histIdx = -1;
    printPrompt(raw);
    const handler = COMMANDS[cmd];
    if (handler) {
      const out = handler();
      if (out) printLines(out);
    } else {
      printLines([{ text: `command not found: ${cmd}  (try 'help')`, cls: 'term-error' }]);
    }
    printLines([{ text: '' }]);
  }

  printLines([
    { text: '──────────────────────────────────────────' },
    { text: "  Welcome. Type 'help' to get started.", cls: 'term-ok' },
    { text: '──────────────────────────────────────────' },
    { text: '' },
  ]);

  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = termInput.value;
      termInput.value = '';
      run(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx < cmdHistory.length - 1) termInput.value = cmdHistory[++histIdx];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) termInput.value = cmdHistory[--histIdx];
      else { histIdx = -1; termInput.value = ''; }
    }
  });

  termWin.addEventListener('click', () => termInput.focus());
})();
