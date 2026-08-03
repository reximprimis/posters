// Logika panelu Plakaty (biblioteka, generowanie, modal, eksport Shopify).
// Wydzielone z inline <script> na koncu index.html - ladowane na tej samej pozycji.

(function () {
  const SIZE_ORDER = ['13x18', '21x30', '30x40', '40x50', '50x70', '70x100'];
  const THEME_KEY = 'plakaty-theme';

  const SUN_SVG =
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>';
  const MOON_SVG = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

  function getStoredTheme() {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === 'light' || v === 'dark') return v;
    } catch (_) {}
    return 'dark';
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {}
    const btn = document.getElementById('themeToggle');
    const glyph = document.getElementById('themeToggleGlyph');
    const label = document.getElementById('themeToggleText');
    if (glyph) {
      glyph.innerHTML = theme === 'light' ? MOON_SVG : SUN_SVG;
    }
    if (label) {
      label.textContent = theme === 'light' ? 'Noc' : 'Dzień';
    }
    if (btn) {
      btn.setAttribute('aria-label', theme === 'light' ? 'Włącz tryb nocny' : 'Włącz tryb dzienny');
      btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    }
  }

  const els = {
    statsRow: document.getElementById('statsRow'),
    categoryFilterListbox: document.getElementById('categoryFilterListbox'),
    libraryStyleFilterListbox: document.getElementById('libraryStyleFilterListbox'),
    categoryFilterTriggerLabel: document.getElementById('categoryFilterTriggerLabel'),
    categoryFilterTriggerCount: document.getElementById('categoryFilterTriggerCount'),
    filterResultsMeta: document.getElementById('filterResultsMeta'),
    filterApplyBtn: document.getElementById('filterApplyBtn'),
    filterClearBtn: document.getElementById('filterClearBtn'),
    filterPendingHint: document.getElementById('filterPendingHint'),
    statusFilterGroup: document.getElementById('statusFilterGroup'),
    mockupFilterGroup: document.getElementById('mockupFilterGroup'),
    modalApprovedPrint: document.getElementById('modalApprovedPrint'),
    modalApprovalFeedback: document.getElementById('modalApprovalFeedback'),
    posterGrid: document.getElementById('posterGrid'),
    search: document.getElementById('search'),
    refreshBtn: document.getElementById('refreshBtn'),
    refreshBtnHero: document.getElementById('refreshBtnHero'),
    updatedAt: document.getElementById('updatedAt'),
    emptyState: document.getElementById('emptyState'),
    errorState: document.getElementById('errorState'),
    modal: document.getElementById('modal'),
    modalDetailTiled: document.getElementById('modalDetailTiled'),
    modalClose: document.getElementById('modalClose'),
    modalImg: document.getElementById('modalImg'),
    modalTitle: document.getElementById('modalTitle'),
    modalCategoryValue: document.getElementById('modalCategoryValue'),
    modalStyleValue: document.getElementById('modalStyleValue'),
    modalMoveCategory: document.getElementById('modalMoveCategory'),
    modalMoveStyle: document.getElementById('modalMoveStyle'),
    modalMoveBtn: document.getElementById('modalMoveBtn'),
    modalMoveFeedback: document.getElementById('modalMoveFeedback'),
    modalCopyTitle: document.getElementById('modalCopyTitle'),
    modalCopyCategory: document.getElementById('modalCopyCategory'),
    modalCopyStyle: document.getElementById('modalCopyStyle'),
    modalCopyMetaLine: document.getElementById('modalCopyMetaLine'),
    modalListingText: document.getElementById('modalListingText'),
    modalListingEmptyHint: document.getElementById('modalListingEmptyHint'),
    modalGenerateListingBtn: document.getElementById('modalGenerateListingBtn'),
    modalCopyListing: document.getElementById('modalCopyListing'),
    modalListingFeedback: document.getElementById('modalListingFeedback'),
    modalPrompt: document.getElementById('modalPrompt'),
    modalPromptLlm: document.getElementById('modalPromptLlm'),
    modalPromptBlock: document.getElementById('modalPromptBlock'),
    modalPromptTile: document.getElementById('modalPromptTile'),
    modalPromptEmpty: document.getElementById('modalPromptEmpty'),
    modalDraftPromptBtn: document.getElementById('modalDraftPromptBtn'),
    modalCopyPrompt: document.getElementById('modalCopyPrompt'),
    modalCopyFeedback: document.getElementById('modalCopyFeedback'),
    modalVisualOpenLightbox: document.getElementById('modalVisualOpenLightbox'),
    modalPreviewThumbs: document.getElementById('modalPreviewThumbs'),
    modalPreviewFullBtn: document.getElementById('modalPreviewFullBtn'),
    modalPreviewFramedBtn: document.getElementById('modalPreviewFramedBtn'),
    modalPreviewFullImg: document.getElementById('modalPreviewFullImg'),
    modalPreviewFramedImg: document.getElementById('modalPreviewFramedImg'),
    modalTopPremiumMenu: document.getElementById('modalTopPremiumMenu'),
    modalPremiumPrintAction: document.getElementById('modalPremiumPrintAction'),
    modalPremiumPrintBadge: document.getElementById('modalPremiumPrintBadge'),
    modalOpenFolderBtnTop: document.getElementById('modalOpenFolderBtnTop'),
    modalPdfVariantsGrid: document.getElementById('modalPdfVariantsGrid'),
    modalFileVariantsGrid: document.getElementById('modalFileVariantsGrid'),
    modalTechnicalMetaDl: document.getElementById('modalTechnicalMetaDl'),
    modalLightbox: document.getElementById('modalLightbox'),
    modalLightboxShell: document.getElementById('modalLightboxShell'),
    modalLightboxFrame: document.getElementById('modalLightboxFrame'),
    modalLightboxImg: document.getElementById('modalLightboxImg'),
    modalLightboxStage: document.getElementById('modalLightboxStage'),
    modalLightboxLens: document.getElementById('modalLightboxLens'),
    modalLightboxPrev: document.getElementById('modalLightboxPrev'),
    modalLightboxNext: document.getElementById('modalLightboxNext'),
    modalLightboxCounter: document.getElementById('modalLightboxCounter'),
    modalLightboxZoomOut: document.getElementById('modalLightboxZoomOut'),
    modalLightboxZoomIn: document.getElementById('modalLightboxZoomIn'),
    modalLightboxZoomReset: document.getElementById('modalLightboxZoomReset'),
    modalLightboxZoomReadout: document.getElementById('modalLightboxZoomReadout'),
    modalLightboxVariantGroup: document.getElementById('modalLightboxVariantGroup'),
    modalLightboxFull: document.getElementById('modalLightboxFull'),
    modalLightboxFramedChip: document.getElementById('modalLightboxFramedChip'),
    modalLightboxLoupe: document.getElementById('modalLightboxLoupe'),
    modalLightboxInfoBtn: document.getElementById('modalLightboxInfoBtn'),
    modalLightboxMeta: document.getElementById('modalLightboxMeta'),
    modalLightboxMetaDl: document.getElementById('modalLightboxMetaDl'),
    modalLightboxClose: document.getElementById('modalLightboxClose'),
    studioCategory: document.getElementById('studioCategory'),
    studioCategoryHint: document.getElementById('studioCategoryHint'),
    studioTitle: document.getElementById('studioTitle'),
    studioStyle: document.getElementById('studioStyle'),
    studioPrompt: document.getElementById('studioPrompt'),
    studioSourceDalle: document.getElementById('studioSourceDalle'),
    studioSourceManual: document.getElementById('studioSourceManual'),
    studioManualUploadRow: document.getElementById('studioManualUploadRow'),
    btnDraftPrompt: document.getElementById('btnDraftPrompt'),
    btnClearStudio: document.getElementById('btnClearStudio'),
    studioUploadInput: document.getElementById('studioUploadInputFile'),
    studioUploadDropzone: document.getElementById('studioUploadDropzone'),
    studioUploadCategory: document.getElementById('studioUploadCategory'),
    studioUploadTitle: document.getElementById('studioUploadTitle'),
    studioUploadStyle: document.getElementById('studioUploadStyle'),
    btnPickStudioImage: document.getElementById('btnPickStudioImage'),
    btnUploadStudioImage: document.getElementById('btnUploadStudioImage'),
    studioUploadNote: document.getElementById('studioUploadNote'),
    btnGeneratePoster: document.getElementById('btnGeneratePoster'),
    studioStatus: document.getElementById('studioStatus'),
    btnShopifyExportApproved: document.getElementById('btnShopifyExportApproved'),
    btnShopifyExportAll: document.getElementById('btnShopifyExportAll'),
    btnShopifyThumbsPush: document.getElementById('btnShopifyThumbsPush'),
    btnShopifySaveSettings: document.getElementById('btnShopifySaveSettings'),
    shopifyOnlyNewToggle: document.getElementById('shopifyOnlyNewToggle'),
    btnShopifyReadiness: document.getElementById('btnShopifyReadiness'),
    shopifySizeRow: document.getElementById('shopifySizeRow'),
    shopifyPrice13x18: document.getElementById('shopifyPrice13x18'),
    shopifyPrice21x30: document.getElementById('shopifyPrice21x30'),
    shopifyPrice30x40: document.getElementById('shopifyPrice30x40'),
    shopifyPrice40x50: document.getElementById('shopifyPrice40x50'),
    shopifyPrice50x70: document.getElementById('shopifyPrice50x70'),
    shopifyPrice70x100: document.getElementById('shopifyPrice70x100'),
    shopifyCsvOpenLink: document.getElementById('shopifyCsvOpenLink'),
    shopifyExportStatus: document.getElementById('shopifyExportStatus'),
    shopifyReadinessStatus: document.getElementById('shopifyReadinessStatus'),
    studioPreviewModal: document.getElementById('studioPreviewModal'),
    studioPreviewImgFull: document.getElementById('studioPreviewImgFull'),
    studioPreviewAccept: document.getElementById('studioPreviewAccept'),
    studioPreviewReject: document.getElementById('studioPreviewReject'),
    studioPreviewClose: document.getElementById('studioPreviewClose'),
    studioModeManual: document.getElementById('studioModeManual'),
    studioModeAuto: document.getElementById('studioModeAuto'),
    studioPanelManual: document.getElementById('studioPanelManual'),
    studioPanelAuto: document.getElementById('studioPanelAuto'),
    studioSub: document.getElementById('studioSub'),
    studioAutoScope: document.getElementById('studioAutoScope'),
    studioAutoStyle: document.getElementById('studioAutoStyle'),
    studioAutoCount: document.getElementById('studioAutoCount'),
    studioAutoCommand: document.getElementById('studioAutoCommand'),
    studioAutoNpmHint: document.getElementById('studioAutoNpmHint'),
    studioAutoCopyFeedback: document.getElementById('studioAutoCopyFeedback'),
    btnCopyStudioAutoCommand: document.getElementById('btnCopyStudioAutoCommand'),
    btnRunStudioAutoBatch: document.getElementById('btnRunStudioAutoBatch'),
    studioAutoRunStatus: document.getElementById('studioAutoRunStatus'),
    studioAutoProgress: document.getElementById('studioAutoProgress'),
    studioAutoProgressFill: document.getElementById('studioAutoProgressFill'),
    studioAutoProgressMeta: document.getElementById('studioAutoProgressMeta'),
    librarySelectionDock: document.getElementById('librarySelectionDock'),
    libraryCountRemove: document.getElementById('libraryCountRemove'),
    libraryCountApprove: document.getElementById('libraryCountApprove'),
    libraryBasketList: document.getElementById('libraryBasketList'),
    libraryApproveChipList: document.getElementById('libraryApproveChipList'),
    libraryRemoveChipGroup: document.getElementById('libraryRemoveChipGroup'),
    libraryApproveChipGroup: document.getElementById('libraryApproveChipGroup'),
    librarySelectionClear: document.getElementById('librarySelectionClear'),
    libraryBulkApproveBtn: document.getElementById('libraryBulkApproveBtn'),
    libraryBasketConfirm: document.getElementById('libraryBasketConfirm'),
    modalAddToRemoveBasket: document.getElementById('modalAddToRemoveBasket'),
    modalBasketFeedback: document.getElementById('modalBasketFeedback'),
  };

  const STUDIO_AUTO_FLASH_KEY = 'plakatyStudioAutoFlash';
  let studioAutoProgressInterval = null;

  const STUDIO_MODE_KEY = 'plakatyStudioMode';
  const STUDIO_HEADING_MANUAL = 'Twórz plakaty z pomocą AI';
  const STUDIO_HEADING_AUTO = 'Generowanie automatyczne';
  const STUDIO_SUB_MANUAL_HTML =
    'OpenAI układa prompt (gdy jest klucz) → generator obrazów → podgląd → zapis <strong>tylko PNG</strong>. PDF wygenerujesz później z Biblioteki.';

  function getStoredStudioMode() {
    try {
      const v = localStorage.getItem(STUDIO_MODE_KEY);
      if (v === 'auto' || v === 'manual' || v === 'upload') return v;
    } catch (_) {}
    return 'manual';
  }

  function setStudioMode(mode) {
    // mode: 'upload' | 'manual' | 'auto'
    const flowOpts = {
      upload: document.getElementById('genFlowUpload'),
      manual: document.getElementById('genFlowManual'),
      auto:   document.getElementById('genFlowAuto'),
    };
    const flowPanels = {
      upload: document.getElementById('genFlowPanelUpload'),
      manual: document.getElementById('genFlowPanelManual'),
      auto:   document.getElementById('genFlowPanelAuto'),
    };
    Object.keys(flowOpts).forEach(function(k) {
      if (flowOpts[k]) flowOpts[k].classList.toggle('is-active', k === mode);
      if (flowPanels[k]) flowPanels[k].classList.toggle('is-active', k === mode);
    });
    // Legacy hidden flags for panels still used by other JS
    if (els.studioPanelManual) els.studioPanelManual.hidden = false;
    if (els.studioPanelAuto)   els.studioPanelAuto.hidden   = false;
    const h = document.getElementById('studio-heading');
    if (h) {
      h.textContent = mode === 'auto' ? STUDIO_HEADING_AUTO
        : mode === 'upload' ? 'Dodaj własne zdjęcie'
        : STUDIO_HEADING_MANUAL;
    }
    try {
      localStorage.setItem(STUDIO_MODE_KEY, mode);
    } catch (_) {}
    if (mode === 'auto') updateStudioAutoCommand();
  }

  // Flow selector click handlers
  ['upload','manual','auto'].forEach(function(m) {
    var btn = document.getElementById('genFlow' + m.charAt(0).toUpperCase() + m.slice(1));
    if (btn) btn.addEventListener('click', function() { setStudioMode(m); });
  });

  let activeStudioPreviewId = null;
  let studioUploadedImageDataUrl = '';
  let studioImageSource = 'dalle';
  /** Aktualnie otwarty plakat w modalu (referencja z flatItems). */
  let modalPosterItem = null;
  /** 'full' | 'framed' */
  let modalPreviewVariant = 'full';

  /** Kolejka lightboxa = ta sama co siatka (filtry). */
  let lightboxPlaylist = [];
  let lightboxIndex = 0;
  let lightboxLoupeActive = false;
  let lightboxZoom = 1;
  let lightboxPanX = 0;
  let lightboxPanY = 0;
  let lightboxPanning = false;
  let lightboxPanStartX = 0;
  let lightboxPanStartY = 0;
  let lightboxPanOriginX = 0;
  let lightboxPanOriginY = 0;
  let lightboxLoupeSize = 220;
  let modalTopView = 'workflow';
  const LIGHTBOX_ZOOM_MIN = 0.5;
  const LIGHTBOX_ZOOM_MAX = 20;
  const LIGHTBOX_ZOOM_STEP = 0.2;
  const LIGHTBOX_LOUPE_SIZE_MIN = 120;
  const LIGHTBOX_LOUPE_SIZE_MAX = 360;
  const LIGHTBOX_LOUPE_SIZE_STEP = 16;

  function applyLightboxZoom() {
    const bounded = Math.max(LIGHTBOX_ZOOM_MIN, Math.min(LIGHTBOX_ZOOM_MAX, lightboxZoom));
    lightboxZoom = Number(bounded.toFixed(2));
    if (els.modalLightboxImg) {
      els.modalLightboxImg.style.transform = `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxZoom})`;
    }
    if (els.modalLightboxZoomReadout) {
      els.modalLightboxZoomReadout.textContent = `${Math.round(lightboxZoom * 100)}%`;
    }
    if (els.modalLightboxZoomOut) {
      els.modalLightboxZoomOut.disabled = lightboxZoom <= LIGHTBOX_ZOOM_MIN + 0.001;
    }
    if (els.modalLightboxZoomIn) {
      els.modalLightboxZoomIn.disabled = lightboxZoom >= LIGHTBOX_ZOOM_MAX - 0.001;
    }
    updateLightboxPanUi();
  }

  function updateLightboxPanUi() {
    if (!els.modalLightboxStage) return;
    const canPan = !lightboxLoupeActive && lightboxZoom > 1.001;
    els.modalLightboxStage.classList.toggle('modal-lightbox-stage--pan-ready', canPan && !lightboxPanning);
    els.modalLightboxStage.classList.toggle('modal-lightbox-stage--panning', canPan && lightboxPanning);
  }

  function changeLightboxZoom(delta) {
    lightboxZoom += delta;
    applyLightboxZoom();
  }

  function resetLightboxZoom() {
    lightboxZoom = 1;
    lightboxPanX = 0;
    lightboxPanY = 0;
    lightboxPanning = false;
    applyLightboxZoom();
  }

  function setStudioImageSource(source) {
    studioImageSource = source === 'manual' ? 'manual' : 'dalle';
    const isManual = studioImageSource === 'manual';
    if (els.studioSourceDalle) {
      const on = !isManual;
      els.studioSourceDalle.classList.toggle('is-active', on);
      els.studioSourceDalle.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (els.studioSourceManual) {
      const on = isManual;
      els.studioSourceManual.classList.toggle('is-active', on);
      els.studioSourceManual.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (els.studioManualUploadRow) els.studioManualUploadRow.hidden = !isManual;
  }

  let rawCategories = {};
  let flatItems = [];
  let activeCategory = 'all';
  /** Zastosowane kryteria (siatka + wiersz metadanych). */
  let searchQuery = '';
  /** Szkic w UI zanim użytkownik kliknie „Zastosuj filtry”. */
  let draftCategory = 'all';
  /** Filtr statusu: all | new | approved */
  let activeStatusFilter = 'all';
  let draftStatusFilter = 'all';
  /** Filtr mockupów: all | missing | has */
  let activeMockupFilter = 'all';
  let draftMockupFilter = 'all';
  /** Filtr stylu: all | dokładna nazwa z artStyle */
  let activeStyleFilter = 'all';
  let draftStyleFilter = 'all';
  /** Style z /api/generation-config (kolejność listy filtra) */
  let configArtStylesList = [];
  /** Kategorie z /api/generation-config (kanoniczna lista dla studio + filtrów biblioteki). */
  let configCategoriesList = [];
  /** Mapa dozwolonych stylów per kategoria z /api/generation-config. */
  let categoryStylesMap = {};
  /** Kolekcje pomieszczeń (tagi sprzedażowe) per kategoria — nie są kategoriami generatora. */
  let categoryRoomCollectionsMap = {};
  let categoryHints = {};
  /** Liczniki plakatów wg kategorii z API + __all */
  let categoryCountMap = { __all: 0 };

  /** Klucz: imagePath z API — zaznaczenia na karcie (usunięcie / zatwierdzenie). */
  const removeBasket = new Map();
  const approveBasket = new Map();

  function removeBasketKeyFromItem(item) {
    return item && item.imagePath ? String(item.imagePath) : '';
  }

  function renderSelectionDock() {
    const nR = removeBasket.size;
    const nA = approveBasket.size;
    const show = nR > 0 || nA > 0;
    if (els.librarySelectionDock) els.librarySelectionDock.hidden = !show;
    if (els.libraryCountRemove) els.libraryCountRemove.textContent = String(nR);
    if (els.libraryCountApprove) els.libraryCountApprove.textContent = String(nA);
    if (els.libraryBasketConfirm) els.libraryBasketConfirm.disabled = nR === 0;
    if (els.libraryBulkApproveBtn) els.libraryBulkApproveBtn.disabled = nA === 0;
    if (els.libraryRemoveChipGroup) els.libraryRemoveChipGroup.hidden = nR === 0;
    if (els.libraryApproveChipGroup) els.libraryApproveChipGroup.hidden = nA === 0;

    if (els.libraryBasketList) {
      els.libraryBasketList.innerHTML = '';
      for (const [pathKey, meta] of removeBasket.entries()) {
        const li = document.createElement('li');
        li.className = 'library-basket-chip';
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'library-basket-chip-remove';
        rm.setAttribute('aria-label', 'Cofnij zaznaczenie do usunięcia');
        rm.textContent = '×';
        rm.addEventListener('click', () => {
          removeBasket.delete(pathKey);
          renderSelectionDock();
          renderGrid();
        });
        const titleSpan = document.createElement('span');
        titleSpan.className = 'library-basket-chip-title';
        titleSpan.textContent = meta.title || '—';
        const catSpan = document.createElement('span');
        catSpan.className = 'library-basket-chip-meta';
        catSpan.textContent = meta.category || '';
        li.appendChild(titleSpan);
        li.appendChild(catSpan);
        li.appendChild(rm);
        els.libraryBasketList.appendChild(li);
      }
    }

    if (els.libraryApproveChipList) {
      els.libraryApproveChipList.innerHTML = '';
      for (const [pathKey, meta] of approveBasket.entries()) {
        const li = document.createElement('li');
        li.className = 'library-basket-chip library-basket-chip--approve';
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'library-basket-chip-remove';
        rm.setAttribute('aria-label', 'Cofnij zaznaczenie do zatwierdzenia');
        rm.textContent = '×';
        rm.addEventListener('click', () => {
          approveBasket.delete(pathKey);
          renderSelectionDock();
          renderGrid();
        });
        const titleSpan = document.createElement('span');
        titleSpan.className = 'library-basket-chip-title';
        titleSpan.textContent = meta.title || '—';
        const catSpan = document.createElement('span');
        catSpan.className = 'library-basket-chip-meta';
        catSpan.textContent = meta.category || '';
        li.appendChild(titleSpan);
        li.appendChild(catSpan);
        li.appendChild(rm);
        els.libraryApproveChipList.appendChild(li);
      }
    }
  }

  function syncSelectionBasketsWithLibrary() {
    const valid = new Set(flatItems.map((x) => x.imagePath).filter(Boolean));
    for (const k of [...removeBasket.keys()]) {
      if (!valid.has(k)) removeBasket.delete(k);
    }
    for (const k of [...approveBasket.keys()]) {
      if (!valid.has(k)) approveBasket.delete(k);
      else {
        const it = flatItems.find((x) => x.imagePath === k);
        if (it && it.approvedForPrint) approveBasket.delete(k);
      }
    }
    renderSelectionDock();
  }

  function setRemoveBasketChecked(item, checked) {
    const k = removeBasketKeyFromItem(item);
    if (!k) return;
    if (checked) removeBasket.set(k, { title: item.title, category: item.category });
    else removeBasket.delete(k);
    renderSelectionDock();
    renderGrid();
  }

  function setApproveBasketChecked(item, checked) {
    const k = removeBasketKeyFromItem(item);
    if (!k || item.approvedForPrint) return;
    if (checked) approveBasket.set(k, { title: item.title, category: item.category });
    else approveBasket.delete(k);
    renderSelectionDock();
    renderGrid();
  }

  function addCurrentModalToRemoveBasket() {
    if (!modalPosterItem) return;
    const k = removeBasketKeyFromItem(modalPosterItem);
    if (!k) return;
    if (removeBasket.has(k)) {
      if (els.modalBasketFeedback) {
        els.modalBasketFeedback.hidden = false;
        els.modalBasketFeedback.textContent = 'Ten plakat jest już oznaczony do usunięcia.';
      }
      return;
    }
    removeBasket.set(k, { title: modalPosterItem.title, category: modalPosterItem.category });
    renderSelectionDock();
    renderGrid();
    if (els.modalBasketFeedback) {
      els.modalBasketFeedback.hidden = false;
      els.modalBasketFeedback.textContent =
        'Oznaczono do usunięcia. Na dole strony kliknij „Usuń zaznaczone”.';
    }
  }

  function sortPdfLinks(links) {
    if (!links || !links.length) return [];
    return [...links].sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a.label);
      const ib = SIZE_ORDER.indexOf(b.label);
      if (ia === -1 && ib === -1) return a.label.localeCompare(b.label);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  function flattenPosters(postersByCat) {
    const list = [];
    for (const cat of Object.keys(postersByCat)) {
      for (const p of postersByCat[cat]) {
        list.push({
          id: p.id || null,
          category: cat,
          title: p.title,
          style: p.style,
          imagePath: p.imagePath,
          imagePathFramed: p.imagePathFramed || '',
          imagePathThumb: p.imagePathThumb || '',
          imagePathFramedThumb: p.imagePathFramedThumb || '',
          pdfLinks: sortPdfLinks(p.pdfLinks || legacyPdfsToLinks(p.pdfs)),
          pdfLinksFramed: sortPdfLinks(p.pdfLinksFramed || []),
          createdAt: p.createdAt || null,
          prompt: p.prompt || '',
          promptLlmLabel: (p.promptLlmLabel || '').trim(),
          promptLlmProvider: (p.promptLlmProvider || '').trim(),
          needsManualMetadata: p.needsManualMetadata === true,
          shopDescription: typeof p.shopDescription === 'string' ? p.shopDescription : '',
          approvedForPrint: p.approvedForPrint === true,
          mockups: p.mockups || null,
          imagePathLifestyle: p.imagePathLifestyle || '',
          shopifyState: p.shopifyState || '',
          shopifyIssues: p.shopifyIssues || [],
        });
      }
    }
    list.sort((a, b) => {
      // Unapproved always first, then by creation date descending
      const aNew = a.approvedForPrint ? 0 : 1;
      const bNew = b.approvedForPrint ? 0 : 1;
      if (bNew !== aNew) return bNew - aNew;
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
    return list;
  }

  function legacyPdfsToLinks(pdfs) {
    if (!pdfs || !pdfs.length) return [];
    return pdfs.map((href, idx) => {
      const h = String(href || '');
      const path = h.startsWith('/') ? h : '/' + h.replace(/^\/+/, '');
      return {
        label: SIZE_ORDER[idx] || 'format',
        href: path,
      };
    });
  }

  function renderStats(stats) {
    els.statsRow.innerHTML = [
      { value: stats.totalPosters, label: 'Plakatów' },
      { value: stats.categories, label: 'Kategorii' },
      { value: stats.totalPdfs, label: 'Plików PDF' },
    ]
      .map(
        (s) => `
      <div class="stat-card">
        <div class="stat-value">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    `
      )
      .join('');
  }

  function plCountPosters(n) {
    const x = Number(n) || 0;
    if (x === 1) return '1 plakat';
    const r10 = x % 10;
    const r100 = x % 100;
    if (r10 >= 2 && r10 <= 4 && (r100 < 10 || r100 >= 20)) return x + ' plakaty';
    return x + ' plakatów';
  }

  function buildCategoryCountMap(postersByCat) {
    const m = { __all: 0 };
    for (const [cat, arr] of Object.entries(postersByCat || {})) {
      const len = Array.isArray(arr) ? arr.length : 0;
      m[cat] = len;
      m.__all += len;
    }
    return m;
  }

  function syncCategoryFilterTrigger() {
    const counts = categoryCountMap;
    const label = draftCategory === 'all' ? 'Wszystkie kategorie' : draftCategory;
    els.categoryFilterTriggerLabel.textContent = label;
    const n = draftCategory === 'all' ? counts.__all || 0 : counts[draftCategory] || 0;
    if (draftCategory === 'all') {
      els.categoryFilterTriggerCount.textContent =
        (counts.__all || 0) === 0 ? 'Brak plakatów w bibliotece' : `${plCountPosters(n)} w bibliotece`;
    } else {
      els.categoryFilterTriggerCount.textContent = `${plCountPosters(n)} w tej kategorii`;
    }
  }

  function syncCategoryFilterSelection() {
    els.categoryFilterListbox.querySelectorAll('.filter-category-option').forEach((btn) => {
      const cat = btn.getAttribute('data-cat');
      const sel =
        (cat === 'all' && draftCategory === 'all') || (cat !== 'all' && cat === draftCategory);
      btn.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
  }

  function itemHasMockups(item) {
    const m = item && item.mockups;
    return !!(m && m.frame && m.interior);
  }

  function syncMockupFilterButtons() {
    if (!els.mockupFilterGroup) return;
    els.mockupFilterGroup.querySelectorAll('.filter-status-btn').forEach((btn) => {
      const on = btn.getAttribute('data-mockup') === draftMockupFilter;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-active', on);
    });
  }

  function setDraftMockupFilter(s) {
    draftMockupFilter = s === 'missing' || s === 'has' ? s : 'all';
    syncMockupFilterButtons();
    updatePendingHint();
  }

  function syncStatusFilterButtons() {
    if (!els.statusFilterGroup) return;
    els.statusFilterGroup.querySelectorAll('.filter-status-btn').forEach((btn) => {
      const on = btn.getAttribute('data-status') === draftStatusFilter;
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-active', on);
    });
  }

  function setDraftStatusFilter(s) {
    draftStatusFilter = s === 'new' || s === 'approved' ? s : 'all';
    syncStatusFilterButtons();
    updatePendingHint();
  }

  function libraryFiltersDirty() {
    const q = els.search ? els.search.value : '';
    return (
      q !== searchQuery ||
      draftCategory !== activeCategory ||
      draftStatusFilter !== activeStatusFilter ||
      draftMockupFilter !== activeMockupFilter ||
      draftStyleFilter !== activeStyleFilter
    );
  }

  function updatePendingHint() {
    if (!els.filterPendingHint || !els.filterApplyBtn) return;
    const dirty = libraryFiltersDirty();
    els.filterPendingHint.hidden = !dirty;
    els.filterPendingHint.textContent = dirty
      ? 'Masz niezastosowane kryteria — kliknij „Zastosuj filtry”, aby odświeżyć siatkę.'
      : '';
    els.filterApplyBtn.classList.toggle('is-pending', dirty);
  }

  function applyLibraryFilters() {
    searchQuery = els.search ? els.search.value : '';
    activeCategory = draftCategory;
    activeStatusFilter = draftStatusFilter;
    activeMockupFilter = draftMockupFilter;
    activeStyleFilter = draftStyleFilter;
    updatePendingHint();
    renderGrid();
  }

  function clearLibraryFilters() {
    draftCategory = 'all';
    activeCategory = 'all';
    draftStatusFilter = 'all';
    activeStatusFilter = 'all';
    draftMockupFilter = 'all';
    activeMockupFilter = 'all';
    draftStyleFilter = 'all';
    activeStyleFilter = 'all';
    searchQuery = '';
    if (els.search) els.search.value = '';
    syncCategoryFilterTrigger();
    syncCategoryFilterSelection();
    syncStyleFilterSelection();
    syncStatusFilterButtons();
    syncMockupFilterButtons();
    updatePendingHint();
    renderGrid();
  }

  function renderCategoryFilterList(categories) {
    const sorted = [...categories].sort((a, b) => a.localeCompare(b, 'pl'));
    const counts = categoryCountMap;
    const total = counts.__all || 0;
    const parts = [];
    parts.push(
      `<li role="presentation"><button type="button" role="option" class="filter-category-option" data-cat="all" aria-selected="false"><span class="filter-category-option-name">Wszystkie kategorie</span><span class="filter-category-option-count">${total}</span></button></li>`
    );
    for (const c of sorted) {
      const n = counts[c] || 0;
      parts.push(
        `<li role="presentation"><button type="button" role="option" class="filter-category-option" data-cat="${escapeAttr(c)}" aria-selected="false"><span class="filter-category-option-name">${escapeHtml(
          c
        )}</span><span class="filter-category-option-count">${n}</span></button></li>`
      );
    }
    els.categoryFilterListbox.innerHTML = parts.join('');
    syncCategoryFilterTrigger();
    syncCategoryFilterSelection();
  }

  function buildStyleCountMap(items) {
    const m = { __all: items.length };
    for (const it of items) {
      const s = (it.style && String(it.style).trim()) || '—';
      m[s] = (m[s] || 0) + 1;
    }
    return m;
  }

  function syncStyleFilterSelection() {
    if (!els.libraryStyleFilterListbox) return;
    els.libraryStyleFilterListbox.querySelectorAll('.filter-style-option').forEach((btn) => {
      const st = btn.getAttribute('data-style');
      const sel =
        (st === 'all' && draftStyleFilter === 'all') || (st !== 'all' && st === draftStyleFilter);
      btn.setAttribute('aria-selected', sel ? 'true' : 'false');
    });
  }

  function renderLibraryStyleFilterList() {
    if (!els.libraryStyleFilterListbox) return;
    const byCategory =
      draftCategory !== 'all'
        ? flatItems.filter((it) => (it.category || '') === draftCategory)
        : flatItems;
    const counts = buildStyleCountMap(byCategory);
    const total = counts.__all || 0;
    const seen = new Set();
    const ordered = [];
    const categoryOrdered =
      draftCategory !== 'all'
        ? getAllowedStylesForCategoryUi(draftCategory)
        : getUnionOfAllCategoryStyles();
    for (const s of categoryOrdered) {
      if (s && !seen.has(s)) {
        seen.add(s);
        ordered.push(s);
      }
    }
    for (const it of byCategory) {
      const s = it.style && String(it.style).trim();
      if (s && !seen.has(s)) {
        seen.add(s);
        ordered.push(s);
      }
    }
    ordered.sort((a, b) => a.localeCompare(b, 'pl'));
    const parts = [
      `<li role="presentation"><button type="button" role="option" class="filter-category-option filter-style-option" data-style="all" aria-selected="false"><span class="filter-category-option-name">Wszystkie style</span><span class="filter-category-option-count">${total}</span></button></li>`,
    ];
    for (const s of ordered) {
      const n = counts[s] || 0;
      parts.push(
        `<li role="presentation"><button type="button" role="option" class="filter-category-option filter-style-option" data-style="${escapeAttr(
          s
        )}" aria-selected="false"><span class="filter-category-option-name">${escapeHtml(
          s
        )}</span><span class="filter-category-option-count">${n}</span></button></li>`
      );
    }
    els.libraryStyleFilterListbox.innerHTML = parts.join('');
    syncStyleFilterSelection();
  }

  function setDraftStyle(st) {
    draftStyleFilter = st === 'all' || !st ? 'all' : st;
    syncStyleFilterSelection();
    updatePendingHint();
  }

  function setDraftCategory(cat) {
    draftCategory = cat;
    const allowed = new Set(
      draftCategory === 'all'
        ? getUnionOfAllCategoryStyles()
        : getAllowedStylesForCategoryUi(draftCategory).length
          ? getAllowedStylesForCategoryUi(draftCategory)
          : flatItems
              .filter((it) => (it.category || '') === draftCategory)
              .map((it) => String(it.style || '').trim())
              .filter(Boolean)
    );
    if (draftStyleFilter !== 'all' && !allowed.has(draftStyleFilter)) {
      draftStyleFilter = 'all';
    }
    syncCategoryFilterTrigger();
    syncCategoryFilterSelection();
    renderLibraryStyleFilterList();
    updatePendingHint();
  }

  function updateFilterResultsMeta() {
    const filteredLen = flatItems.filter(matchesFilters).length;
    const total = flatItems.length;
    let msg = `Widocznych na siatce: ${filteredLen} z ${total} plakatów`;
    if (activeCategory !== 'all') msg += ` · kategoria: ${activeCategory}`;
    if (activeStatusFilter === 'new') msg += ' · tylko: nowe (niewybrane do druku)';
    if (activeStatusFilter === 'approved') msg += ' · tylko: zatwierdzone do druku';
    if (activeMockupFilter === 'missing') msg += ' · tylko: bez mockupu Shopify';
    if (activeMockupFilter === 'has') msg += ' · tylko: z mockupem Shopify';
    if (activeStyleFilter !== 'all') msg += ` · styl: ${activeStyleFilter}`;
    if (searchQuery.trim()) msg += ' · wyszukiwanie tekstowe';
    els.filterResultsMeta.textContent = total === 0 && filteredLen === 0 ? '' : msg;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, '&#39;');
  }

  function clampAutoPosterCount(raw) {
    let n = parseInt(String(raw), 10);
    if (Number.isNaN(n)) n = 1;
    return Math.min(50, Math.max(1, n));
  }

  function shellQuoteCliArg(s) {
    const t = String(s);
    if (!/[\s"'\\]/.test(t)) return t;
    return '"' + t.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }

  function buildAutoCliCommand() {
    const n = clampAutoPosterCount(els.studioAutoCount.value);
    const scope = els.studioAutoScope.value;
    const styleVal = els.studioAutoStyle && els.studioAutoStyle.value ? els.studioAutoStyle.value.trim() : '';
    const styleSuffix = styleVal ? ` --style ${shellQuoteCliArg(styleVal)}` : '';
    if (scope === '__all__') {
      const npmAlt = n === 5 && !styleVal ? 'npm run generate-all' : '';
      return { line: `node index.js generate-all ${n}${styleSuffix}`, npmAlt };
    }
    const q = shellQuoteCliArg(scope);
    const npmAlt = n === 5 && scope === 'Botanika' && !styleVal ? 'npm run generate-botanika' : '';
    return { line: `node index.js generate ${q} ${n}${styleSuffix}`, npmAlt };
  }

  function updateStudioAutoCountLabels() {
    const lbl = document.getElementById('studioAutoCountLabel');
    const hint = document.getElementById('studioAutoCountHint');
    const fixed = els.studioAutoStyle && els.studioAutoStyle.value.trim();
    if (lbl) {
      lbl.textContent = fixed
        ? 'Liczba plakatów (łącznie, wybrany styl)'
        : 'Liczba plakatów na każdy styl';
    }
    if (hint) {
      hint.innerHTML = fixed
        ? 'Dokładnie tyle plakatów w <strong>wybranym</strong> stylu — np. Botanika + line art + <strong>1</strong> = jeden plakat. Max 50. Przy „Wszystkie kategorie” — tyle samo w każdej kategorii.'
        : 'Tyle plakatów wygeneruje się <strong>dla każdego</strong> stylu osobno (np. <strong>1</strong> i 8 stylów → 8 plakatów w jednej kategorii). Max 50 na styl. Przy „Wszystkie kategorie” koszt = kategorie × style × liczba.';
    }
  }

  function updateStudioAutoCommand() {
    if (!els.studioAutoCommand || !els.studioAutoCount) return;
    const n = clampAutoPosterCount(els.studioAutoCount.value);
    els.studioAutoCount.value = String(n);
    updateStudioAutoCountLabels();
    const { line, npmAlt } = buildAutoCliCommand();
    els.studioAutoCommand.textContent = line;
    if (els.studioAutoNpmHint) {
      if (npmAlt) {
        els.studioAutoNpmHint.innerHTML =
          'Odpowiednik z <code>package.json</code> (przy liczbie 5, bez <code>--style</code>): <code>' +
          escapeHtml(npmAlt) +
          '</code>';
      } else {
        els.studioAutoNpmHint.innerHTML =
          'Skrypty <code>npm run generate-all</code> / <code>generate-botanika</code> mają stałą liczbę <strong>5</strong> i <strong>nie</strong> przekazują stylu — przy wybranym stylu użyj polecenia z pola powyżej.';
      }
    }
  }

  function fillStudioAutoScopeSelect(categories) {
    if (!els.studioAutoScope) return;
    const cats = Array.isArray(categories) ? categories : [];
    const sorted = [...cats].sort((a, b) => String(a).localeCompare(String(b), 'pl'));
    els.studioAutoScope.innerHTML =
      '<option value="__all__">Wszystkie kategorie</option>' +
      sorted.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join('');
    updateStudioAutoCommand();
  }

  function getStudioAutoAllowedStyles() {
    const scope = els.studioAutoScope ? String(els.studioAutoScope.value || '') : '';
    if (scope && scope !== '__all__') {
      return getAllowedStylesForCategoryUi(scope);
    }
    return getUnionOfAllCategoryStyles();
  }

  function fillStudioAutoStyleSelect(artStyles) {
    if (!els.studioAutoStyle) return;
    if (Array.isArray(artStyles)) configArtStylesList = artStyles;
    const styles = getStudioAutoAllowedStyles();
    const cur = els.studioAutoStyle.value;
    els.studioAutoStyle.innerHTML =
      '<option value="">Wszystkie style (liczba = na każdy styl osobno)</option>' +
      styles.map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`).join('');
    if (cur && [...els.studioAutoStyle.options].some((o) => o.value === cur)) {
      els.studioAutoStyle.value = cur;
    }
    updateStudioAutoCommand();
  }

  function setStudioAutoRunStatus(text, kind) {
    if (!els.studioAutoRunStatus) return;
    els.studioAutoRunStatus.textContent = text || '';
    els.studioAutoRunStatus.classList.remove('is-error', 'is-ok');
    if (kind === 'error') els.studioAutoRunStatus.classList.add('is-error');
    if (kind === 'ok') els.studioAutoRunStatus.classList.add('is-ok');
  }

  function setShopifyExportStatus(text, kind) {
    if (!els.shopifyExportStatus) return;
    els.shopifyExportStatus.textContent = text || '';
    els.shopifyExportStatus.classList.remove('is-error', 'is-ok');
    if (kind === 'error') els.shopifyExportStatus.classList.add('is-error');
    if (kind === 'ok') els.shopifyExportStatus.classList.add('is-ok');
  }

  function setShopifyReadinessStatus(text, kind) {
    if (!els.shopifyReadinessStatus) return;
    els.shopifyReadinessStatus.textContent = text || '';
    els.shopifyReadinessStatus.classList.remove('is-error', 'is-ok');
    if (kind === 'error') els.shopifyReadinessStatus.classList.add('is-error');
    if (kind === 'ok') els.shopifyReadinessStatus.classList.add('is-ok');
  }

  function getShopifySelectedSizes() {
    const nodes = Array.from(document.querySelectorAll('.shopify-size-toggle'));
    return nodes.filter((n) => n && n.checked).map((n) => String(n.value || '').trim()).filter(Boolean);
  }

  function getShopifyPricePayload() {
    const map = {
      '13x18': els.shopifyPrice13x18 && els.shopifyPrice13x18.value,
      '21x30': els.shopifyPrice21x30 && els.shopifyPrice21x30.value,
      '30x40': els.shopifyPrice30x40 && els.shopifyPrice30x40.value,
      '40x50': els.shopifyPrice40x50 && els.shopifyPrice40x50.value,
      '50x70': els.shopifyPrice50x70 && els.shopifyPrice50x70.value,
      '70x100': els.shopifyPrice70x100 && els.shopifyPrice70x100.value,
    };
    const out = {};
    for (const [k, v] of Object.entries(map)) {
      const n = Number(String(v || '').replace(',', '.'));
      if (Number.isFinite(n) && n > 0) out[k] = n.toFixed(2);
    }
    return out;
  }

  async function loadShopifyExportSettings() {
    try {
      const res = await fetch('/api/shopify/export-settings', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const prices = data.prices || {};
      if (els.shopifyPrice13x18) els.shopifyPrice13x18.value = prices['13x18'] || '16.00';
      if (els.shopifyPrice21x30) els.shopifyPrice21x30.value = prices['21x30'] || '26.00';
      if (els.shopifyPrice30x40) els.shopifyPrice30x40.value = prices['30x40'] || '43.00';
      if (els.shopifyPrice40x50) els.shopifyPrice40x50.value = prices['40x50'] || '57.00';
      if (els.shopifyPrice50x70) els.shopifyPrice50x70.value = prices['50x70'] || '71.00';
      if (els.shopifyPrice70x100) els.shopifyPrice70x100.value = prices['70x100'] || '99.00';
      const selected = Array.isArray(data.selectedSizes) ? new Set(data.selectedSizes) : new Set();
      const nodes = Array.from(document.querySelectorAll('.shopify-size-toggle'));
      for (const node of nodes) {
        node.checked = selected.size ? selected.has(String(node.value || '')) : true;
      }
    } catch (e) {
      setShopifyExportStatus(e.message || 'Nie udało się wczytać ustawień Shopify export.', 'error');
    }
  }

  async function saveShopifyExportSettings() {
    const sizes = getShopifySelectedSizes();
    if (sizes.length === 0) {
      setShopifyExportStatus('Wybierz minimum jeden rozmiar do zapisu.', 'error');
      return;
    }
    const prices = getShopifyPricePayload();
    if (Object.keys(prices).length === 0) {
      setShopifyExportStatus('Podaj poprawne ceny (większe od 0).', 'error');
      return;
    }
    if (els.btnShopifySaveSettings) els.btnShopifySaveSettings.disabled = true;
    setShopifyExportStatus('Zapisywanie cennika…');
    try {
      const res = await fetch('/api/shopify/export-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prices, selectedSizes: sizes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setShopifyExportStatus('Cennik zapisany.', 'ok');
    } catch (e) {
      setShopifyExportStatus(e.message || 'Nie udało się zapisać cennika.', 'error');
    } finally {
      if (els.btnShopifySaveSettings) els.btnShopifySaveSettings.disabled = false;
    }
  }

  async function runShopifyThumbsPush() {
    setShopifyExportStatus('Sync thumbów i push do Git…');
    if (els.btnShopifyThumbsPush) els.btnShopifyThumbsPush.disabled = true;
    if (els.btnShopifyExportApproved) els.btnShopifyExportApproved.disabled = true;
    if (els.btnShopifyExportAll) els.btnShopifyExportAll.disabled = true;
    if (els.btnShopifyReadiness) els.btnShopifyReadiness.disabled = true;
    if (els.btnShopifySaveSettings) els.btnShopifySaveSettings.disabled = true;
    try {
      const res = await fetch('/api/shopify/thumbs-sync-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || res.statusText);
      setShopifyExportStatus(data.message || 'Sync + push zakończone.', 'ok');
    } catch (e) {
      setShopifyExportStatus(e.message || 'Sync + push nie powiódł się.', 'error');
    } finally {
      if (els.btnShopifyThumbsPush) els.btnShopifyThumbsPush.disabled = false;
      if (els.btnShopifyExportApproved) els.btnShopifyExportApproved.disabled = false;
      if (els.btnShopifyExportAll) els.btnShopifyExportAll.disabled = false;
      if (els.btnShopifyReadiness) els.btnShopifyReadiness.disabled = false;
      if (els.btnShopifySaveSettings) els.btnShopifySaveSettings.disabled = false;
    }
  }

  async function refreshShopifyReadiness() {
    if (els.btnShopifyReadiness) els.btnShopifyReadiness.disabled = true;
    setShopifyReadinessStatus('Sprawdzanie gotowości Shopify…');
    try {
      const res = await fetch('/api/shopify/readiness', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const s = data.summary || {};
      const blocked = Number(s.blockedApproved || 0);
      const dup = Number(s.duplicates || 0);
      const msg =
        `Zatwierdzone: ${Number(s.approved || 0)} · Ready: ${Number(s.ready || 0)} · Pending: ${Number(
          s.pending_assets || 0
        )} · Legacy: ${Number(s.legacy_blocked || 0)}` +
        (dup > 0 ? ` · Duplikaty: ${dup}` : '') +
        (blocked > 0 ? ` · Zablokowane: ${blocked}` : '');
      setShopifyReadinessStatus(msg, blocked > 0 ? 'error' : 'ok');
    } catch (e) {
      setShopifyReadinessStatus(e.message || 'Nie udało się sprawdzić gotowości Shopify.', 'error');
    } finally {
      if (els.btnShopifyReadiness) els.btnShopifyReadiness.disabled = false;
    }
  }

  function setStudioAutoBatchUiBusy(busy) {
    const d = !!busy;
    if (els.studioAutoScope) els.studioAutoScope.disabled = d;
    if (els.studioAutoStyle) els.studioAutoStyle.disabled = d;
    if (els.studioAutoCount) els.studioAutoCount.disabled = d;
    if (els.btnRunStudioAutoBatch) els.btnRunStudioAutoBatch.disabled = d;
    if (els.btnCopyStudioAutoCommand) els.btnCopyStudioAutoCommand.disabled = d;
  }

  async function runShopifyExport(all) {
    const isAll = all === true;
    const onlyNew = !!(els.shopifyOnlyNewToggle && els.shopifyOnlyNewToggle.checked);
    const sizes = getShopifySelectedSizes();
    if (sizes.length === 0) {
      setShopifyExportStatus('Wybierz minimum jeden rozmiar do eksportu.', 'error');
      return;
    }
    const prices = getShopifyPricePayload();
    const timestamped = onlyNew || sizes.length < 6;
    setShopifyExportStatus('Generowanie CSV Shopify…');
    if (els.btnShopifyExportApproved) els.btnShopifyExportApproved.disabled = true;
    if (els.btnShopifyExportAll) els.btnShopifyExportAll.disabled = true;
    if (els.btnShopifyThumbsPush) els.btnShopifyThumbsPush.disabled = true;
    if (els.btnShopifyReadiness) els.btnShopifyReadiness.disabled = true;
    if (els.btnShopifySaveSettings) els.btnShopifySaveSettings.disabled = true;
    try {
      const res = await fetch('/api/shopify/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          all: isAll,
          onlyNew,
          sizes,
          prices,
          timestamped,
          saveSettings: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      const bytes = Number(data.bytes || 0);
      const kb = bytes > 0 ? ` (${(bytes / 1024).toFixed(1)} KB)` : '';
      if (els.shopifyCsvOpenLink && data.csvPath) {
        els.shopifyCsvOpenLink.href = data.csvPath;
      }
      setShopifyExportStatus(`CSV gotowy${kb} — zakres: ${sizes.join(', ')}${onlyNew ? ' · tylko nowe' : ''}.`, 'ok');
      await refreshShopifyReadiness();
    } catch (e) {
      setShopifyExportStatus(e.message || 'Eksport Shopify nie powiódł się.', 'error');
    } finally {
      if (els.btnShopifyExportApproved) els.btnShopifyExportApproved.disabled = false;
      if (els.btnShopifyExportAll) els.btnShopifyExportAll.disabled = false;
      if (els.btnShopifyThumbsPush) els.btnShopifyThumbsPush.disabled = false;
      if (els.btnShopifyReadiness) els.btnShopifyReadiness.disabled = false;
      if (els.btnShopifySaveSettings) els.btnShopifySaveSettings.disabled = false;
    }
  }

  function clearStudioAutoProgressInterval() {
    if (studioAutoProgressInterval != null) {
      window.clearInterval(studioAutoProgressInterval);
      studioAutoProgressInterval = null;
    }
  }

  function startStudioAutoProgressUi() {
    clearStudioAutoProgressInterval();
    if (!els.studioAutoProgress || !els.studioAutoProgressMeta) return;
    els.studioAutoProgress.hidden = false;
    els.studioAutoProgress.classList.remove('is-complete');
    const t0 = Date.now();
    const tick = () => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      const timeStr = m > 0 ? `${m} min ${s} s` : `${s} s`;
      els.studioAutoProgressMeta.textContent =
        `Synchronizacja z API (generator obrazów / LLM) — praca w toku… upłynęło ${timeStr} (czas zależy od liczby plakatów i API).`;
    };
    tick();
    studioAutoProgressInterval = window.setInterval(tick, 400);
  }

  function stopStudioAutoProgressUi(success) {
    clearStudioAutoProgressInterval();
    if (!els.studioAutoProgress || !els.studioAutoProgressMeta) return;
    if (success) {
      els.studioAutoProgress.classList.add('is-complete');
      els.studioAutoProgressMeta.textContent =
        'Gotowe — PNG w bibliotece (PDF zależnie od trybu npm). Odświeżanie strony…';
    } else {
      els.studioAutoProgress.hidden = true;
      els.studioAutoProgress.classList.remove('is-complete');
      els.studioAutoProgressMeta.textContent = '';
    }
  }

  function matchesFilters(item) {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (activeStyleFilter !== 'all' && (item.style || '') !== activeStyleFilter) return false;
    if (activeStatusFilter === 'new' && item.approvedForPrint) return false;
    if (activeStatusFilter === 'approved' && !item.approvedForPrint) return false;
    if (activeMockupFilter === 'missing' && itemHasMockups(item)) return false;
    if (activeMockupFilter === 'has' && !itemHasMockups(item)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const inPrompt = (item.prompt || '').toLowerCase().includes(q);
    const st = (item.style || '').toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      st.includes(q) ||
      inPrompt
    );
  }

  function renderGrid() {
    const filtered = flatItems.filter(matchesFilters);
    els.emptyState.hidden = filtered.length !== 0;
    els.posterGrid.innerHTML = '';

    filtered.forEach((item, i) => {
      const card = document.createElement('article');
      card.className = 'poster-card poster-card--portrait';
      card.style.animationDelay = `${Math.min(i * 0.04, 0.6)}s`;
      card.setAttribute('role', 'listitem');
      card.tabIndex = 0;
      const k = removeBasketKeyFromItem(item);
      const inRemove = removeBasket.has(k);
      const inApprove = approveBasket.has(k);
      if (inRemove) card.classList.add('poster-card--marked-remove');
      if (inApprove) card.classList.add('poster-card--marked-approve');

      const pdfs = item.pdfLinks || [];
      const hasFramed = !!(item.imagePathFramed && String(item.imagePathFramed).trim());
      const appr = !!item.approvedForPrint;
      const badgeClass = appr ? 'poster-status-badge--approved' : 'poster-status-badge--new';
      const badgeText = appr ? 'Zatwierdzony' : 'Nowy';
      const framedPill = hasFramed ? '<span class="size-pill size-pill--framed">Ramka</span>' : '';
      const approveCb = !appr
        ? `<label class="poster-card-cb poster-card-cb--approve poster-card-ctrl"><input type="checkbox" class="lib-cb-approve" ${
            inApprove ? 'checked' : ''
          } /><span>Druk</span></label>`
        : '';

      card.innerHTML = `
        <figure class="poster-card-figure">
          <img src="${escapeAttr(item.imagePath)}" alt="${escapeAttr(item.title)}" loading="lazy" />
          <span class="poster-status-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
          <span class="poster-orientation-badge poster-orientation-badge--portrait" data-orientation-badge>Pion</span>
          <div class="poster-card-select poster-card-ctrl" role="group" aria-label="Zaznaczenia na karcie">
            <label class="poster-card-cb poster-card-ctrl">
              <input type="checkbox" class="lib-cb-remove" ${inRemove ? 'checked' : ''} />
              <span>Usuń</span>
            </label>
            ${approveCb}
          </div>
        </figure>
        <div class="poster-body">
          <h3 class="poster-title">${escapeHtml(item.title)}</h3>
          <p class="poster-style">${escapeHtml(item.style)} · ${escapeHtml(item.category)}</p>
          <div class="poster-sizes">
            ${framedPill}
            ${pdfs
              .map(
                (l) =>
                  `<a class="size-pill-link" href="${escapeAttr(l.href)}" target="_blank" rel="noopener"><span class="size-pill">${escapeHtml(
                    l.label
                  )}</span></a>`
              )
              .join('')}
          </div>
          <button type="button" class="poster-open-folder-btn poster-card-ctrl" title="Otwórz folder plakatu" aria-label="Otwórz folder plakatu">📁</button>
        </div>
      `;

      const cardImg = card.querySelector('figure img');
      if (cardImg) {
        const orientationBadge = card.querySelector('[data-orientation-badge]');
        const applyOrientationClass = () => {
          const nw = Number(cardImg.naturalWidth || 0);
          const nh = Number(cardImg.naturalHeight || 0);
          if (!nw || !nh) return;
          const isLandscape = nw > nh;
          card.classList.toggle('poster-card--landscape', isLandscape);
          card.classList.toggle('poster-card--portrait', !isLandscape);
          if (orientationBadge) {
            orientationBadge.textContent = isLandscape ? 'Poziom' : 'Pion';
            orientationBadge.classList.toggle('poster-orientation-badge--landscape', isLandscape);
          }
        };
        if (cardImg.complete) applyOrientationClass();
        cardImg.addEventListener('load', applyOrientationClass, { once: true });
      }

      card.addEventListener('click', (e) => {
        if (e.target.closest('.poster-card-ctrl')) return;
        if (e.target.closest('.size-pill-link')) return;
        openModal(item);
      });
      card.addEventListener('keydown', (e) => {
        if (e.target.closest('.poster-card-ctrl')) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(item);
        }
      });

      const rcb = card.querySelector('.lib-cb-remove');
      if (rcb) {
        rcb.addEventListener('click', (e) => e.stopPropagation());
        rcb.addEventListener('change', () => setRemoveBasketChecked(item, rcb.checked));
      }
      const acb = card.querySelector('.lib-cb-approve');
      if (acb) {
        acb.addEventListener('click', (e) => e.stopPropagation());
        acb.addEventListener('change', () => setApproveBasketChecked(item, acb.checked));
      }
      const folderBtn = card.querySelector('.poster-open-folder-btn');
      if (folderBtn) {
        folderBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            const payload = item.id ? { id: item.id } : { imagePath: item.imagePath };
            const res = await fetch('/api/posters/open-folder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Nie udało się otworzyć folderu');
          } catch (err) {
            window.alert(err.message || 'Nie udało się otworzyć folderu');
          }
        });
      }

      if (item.approvedForPrint && hasFramed) {
        const img = card.querySelector('figure img');
        if (img) {
          const fullSrc = item.imagePath;
          const framedSrc = item.imagePathFramed;
          card.addEventListener('mouseenter', () => {
            img.src = framedSrc;
          });
          card.addEventListener('mouseleave', () => {
            img.src = fullSrc;
          });
        }
      }

      els.posterGrid.appendChild(card);
    });
    updateFilterResultsMeta();
  }

  function setLightboxLoupe(on) {
    lightboxLoupeActive = !!on;
    if (els.modalLightboxLoupe) els.modalLightboxLoupe.setAttribute('aria-pressed', lightboxLoupeActive ? 'true' : 'false');
    if (els.modalLightboxStage) els.modalLightboxStage.classList.toggle('modal-lightbox-stage--loupe', lightboxLoupeActive);
    if (lightboxLoupeActive) {
      lightboxPanning = false;
    }
    if (els.modalLightboxLens) {
      els.modalLightboxLens.hidden = !lightboxLoupeActive;
      els.modalLightboxLens.style.opacity = lightboxLoupeActive ? '' : '0';
    }
    updateLightboxPanUi();
  }

  function changeLightboxLoupeSize(delta) {
    const next = lightboxLoupeSize + Number(delta || 0);
    lightboxLoupeSize = Math.max(LIGHTBOX_LOUPE_SIZE_MIN, Math.min(LIGHTBOX_LOUPE_SIZE_MAX, next));
  }

  function posterItemsMatch(a, b) {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;
    return (a.imagePath || '') === (b.imagePath || '');
  }

  function syncLightboxImageFromModal() {
    const src = els.modalImg && els.modalImg.getAttribute('src');
    if (!src || !els.modalLightboxImg) return;
    els.modalLightboxImg.src = src;
    els.modalLightboxImg.alt = (els.modalImg.alt || '').trim();
    if (els.modalLightboxFrame) {
      els.modalLightboxFrame.classList.toggle(
        'poster-aspect-frame--natural',
        modalPreviewVariant === 'framed'
      );
    }
    updateLightboxVariantToolbar();
    resetLightboxZoom();
  }

  function updateLightboxVariantToolbar() {
    const item = lightboxPlaylist[lightboxIndex] || modalPosterItem;
    const fr = item && item.imagePathFramed && String(item.imagePathFramed).trim();
    const show = !!fr;
    if (els.modalLightboxVariantGroup) els.modalLightboxVariantGroup.hidden = !show;
    if (els.modalLightboxFramedChip) els.modalLightboxFramedChip.hidden = !fr;
    if (els.modalLightboxFull && els.modalLightboxFramedChip) {
      els.modalLightboxFull.setAttribute('aria-pressed', modalPreviewVariant === 'full' ? 'true' : 'false');
      els.modalLightboxFramedChip.setAttribute('aria-pressed', modalPreviewVariant === 'framed' ? 'true' : 'false');
    }
  }

  function preferredPreviewForItem(item, preferred) {
    if (!item) return 'full';
    const fr = item.imagePathFramed && String(item.imagePathFramed).trim();
    if (preferred === 'framed' && fr) return 'framed';
    return 'full';
  }

  function refreshLightboxNav() {
    const n = lightboxPlaylist.length;
    const i = lightboxIndex;
    if (els.modalLightboxPrev) els.modalLightboxPrev.disabled = n <= 1 || i <= 0;
    if (els.modalLightboxNext) els.modalLightboxNext.disabled = n <= 1 || i >= n - 1;
    if (els.modalLightboxCounter) {
      els.modalLightboxCounter.textContent = n ? `${i + 1} / ${n}` : '';
    }
  }

  function formatBytesMeta(n) {
    if (n == null || Number.isNaN(n)) return '—';
    const x = Number(n);
    if (x < 1024) return `${x} B`;
    if (x < 1048576) return `${(x / 1024).toFixed(1)} KB`;
    return `${(x / 1048576).toFixed(2)} MB`;
  }

  async function fetchLightboxImageMeta() {
    if (!els.modalLightboxMetaDl) return;
    const src = els.modalLightboxImg && els.modalLightboxImg.getAttribute('src');
    if (!src) {
      els.modalLightboxMetaDl.innerHTML = '<dt>Status</dt><dd>Brak obrazu</dd>';
      return;
    }
    els.modalLightboxMetaDl.innerHTML = '<dt>Status</dt><dd>Ładowanie…</dd>';
    let path = src.split('?')[0];
    try {
      const u = new URL(src, window.location.origin);
      path = u.pathname;
    } catch (_) {}
    try {
      const res = await fetch('/api/posters/image-meta?path=' + encodeURIComponent(path), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      const rows = [
        ['Plik', data.fileName],
        ['Ścieżka', data.webPath],
        ['Piksele', data.width && data.height ? `${data.width} × ${data.height}` : '—'],
        ['Proporcje (w/h)', data.aspectRatio != null ? String(data.aspectRatio) : '—'],
        ['Megapiksele', data.megapixels != null ? String(data.megapixels) : '—'],
        ['Format', data.format || '—'],
        ['Rozmiar na dysku', formatBytesMeta(data.bytes)],
        ['Modyfikacja', data.mtime ? new Date(data.mtime).toLocaleString('pl-PL') : '—'],
        ['Przestrzeń barw', data.space || '—'],
        ['Kanały', data.channels != null ? String(data.channels) : '—'],
        ['Głębia', data.depth != null ? String(data.depth) : '—'],
        ['Kanał alfa', data.hasAlpha ? 'tak' : 'nie'],
        ['DPI (metadane)', data.density != null ? String(data.density) : '—'],
        ['Jednostka DPI', data.resolutionUnit || '—'],
        ['Progressive', data.isProgressive != null ? (data.isProgressive ? 'tak' : 'nie') : '—'],
        ['Chroma subsampling', data.chromaSubsampling || '—'],
        ['Kompresja', data.compression != null ? String(data.compression) : '—'],
        ['Paleta', data.palette != null ? (data.palette ? 'tak' : 'nie') : '—'],
        ['Strony', data.pages != null ? String(data.pages) : '—'],
        ['Orientacja', data.orientation != null ? String(data.orientation) : '—'],
      ];
      els.modalLightboxMetaDl.innerHTML = rows
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
        .join('');
    } catch (e) {
      els.modalLightboxMetaDl.innerHTML = `<dt>Błąd</dt><dd>${escapeHtml(e.message || 'Żądanie nieudane')}</dd>`;
    }
  }

  function lightboxNavigate(delta) {
    const n = lightboxPlaylist.length;
    if (n === 0) return;
    const j = lightboxIndex + delta;
    if (j < 0 || j >= n) return;
    lightboxIndex = j;
    const item = lightboxPlaylist[lightboxIndex];
    populatePosterDetailModal(item, preferredPreviewForItem(item, modalPreviewVariant));
    syncLightboxImageFromModal();
    refreshLightboxNav();
    if (els.modalLightboxMeta && !els.modalLightboxMeta.hidden) fetchLightboxImageMeta();
  }

  function lightboxSetVariant(variant) {
    const item = lightboxPlaylist[lightboxIndex] || modalPosterItem;
    if (!item) return;
    setModalPreviewVariant(variant);
    syncLightboxImageFromModal();
    if (els.modalLightboxMeta && !els.modalLightboxMeta.hidden) fetchLightboxImageMeta();
  }

  function onLightboxStagePointerMove(e) {
    if (!lightboxLoupeActive || !els.modalLightboxLens || !els.modalLightboxImg || !els.modalLightboxStage) return;
    const img = els.modalLightboxImg;
    const stage = els.modalLightboxStage;
    const lens = els.modalLightboxLens;
    if (!img.naturalWidth) return;
    const ir = img.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();
    if (e.clientX < ir.left || e.clientX > ir.right || e.clientY < ir.top || e.clientY > ir.bottom) {
      lens.style.opacity = '0';
      return;
    }
    lens.style.opacity = '1';
    const nx = (e.clientX - ir.left) / ir.width;
    const ny = (e.clientY - ir.top) / ir.height;
    const Z = 2.75;
    const LW = lightboxLoupeSize;
    const bw = img.naturalWidth * Z;
    const bh = img.naturalHeight * Z;
    const px = nx * bw - LW / 2;
    const py = ny * bh - LW / 2;
    const src = img.currentSrc || img.src;
    lens.style.width = `${LW}px`;
    lens.style.height = `${LW}px`;
    lens.style.backgroundImage = 'url(' + JSON.stringify(src) + ')';
    lens.style.backgroundSize = `${bw}px ${bh}px`;
    lens.style.backgroundPosition = `${-px}px ${-py}px`;
    lens.style.left = `${e.clientX - sr.left - LW / 2}px`;
    lens.style.top = `${e.clientY - sr.top - LW / 2}px`;
  }

  function onLightboxPanStart(e) {
    if (!els.modalLightboxStage || lightboxLoupeActive || lightboxZoom <= 1.001) return;
    if (e.button !== 0) return;
    const img = els.modalLightboxImg;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const overImage = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!overImage) return;
    e.preventDefault();
    lightboxPanning = true;
    lightboxPanStartX = e.clientX;
    lightboxPanStartY = e.clientY;
    lightboxPanOriginX = lightboxPanX;
    lightboxPanOriginY = lightboxPanY;
    updateLightboxPanUi();
  }

  function onLightboxPanMove(e) {
    if (!lightboxPanning) return;
    e.preventDefault();
    lightboxPanX = lightboxPanOriginX + (e.clientX - lightboxPanStartX);
    lightboxPanY = lightboxPanOriginY + (e.clientY - lightboxPanStartY);
    applyLightboxZoom();
  }

  function onLightboxPanEnd() {
    if (!lightboxPanning) return;
    lightboxPanning = false;
    updateLightboxPanUi();
  }

  function closePosterLightbox() {
    if (!els.modalLightbox || els.modalLightbox.hidden) return;
    setLightboxLoupe(false);
    resetLightboxZoom();
    if (els.modalLightboxMeta) els.modalLightboxMeta.hidden = true;
    if (els.modalLightboxInfoBtn) els.modalLightboxInfoBtn.setAttribute('aria-pressed', 'false');
    els.modalLightbox.classList.remove('is-open');
    els.modalLightbox.hidden = true;
    els.modalLightboxImg.removeAttribute('src');
    els.modalLightboxImg.alt = '';
    els.modalLightboxImg.style.transform = '';
    if (els.modalLightboxFrame) els.modalLightboxFrame.classList.remove('poster-aspect-frame--natural');
    lightboxPlaylist = [];
    lightboxIndex = 0;
    lightboxPanning = false;
    lightboxPanX = 0;
    lightboxPanY = 0;
    updateLightboxPanUi();
    if (els.modalLightboxMetaDl) els.modalLightboxMetaDl.innerHTML = '';
  }

  async function copyTextWithOptionalFeedback(text, feedbackEl, okMsg) {
    const t = String(text || '').trim();
    if (!t) return;
    if (feedbackEl) feedbackEl.textContent = '';
    try {
      await navigator.clipboard.writeText(t);
      if (feedbackEl) feedbackEl.textContent = okMsg || 'Skopiowano.';
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = t;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        if (feedbackEl) feedbackEl.textContent = okMsg || 'Skopiowano.';
      } catch (e2) {
        if (feedbackEl) feedbackEl.textContent = 'Copy manually from the field.';
      }
    }
  }

  function setModalPreviewVariant(variant) {
    if (!modalPosterItem) return;
    const full = String(modalPosterItem.imagePath || '').trim();
    const framed = String(modalPosterItem.imagePathFramed || '').trim();
    const canFramed = !!framed;
    const v = variant === 'framed' && canFramed ? 'framed' : 'full';
    const src = v === 'framed' ? framed : full;
    if (!src) return;
    els.modalImg.src = src;
    modalPreviewVariant = v;
    if (els.modalPreviewFullBtn) {
      const on = v === 'full';
      els.modalPreviewFullBtn.classList.toggle('is-active', on);
      els.modalPreviewFullBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    if (els.modalPreviewFramedBtn) {
      const on = v === 'framed';
      els.modalPreviewFramedBtn.classList.toggle('is-active', on);
      els.modalPreviewFramedBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      els.modalPreviewFramedBtn.disabled = !canFramed;
    }
    fetchModalTechnicalMeta(src);
    if (els.modalLightbox && !els.modalLightbox.hidden) {
      syncLightboxImageFromModal();
      updateLightboxVariantToolbar();
      if (els.modalLightboxMeta && !els.modalLightboxMeta.hidden) fetchLightboxImageMeta();
    }
  }

  function setModalTopView(view) {
    modalTopView = ['all', 'workflow', 'print', 'files'].includes(view) ? view : 'all';
    if (els.modalDetailTiled) {
      els.modalDetailTiled.setAttribute('data-modal-view', modalTopView);
    }
    document.querySelectorAll('[data-modal-view]').forEach((btn) => {
      const on = btn.getAttribute('data-modal-view') === modalTopView;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.querySelectorAll('[data-modal-section]').forEach((node) => {
      const own = String(node.getAttribute('data-modal-section') || '')
        .split(/\s+/)
        .filter(Boolean);
      const hideInAll = node.getAttribute('data-modal-hide-in-all') === 'true';
      const show = hideInAll && modalTopView === 'all'
        ? false
        : modalTopView === 'all' || own.includes(modalTopView);
      node.hidden = !show;
    });
  }

  function syncPremiumPrintBadge() {
    if (!els.modalPremiumPrintAction) return;
    const on = !!(modalPosterItem && modalPosterItem.approvedForPrint);
    els.modalPremiumPrintAction.classList.toggle('is-active', on);
    if (els.modalPremiumPrintBadge) els.modalPremiumPrintBadge.textContent = on ? 'ON' : 'OFF';
  }

  function syncModalPosterPreview(item, preferredVariant) {
    const title = item.title || '';
    const full = String(item.imagePath || '').trim();
    const framed = String(item.imagePathFramed || '').trim();
    const hasFramed = !!framed;
    els.modalImg.alt = title;
    if (els.modalPreviewThumbs) els.modalPreviewThumbs.hidden = !hasFramed;
    if (els.modalPreviewFullImg) els.modalPreviewFullImg.src = full;
    if (els.modalPreviewFramedImg) els.modalPreviewFramedImg.src = hasFramed ? framed : full;
    setModalPreviewVariant(preferredVariant === 'framed' ? 'framed' : 'full');
  }

  function renderModalFileVariants(item) {
    if (!els.modalFileVariantsGrid) return;
    const mkRow = (label, value) => {
      const v = String(value || '').trim();
      const shown = v || '—';
      const img = v
        ? `<img class="modal-file-variant-preview" src="${escapeAttr(v)}" alt="${escapeAttr(label)}" loading="lazy" />`
        : '';
      const copyBtn = v
        ? `<button type="button" class="modal-copy-combo-line modal-copy-combo-line--compact" data-copy-path="${escapeAttr(v)}">Kopiuj</button>`
        : '';
      return `
        <div class="modal-file-variant-row">
          <span class="modal-file-variant-name">${escapeHtml(label)}</span>
          ${img}
          <code class="modal-file-variant-path">${escapeHtml(shown)}</code>
          ${copyBtn}
        </div>
      `;
    };
    const html = `
      <section class="modal-file-variant-col">
        <p class="modal-file-variant-title">Druk / PNG</p>
        ${mkRow('MASTER', item.imagePath)}
        ${mkRow('MASTER + RAMKA', item.imagePathFramed)}
      </section>
      <section class="modal-file-variant-col">
        <p class="modal-file-variant-title">Sklep / THUMB JPEG</p>
        ${mkRow('THUMB MASTER', item.imagePathThumb)}
        ${mkRow('THUMB RAMKA', item.imagePathFramedThumb)}
      </section>
    `;
    els.modalFileVariantsGrid.innerHTML = html;
    els.modalFileVariantsGrid.querySelectorAll('[data-copy-path]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const path = btn.getAttribute('data-copy-path') || '';
        if (!path.trim()) return;
        await copyTextWithOptionalFeedback(path, els.modalListingFeedback, 'Path copied.');
        window.setTimeout(() => {
          if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
        }, 1800);
      });
    });
  }

  function renderModalPdfVariants(item) {
    if (!els.modalPdfVariantsGrid) return;
    const mkLinks = (links) => {
      const list = Array.isArray(links) ? links : [];
      if (!list.length) return '<p class="modal-pdf-empty">Brak wygenerowanych PDF.</p>';
      return `<div class="modal-pdf-chip-list">${list
        .map((l) => {
          const href = String(l && l.href ? l.href : '').trim();
          const label = String(l && l.label ? l.label : 'format').trim();
          if (!href) return '';
          return `<a class="modal-pdf-chip" href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
        })
        .join('')}</div>`;
    };
    const fullLinks = item && Array.isArray(item.pdfLinks) ? item.pdfLinks : [];
    const framedLinks = item && Array.isArray(item.pdfLinksFramed) ? item.pdfLinksFramed : [];
    els.modalPdfVariantsGrid.innerHTML = `
      <section class="modal-pdf-variant-col">
        <div class="modal-pdf-variant-head">
          <p class="modal-pdf-variant-title">Master</p>
          <span class="modal-pdf-variant-count">${fullLinks.length} formatów</span>
        </div>
        ${mkLinks(fullLinks)}
      </section>
      <section class="modal-pdf-variant-col">
        <div class="modal-pdf-variant-head">
          <p class="modal-pdf-variant-title">Master + Ramka</p>
          <span class="modal-pdf-variant-count">${framedLinks.length} formatów</span>
        </div>
        ${mkLinks(framedLinks)}
      </section>
    `;
  }

  async function fetchModalTechnicalMeta(imageSrc) {
    if (!els.modalTechnicalMetaDl) return;
    if (!imageSrc) {
      els.modalTechnicalMetaDl.innerHTML = '<dt>Status</dt><dd>Brak obrazu</dd>';
      return;
    }
    els.modalTechnicalMetaDl.innerHTML = '<dt>Status</dt><dd>Ładowanie…</dd>';
    let webPath = imageSrc.split('?')[0];
    try {
      const u = new URL(imageSrc, window.location.origin);
      webPath = u.pathname;
    } catch (_) {}
    try {
      const res = await fetch('/api/posters/image-meta?path=' + encodeURIComponent(webPath), { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      const rows = [
        ['Plik', data.fileName || '—'],
        ['Ścieżka', data.webPath || '—'],
        ['Format', data.format || '—'],
        ['Piksele', data.width && data.height ? `${data.width} × ${data.height}` : '—'],
        ['Proporcje (w/h)', data.aspectRatio != null ? String(data.aspectRatio) : '—'],
        ['Megapiksele', data.megapixels != null ? String(data.megapixels) : '—'],
        ['Rozmiar na dysku', formatBytesMeta(data.bytes)],
        ['Przestrzeń barw', data.space || '—'],
        ['Kanały', data.channels != null ? String(data.channels) : '—'],
        ['Głębia', data.depth != null ? String(data.depth) : '—'],
        ['Kanał alfa', data.hasAlpha ? 'tak' : 'nie'],
        ['DPI (metadane)', data.density != null ? String(data.density) : '—'],
        ['Jednostka DPI', data.resolutionUnit || '—'],
        ['Progressive', data.isProgressive != null ? (data.isProgressive ? 'tak' : 'nie') : '—'],
        ['Kompresja', data.compression != null ? String(data.compression) : '—'],
        ['Paleta', data.palette != null ? (data.palette ? 'tak' : 'nie') : '—'],
        ['Modyfikacja', data.mtime ? new Date(data.mtime).toLocaleString('pl-PL') : '—'],
      ];
      els.modalTechnicalMetaDl.innerHTML = rows
        .map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(String(v))}</dd>`)
        .join('');
    } catch (e) {
      els.modalTechnicalMetaDl.innerHTML = `<dt>Błąd</dt><dd>${escapeHtml(e.message || 'Nie udało się pobrać metadanych')}</dd>`;
    }
  }

  function openPosterLightbox() {
    const src = els.modalImg.getAttribute('src');
    if (!src) return;
    lightboxPlaylist = flatItems.filter(matchesFilters);
    lightboxIndex = lightboxPlaylist.findIndex((it) => posterItemsMatch(it, modalPosterItem));
    if (lightboxIndex < 0) {
      lightboxPlaylist = modalPosterItem ? [modalPosterItem] : [];
      lightboxIndex = 0;
    }
    syncLightboxImageFromModal();
    refreshLightboxNav();
    els.modalLightbox.hidden = false;
    requestAnimationFrame(() => els.modalLightbox.classList.add('is-open'));
    els.modalLightboxClose.focus();
  }

  function populatePosterDetailModal(item, preferredPreviewVariant) {
    modalPosterItem = item;
    setModalTopView('workflow');
    syncPremiumPrintBadge();
    if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = '';
    if (els.modalApprovalFeedback) els.modalApprovalFeedback.textContent = '';
    if (els.modalBasketFeedback) {
      els.modalBasketFeedback.hidden = true;
      els.modalBasketFeedback.textContent = '';
    }
    const pv = preferredPreviewVariant === 'framed' ? 'framed' : 'full';
    syncModalPosterPreview(item, pv);
    renderModalPdfVariants(item);
    renderModalFileVariants(item);
    els.modalTitle.textContent = item.title;
    if (els.modalCategoryValue) els.modalCategoryValue.textContent = item.category || '—';
    if (els.modalStyleValue) els.modalStyleValue.textContent = item.style || '—';
    syncModalMoveSelectors(item);
    if (els.modalMoveFeedback) els.modalMoveFeedback.textContent = '';
    const listing = (item.shopDescription || '').trim();
    if (els.modalListingText) els.modalListingText.textContent = listing;
    if (els.modalListingEmptyHint) els.modalListingEmptyHint.hidden = !!listing;
    if (els.modalGenerateListingBtn) {
      const canGen = !!(item.id || item.imagePath);
      els.modalGenerateListingBtn.hidden = !!listing || !canGen;
    }
    if (els.modalCopyListing) els.modalCopyListing.disabled = !listing;
    if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
    if (els.modalApprovedPrint) {
      els.modalApprovedPrint.checked = !!item.approvedForPrint;
      els.modalApprovedPrint.disabled = false;
    }
    const pr = (item.prompt || '').trim();
    const llmLbl = (item.promptLlmLabel || '').trim();
    const manualImport =
      item.needsManualMetadata === true ||
      item.promptLlmProvider === 'manual-import' ||
      (!pr && /import/i.test(llmLbl));
    if (els.modalPromptLlm) {
      if (llmLbl) {
        els.modalPromptLlm.hidden = false;
        els.modalPromptLlm.textContent = pr ? 'Prompt ułożył: ' + llmLbl : llmLbl;
      } else {
        els.modalPromptLlm.hidden = true;
        els.modalPromptLlm.textContent = '';
      }
    }
    if (els.modalPromptBlock) els.modalPromptBlock.hidden = false;
    if (els.modalPromptTile) els.modalPromptTile.classList.toggle('is-prompt-empty', !pr);
    if (pr) {
      if (els.modalPrompt) {
        els.modalPrompt.hidden = false;
        els.modalPrompt.textContent = pr;
      }
      if (els.modalPromptEmpty) els.modalPromptEmpty.hidden = true;
      if (els.modalDraftPromptBtn) els.modalDraftPromptBtn.hidden = true;
      if (els.modalCopyPrompt) els.modalCopyPrompt.disabled = false;
    } else {
      if (els.modalPrompt) {
        els.modalPrompt.hidden = true;
        els.modalPrompt.textContent = '';
      }
      if (els.modalPromptEmpty) {
        els.modalPromptEmpty.hidden = false;
        els.modalPromptEmpty.textContent = manualImport
          ? 'Brak zapisanego promptu — ten plakat jest w bibliotece jako import z pliku PNG (bez historii studia).'
          : 'Brak zapisanego promptu w bibliotece.';
      }
      if (els.modalDraftPromptBtn) els.modalDraftPromptBtn.hidden = false;
      if (els.modalCopyPrompt) els.modalCopyPrompt.disabled = true;
    }
    if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = '';
    renderModalMockups(item);
  }

  function mockupUrlFromRel(p) {
    if (!p) return '';
    if (p.startsWith('/') || p.startsWith('http')) return p;
    const stripped = p.startsWith('posters/') ? p.slice('posters/'.length) : p;
    return '/' + stripped;
  }

  function renderModalMockupRows(item) {
    const grid = document.getElementById('modalMockupsGrid');
    const fb = document.getElementById('mockupGenerateFeedback');
    const btn = document.getElementById('btnGenerateMockups');
    if (!grid) return;
    if (fb) {
      fb.textContent = '';
      fb.className = 'modal-mockups-feedback';
    }

    const mkups = item.mockups || {};
    const frameUrl = mockupUrlFromRel(mkups.frame || '');
    const interiorUrl = mockupUrlFromRel(mkups.interior || '');

    const mkRow = (label, value) => {
      const v = String(value || '').trim();
      const shown = v || '—';
      const img = v
        ? `<img class="modal-file-variant-preview" src="${escapeAttr(v)}" alt="${escapeAttr(label)}" loading="lazy" />`
        : '';
      const copyBtn = v
        ? `<button type="button" class="modal-copy-combo-line modal-copy-combo-line--compact" data-copy-path="${escapeAttr(v)}">Kopiuj</button>`
        : '';
      return `
        <div class="modal-file-variant-row">
          <span class="modal-file-variant-name">${escapeHtml(label)}</span>
          ${img}
          <code class="modal-file-variant-path">${escapeHtml(shown)}</code>
          ${copyBtn}
        </div>
      `;
    };

    grid.innerHTML = mkRow('PACKSHOT RAMKA', frameUrl) + mkRow('SALON', interiorUrl);

    grid.querySelectorAll('[data-copy-path]').forEach((copyBtn) => {
      copyBtn.addEventListener('click', async () => {
        const path = copyBtn.getAttribute('data-copy-path') || '';
        if (!path.trim()) return;
        await copyTextWithOptionalFeedback(path, els.modalListingFeedback, 'Path copied.');
        window.setTimeout(() => {
          if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
        }, 1800);
      });
    });

    const mfBtn = document.getElementById('modalPreviewMockupFrameBtn');
    const mfImg = document.getElementById('modalPreviewMockupFrameImg');
    const miBtn = document.getElementById('modalPreviewMockupInteriorBtn');
    const miImg = document.getElementById('modalPreviewMockupInteriorImg');
    const thumbsEl = document.getElementById('modalPreviewThumbs');

    if (mfBtn && mfImg) {
      if (frameUrl) {
        mfImg.src = frameUrl;
        mfBtn.hidden = false;
      } else {
        mfBtn.hidden = true;
      }
    }
    if (miBtn && miImg) {
      if (interiorUrl) {
        miImg.src = interiorUrl;
        miBtn.hidden = false;
      } else {
        miBtn.hidden = true;
      }
    }
    if (thumbsEl) thumbsEl.hidden = false;

    if (btn) btn.textContent = mkups.frame ? 'Regeneruj mockupy' : 'Generuj mockupy';
  }

  // ── Mockup section (Pliki tab) ───────────────────────────────────────
  function renderModalMockups(item) {
    renderModalMockupRows(item);
  }

  // Generate mockups button handler
  document.addEventListener('click', async function(e) {
    const btn = e.target.closest('#btnGenerateMockups');
    if (!btn || !modalPosterItem) return;
    const fb = document.getElementById('mockupGenerateFeedback');
    btn.disabled = true;
    btn.textContent = 'Generowanie…';
    if (fb) { fb.textContent = 'Wysyłam do GPT Image 2…'; fb.className = 'modal-mockups-feedback'; }
    try {
      const res = await fetch('/api/posters/' + encodeURIComponent(modalPosterItem.id) + '/generate-mockups', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        modalPosterItem.mockups = data.mockups;
        renderModalMockups(modalPosterItem);
        if (fb) { fb.textContent = 'Mockupy gotowe ✓'; fb.className = 'modal-mockups-feedback'; }
      } else {
        if (fb) { fb.textContent = 'Błąd: ' + (data.error || 'nieznany'); fb.className = 'modal-mockups-feedback is-error'; }
      }
    } catch (err) {
      if (fb) { fb.textContent = 'Błąd połączenia: ' + err.message; fb.className = 'modal-mockups-feedback is-error'; }
    } finally {
      btn.disabled = false;
      btn.textContent = (modalPosterItem.mockups && modalPosterItem.mockups.frame) ? 'Regeneruj mockupy' : 'Generuj mockupy';
    }
  });

  // Mockup preview thumb click handlers
  ['modalPreviewMockupFrameBtn', 'modalPreviewMockupInteriorBtn'].forEach(function(id, idx) {
    const thumbBtn = document.getElementById(id);
    if (!thumbBtn) return;
    thumbBtn.addEventListener('click', function() {
      const imgEl = document.getElementById(idx === 0 ? 'modalPreviewMockupFrameImg' : 'modalPreviewMockupInteriorImg');
      if (!imgEl || !els.modalImg) return;
      els.modalImg.src = imgEl.src;
      // Update aria-pressed for all thumbs
      document.querySelectorAll('.modal-preview-thumb').forEach(b => b.setAttribute('aria-pressed','false'));
      thumbBtn.setAttribute('aria-pressed','true');
    });
  });
  // ────────────────────────────────────────────────────────────────────

  function openModal(item, previewVariant) {
    closePosterLightbox();
    els.modal.hidden = false;
    els.modal.classList.add('is-open');
    const pv = previewVariant === 'framed' ? 'framed' : 'full';
    populatePosterDetailModal(item, pv);
    document.body.style.overflow = 'hidden';
    els.modalClose.focus();
  }

  function closeModal() {
    closePosterLightbox();
    modalPosterItem = null;
    setModalTopView('workflow');
    syncPremiumPrintBadge();
    els.modal.classList.remove('is-open');
    els.modal.hidden = true;
    document.body.style.overflow = '';
    els.modalImg.src = '';
    modalPreviewVariant = 'full';
    if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = '';
    if (els.modalApprovalFeedback) els.modalApprovalFeedback.textContent = '';
    if (els.modalPromptLlm) {
      els.modalPromptLlm.hidden = true;
      els.modalPromptLlm.textContent = '';
    }
    if (els.modalPrompt) {
      els.modalPrompt.hidden = true;
      els.modalPrompt.textContent = '';
    }
    if (els.modalPromptEmpty) els.modalPromptEmpty.hidden = true;
    if (els.modalDraftPromptBtn) els.modalDraftPromptBtn.hidden = true;
    if (els.modalPromptTile) els.modalPromptTile.classList.remove('is-prompt-empty');
    if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = '';
    if (els.modalTechnicalMetaDl) els.modalTechnicalMetaDl.innerHTML = '';
    if (els.modalListingText) els.modalListingText.textContent = '';
    if (els.modalListingEmptyHint) els.modalListingEmptyHint.hidden = true;
    if (els.modalGenerateListingBtn) els.modalGenerateListingBtn.hidden = true;
    if (els.modalCopyListing) els.modalCopyListing.disabled = true;
    if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
    if (els.modalPdfVariantsGrid) els.modalPdfVariantsGrid.innerHTML = '';
    if (els.modalFileVariantsGrid) els.modalFileVariantsGrid.innerHTML = '';
    if (els.modalPreviewThumbs) els.modalPreviewThumbs.hidden = true;
    if (els.modalPreviewFullImg) els.modalPreviewFullImg.src = '';
    if (els.modalPreviewFramedImg) els.modalPreviewFramedImg.src = '';
  }

  async function load() {
    els.errorState.hidden = true;
    try {
      const res = await fetch('/api/posters', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      rawCategories = data.posters || {};
      flatItems = flattenPosters(rawCategories);
      renderStats(data.stats || { totalPosters: 0, totalPdfs: 0, categories: 0 });
      const catsFromInventory = Object.keys(rawCategories);
      const catsBase = configCategoriesList.length ? [...configCategoriesList] : [...catsFromInventory];
      const catsExtra = catsFromInventory.filter((c) => !catsBase.includes(c));
      const cats = [...catsBase, ...catsExtra];
      if (activeCategory !== 'all' && !cats.includes(activeCategory)) activeCategory = 'all';
      draftCategory = activeCategory;
      draftStatusFilter = activeStatusFilter;
      draftMockupFilter = activeMockupFilter;
      draftStyleFilter = activeStyleFilter;
      if (els.search) els.search.value = searchQuery;
      categoryCountMap = buildCategoryCountMap(rawCategories);
      renderCategoryFilterList(cats);
      renderLibraryStyleFilterList();
      syncStatusFilterButtons();
      syncMockupFilterButtons();
      updatePendingHint();
      renderGrid();
      syncSelectionBasketsWithLibrary();
      await loadShopifyExportSettings();
      await refreshShopifyReadiness();
      els.updatedAt.textContent =
        'Zaktualizowano: ' +
        new Intl.DateTimeFormat('pl-PL', {
          dateStyle: 'short',
          timeStyle: 'medium',
        }).format(new Date());
    } catch (e) {
      els.errorState.textContent = 'Nie udało się wczytać danych. Uruchom `npm run dev` i sprawdź plik posters_inventory.json.';
      els.errorState.hidden = false;
      els.statsRow.innerHTML = '';
      els.posterGrid.innerHTML = '';
      els.categoryFilterListbox.innerHTML = '';
      categoryCountMap = { __all: 0 };
      activeCategory = 'all';
      draftCategory = 'all';
      activeStatusFilter = 'all';
      draftStatusFilter = 'all';
      activeMockupFilter = 'all';
      draftMockupFilter = 'all';
      activeStyleFilter = 'all';
      draftStyleFilter = 'all';
      searchQuery = '';
      if (els.search) els.search.value = '';
      els.categoryFilterTriggerLabel.textContent = '—';
      els.categoryFilterTriggerCount.textContent = '';
      if (els.filterResultsMeta) els.filterResultsMeta.textContent = '';
      if (els.libraryStyleFilterListbox) els.libraryStyleFilterListbox.innerHTML = '';
      syncStatusFilterButtons();
      syncMockupFilterButtons();
      updatePendingHint();
    }
  }

  if (els.librarySelectionClear) {
    els.librarySelectionClear.addEventListener('click', () => {
      if (removeBasket.size === 0 && approveBasket.size === 0) return;
      removeBasket.clear();
      approveBasket.clear();
      renderSelectionDock();
      renderGrid();
    });
  }

  if (els.libraryBulkApproveBtn) {
    els.libraryBulkApproveBtn.addEventListener('click', async () => {
      if (approveBasket.size === 0) return;
      const n = approveBasket.size;
      const msg =
        'Zatwierdzić do druku ' +
        plCountPosters(n) +
        '? Status „Zatwierdzony” zapisze się w bibliotece.';
      if (!window.confirm(msg)) return;
      const items = [];
      for (const pathKey of approveBasket.keys()) {
        const row = flatItems.find((x) => x.imagePath === pathKey);
        if (row && row.id) items.push({ id: row.id });
        else items.push({ imagePath: pathKey });
      }
      try {
        const res = await fetch('/api/posters/bulk-approval', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, approvedForPrint: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        approveBasket.clear();
        renderSelectionDock();
        await load();
      } catch (err) {
        window.alert(err.message || 'Nie udało się zatwierdzić plakatów.');
      }
    });
  }

  if (els.libraryBasketConfirm) {
    els.libraryBasketConfirm.addEventListener('click', async () => {
      if (removeBasket.size === 0) return;
      const n = removeBasket.size;
      const msg = `Na pewno usunąć z biblioteki (${plCountPosters(n)})? Znikną wpisy w bibliotece oraz powiązane pliki PNG i PDF w folderze posters/.`;
      if (!window.confirm(msg)) return;
      const items = [...removeBasket.keys()].map((imagePath) => ({ imagePath }));
      try {
        const res = await fetch('/api/posters/remove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        removeBasket.clear();
        renderSelectionDock();
        await load();
      } catch (err) {
        window.alert(err.message || 'Nie udało się usunąć plakatów.');
      }
    });
  }

  if (els.modalAddToRemoveBasket) {
    els.modalAddToRemoveBasket.addEventListener('click', () => addCurrentModalToRemoveBasket());
  }

  if (els.refreshBtn) els.refreshBtn.addEventListener('click', load);
  if (els.refreshBtnHero) els.refreshBtnHero.addEventListener('click', load);

  document.querySelectorAll('[data-modal-view]').forEach((btn) => {
    btn.addEventListener('click', () => setModalTopView(btn.getAttribute('data-modal-view') || 'all'));
  });

  if (els.modalPremiumPrintAction) {
    els.modalPremiumPrintAction.addEventListener('click', () => {
      setModalTopView('print');
      if (els.modalApprovedPrint) {
        els.modalApprovedPrint.focus();
        if (!els.modalApprovedPrint.checked) els.modalApprovedPrint.click();
      }
    });
  }

  if (els.modalOpenFolderBtnTop) {
    els.modalOpenFolderBtnTop.addEventListener('click', async () => {
      if (!modalPosterItem) return;
      try {
        const payload = modalPosterItem.id ? { id: modalPosterItem.id } : { imagePath: modalPosterItem.imagePath };
        const res = await fetch('/api/posters/open-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Nie udało się otworzyć folderu');
      } catch (err) {
        window.alert(err.message || 'Nie udało się otworzyć folderu');
      }
    });
  }

  if (els.modalMoveBtn) {
    els.modalMoveBtn.addEventListener('click', async () => {
      if (!modalPosterItem) return;
      const targetCategory = els.modalMoveCategory ? String(els.modalMoveCategory.value || '').trim() : '';
      const targetStyle = els.modalMoveStyle ? String(els.modalMoveStyle.value || '').trim() : '';
      if (!targetCategory || !targetStyle) {
        if (els.modalMoveFeedback) els.modalMoveFeedback.textContent = 'Wybierz kategorię i styl docelowy.';
        return;
      }
      const sameCategory = String(modalPosterItem.category || '').trim() === targetCategory;
      const sameStyle = String(modalPosterItem.style || '').trim() === targetStyle;
      if (sameCategory && sameStyle) {
        if (els.modalMoveFeedback) els.modalMoveFeedback.textContent = 'To już jest aktualna kategoria i styl.';
        return;
      }
      if (els.modalMoveBtn) els.modalMoveBtn.disabled = true;
      if (els.modalMoveFeedback) els.modalMoveFeedback.textContent = 'Przenoszenie plików i aktualizacja biblioteki…';
      try {
        const payload = {
          targetCategory,
          targetStyle,
        };
        if (modalPosterItem.id) payload.id = modalPosterItem.id;
        else payload.imagePath = modalPosterItem.imagePath;
        const res = await fetch('/api/posters/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Nie udało się przenieść plakatu');
        if (els.modalMoveFeedback) {
          const filesInfo = Number(data.movedFiles || 0);
          els.modalMoveFeedback.textContent = `Przeniesiono. Zmieniono ${filesInfo} plików. Odświeżam widok…`;
        }
        await load();
        closeModal();
      } catch (err) {
        if (els.modalMoveFeedback) els.modalMoveFeedback.textContent = err.message || 'Błąd przenoszenia.';
      } finally {
        if (els.modalMoveBtn) els.modalMoveBtn.disabled = false;
      }
    });
  }

  els.search.addEventListener('input', () => {
    updatePendingHint();
  });
  els.search.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyLibraryFilters();
    }
  });
  if (els.filterApplyBtn) els.filterApplyBtn.addEventListener('click', applyLibraryFilters);
  if (els.filterClearBtn) els.filterClearBtn.addEventListener('click', clearLibraryFilters);

  if (els.statusFilterGroup) {
    els.statusFilterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-status-btn');
      if (!btn || !els.statusFilterGroup.contains(btn)) return;
      const st = btn.getAttribute('data-status');
      if (st) setDraftStatusFilter(st);
    });
  }

  if (els.mockupFilterGroup) {
    els.mockupFilterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-status-btn');
      if (!btn || !els.mockupFilterGroup.contains(btn)) return;
      const mk = btn.getAttribute('data-mockup');
      if (mk) setDraftMockupFilter(mk);
    });
  }

  if (els.modalApprovedPrint) {
    els.modalApprovedPrint.addEventListener('change', async () => {
      if (!modalPosterItem) return;
      const want = els.modalApprovedPrint.checked;
      const prev = !!modalPosterItem.approvedForPrint;
      els.modalApprovedPrint.disabled = true;
      if (els.modalApprovalFeedback) els.modalApprovalFeedback.textContent = 'Zapisywanie…';
      try {
        const body = { approvedForPrint: want };
        if (modalPosterItem.id) body.id = modalPosterItem.id;
        else body.imagePath = modalPosterItem.imagePath;
        const res = await fetch('/api/posters/approval', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        modalPosterItem.approvedForPrint = want;
        syncPremiumPrintBadge();
        if (els.modalApprovalFeedback) {
          els.modalApprovalFeedback.textContent = want
            ? 'Zapisano: zatwierdzony do druku.'
            : 'Cofnięto zatwierdzenie do druku.';
        }
        renderGrid();
      } catch (err) {
        modalPosterItem.approvedForPrint = prev;
        els.modalApprovedPrint.checked = prev;
        syncPremiumPrintBadge();
        if (els.modalApprovalFeedback) els.modalApprovalFeedback.textContent = err.message || 'Błąd zapisu';
      } finally {
        els.modalApprovedPrint.disabled = false;
        window.setTimeout(() => {
          if (els.modalApprovalFeedback && els.modal && !els.modal.hidden) els.modalApprovalFeedback.textContent = '';
        }, 2800);
      }
    });
  }

  els.categoryFilterListbox.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-category-option');
    if (!btn || !els.categoryFilterListbox.contains(btn)) return;
    const cat = btn.getAttribute('data-cat');
    if (cat === 'all') setDraftCategory('all');
    else if (cat) setDraftCategory(cat);
  });

  if (els.libraryStyleFilterListbox) {
    els.libraryStyleFilterListbox.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-style-option');
      if (!btn || !els.libraryStyleFilterListbox.contains(btn)) return;
      const st = btn.getAttribute('data-style');
      if (st === 'all') setDraftStyle('all');
      else if (st) setDraftStyle(st);
    });
  }

  els.modalClose.addEventListener('click', closeModal);
  els.modal.addEventListener('click', async (e) => {
    if (e.target === els.modal) closeModal();
  });

  els.modalVisualOpenLightbox.addEventListener('click', () => openPosterLightbox());

  els.modalLightboxClose.addEventListener('click', () => closePosterLightbox());
  els.modalLightbox.addEventListener('click', (e) => {
    if (e.target === els.modalLightbox) closePosterLightbox();
  });

  if (els.modalLightboxPrev) els.modalLightboxPrev.addEventListener('click', () => lightboxNavigate(-1));
  if (els.modalLightboxNext) els.modalLightboxNext.addEventListener('click', () => lightboxNavigate(1));
  if (els.modalLightboxZoomOut) els.modalLightboxZoomOut.addEventListener('click', () => changeLightboxZoom(-LIGHTBOX_ZOOM_STEP));
  if (els.modalLightboxZoomIn) els.modalLightboxZoomIn.addEventListener('click', () => changeLightboxZoom(LIGHTBOX_ZOOM_STEP));
  if (els.modalLightboxZoomReset) els.modalLightboxZoomReset.addEventListener('click', () => resetLightboxZoom());
  if (els.modalLightboxFull) els.modalLightboxFull.addEventListener('click', () => lightboxSetVariant('full'));
  if (els.modalLightboxFramedChip) els.modalLightboxFramedChip.addEventListener('click', () => lightboxSetVariant('framed'));
  if (els.modalPreviewFullBtn) {
    els.modalPreviewFullBtn.addEventListener('click', () => setModalPreviewVariant('full'));
  }
  if (els.modalPreviewFramedBtn) {
    els.modalPreviewFramedBtn.addEventListener('click', () => setModalPreviewVariant('framed'));
  }
  if (els.modalLightboxLoupe) {
    els.modalLightboxLoupe.addEventListener('click', () => setLightboxLoupe(!lightboxLoupeActive));
  }
  if (els.modalLightboxInfoBtn && els.modalLightboxMeta) {
    els.modalLightboxInfoBtn.addEventListener('click', () => {
      const on = els.modalLightboxMeta.hidden;
      els.modalLightboxMeta.hidden = !on;
      els.modalLightboxInfoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on) fetchLightboxImageMeta();
    });
  }
  if (els.modalLightboxStage) {
    els.modalLightboxStage.addEventListener('wheel', (e) => {
      if (!els.modalLightbox || els.modalLightbox.hidden) return;
      const img = els.modalLightboxImg;
      if (!img) return;
      const rect = img.getBoundingClientRect();
      const overImage =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!overImage) return;
      e.preventDefault();
      if (lightboxLoupeActive) {
        const loupeDelta = e.deltaY < 0 ? LIGHTBOX_LOUPE_SIZE_STEP : -LIGHTBOX_LOUPE_SIZE_STEP;
        changeLightboxLoupeSize(loupeDelta);
        onLightboxStagePointerMove({ clientX: e.clientX, clientY: e.clientY });
        return;
      }
      const delta = e.deltaY < 0 ? LIGHTBOX_ZOOM_STEP : -LIGHTBOX_ZOOM_STEP;
      changeLightboxZoom(delta);
    }, { passive: false });
    els.modalLightboxStage.addEventListener('mousemove', onLightboxStagePointerMove);
    els.modalLightboxStage.addEventListener('mousedown', onLightboxPanStart);
    els.modalLightboxStage.addEventListener('touchmove', (e) => {
      if (!lightboxLoupeActive || !e.touches[0]) return;
      const t = e.touches[0];
      onLightboxStagePointerMove({ clientX: t.clientX, clientY: t.clientY });
    }, { passive: true });
  }
  window.addEventListener('mousemove', onLightboxPanMove);
  window.addEventListener('mouseup', onLightboxPanEnd);
  if (els.modalLightboxImg) {
    els.modalLightboxImg.addEventListener('load', () => {
      if (!els.modalLightbox.hidden && els.modalLightboxMeta && !els.modalLightboxMeta.hidden) {
        fetchLightboxImageMeta();
      }
    });
  }

  els.modalCopyPrompt.addEventListener('click', async () => {
    const text = (els.modalPrompt.textContent || '').trim();
    if (!text) return;
    await copyTextWithOptionalFeedback(text, els.modalCopyFeedback, 'Copied to clipboard.');
    window.setTimeout(() => {
      if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = '';
    }, 2200);
  });

  if (els.modalCopyTitle) {
    els.modalCopyTitle.addEventListener('click', async () => {
      const text = (els.modalTitle.textContent || '').trim();
      await copyTextWithOptionalFeedback(text, els.modalListingFeedback, 'Title copied.');
      window.setTimeout(() => {
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
      }, 2000);
    });
  }

  if (els.modalCopyCategory) {
    els.modalCopyCategory.addEventListener('click', async () => {
      const text = (els.modalCategoryValue.textContent || '').trim();
      if (text === '—') return;
      await copyTextWithOptionalFeedback(text, els.modalListingFeedback, 'Category copied.');
      window.setTimeout(() => {
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
      }, 2000);
    });
  }

  if (els.modalCopyStyle) {
    els.modalCopyStyle.addEventListener('click', async () => {
      const text = (els.modalStyleValue.textContent || '').trim();
      if (text === '—') return;
      await copyTextWithOptionalFeedback(text, els.modalListingFeedback, 'Style copied.');
      window.setTimeout(() => {
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
      }, 2000);
    });
  }

  if (els.modalCopyMetaLine) {
    els.modalCopyMetaLine.addEventListener('click', async () => {
      if (!modalPosterItem) return;
      const line = `${modalPosterItem.style} · ${modalPosterItem.category}`;
      await copyTextWithOptionalFeedback(line, els.modalListingFeedback, 'Metadata line copied.');
      window.setTimeout(() => {
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
      }, 2000);
    });
  }

  if (els.modalCopyListing) {
    els.modalCopyListing.addEventListener('click', async () => {
      const text = (els.modalListingText.textContent || '').trim();
      await copyTextWithOptionalFeedback(text, els.modalListingFeedback, 'Listing copied.');
      window.setTimeout(() => {
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = '';
      }, 2000);
    });
  }

  if (els.modalDraftPromptBtn) {
    els.modalDraftPromptBtn.addEventListener('click', async () => {
      if (!modalPosterItem) return;
      const title = (modalPosterItem.title || '').trim();
      const category = modalPosterItem.category || '';
      const style = modalPosterItem.style || '';
      if (!title || !category || !style) {
        if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = 'Brak tytułu, kategorii lub stylu.';
        return;
      }
      els.modalDraftPromptBtn.disabled = true;
      if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = 'Układam prompt…';
      try {
        const draftRes = await fetch('/api/draft-image-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, category, style }),
        });
        const draftData = await draftRes.json().catch(() => ({}));
        if (!draftRes.ok) throw new Error(draftData.error || draftRes.statusText);
        const promptText = (draftData.prompt || '').trim();
        if (!promptText) throw new Error('Pusty prompt z serwera');
        const saveBody = { prompt: promptText, promptLlm: draftData.promptLlm || {} };
        if (modalPosterItem.id) saveBody.id = modalPosterItem.id;
        else saveBody.imagePath = modalPosterItem.imagePath;
        const saveRes = await fetch('/api/posters/prompt', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveBody),
        });
        const saveData = await saveRes.json().catch(() => ({}));
        if (!saveRes.ok) throw new Error(saveData.error || saveRes.statusText);
        const idKeep = modalPosterItem.id;
        const pathKeep = modalPosterItem.imagePath;
        modalPosterItem.prompt = promptText;
        if (draftData.promptLlm && draftData.promptLlm.promptLlmLabel) {
          modalPosterItem.promptLlmLabel = draftData.promptLlm.promptLlmLabel;
          modalPosterItem.promptLlmProvider = draftData.promptLlm.promptLlmProvider || '';
        }
        modalPosterItem.needsManualMetadata = false;
        populatePosterDetailModal(modalPosterItem, modalPreviewVariant);
        if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = 'Prompt zapisany w bibliotece.';
        await load();
        const next =
          (idKeep && flatItems.find((x) => x.id === idKeep)) ||
          (pathKeep && flatItems.find((x) => x.imagePath === pathKeep)) ||
          null;
        if (next) modalPosterItem = next;
      } catch (err) {
        if (els.modalCopyFeedback) els.modalCopyFeedback.textContent = err.message || 'Błąd';
      } finally {
        els.modalDraftPromptBtn.disabled = false;
        window.setTimeout(() => {
          if (els.modalCopyFeedback && els.modal && !els.modal.hidden) els.modalCopyFeedback.textContent = '';
        }, 3200);
      }
    });
  }

  if (els.modalGenerateListingBtn) {
    els.modalGenerateListingBtn.addEventListener('click', async () => {
      if (!modalPosterItem) return;
      els.modalGenerateListingBtn.disabled = true;
      if (els.modalListingFeedback) els.modalListingFeedback.textContent = 'Generating listing…';
      try {
        const body = {};
        if (modalPosterItem.id) body.id = modalPosterItem.id;
        else body.imagePath = modalPosterItem.imagePath;
        const res = await fetch('/api/posters/listing-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        const desc = (data.shopDescription || '').trim();
        const idKeep = modalPosterItem.id;
        const pathKeep = modalPosterItem.imagePath;
        modalPosterItem.shopDescription = desc;
        if (els.modalListingText) els.modalListingText.textContent = desc;
        if (els.modalListingEmptyHint) els.modalListingEmptyHint.hidden = true;
        if (els.modalGenerateListingBtn) els.modalGenerateListingBtn.hidden = true;
        if (els.modalCopyListing) els.modalCopyListing.disabled = !desc;
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = 'Saved listing to library.';
        await load();
        const next =
          (idKeep && flatItems.find((x) => x.id === idKeep)) ||
          (pathKeep && flatItems.find((x) => x.imagePath === pathKeep)) ||
          null;
        if (next) modalPosterItem = next;
      } catch (err) {
        if (els.modalListingFeedback) els.modalListingFeedback.textContent = err.message || 'Error';
      } finally {
        els.modalGenerateListingBtn.disabled = false;
        window.setTimeout(() => {
          if (els.modalListingFeedback && els.modal && !els.modal.hidden) els.modalListingFeedback.textContent = '';
        }, 3200);
      }
    });
  }

  els.studioPreviewModal.addEventListener('click', (e) => {
    if (e.target === els.studioPreviewModal) rejectStudioPreview();
  });
  els.studioPreviewClose.addEventListener('click', () => rejectStudioPreview());
  els.studioPreviewReject.addEventListener('click', () => rejectStudioPreview());

  els.studioPreviewAccept.addEventListener('click', async () => {
    if (!activeStudioPreviewId) return;
    const title = els.studioTitle.value.trim();
    const category = els.studioCategory.value;
    const style = els.studioStyle.value;
    const imagePrompt = els.studioPrompt.value.trim();
    if (!title || !imagePrompt) {
      setStudioStatus('Uzupełnij tytuł i prompt przed zatwierdzeniem.', 'error');
      return;
    }
    const pairErrCommit = validateStudioCategoryStyle(category, style);
    if (pairErrCommit) {
      setStudioStatus(pairErrCommit, 'error');
      return;
    }
    const previewId = activeStudioPreviewId;
    setStudioStatus('Zapis do biblioteki (tylko PNG)…');
    els.studioPreviewAccept.disabled = true;
    els.studioPreviewReject.disabled = true;
    els.studioPreviewClose.disabled = true;
    els.btnDraftPrompt.disabled = true;
    els.btnGeneratePoster.disabled = true;
    try {
      const res = await fetch('/api/studio/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId,
          title,
          category,
          style,
          imagePrompt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      activeStudioPreviewId = null;
      closeStudioPreviewModal();
      setStudioStatus('Zapisano w bibliotece (PNG). PDF wygenerujesz później z Biblioteki.', 'ok');
      await load();
    } catch (err) {
      setStudioStatus(err.message || 'Błąd zapisu', 'error');
    } finally {
      els.studioPreviewAccept.disabled = false;
      els.studioPreviewReject.disabled = false;
      els.studioPreviewClose.disabled = false;
      els.btnDraftPrompt.disabled = false;
      els.btnGeneratePoster.disabled = false;
    }
  });
  async function discardStudioPreviewRequest() {
    if (!activeStudioPreviewId) return;
    const id = activeStudioPreviewId;
    activeStudioPreviewId = null;
    try {
      await fetch('/api/studio/discard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewId: id }),
      });
    } catch (_) {}
  }

  function closeStudioPreviewModal() {
    els.studioPreviewModal.classList.remove('is-open');
    els.studioPreviewModal.hidden = true;
    if (els.studioPreviewImgFull) els.studioPreviewImgFull.removeAttribute('src');
    document.body.style.overflow = '';
  }

  async function rejectStudioPreview() {
    await discardStudioPreviewRequest();
    closeStudioPreviewModal();
  }

  function openStudioPreviewModal(previewId, imageUrl) {
    activeStudioPreviewId = previewId;
    const ts = Date.now();
    const sep = imageUrl.indexOf('?') >= 0 ? '&' : '?';
    const fullSrc = imageUrl + sep + 't=' + ts;
    if (els.studioPreviewImgFull) els.studioPreviewImgFull.src = fullSrc;
    els.studioPreviewModal.hidden = false;
    requestAnimationFrame(() => els.studioPreviewModal.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    els.studioPreviewAccept.focus();
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!els.studioPreviewModal.hidden && els.studioPreviewModal.classList.contains('is-open')) {
        e.preventDefault();
        rejectStudioPreview();
        return;
      }
      if (!els.modalLightbox.hidden && els.modalLightbox.classList.contains('is-open')) {
        e.preventDefault();
        closePosterLightbox();
        return;
      }
      if (!els.modal.hidden) closeModal();
    }
    if (!els.modalLightbox.hidden && els.modalLightbox.classList.contains('is-open')) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        lightboxNavigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        lightboxNavigate(1);
      }
    }
  });

  function setStudioStatus(text, kind) {
    els.studioStatus.textContent = text || '';
    els.studioStatus.classList.remove('is-error', 'is-ok');
    if (kind === 'error') els.studioStatus.classList.add('is-error');
    if (kind === 'ok') els.studioStatus.classList.add('is-ok');
  }

  function updateStudioCategoryPanel() {
    const cat = String(els.studioCategory.value || '').trim();
    const hint = categoryHints[cat] || '';
    const allowed = getAllowedStylesForCategoryUi(cat);
    const rooms = Array.isArray(categoryRoomCollectionsMap[cat]) ? categoryRoomCollectionsMap[cat] : [];
    const parts = [];
    if (hint) parts.push(`<span>${escapeHtml(hint)}</span>`);
    if (allowed.length) {
      parts.push(
        `<strong>Allowed styles (${allowed.length}):</strong> ${escapeHtml(allowed.join(', '))}`
      );
    }
    if (rooms.length) {
      parts.push(`<strong>Room collections:</strong> ${escapeHtml(rooms.join(', '))}`);
    }
    if (cat) {
      parts.push(
        `<strong>Output:</strong> <code>posters/${escapeHtml(cat)}/&lt;Styl&gt;/</code>`
      );
    }
    els.studioCategoryHint.innerHTML = parts.join('<br>') || '';
  }

  function getAllowedStylesForCategoryUi(category) {
    const cat = String(category || '').trim();
    const list = categoryStylesMap && categoryStylesMap[cat];
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  function getUnionOfAllCategoryStyles() {
    const seen = new Set();
    const ordered = [];
    for (const styles of Object.values(categoryStylesMap || {})) {
      if (!Array.isArray(styles)) continue;
      for (const s of styles) {
        const st = String(s || '').trim();
        if (st && !seen.has(st)) {
          seen.add(st);
          ordered.push(st);
        }
      }
    }
    return ordered.length ? ordered : (Array.isArray(configArtStylesList) ? configArtStylesList : []);
  }

  function validateStudioCategoryStyle(category, style) {
    const cat = String(category || '').trim();
    const st = String(style || '').trim();
    const allowed = getAllowedStylesForCategoryUi(cat);
    if (!allowed.length) {
      return `Nieznana kategoria lub brak mapowania stylów dla „${cat}”.`;
    }
    if (!allowed.includes(st)) {
      return (
        `Niedozwolona para kategoria + styl: ${cat} + ${st}. ` +
        `Dozwolone style: ${allowed.join(', ')}`
      );
    }
    return '';
  }

  function rebuildStudioStyleOptionsForCategory(category) {
    if (!els.studioStyle) return;
    const allowed = getAllowedStylesForCategoryUi(category);
    if (!allowed.length) {
      els.studioStyle.innerHTML =
        '<option value="">— wybierz kategorię —</option>';
      return;
    }
    const prev = String(els.studioStyle.value || '').trim();
    els.studioStyle.innerHTML = allowed
      .map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
      .join('');
    if (allowed.includes(prev)) {
      els.studioStyle.value = prev;
    } else {
      els.studioStyle.value = allowed[0];
    }
  }

  function rebuildModalMoveStyleForCategory(category, preferredStyle) {
    if (!els.modalMoveStyle) return;
    const allowed = getAllowedStylesForCategoryUi(category);
    if (!allowed.length) {
      els.modalMoveStyle.innerHTML = '<option value="">—</option>';
      return;
    }
    const prev = String(preferredStyle || els.modalMoveStyle.value || '').trim();
    els.modalMoveStyle.innerHTML = allowed
      .map((s) => `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`)
      .join('');
    if (allowed.includes(prev)) {
      els.modalMoveStyle.value = prev;
    } else {
      els.modalMoveStyle.value = allowed[0];
    }
  }

  function syncModalMoveSelectors(item) {
    if (!els.modalMoveCategory || !els.modalMoveStyle) return;
    const categories = Array.isArray(configCategoriesList) && configCategoriesList.length
      ? configCategoriesList
      : Object.keys(categoryHints || {});
    els.modalMoveCategory.innerHTML = categories
      .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
      .join('');
    const cat = item && item.category ? item.category : els.modalMoveCategory.value;
    if (item && item.category) els.modalMoveCategory.value = item.category;
    rebuildModalMoveStyleForCategory(cat, item && item.style ? item.style : '');
  }

  async function loadGenerationConfig() {
    try {
      const res = await fetch('/api/generation-config');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      categoryHints = data.categoryHints || {};
      configCategoriesList = Array.isArray(data.categories) ? [...data.categories] : [];
      categoryStylesMap = data.categoryStyles && typeof data.categoryStyles === 'object' ? data.categoryStyles : {};
      categoryRoomCollectionsMap =
        data.categoryRoomCollections && typeof data.categoryRoomCollections === 'object'
          ? data.categoryRoomCollections
          : {};
      els.studioCategory.innerHTML = (data.categories || [])
        .map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`)
        .join('');
      configArtStylesList = data.artStyles || [];
      rebuildStudioStyleOptionsForCategory(els.studioCategory.value);
      updateStudioCategoryPanel();
      fillStudioAutoScopeSelect(data.categories || []);
      fillStudioAutoStyleSelect(data.artStyles || []);
      renderLibraryStyleFilterList();
    } catch (e) {
      setStudioStatus('Nie wczytano konfiguracji kategorii (endpoint /api/generation-config).', 'error');
    }
  }

  els.studioCategory.addEventListener('change', () => {
    rebuildStudioStyleOptionsForCategory(els.studioCategory.value);
    updateStudioCategoryPanel();
  });

  if (els.modalMoveCategory) {
    els.modalMoveCategory.addEventListener('change', () => {
      rebuildModalMoveStyleForCategory(els.modalMoveCategory.value, '');
    });
  }

  if (els.studioModeManual) els.studioModeManual.addEventListener('click', () => setStudioMode('manual'));
  if (els.studioModeAuto) els.studioModeAuto.addEventListener('click', () => setStudioMode('auto'));
  els.studioAutoScope.addEventListener('change', () => fillStudioAutoStyleSelect());
  if (els.studioAutoStyle) els.studioAutoStyle.addEventListener('change', updateStudioAutoCommand);
  els.studioAutoCount.addEventListener('input', updateStudioAutoCommand);
  els.studioAutoCount.addEventListener('change', updateStudioAutoCommand);

  els.btnRunStudioAutoBatch.addEventListener('click', async () => {
    const n = clampAutoPosterCount(els.studioAutoCount.value);
    const scope = els.studioAutoScope.value;
    const all = scope === '__all__';
    setStudioAutoBatchUiBusy(true);
    setStudioAutoRunStatus('');
    startStudioAutoProgressUi();
    try {
      const stylePick = els.studioAutoStyle && els.studioAutoStyle.value ? els.studioAutoStyle.value.trim() : '';
      if (stylePick) {
        if (all) {
          const cats =
            Array.isArray(configCategoriesList) && configCategoriesList.length
              ? configCategoriesList
              : Object.keys(categoryStylesMap || {});
          for (const c of cats) {
            const err = validateStudioCategoryStyle(c, stylePick);
            if (err) throw new Error(`${err} (tryb: wszystkie kategorie)`);
          }
        } else {
          const err = validateStudioCategoryStyle(scope, stylePick);
          if (err) throw new Error(err);
        }
      }
      const res = await fetch('/api/studio/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          all,
          ...(all ? {} : { category: scope }),
          count: n,
          ...(stylePick ? { artStyle: stylePick } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      stopStudioAutoProgressUi(true);
      await new Promise((r) => window.setTimeout(r, 620));
      try {
        sessionStorage.setItem(
          STUDIO_AUTO_FLASH_KEY,
          JSON.stringify({ msg: data.message || 'Zakończono.', kind: 'ok' })
        );
      } catch (_) {}
      window.location.reload();
    } catch (e) {
      stopStudioAutoProgressUi(false);
      setStudioAutoRunStatus(e.message || 'Błąd generowania wsadowego', 'error');
    } finally {
      setStudioAutoBatchUiBusy(false);
    }
  });

  els.btnCopyStudioAutoCommand.addEventListener('click', async () => {
    const text = (els.studioAutoCommand.textContent || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      els.studioAutoCopyFeedback.textContent = 'Skopiowano do schowka.';
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        els.studioAutoCopyFeedback.textContent = 'Skopiowano do schowka.';
      } catch (e2) {
        els.studioAutoCopyFeedback.textContent = 'Zaznacz i skopiuj ręcznie z pola powyżej.';
      }
    }
    window.setTimeout(() => {
      els.studioAutoCopyFeedback.textContent = '';
    }, 2800);
  });

  if (els.btnShopifyExportApproved) {
    els.btnShopifyExportApproved.addEventListener('click', async () => {
      await runShopifyExport(false);
    });
  }
  if (els.btnShopifyExportAll) {
    els.btnShopifyExportAll.addEventListener('click', async () => {
      await runShopifyExport(true);
    });
  }
  if (els.btnShopifyThumbsPush) {
    els.btnShopifyThumbsPush.addEventListener('click', async () => {
      await runShopifyThumbsPush();
    });
  }
  if (els.btnShopifySaveSettings) {
    els.btnShopifySaveSettings.addEventListener('click', async () => {
      await saveShopifyExportSettings();
    });
  }
  if (els.btnShopifyReadiness) {
    els.btnShopifyReadiness.addEventListener('click', async () => {
      await refreshShopifyReadiness();
    });
  }

  els.btnDraftPrompt.addEventListener('click', async () => {
    const title = els.studioTitle.value.trim();
    const category = els.studioCategory.value;
    const style = els.studioStyle.value;
    if (!title) {
      setStudioStatus('Podaj tytuł plakatu.', 'error');
      return;
    }
    const pairErrDraft = validateStudioCategoryStyle(category, style);
    if (pairErrDraft) {
      setStudioStatus(pairErrDraft, 'error');
      return;
    }
    setStudioStatus('Łączenie z API…');
    els.btnDraftPrompt.disabled = true;
    els.btnGeneratePoster.disabled = true;
    try {
      const res = await fetch('/api/draft-image-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          style,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      els.studioPrompt.value = data.prompt || '';
      setStudioStatus('Prompt wstawiony — edytuj, potem „Generuj podgląd”.', 'ok');
    } catch (e) {
      setStudioStatus(e.message || 'Błąd przy układaniu promptu', 'error');
    } finally {
      els.btnDraftPrompt.disabled = false;
      els.btnGeneratePoster.disabled = false;
    }
  });

  if (els.btnClearStudio) {
    els.btnClearStudio.addEventListener('click', () => {
      els.studioTitle.value = '';
      els.studioPrompt.value = '';
      studioUploadedImageDataUrl = '';
      if (els.studioUploadInput) els.studioUploadInput.value = '';
      if (els.btnUploadStudioImage) els.btnUploadStudioImage.disabled = true;
      if (els.studioUploadNote) {
        els.studioUploadNote.textContent = 'Ręczny flow: wybierz PNG/JPG/WEBP i zapisz przez ten sam modal akceptacji.';
      }
      setStudioStatus('');
      try {
        els.studioTitle.focus();
      } catch (_) {}
    });
  }

  if (els.btnPickStudioImage && els.studioUploadInput) {
    els.btnPickStudioImage.addEventListener('click', () => {
      els.studioUploadInput.click();
    });
  }

  if (els.studioUploadInput) {
    els.studioUploadInput.addEventListener('change', () => {
      const f = els.studioUploadInput.files && els.studioUploadInput.files[0];
      if (f) processUploadFile(f);
    });
  }

  // Dropzone click / drag-drop for upload panel
  if (els.studioUploadDropzone && els.studioUploadInput) {
    els.studioUploadDropzone.addEventListener('click', () => els.studioUploadInput.click());
    els.studioUploadDropzone.addEventListener('dragover', (e) => { e.preventDefault(); els.studioUploadDropzone.classList.add('is-dragover'); });
    els.studioUploadDropzone.addEventListener('dragleave', () => els.studioUploadDropzone.classList.remove('is-dragover'));
    els.studioUploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.studioUploadDropzone.classList.remove('is-dragover');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) processUploadFile(file);
    });
  }

  function processUploadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      studioUploadedImageDataUrl = ev.target.result;
      // Show preview inside dropzone
      if (els.studioUploadDropzone) {
        let img = els.studioUploadDropzone.querySelector('.studio-upload-preview-img');
        if (!img) { img = document.createElement('img'); img.className = 'studio-upload-preview-img'; els.studioUploadDropzone.appendChild(img); }
        img.src = studioUploadedImageDataUrl;
        els.studioUploadDropzone.querySelector('.studio-upload-dropzone-label').textContent = file.name;
        els.studioUploadDropzone.querySelector('.studio-upload-dropzone-hint').textContent = Math.round(file.size / 1024) + ' KB';
      }
      if (els.btnUploadStudioImage) els.btnUploadStudioImage.disabled = false;
      if (els.studioUploadNote) els.studioUploadNote.textContent = 'Plik gotowy — uzupełnij tytuł i kliknij „Dodaj do biblioteki".';
    };
    reader.onerror = () => { if (els.studioUploadNote) els.studioUploadNote.textContent = 'Błąd odczytu pliku.'; };
    reader.readAsDataURL(file);
  }

  if (els.btnUploadStudioImage) {
    const runManualUploadPreview = async () => {
      const title = (els.studioUploadTitle ? els.studioUploadTitle.value.trim() : els.studioTitle.value.trim());
      const category = (els.studioUploadCategory ? els.studioUploadCategory.value : els.studioCategory.value);
      const style = (els.studioUploadStyle ? els.studioUploadStyle.value : els.studioStyle.value);
      const imagePrompt = (title ? 'Photo: ' + title : '') || els.studioPrompt.value.trim();
      if (!title) return setStudioStatus('Podaj tytuł plakatu.', 'error');
      const pairErrUp = validateStudioCategoryStyle(category, style);
      if (pairErrUp) return setStudioStatus(pairErrUp, 'error');
      if (!imagePrompt) return setStudioStatus('Najpierw ułóż lub wpisz prompt (ChatGPT/manual).', 'error');
      if (!studioUploadedImageDataUrl) return setStudioStatus('Najpierw wybierz plik obrazu.', 'error');

      if (activeStudioPreviewId) {
        const oldId = activeStudioPreviewId;
        activeStudioPreviewId = null;
        closeStudioPreviewModal();
        try {
          await fetch('/api/studio/discard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewId: oldId }),
          });
        } catch (_) {}
      }

      setStudioStatus('Upload ręcznego zdjęcia — przygotowanie podglądu…');
      if (els.btnDraftPrompt) els.btnDraftPrompt.disabled = true;
      if (els.btnGeneratePoster) els.btnGeneratePoster.disabled = true;
      if (els.btnPickStudioImage) els.btnPickStudioImage.disabled = true;
      els.btnUploadStudioImage.disabled = true;
      try {
        const res = await fetch('/api/studio/preview-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, category, style, imagePrompt, imageDataUrl: studioUploadedImageDataUrl }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || res.statusText);
        setStudioStatus('Ręczny podgląd gotowy — zaakceptuj lub odrzuć w oknie.', 'ok');
        openStudioPreviewModal(data.previewId, data.imageUrl);
      } catch (e) {
        setStudioStatus(e.message || 'Błąd uploadu ręcznego zdjęcia', 'error');
      } finally {
        if (els.btnDraftPrompt) els.btnDraftPrompt.disabled = false;
        if (els.btnGeneratePoster) els.btnGeneratePoster.disabled = false;
        if (els.btnPickStudioImage) els.btnPickStudioImage.disabled = false;
        els.btnUploadStudioImage.disabled = !studioUploadedImageDataUrl;
      }
    };
    els.btnUploadStudioImage.addEventListener('click', runManualUploadPreview);
    els.btnUploadStudioImage.__runManualUploadPreview = runManualUploadPreview;
  }

  els.btnGeneratePoster.addEventListener('click', async () => {
    if (studioImageSource === 'manual') {
      const runManual = els.btnUploadStudioImage && els.btnUploadStudioImage.__runManualUploadPreview;
      if (typeof runManual === 'function') {
        await runManual();
        return;
      }
    }
    const title = els.studioTitle.value.trim();
    const category = els.studioCategory.value;
    const style = els.studioStyle.value;
    const imagePrompt = els.studioPrompt.value.trim();
    if (!title) {
      setStudioStatus('Podaj tytuł plakatu.', 'error');
      return;
    }
    const pairErr = validateStudioCategoryStyle(category, style);
    if (pairErr) {
      setStudioStatus(pairErr, 'error');
      return;
    }
    if (!imagePrompt) {
      setStudioStatus('Wpisz lub wygeneruj prompt przed generatorem obrazów.', 'error');
      return;
    }
    if (activeStudioPreviewId) {
      const oldId = activeStudioPreviewId;
      activeStudioPreviewId = null;
      closeStudioPreviewModal();
      try {
        await fetch('/api/studio/discard', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previewId: oldId }),
        });
      } catch (_) {}
    }
    setStudioStatus('Generowanie podglądu (GPT Image) — bez zapisu do biblioteki…');
    els.btnDraftPrompt.disabled = true;
    els.btnGeneratePoster.disabled = true;
    try {
      const res = await fetch('/api/studio/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, style, imagePrompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      setStudioStatus('Podgląd gotowy — zaakceptuj lub odrzuć w oknie.', 'ok');
      openStudioPreviewModal(data.previewId, data.imageUrl);
    } catch (e) {
      setStudioStatus(e.message || 'Błąd generowania', 'error');
    } finally {
      els.btnDraftPrompt.disabled = false;
      els.btnGeneratePoster.disabled = false;
    }
  });

  if (els.studioSourceDalle) {
    els.studioSourceDalle.addEventListener('click', () => setStudioImageSource('dalle'));
  }
  if (els.studioSourceManual) {
    els.studioSourceManual.addEventListener('click', () => setStudioImageSource('manual'));
  }

  document.getElementById('themeToggle').addEventListener('click', function () {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    applyTheme(isLight ? 'dark' : 'light');
  });

  applyTheme(getStoredTheme());

  setStudioMode(getStoredStudioMode());
  setStudioImageSource('dalle');
  updateStudioAutoCommand();
  try {
    const raw = sessionStorage.getItem(STUDIO_AUTO_FLASH_KEY);
    if (raw) {
      sessionStorage.removeItem(STUDIO_AUTO_FLASH_KEY);
      const j = JSON.parse(raw);
      if (j && j.msg) setStudioAutoRunStatus(String(j.msg), j.kind === 'error' ? 'error' : 'ok');
    }
  } catch (_) {}
  loadGenerationConfig();
  syncStatusFilterButtons();
  load();
})();
