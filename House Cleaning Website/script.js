(() => {
  'use strict';

  // Keep all quote pricing in one place so it is easy to customize.
  const PRICING = {
    services: {
      standard: { label: 'Standard cleaning', base: 75, bedroom: 18, bathroom: 12 },
      deep: { label: 'Deep cleaning', base: 125, bedroom: 25, bathroom: 18 },
      move: { label: 'Move in / move out', base: 150, bedroom: 28, bathroom: 20 }
    },
    frequencies: {
      once: { label: 'One-time visit', discount: 0 },
      biweekly: { label: 'Every 2 weeks', discount: 0.10 },
      weekly: { label: 'Weekly visit', discount: 0.15 }
    },
    addons: {
      fridge: { label: 'Inside fridge', price: 25 },
      oven: { label: 'Inside oven', price: 30 },
      windows: { label: 'Interior windows', price: 20 },
      laundry: { label: 'One laundry load', price: 18 }
    },
    currency: 'USD'
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const money = value => new Intl.NumberFormat('en-US', {
    style: 'currency', currency: PRICING.currency, maximumFractionDigits: 0
  }).format(value);

  // Mobile navigation: closes after selecting a destination or pressing Escape.
  const menuToggle = $('.menu-toggle');
  const nav = $('#primary-nav');
  const closeMenu = () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Open navigation');
    nav?.classList.remove('is-open');
  };
  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    nav?.classList.toggle('is-open', !isOpen);
  });
  $$('#primary-nav a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('click', event => {
    if (nav?.classList.contains('is-open') && !nav.contains(event.target) && !menuToggle?.contains(event.target)) closeMenu();
  });

  // Quote calculator.
  const quoteForm = $('#quoteForm');
  const serviceInput = $('#serviceType');
  const bedroomInput = $('#bedrooms');
  const bathroomInput = $('#bathrooms');
  const totalOutput = $('#estimateTotal');
  const savingOutput = $('#estimateSaving');
  const breakdownOutput = $('#priceBreakdown');

  function calculateQuote() {
    if (!quoteForm || !serviceInput || !bedroomInput || !bathroomInput) return null;
    const service = PRICING.services[serviceInput.value] || PRICING.services.standard;
    const bedrooms = Number(bedroomInput.value);
    const bathrooms = Number(bathroomInput.value);
    const frequencyKey = $('input[name="frequency"]:checked', quoteForm)?.value || 'once';
    const frequency = PRICING.frequencies[frequencyKey] || PRICING.frequencies.once;
    const base = service.base + bedrooms * service.bedroom + Math.max(0, bathrooms - 1) * service.bathroom;
    const discount = Math.round(base * frequency.discount);
    const selectedAddons = $$('input[name="addon"]:checked', quoteForm)
      .map(input => PRICING.addons[input.value])
      .filter(Boolean);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const total = Math.max(0, base - discount + addonsTotal);

    if (totalOutput) totalOutput.innerHTML = `${money(total)} <small>/ visit</small>`;
    if (savingOutput) savingOutput.textContent = frequency.discount ? `Save ${Math.round(frequency.discount * 100)}%` : 'One-time visit';
    if (breakdownOutput) {
      const rows = [
        [service.label, base],
        ...(discount ? [[`${frequency.label} discount`, -discount]] : []),
        ...selectedAddons.map(addon => [addon.label, addon.price])
      ];
      breakdownOutput.innerHTML = rows.map(([label, amount]) =>
        `<div class="breakdown-row"><span>${label}</span><span>${amount < 0 ? '−' : ''}${money(Math.abs(amount))}</span></div>`
      ).join('') + `<div class="breakdown-row total"><span>Estimated total</span><span>${money(total)}</span></div>`;
    }
    return { service: service.label, bedrooms, bathrooms, frequency: frequency.label, base, discount, addons: selectedAddons.map(addon => addon.label), total };
  }

  quoteForm?.addEventListener('input', calculateQuote);
  quoteForm?.addEventListener('change', calculateQuote);

  // Service cards can preselect the relevant quote option.
  $$('[data-service]').forEach(link => {
    link.addEventListener('click', () => {
      const serviceKey = link.dataset.service;
      if (serviceInput && PRICING.services[serviceKey]) {
        serviceInput.value = serviceKey;
        calculateQuote();
      }
    });
  });

  // Set the date minimum to today, using the visitor's local date.
  const dateInput = $('#preferredDate');
  if (dateInput) {
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    dateInput.min = localDate;
  }

  // Accessible FAQ behavior: keep one answer open at a time.
  const faqItems = $$('#faq details');
  faqItems.forEach(item => item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
  }));

  // Reveal sections as they enter view; fall back gracefully if unsupported.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // Demo lead form. Replace the console.log with a fetch() request to your backend/CRM.
  quoteForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!quoteForm.reportValidity()) return;
    const estimate = calculateQuote();
    const formData = new FormData(quoteForm);
    const lead = {
      name: String(formData.get('fullName') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      preferredDate: formData.get('preferredDate'),
      notes: String(formData.get('notes') || '').trim(),
      estimate,
      submittedAt: new Date().toISOString()
    };
    console.log('SparkNest quote request (demo only):', lead);
    // Backend integration example:
    // fetch('/api/quote-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) });
    const status = $('#formStatus');
    if (status) {
      status.hidden = false;
      status.textContent = `Thanks, ${lead.name}! Your estimated total is ${money(estimate.total)} per visit. This demo has recorded the request in the browser console; connect a backend to receive real submissions.`;
      status.focus?.();
    }
    status?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
  calculateQuote();
})();
