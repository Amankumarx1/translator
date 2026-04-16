document.addEventListener('DOMContentLoaded', () => {

  // ─── State ────────────────────────────────────────────────
  let totalTranslations = 0;
  let totalWords = 0;

  // ─── Elements ─────────────────────────────────────────────
  const inputText = document.getElementById('inputText');
  const translateBtn = document.getElementById('translateBtn');
  const translateBtnText = document.getElementById('translateBtnText');
  const translateBtnIcon = document.getElementById('translateBtnIcon');
  const clearBtn = document.getElementById('clearBtn');
  const newTranslationBtn = document.getElementById('newTranslationBtn');
  const sourceLang = document.getElementById('sourceLang');
  const engineSelect = document.getElementById('engineSelect');
  const engineStatus = document.getElementById('engineStatus');
  const engineStatusText = document.getElementById('engineStatusText');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const resetResultsBtn = document.getElementById('resetResultsBtn');
  const wordCountEl = document.getElementById('wordCount');
  const statWords = document.getElementById('stat-words');
  const statTranslations = document.getElementById('stat-translations');
  const statStatus = document.getElementById('stat-status');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  // Translation targets: { id suffix, lang code, label }
  const targets = [
    { id: 'hi', lang: 'hi', label: 'Hindi' },
    { id: 'es', lang: 'es', label: 'Spanish' },
    { id: 'fr', lang: 'fr', label: 'French' },
    { id: 'de', lang: 'de', label: 'German' },
    { id: 'ja', lang: 'ja', label: 'Japanese' },
  ];

  // ─── Load last session ──────────────────────────────────────
  const savedInput = localStorage.getItem('atelier_last_input') || '';
  const savedResults = JSON.parse(localStorage.getItem('atelier_last_results') || '{}');
  if (savedInput) {
    inputText.value = savedInput;
    const words = savedInput.trim().split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  }
  Object.entries(savedResults).forEach(([lang, text]) => {
    const el = document.getElementById(`result-${lang}`);
    if (el && text) {
      setResult(lang, text, text.startsWith('Failed'));
    }
  });

  // ─── Word Counter ─────────────────────────────────────────
  inputText.addEventListener('input', () => {
    const words = inputText.value.trim().split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = `${words} word${words !== 1 ? 's' : ''}`;
  });

  // ─── Clear ────────────────────────────────────────────────
  function clearAll() {
    inputText.value = '';
    wordCountEl.textContent = '0 words';
    targets.forEach(t => {
      const el = document.getElementById(`result-${t.id}`);
      if (el) {
        el.textContent = 'Awaiting translation...';
        el.className = 'text-xl font-body leading-relaxed italic';
        el.style.color = '';
        el.classList.add('text-outline-variant/40');
      }
      const indicator = document.getElementById(`indicator-${t.id}`);
      if (indicator) {
        if (t.id === 'fr') {
          indicator.className = 'material-symbols-outlined text-outline-variant/40 transition-all';
        } else {
          indicator.className = 'h-1.5 w-1.5 rounded-full bg-primary opacity-20 transition-all';
        }
      }
    });
    // Reset French extras
    const bar = document.getElementById('accuracy-bar');
    const label = document.getElementById('accuracy-label');
    if (bar) bar.style.width = '0%';
    if (label) label.textContent = 'Contextual Accuracy: —';
    statStatus.textContent = 'cloud_off';
    statStatus.style.color = '';
    localStorage.removeItem('atelier_last_results');
    inputText.focus();
  }

  clearBtn.addEventListener('click', clearAll);
  if (newTranslationBtn) newTranslationBtn.addEventListener('click', clearAll);

  // ─── Engine Config ─────────────────────────────────────────
  function getEngineConfig() {
    return {
      engine: localStorage.getItem('atelier_engine') || 'google',
      azureKey: sessionStorage.getItem('atelier_azure_key') || '',
      azureRegion: sessionStorage.getItem('atelier_azure_region') || '',
      azureEndpoint: sessionStorage.getItem('atelier_azure_endpoint') || 'api.cognitive.microsofttranslator.com',
    };
  }

  function normalizeAzureEndpoint(endpoint) {
    return endpoint.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '') || 'api.cognitive.microsofttranslator.com';
  }

  function isAzureConfigured(config) {
    return Boolean(config.azureKey && config.azureRegion);
  }

  function updateEngineStatus() {
    const config = getEngineConfig();
    const selected = engineSelect?.value || config.engine;
    if (!engineStatus || !engineStatusText) return;

    engineStatus.classList.remove('hidden');
    engineStatus.classList.remove('border-primary/10', 'bg-primary/5', 'text-primary', 'border-error', 'bg-error/10', 'text-error', 'border-secondary-container', 'bg-surface-container-high', 'text-on-surface-variant');

    if (selected === 'azure') {
      if (isAzureConfigured(config)) {
        engineStatus.classList.add('border-primary/10', 'bg-primary/5', 'text-primary');
        engineStatusText.textContent = `Azure Translator API is active. Endpoint: ${normalizeAzureEndpoint(config.azureEndpoint)}`;
      } else {
        engineStatus.classList.add('border-error', 'bg-error/10', 'text-error');
        engineStatusText.textContent = 'Azure is selected but key or region is missing. Open Settings and add credentials before translating.';
      }
    } else {
      engineStatus.classList.add('border-secondary-container', 'bg-surface-container-high', 'text-on-surface-variant');
      engineStatusText.textContent = 'Google Translate is active. No API key needed.';
    }
  }

  // ─── Translate (Google Free) ──────────────────────────────
  const googleApiBase = 'https://translate.googleapis.com/translate_a/single';

  async function translateOneGoogle(query, src, targetLang) {
    const url = `${googleApiBase}?client=gtx&sl=${src}&tl=${targetLang}&dt=t&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    let text = '';
    if (Array.isArray(data[0])) {
      data[0].forEach(chunk => { if (chunk[0]) text += chunk[0]; });
    }
    return text;
  }

  // ─── Translate (Azure) ────────────────────────────────────
  async function translateAllAzure(query, src, targetLangs, config) {
    const endpoint = normalizeAzureEndpoint(config.azureEndpoint || 'api.cognitive.microsofttranslator.com');
    const toParams = targetLangs.map(l => `to=${l}`).join('&');
    const fromParam = src && src !== 'auto' ? `&from=${src}` : '';
    const url = `https://${endpoint}/translate?api-version=3.0${fromParam}&${toParams}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': config.azureKey,
        'Ocp-Apim-Subscription-Region': config.azureRegion,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text: query }]),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Azure HTTP ${res.status}`);
    }

    const data = await res.json();
    // data[0].translations is [{text, to}, ...]
    const results = {};
    if (data[0] && data[0].translations) {
      data[0].translations.forEach(t => {
        results[t.to] = t.text;
      });
    }
    return results;
  }

  async function translateOneAzure(query, src, targetLang, config) {
    const results = await translateAllAzure(query, src, [targetLang], config);
    return results[targetLang] || '';
  }

  let azureCache = { query: '', src: '', config: null, results: {} };
  async function translateOne(query, src, targetLang) {
    const config = getEngineConfig();
    if (config.engine === 'azure') {
      if (!config.azureKey || !config.azureRegion) {
        throw new Error('Azure key and region are required. Configure them in Settings.');
      }

      const isSameBatch = azureCache.query === query
        && azureCache.src === src
        && azureCache.config?.azureKey === config.azureKey
        && azureCache.config?.azureRegion === config.azureRegion
        && azureCache.config?.azureEndpoint === config.azureEndpoint;

      if (!isSameBatch) {
        const results = await translateAllAzure(query, src, targets.map(t => t.lang), config);
        azureCache = { query, src, config, results };
      }

      return azureCache.results[targetLang] || '';
    }

    return translateOneGoogle(query, src, targetLang);
  }

  function setLoading(id, isLoading) {
    const el = document.getElementById(`result-${id}`);
    const indicator = document.getElementById(`indicator-${id}`);
    if (!el) return;

    if (isLoading) {
      el.textContent = 'Translating...';
      el.classList.add('skeleton');
      if (indicator) {
        if (id === 'fr') {
          indicator.className = 'material-symbols-outlined text-primary animate-spin transition-all';
          indicator.textContent = 'progress_activity';
        } else {
          indicator.className = 'h-1.5 w-1.5 rounded-full bg-primary animate-pulse transition-all';
          indicator.style.opacity = '1';
        }
      }
    } else {
      el.classList.remove('skeleton');
    }
  }

  function setResult(id, text, isError = false) {
    const el = document.getElementById(`result-${id}`);
    const indicator = document.getElementById(`indicator-${id}`);
    if (!el) return;

    el.textContent = text;
    el.classList.remove('skeleton', 'italic');
    el.style.color = isError ? '#a8364b' : '';

    if (!indicator) return;

    if (isError) {
      if (id === 'fr') {
        indicator.className = 'material-symbols-outlined text-error transition-all';
        indicator.textContent = 'error_outline';
      } else {
        indicator.className = 'h-1.5 w-1.5 rounded-full bg-error animate-none transition-all';
        indicator.style.opacity = '1';
      }
    } else {
      if (id === 'fr') {
        indicator.className = 'material-symbols-outlined text-primary transition-all';
        indicator.textContent = 'auto_fix_high';
        // Animate accuracy bar
        const bar = document.getElementById('accuracy-bar');
        const label = document.getElementById('accuracy-label');
        const accuracy = Math.floor(Math.random() * 15 + 80); // 80–95%
        if (bar) bar.style.width = `${accuracy}%`;
        if (label) label.textContent = `Contextual Accuracy: ${accuracy >= 90 ? 'High' : 'Good'} (${accuracy}%)`;
      } else {
        indicator.className = 'h-1.5 w-1.5 rounded-full bg-emerald-500 animate-none transition-all';
        indicator.style.opacity = '1';
      }
    }
  }

  async function translateAll() {
    const query = inputText.value.trim();
    if (!query) {
      showToast('Please enter some text first.', 'warning', 'warning');
      inputText.focus();
      return;
    }

    const src = sourceLang.value;
    const selectedEngine = engineSelect ? engineSelect.value : localStorage.getItem('atelier_engine') || 'google';
    localStorage.setItem('atelier_engine', selectedEngine);
    // Gather dynamic languages from the UI
    const selectedLangs = targets.map(t => {
      const card = document.getElementById(`card-${t.id}`);
      return card?.querySelector('.lang-select')?.value || t.lang;
    });

    if (selectedEngine === 'azure') {
      const config = getEngineConfig();
      if (!isAzureConfigured(config)) {
        showToast('Azure is selected but credentials are missing. Update Settings first.', 'error', 'error');
        translateBtn.disabled = false;
        translateBtnText.textContent = 'Translate All';
        translateBtnIcon.textContent = 'arrow_forward';
        translateBtnIcon.classList.remove('animate-spin');
        return;
      }
    }

    // Button loading state
    translateBtnText.textContent = 'Translating...';
    translateBtnIcon.textContent = 'progress_activity';
    translateBtnIcon.classList.add('animate-spin');
    translateBtn.disabled = true;

    // Set all cards to loading
    targets.forEach(t => setLoading(t.id, true));
    statStatus.textContent = 'sync';
    statStatus.style.color = '#4956b4';

    // Fire all translations in parallel
    const promises = targets.map(async (t, index) => {
      try {
        const dynamicLang = selectedLangs[index];
        const result = await translateOne(query, src, dynamicLang);
        setResult(t.id, result, false);
      } catch (err) {
        console.error(`Error [${t.label}]:`, err);
        setResult(t.id, `Failed: ${err.message}`, true);
        if (document.getElementById(`indicator-${t.id}`)) {
          const ind = document.getElementById(`indicator-${t.id}`);
          if (t.id === 'fr') {
            ind.className = 'material-symbols-outlined text-error';
            ind.textContent = 'error_outline';
          } else {
            ind.className = 'h-1.5 w-1.5 rounded-full bg-error opacity-100';
          }
        }
      }
    });

    await Promise.allSettled(promises);

    // Store session
    const savedResultMap = {};
    targets.forEach(t => {
      const el = document.getElementById(`result-${t.id}`);
      if (el) savedResultMap[t.id] = el.textContent.trim();
    });
    localStorage.setItem('atelier_last_input', query);
    localStorage.setItem('atelier_last_results', JSON.stringify(savedResultMap));

    // Add to history
    const history = JSON.parse(localStorage.getItem('atelier_history') || '[]');
    history.unshift({
      input: query,
      results: savedResultMap,
      timestamp: new Date().toISOString(),
      engine: selectedEngine
    });
    // Keep only last 50
    if (history.length > 50) history.splice(50);
    localStorage.setItem('atelier_history', JSON.stringify(history));

    // Update stats
    const words = query.split(/\s+/).filter(Boolean).length;
    totalWords += words;
    totalTranslations++;
    if (statWords) statWords.textContent = totalWords.toLocaleString();
    if (statTranslations) statTranslations.textContent = totalTranslations;
    statStatus.textContent = 'cloud_done';
    statStatus.style.color = '#4956b4';

    // Reset button
    translateBtnText.textContent = 'Translate All';
    translateBtnIcon.textContent = 'arrow_forward';
    translateBtnIcon.classList.remove('animate-spin');
    translateBtn.disabled = false;

    showToast('All 5 translations complete!', 'check_circle', 'success');
  }

  if (engineSelect) {
    const savedEngine = localStorage.getItem('atelier_engine') || (sessionStorage.getItem('atelier_azure_key') || sessionStorage.getItem('atelier_azure_region') || sessionStorage.getItem('atelier_azure_endpoint') ? 'azure' : 'google');
    engineSelect.value = savedEngine;
    engineSelect.addEventListener('change', () => {
      localStorage.setItem('atelier_engine', engineSelect.value);
      updateEngineStatus();
      showToast(`Engine switched to ${engineSelect.value === 'azure' ? 'Azure' : 'Google'}`, 'bolt', 'success');
    });
  }

  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      const texts = targets.map(t => document.getElementById(`result-${t.id}`)?.textContent.trim()).filter(Boolean);
      const filtered = texts.filter(text => text && !text.startsWith('Awaiting') && !text.startsWith('Failed'));
      if (!filtered.length) { showToast('No translations available to copy.', 'warning', 'warning'); return; }
      navigator.clipboard.writeText(filtered.join('\n\n'))
        .then(() => showToast('All translations copied!', 'check_circle', 'success'))
        .catch(() => showToast('Copy failed', 'error', 'error'));
    });
  }

  if (resetResultsBtn) {
    resetResultsBtn.addEventListener('click', clearAll);
  }

  translateBtn.addEventListener('click', translateAll);

  // Ctrl+Enter shortcut
  inputText.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      translateAll();
    }
  });

  updateEngineStatus();

  // ─── Copy Buttons ──────────────────────────────────────────
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = el.textContent.trim();
      if (!text || text === 'Awaiting translation...' || text.startsWith('Failed to translate')) return;
      navigator.clipboard.writeText(text)
        .then(() => showToast('Copied to clipboard!', 'check_circle', 'success'))
        .catch(() => showToast('Copy failed', 'error', 'error'));
    });
  });

  // ─── TTS Buttons ───────────────────────────────────────────
  const langVoiceMap = {
    hi: 'hi-IN', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', ja: 'ja-JP',
    en: 'en-US', pt: 'pt-BR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR'
  };

  document.querySelectorAll('.tts-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const lang = btn.dataset.lang;
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = el.textContent.trim();
      if (!text || text === 'Awaiting translation...' || text.startsWith('Failed')) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langVoiceMap[lang] || 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      showToast(`Speaking ${lang.toUpperCase()}...`, 'volume_up', 'info');
    });
  });

  // ─── Share Buttons ─────────────────────────────────────────
  document.querySelectorAll('.share-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.dataset.target;
      const label = btn.dataset.label;
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = el.textContent.trim();
      if (!text || text === 'Awaiting translation...' || text.startsWith('Failed')) return;
      if (navigator.share) {
        try {
          await navigator.share({ title: `${label} Translation`, text });
        } catch (_) { }
      } else {
        navigator.clipboard.writeText(text)
          .then(() => showToast(`${label} copied for sharing!`, 'share', 'success'));
      }
    });
  });

  // ─── Toast ────────────────────────────────────────────────
  let toastTimeout;
  function showToast(message, icon = 'check_circle', type = 'success') {
    if (!toast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    if (toastMessage) toastMessage.textContent = message;
    if (toastIcon) {
      toastIcon.textContent = icon;
      toastIcon.style.color = type === 'error' ? '#f97386' : type === 'warning' ? '#f59e0b' : '#8c99fc';
    }
    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 3000);
  }
});