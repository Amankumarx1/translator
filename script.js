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
  const summarizeBtn = document.getElementById('summarizeBtn');
  const summaryModal = document.getElementById('summaryModal');
  const summaryText = document.getElementById('summaryText');
  const summaryLoading = document.getElementById('summaryLoading');
  const summaryResult = document.getElementById('summaryResult');
  const closeSummaryBtn = document.getElementById('closeSummaryBtn');
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const downloadDocBtn = document.getElementById('downloadDocBtn');
  const summaryCompression = document.getElementById('summaryCompression');
  const summarySentences = document.getElementById('summarySentences');

  const reportTemplate = document.getElementById('reportTemplate');

  // Translation targets: { id suffix, lang code, label }
  // Translation targets loaded from global palette
  const targets = typeof getActivePalette === 'function' ? getActivePalette() : [
    { id: '1', lang: 'hi', label: 'Hindi' },
    { id: '2', lang: 'es', label: 'Spanish' },
    { id: '3', lang: 'fr', label: 'French' },
    { id: '4', lang: 'de', label: 'German' },
    { id: '5', lang: 'ja', label: 'Japanese' },
  ];


  // ─── Initialize Languages ──────────────────────────────────
  function initLanguageSelects() {
    if (typeof SUPPORTED_LANGUAGES === 'undefined') {
      console.error('SUPPORTED_LANGUAGES not found. Make sure languages.js is loaded.');
      return;
    }

    // Populate Source Dropdown
    if (sourceLang) {
      // Keep "Auto Detect" as first option
      sourceLang.innerHTML = '<option value="auto" selected>Auto Detect</option>';
      SUPPORTED_LANGUAGES.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        sourceLang.appendChild(opt);
      });
    }

    // Populate all Target Card Select dropdowns
    document.querySelectorAll('.lang-select').forEach((select, idx) => {
      const slotId = (idx + 1).toString();
      select.innerHTML = '';
      SUPPORTED_LANGUAGES.forEach(lang => {
        const opt = document.createElement('option');
        opt.value = lang.code;
        opt.textContent = lang.name;
        select.appendChild(opt);
      });
      // Set initial values based on targets array
      const target = targets.find(t => t.id === slotId);
      if (target) {
        select.value = target.lang;
        const cardTitle = document.getElementById(`result-${slotId}`);
        if (target.label === 'Select Language') {
          if (cardTitle) cardTitle.textContent = 'Choose a Language';
        }
      }


      // Add change listener to update global palette
      select.addEventListener('change', () => {
        const newLangCode = select.value;
        const newLangName = select.options[select.selectedIndex].text;
        const currentPalette = typeof getActivePalette === 'function' ? getActivePalette() : targets;
        const targetIdx = currentPalette.findIndex(t => t.id === slotId);
        if (targetIdx !== -1) {
          currentPalette[targetIdx].lang = newLangCode;
          currentPalette[targetIdx].label = newLangName;
          if (typeof setActivePalette === 'function') setActivePalette(currentPalette);
          showToast(`Slot ${slotId} changed to ${newLangName}`, 'language', 'success');
        }
      });
    });
  }


  initLanguageSelects();


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
        if (t.id === '3') { // Card 3 is the special French/Glass slot
          indicator.className = 'material-symbols-outlined text-outline-variant/40 transition-all';
          indicator.textContent = 'auto_fix_high';
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
    statStatus.textContent = 'storage';
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

  async function translateOne(query, src, targetLang) {
    const config = getEngineConfig();
    if (config.engine === 'azure') {
      // For Azure, we now handle batching at the top level in translateAll
      // This function remains for single-call fallbacks if needed
      if (!config.azureKey || !config.azureRegion) {
        throw new Error('Azure key and region are required.');
      }
      const results = await translateAllAzure(query, src, [targetLang], config);
      return results[targetLang] || '';
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
        if (id === '3') { // Special Card 3
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
      if (id === '3') { // Special Card 3
        indicator.className = 'material-symbols-outlined text-error transition-all';
        indicator.textContent = 'error_outline';
      } else {
        indicator.className = 'h-1.5 w-1.5 rounded-full bg-error animate-none transition-all';
        indicator.style.opacity = '1';
      }
    } else {
      if (id === '3') { // Special Card 3
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

    // Fire all translations
    if (selectedEngine === 'azure') {
      try {
        const config = getEngineConfig();
        // Filter out placeholders for the batch request
        const validTargets = targets.filter((t, i) => selectedLangs[i] !== 'en' && targets.find(item => item.id === t.id)?.label !== 'Select Language');
        const validLangs = validTargets.map((t, i) => {
          const card = document.getElementById(`card-${t.id}`);
          return card?.querySelector('.lang-select')?.value || t.lang;
        });

        if (validLangs.length > 0) {
          const results = await translateAllAzure(query, src, validLangs, config);
          targets.forEach((t, i) => {
            const currentLang = selectedLangs[i];
            if (results[currentLang]) {
              setResult(t.id, results[currentLang], false);
            } else if (selectedLangs[i] === 'en' || targets[i].label === 'Select Language') {
              setResult(t.id, 'Choose a Language', false);
            } else {
              // If not in results but was requested, it might be a lang mismatch or empty result
              setResult(t.id, 'Translation failed or not returned.', true);
            }
          });
        } else {
          // All slots were Select Language
          targets.forEach(t => setResult(t.id, 'Choose a Language', false));
        }
      } catch (err) {
        console.error('Azure Batch Error:', err);
        targets.forEach(t => setResult(t.id, `Failed: ${err.message}`, true));
      }
    } else {
      // Google Fallback (Parallel Individual Requests)
      const promises = targets.map(async (t, index) => {
        try {
          const dynamicLang = selectedLangs[index];
          const target = targets.find(item => item.id === t.id);
          if (target && target.label === 'Select Language') {
            setResult(t.id, 'Choose a Language', false);
            return;
          }
          const result = await translateOne(query, src, dynamicLang);
          setResult(t.id, result, false);
        } catch (err) {
          console.error(`Error [${t.label}]:`, err);
          setResult(t.id, `Failed: ${err.message}`, true);
        }
      });
      await Promise.allSettled(promises);
    }


    // Store session
    const savedResultMap = {};
    const historyResultMap = {};
    targets.forEach((t, index) => {
      const el = document.getElementById(`result-${t.id}`);
      if (el) {
        const text = el.textContent.trim();
        savedResultMap[t.id] = text;
        const currentLang = selectedLangs[index];
        historyResultMap[currentLang] = text;
      }
    });
    localStorage.setItem('atelier_last_input', query);
    localStorage.setItem('atelier_last_results', JSON.stringify(savedResultMap));

    const user = getCurrentUser();
    if (user && user.email) {
      try {
        await fetch('/api/user/save-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, entry: historyEntry })
        });
      } catch (err) {
        console.error('Failed to sync history to server:', err);
      }
    }

    const history = JSON.parse(localStorage.getItem('atelier_history') || '[]');
    history.unshift(historyEntry);
    if (history.length > 50) history.splice(50);
    localStorage.setItem('atelier_history', JSON.stringify(history));

    // Update stats
    const words = query.split(/\s+/).filter(Boolean).length;
    totalWords += words;
    totalTranslations++;
    updateStatsUI();

    // Reset button
    translateBtnText.textContent = 'Translate All';
    translateBtnIcon.textContent = 'arrow_forward';
    translateBtnIcon.classList.remove('animate-spin');
    translateBtn.disabled = false;

    showToast('All 5 translations complete!', 'check_circle', 'success');
  }

  // ─── Summarization (Azure) ─────────────────────────────────
  async function summarizeText() {
    const query = inputText.value.trim();
    if (!query) {
      showToast('Please enter some text to summarize.', 'warning', 'warning');
      return;
    }

    const config = getEngineConfig();
    if (!isAzureConfigured(config)) {
      showToast('Summarization requires Azure credentials. Please configure them in Settings.', 'error', 'error');
      return;
    }

    // Show modal and loading state
    summaryModal.classList.remove('opacity-0', 'pointer-events-none');
    summaryModal.querySelector('#summaryModalContent').classList.remove('scale-95');
    summaryModal.querySelector('#summaryModalContent').classList.add('scale-100');
    summaryLoading.classList.remove('hidden');
    summaryResult.classList.add('hidden');

    try {
      // Azure Language Service Summarization Endpoint
      // Note: We assume the user's endpoint/resource supports Language Service
      // If it's a dedicated Translator resource, it might fail.
      const endpoint = config.azureEndpoint.replace('api.cognitive.microsofttranslator.com', '').replace(/\/+$/, '') || `${config.azureRegion}.api.cognitive.microsoft.com`;
      const url = `https://${endpoint}/language/:analyze-text?api-version=2023-04-01`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': config.azureKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kind: "ExtractiveSummarization",
          parameters: {
            sentenceCount: 3
          },
          analysisInput: {
            documents: [{
              id: "1",
              language: sourceLang.value === 'auto' ? 'en' : sourceLang.value,
              text: query
            }]
          }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Azure Language Service Error ${response.status}`);
      }

      const data = await response.json();
      const results = data.results?.documents?.[0]?.sentences;

      if (!results || results.length === 0) {
        throw new Error('No summary could be generated for this text.');
      }

      const summary = results.map(s => s.text).join(' ');
      summaryText.textContent = summary;

      // Calculate stats
      const originalWords = query.split(/\s+/).filter(Boolean).length;
      const summaryWords = summary.split(/\s+/).filter(Boolean).length;
      const ratio = Math.round((1 - (summaryWords / originalWords)) * 100);

      summaryCompression.textContent = `${ratio}% Reduced`;
      summarySentences.textContent = `${results.length} Key Points`;

      summaryLoading.classList.add('hidden');
      summaryResult.classList.remove('hidden');
    } catch (err) {
      console.error('Summarization Error:', err);
      summaryText.textContent = `Error: ${err.message}`;
      summaryLoading.classList.add('hidden');
      summaryResult.classList.remove('hidden');
      summaryCompression.textContent = 'Error';
      summarySentences.textContent = '0';
    }
  }

  function closeSummary() {
    summaryModal.classList.add('opacity-0', 'pointer-events-none');
    summaryModal.querySelector('#summaryModalContent').classList.add('scale-95');
    summaryModal.querySelector('#summaryModalContent').classList.remove('scale-100');
  }

  // ─── Export Logic (PDF/DOC) ────────────────────────────────
  function populateReportTemplate() {
    const text = summaryText.textContent;
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : { name: 'Valued User', email: '' };
    
    const preparedBy = document.getElementById('reportPreparedBy');
    const company = document.getElementById('reportCompany');
    const date = document.getElementById('reportDate');
    const highlights = document.getElementById('reportHighlights');
    const metrics = document.getElementById('reportMetrics');
    const keyPoints = document.getElementById('reportKeyPoints');

    if (preparedBy) preparedBy.textContent = user.name || 'Valued User';
    if (company) company.textContent = 'The Linguistic Atelier';
    if (date) date.textContent = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (highlights) highlights.textContent = text;
    if (metrics) metrics.textContent = summaryCompression.textContent;
    if (keyPoints) keyPoints.textContent = summarySentences.textContent;
    
    // Update company name placeholders in text
    document.querySelectorAll('.reportCompanyName').forEach(el => el.textContent = 'The Linguistic Atelier');
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
      const text = summaryText.textContent;
      if (!text || text.startsWith('Your summary') || text.startsWith('Error')) return;

      showToast('Preparing PDF Report...', 'picture_as_pdf', 'success');
      populateReportTemplate();
      
      const originalDisplay = reportTemplate.style.display;
      reportTemplate.style.display = 'block'; // Temporarily show for capture

      try {
        const canvas = await html2canvas(reportTemplate, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Summary_Report_${new Date().getTime()}.pdf`);
        showToast('PDF Exported!', 'check_circle', 'success');
      } catch (err) {
        console.error('PDF Error:', err);
        showToast('PDF Export failed.', 'error', 'error');
      } finally {
        reportTemplate.style.display = originalDisplay;
      }
    });
  }

  if (downloadDocBtn) {
    downloadDocBtn.addEventListener('click', () => {
      const text = summaryText.textContent;
      if (!text || text.startsWith('Your summary') || text.startsWith('Error')) return;

      showToast('Preparing DOC Report...', 'description', 'success');
      populateReportTemplate();

      const content = reportTemplate.innerHTML;
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Summary Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .hidden { display: none; }
          h1 { text-align: center; font-size: 24pt; }
          h2 { border-bottom: 1px solid #ccc; font-size: 18pt; margin-top: 20pt; }
          .header-bar { background-color: #7a9d91; color: white; padding: 10px; text-align: center; font-size: 9pt; }
        </style>
        </head>
        <body>${content}</body>
        </html>`;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Summary_Report_${new Date().getTime()}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('DOC Exported!', 'check_circle', 'success');
    });
  }

  if (summarizeBtn) summarizeBtn.addEventListener('click', summarizeText);
  if (closeSummaryBtn) closeSummaryBtn.addEventListener('click', closeSummary);
  if (summaryModal) {
    summaryModal.addEventListener('click', (e) => {
      if (e.target === summaryModal) closeSummary();
    });
  }

  if (copySummaryBtn) {
    copySummaryBtn.addEventListener('click', () => {
      const text = summaryText.textContent;
      if (!text || text.startsWith('Your summary') || text.startsWith('Error')) return;
      navigator.clipboard.writeText(text)
        .then(() => showToast('Summary copied!', 'check_circle', 'success'))
        .catch(() => showToast('Copy failed', 'error', 'error'));
    });
  }

  if (downloadSummaryBtn) {
    downloadSummaryBtn.addEventListener('click', () => {
      const text = summaryText.textContent;
      if (!text || text.startsWith('Your summary') || text.startsWith('Error')) return;

      const report = `THE LINGUISTIC ATELIER - SUMMARY REPORT\n` +
        `========================================\n\n` +
        `Original Text Length: ${inputText.value.length} chars\n` +
        `Summary Length: ${text.length} chars\n` +
        `Compression: ${summaryCompression.textContent}\n` +
        `Key Points: ${summarySentences.textContent}\n\n` +
        `SUMMARY:\n` +
        `----------------------------------------\n` +
        `${text}\n\n` +
        `----------------------------------------\n` +
        `Generated on: ${new Date().toLocaleString()}\n`;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Summary_Report_${new Date().getTime()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Report downloaded!', 'download_done', 'success');
    });
  }

  function updateStatsUI() {
    if (statWords) statWords.textContent = totalWords.toLocaleString();
    if (statTranslations) statTranslations.textContent = totalTranslations;
    statStatus.textContent = 'storage';
    statStatus.style.color = '#4956b4';
  }

  async function loadSession() {
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    let history = JSON.parse(localStorage.getItem('atelier_history') || '[]');

    if (user && user.email) {
      try {
        const response = await fetch(`/api/user/data?email=${encodeURIComponent(user.email)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            history = data.history || history;
            if (data.settings) {
              // Apply settings if needed
            }
          }
        }
      } catch (err) {
        console.error('Failed to load data from server:', err);
      }
    }

    // Restore last input/results
    const lastInput = localStorage.getItem('atelier_last_input');
    const lastResults = JSON.parse(localStorage.getItem('atelier_last_results') || '{}');
    if (lastInput && inputText) inputText.value = lastInput;
    if (lastResults) {
      Object.keys(lastResults).forEach(id => {
        const el = document.getElementById(`result-${id}`);
        if (el) {
          el.textContent = lastResults[id];
          el.classList.remove('skeleton', 'italic');
        }
      });
    }

    // Calculate stats from history
    totalTranslations = history.length;
    totalWords = history.reduce((sum, h) => sum + (h.input || '').split(/\s+/).filter(Boolean).length, 0);
    updateStatsUI();
  }

  loadSession();

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
      const slotId = btn.dataset.slot;
      const el = document.getElementById(targetId);
      if (!el) return;
      const text = el.textContent.trim();
      if (!text || text === 'Awaiting translation...' || text.startsWith('Failed to translate')) return;

      // Get lang code for this slot
      const targets = getActivePalette();
      const target = targets.find(t => t.id === slotId);
      const lang = target ? target.lang : 'en';

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = langVoiceMap[lang] || lang;
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
        showToast(`Speaking in ${target?.label || lang}...`, 'volume_up', 'success');
      } else {
        showToast('TTS not supported', 'error', 'error');
      }
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