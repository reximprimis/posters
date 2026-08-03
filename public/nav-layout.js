// Przebudowa nawigacji i zakladek panelu (Figma nav) - wydzielone z inline <script> w index.html.
// Ladowane na poczatku <body>, cala praca dzieje sie w DOMContentLoaded.

// Figma nav + tab restructuring — runs before DOMContentLoaded
document.addEventListener('DOMContentLoaded', function () {
  // 1. Create top nav
  var nav = document.createElement('nav');
  nav.className = 'figma-nav';
  nav.setAttribute('aria-label', 'Główna nawigacja');
  nav.innerHTML =
    '<div class="figma-nav-inner">' +
      '<div class="figma-nav-brand">' +
        '<span class="figma-nav-wordmark">Plakaty</span>' +
        '<span class="figma-nav-version">v2.0</span>' +
      '</div>' +
      '<div class="figma-nav-tabs">' +
        '<div class="figma-tab-group" role="tablist">' +
          '<button class="figma-tab is-active" role="tab" aria-selected="true" data-tab="dashboard"><span class="step-num">1</span>Generator plakatów</button>' +
          '<span class="figma-tab-arrow" aria-hidden="true">→</span>' +
          '<button class="figma-tab" role="tab" aria-selected="false" data-tab="library"><span class="step-num">2</span>Biblioteka</button>' +
          '<span class="figma-tab-arrow" aria-hidden="true">→</span>' +
          '<button class="figma-tab" role="tab" aria-selected="false" data-tab="export"><span class="step-num">3</span>Eksport</button>' +
        '</div>' +
      '</div>' +
      '<div class="figma-nav-actions" id="figmaNavActions">' +
        '<button class="figma-settings-btn" id="btnOpenInfo" title="Jak to działa?" aria-label="Dokumentacja i flow">' +
          '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 6.5v4M7.5 4.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<button class="figma-settings-btn" id="btnOpenSettings" title="Ustawienia" aria-label="Otwórz ustawienia">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="currentColor"/>' +
            '<path fill-rule="evenodd" clip-rule="evenodd" d="M6.56 1.27a1.5 1.5 0 0 1 2.88 0l.14.55a.5.5 0 0 0 .68.33l.52-.22a1.5 1.5 0 0 1 2.04 2.04l-.22.52a.5.5 0 0 0 .33.68l.55.14a1.5 1.5 0 0 1 0 2.88l-.55.14a.5.5 0 0 0-.33.68l.22.52a1.5 1.5 0 0 1-2.04 2.04l-.52-.22a.5.5 0 0 0-.68.33l-.14.55a1.5 1.5 0 0 1-2.88 0l-.14-.55a.5.5 0 0 0-.68-.33l-.52.22a1.5 1.5 0 0 1-2.04-2.04l.22-.52a.5.5 0 0 0-.33-.68l-.55-.14a1.5 1.5 0 0 1 0-2.88l.55-.14a.5.5 0 0 0 .33-.68l-.22-.52A1.5 1.5 0 0 1 5.22 1.93l.52.22a.5.5 0 0 0 .68-.33l.14-.55ZM8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" fill="currentColor"/>' +
          '</svg>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.prepend(nav);

  // ── Settings modal ────────────────────────────────────────
  var settingsModal = document.createElement('div');
  settingsModal.id = 'settingsModal';
  settingsModal.className = 'settings-modal-overlay';
  settingsModal.hidden = true;
  settingsModal.innerHTML =
    '<div class="settings-modal">' +
      '<div class="settings-modal-header">' +
        '<div>' +
          '<p class="settings-modal-eyebrow">System</p>' +
          '<h2 class="settings-modal-title">Ustawienia</h2>' +
        '</div>' +
        '<button class="settings-modal-close" id="btnCloseSettings" aria-label="Zamknij">✕</button>' +
      '</div>' +

      // Tab nav inside modal
      '<div class="settings-tabs">' +
        '<button class="settings-tab is-active" data-stab="api">API & Modele</button>' +
        '<button class="settings-tab" data-stab="categories">Kategorie</button>' +
        '<button class="settings-tab" data-stab="styles">Style</button>' +
        '<button class="settings-tab" data-stab="export">Eksport</button>' +
      '</div>' +

      '<div class="settings-modal-body">' +

        // ─── Tab: API & Modele ───
        '<div class="settings-tab-panel is-active" data-stab-panel="api">' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">API & Modele</h3>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">OpenAI API Key</span><span class="settings-row-desc">Klucz do GPT Image 2 i promptów</span></div>' +
              '<div class="settings-row-value" id="settingApiKey"><span class="settings-skeleton">…</span></div>' +
            '</div>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">Model obrazów</span><span class="settings-row-desc">IMAGE_GENERATION_MODEL</span></div>' +
              '<div class="settings-row-value" id="settingImageModel"><span class="settings-skeleton">…</span></div>' +
            '</div>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">Model promptów</span><span class="settings-row-desc">OPENAI_PROMPT_MODEL</span></div>' +
              '<div class="settings-row-value" id="settingPromptModel"><span class="settings-skeleton">…</span></div>' +
            '</div>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">Node.js</span></div>' +
              '<div class="settings-row-value" id="settingNodeVersion"><span class="settings-skeleton">…</span></div>' +
            '</div>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">LLM Providers</span><span class="settings-row-desc">Aktywni dostawcy AI</span></div>' +
              '<div class="settings-row-value" id="settingLlmProviders"><span class="settings-skeleton">…</span></div>' +
            '</div>' +
          '</section>' +
          '<section class="settings-section settings-section--info">' +
            '<h3 class="settings-section-title">Konfiguracja przez .env</h3>' +
            '<div class="settings-env-preview">' +
              '<code class="settings-env-line">OPENAI_API_KEY=sk-…</code>' +
              '<code class="settings-env-line">IMAGE_GENERATION_MODEL=gpt-image-2</code>' +
              '<code class="settings-env-line">OPENAI_PROMPT_MODEL=gpt-4o-mini</code>' +
            '</div>' +
          '</section>' +
        '</div>' +

        // ─── Tab: Kategorie ───
        '<div class="settings-tab-panel" data-stab-panel="categories" hidden>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Kategorie plakatów</h3>' +
            '<p class="settings-info-text">Wbudowane kategorie są stałe. Możesz dodawać własne — pojawią się w Generatorze i filtrach Biblioteki natychmiast.</p>' +
            '<div id="settingCategoriesList" class="settings-tag-list"><span class="settings-skeleton">Ładowanie…</span></div>' +
          '</section>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Dodaj kategorię</h3>' +
            '<div class="settings-add-form">' +
              '<input id="newCategoryName" class="settings-input" type="text" placeholder="Nazwa kategorii (np. Śluby i uroczystości)" />' +
              '<input id="newCategoryHint" class="settings-input" type="text" placeholder="Opis dla AI (po angielsku, opcjonalnie)" />' +
              '<button id="btnAddCategory" class="settings-add-btn">Dodaj kategorię</button>' +
            '</div>' +
            '<p class="settings-add-feedback" id="categoryFeedback"></p>' +
          '</section>' +
        '</div>' +

        // ─── Tab: Style ───
        '<div class="settings-tab-panel" data-stab-panel="styles" hidden>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Style artystyczne</h3>' +
            '<p class="settings-info-text">Style determinują jak wygląda plakat. Wbudowane są stałe, możesz dodać własne.</p>' +
            '<div id="settingStylesList" class="settings-tag-list"><span class="settings-skeleton">Ładowanie…</span></div>' +
          '</section>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Dodaj styl</h3>' +
            '<div class="settings-add-form">' +
              '<input id="newStyleName" class="settings-input" type="text" placeholder="Nazwa stylu (np. Watercolor)" />' +
              '<button id="btnAddStyle" class="settings-add-btn">Dodaj styl</button>' +
            '</div>' +
            '<p class="settings-add-feedback" id="styleFeedback"></p>' +
          '</section>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Domyślne w Generatorze</h3>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">Domyślna kategoria</span></div>' +
              '<div class="settings-row-value"><select id="settingDefaultCategory" class="settings-select"><option value="">— brak —</option></select></div>' +
            '</div>' +
            '<div class="settings-row">' +
              '<div class="settings-row-label"><span class="settings-row-name">Domyślny styl</span></div>' +
              '<div class="settings-row-value"><select id="settingDefaultStyle" class="settings-select"><option value="">— brak —</option></select></div>' +
            '</div>' +
            '<button id="btnSaveDefaults" class="settings-save-btn">Zapisz domyślne</button>' +
            '<p class="settings-add-feedback" id="defaultsFeedback"></p>' +
          '</section>' +
        '</div>' +

        // ─── Tab: Eksport ───
        '<div class="settings-tab-panel" data-stab-panel="export" hidden>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Szybki eksport</h3>' +
            '<div class="settings-export-actions">' +
              '<button class="settings-export-btn" id="settingBtnExportApproved">📦 Eksport Shopify (zatwierdzone)</button>' +
              '<button class="settings-export-btn settings-export-btn--secondary" id="settingBtnExportAll">📋 Eksport Shopify (wszystkie)</button>' +
              '<button class="settings-export-btn settings-export-btn--secondary" id="settingBtnSyncThumbs">🔄 Sync thumbs + push</button>' +
            '</div>' +
            '<p class="settings-export-status" id="settingExportStatus"></p>' +
          '</section>' +
          '<section class="settings-section">' +
            '<h3 class="settings-section-title">Cennik</h3>' +
            '<div id="settingsPriceTable" class="price-table"></div>' +
            '<button class="settings-save-btn" id="settingsBtnSavePrice">Zapisz cennik</button>' +
            '<p class="settings-add-feedback" id="priceFeedback"></p>' +
          '</section>' +
        '</div>' +

      '</div>' +
    '</div>';
  document.body.appendChild(settingsModal);

  // ── Info modal ────────────────────────────────────────────
  // INFO-DOC: Ten blok zawiera dokumentację flow całego systemu.
  // Przy zmianie logiki generatora, biblioteki lub eksportu — zaktualizuj
  // odpowiednią sekcję info-panel poniżej.
  var infoModal = document.createElement('div');
  infoModal.id = 'infoModal';
  infoModal.className = 'info-modal-overlay';
  infoModal.hidden = true;
  infoModal.innerHTML =
    '<div class="info-modal" role="dialog" aria-labelledby="infoModalTitle">' +

      // Header
      '<div class="info-modal-header">' +
        '<div>' +
          '<p class="info-modal-eyebrow">Dokumentacja systemu</p>' +
          '<h2 class="info-modal-title" id="infoModalTitle">' +
            '<svg width="18" height="18" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.4"/><path d="M7.5 6.5v4M7.5 4.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' +
            'Jak to działa?' +
          '</h2>' +
        '</div>' +
        '<button class="info-modal-close" id="btnCloseInfo" aria-label="Zamknij">✕</button>' +
      '</div>' +

      // Tabs
      '<div class="info-modal-tabs" role="tablist">' +
        '<button class="info-modal-tab" data-itab="generator-upload" role="tab">📸 Dodaj własne zdjęcie</button>' +
        '<button class="info-modal-tab is-active" data-itab="generator-manual" role="tab">🎨 Generator manualny</button>' +
        '<button class="info-modal-tab" data-itab="generator-auto" role="tab">⚡ Generator automatyczny</button>' +
        '<button class="info-modal-tab" data-itab="pipeline" role="tab">⚙️ Pipeline (zatwierdzenie)</button>' +
        '<button class="info-modal-tab" data-itab="library" role="tab">📚 Biblioteka</button>' +
        '<button class="info-modal-tab" data-itab="export" role="tab">🛒 Eksport Shopify</button>' +
        '<button class="info-modal-tab" data-itab="mockups" role="tab">🖼️ Mockupy GPT</button>' +
      '</div>' +

      '<div class="info-modal-body">' +

        // ── PANEL 1: Generator manualny ──────────────────────────
        '<div class="info-panel is-active" id="itab-generator-manual">' +

          '<p class="info-section-title">Wybór flow — ekran startowy Generatora</p>' +
          '<div class="info-cards">' +
            card('📸','Dodaj własne zdjęcie','Wgraj gotowy PNG/JPG/WEBP z dysku. Żadnego generowania — plik trafia prosto do biblioteki jako niezatwierdzony plakat.') +
            card('🎨','Generator manualny','Piszesz prompt (lub prosisz GPT-4 o pomoc), opcjonalnie dołączasz zdjęcie ref., generujesz podgląd i akceptujesz wynik.') +
            card('⚡','Generator automatyczny','Batch: wybierasz kategorię i liczbę plakatów. GPT generuje prompty i obrazy automatycznie, bez podglądu przed zapisem.') +
          '</div>' +

          '<p class="info-section-title">Flow — Generator manualny</p>' +
          '<div class="info-flow">' +
            step('📝','Prompt','Opisujesz plakat lub klikasz „Ułóż prompt" → GPT-4 pisze prompt za Ciebie','accent') +
            arrow() +
            step('👁️','Generuj podgląd','API generuje master PNG i wyświetla go w prawym panelu. Można ponowić.','accent') +
            arrow() +
            step('📚','Dodaj do biblioteki','„Dodaj do biblioteki" zapisuje master PNG + meta w inventory.<br>Plakat trafia jako <strong>niezatwierdzony</strong>.','') +
          '</div>' +

          '<p class="info-section-title">Wszystkie 3 flow kończą się w tym samym miejscu</p>' +
          '<div class="info-cards">' +
            card('📚','Wspólny punkt końcowy','Upload / manualny / automatyczny — zawsze: master PNG w <code>posters/</code> + wpis w inventory z <code>approvedForPrint: false</code>.') +
            card('☑️','Co dalej?','Plakat czeka w bibliotece na Twoje zatwierdzenie. Dopiero zatwierdzenie uruchamia pipeline (thumby, PDF, mockupy).') +
          '</div>' +

        '</div>' +

        // ── PANEL 2: Generator automatyczny ─────────────────────
        '<div class="info-panel" id="itab-generator-auto">' +

          '<p class="info-section-title">Flow — Generator automatyczny (zakładka 1, pole „Liczba")</p>' +
          '<div class="info-flow">' +
            step('🔢','Liczba','Wpisujesz ile plakatów na styl. Np. 3 = 3 plakaty × każdy styl w kategorii','') +
            arrow() +
            step('🤖','GPT-4 prompt','Dla każdego stylu generowany jest unikalny prompt w oparciu o kategorię i styl','accent') +
            arrow() +
            step('🎨','GPT Image 2','Obraz generowany przez API. Model: gpt-image-2, rozmiar: 1024×1536','accent') +
            arrow() +
            step('📚','Dodaj do biblioteki','Master PNG zapisywany do <code>posters/</code> + wpis w inventory jako <strong>niezatwierdzony</strong>','') +
          '</div>' +

          '<p class="info-section-title">Polecenia CLI (Terminal)</p>' +
          '<div class="info-cards">' +
            card('⌨️','Generuj wszystkie style','<code>npm run generate-all</code><br>Generuje po 1 plakacie na każdy styl, każdą kategorię.') +
            card('⌨️','Konkretna kategoria','<code>npm run generate-botanika</code><br>Lub z parametrem stylu w JSON konfigu.') +
            card('⌨️','Tryb headless','Serwer <code>node preview.js</code> nasłuchuje na porcie 3000. Generator woła lokalne API.') +
            card('📊','Konfiguracja','Kategorie i style zdefiniowane w <code>config.js</code> lub przez UI Ustawień (zakładki Kategorie / Style).') +
          '</div>' +

        '</div>' +

        // ── PANEL 2b: Dodaj własne zdjęcie ───────────────────────
        '<div class="info-panel" id="itab-generator-upload">' +

          '<p class="info-section-title">Flow — Dodaj własne zdjęcie (3. flow)</p>' +
          '<div class="info-flow">' +
            step('📸','Wybierz plik','Kliknij strefę lub przeciągnij PNG/JPG/WEBP · max 30 MB. Pojawia się podgląd.','accent') +
            arrow() +
            step('📋','Uzupełnij meta','Tytuł plakatu, kategoria, styl — te same pola co w generatorze manualnym.','') +
            arrow() +
            step('📚','Dodaj do biblioteki','Kliknij „Dodaj do biblioteki". Plik trafia do <code>posters/</code> jako <strong>niezatwierdzony</strong>.','') +
          '</div>' +

          '<p class="info-section-title">Kiedy używać</p>' +
          '<div class="info-cards">' +
            card('🖼️','Gotowe dzieło','Masz już gotowy obraz — rysunek, skan, ilustrację — i chcesz go po prostu dodać do katalogu bez generowania AI.') +
            card('🔄','Ten sam pipeline','Po zatwierdzeniu w bibliotece uruchamia się identyczny pipeline co dla plakatów generowanych: thumby, PDFy, mockupy.') +
            card('📐','Format','PNG/JPG/WEBP, proporcje 2:3 (portret) zalecane. Plik trafi jako master PNG — pipeline skalibruje go do standardu.') +
          '</div>' +

        '</div>' +

        // ── PANEL 3: Pipeline po zatwierdzeniu ──────────────────
        '<div class="info-panel" id="itab-pipeline">' +

          '<p class="info-section-title">Pipeline po zatwierdzeniu — uruchamia się automatycznie w tle</p>' +
          '<div class="info-flow">' +
            step('☑️','Zatwierdź','Klikasz checkbox „Zatwierdzony do druku" w bibliotece → API PATCH → pipeline startuje w tle','') +
            arrow() +
            step('📐','Master standard','Sprawdza i koryguje rozdzielczość / proporcje mastera PNG','accent') +
            arrow() +
            step('🖼️','Ramka PNG','Generuje wersję z białą ramką (passepartout)','accent') +
            arrow() +
            step('🔲','Thumby Shopify','<code>_thumb.jpg</code> + <code>_ramka_thumb.jpg</code> — miniaturki 800×1200 JPEG','green') +
            arrow() +
            step('📄','PDF × 6','13×18, 21×30, 30×40, 40×50, 50×70, 70×100 cm — master i ramka','green') +
            arrow() +
            step('🖼️','Mockupy GPT','<code>_mockup_frame.jpg</code> + <code>_mockup_interior.jpg</code> — tylko gdy jest OPENAI_API_KEY','green') +
          '</div>' +

          '<p class="info-section-title">Co się generuje (kompletna lista)</p>' +
          '<div class="info-cards">' +
            card('📐','Master standard','Master PNG przeskalowany / dopasowany do standardu 2:3 (1024×1536 lub wyżej).') +
            card('🖼️','Ramka PNG','Wersja mastera z białą ramką passepartout. Prefix <code>_ramka</code>.') +
            card('🔲','Thumby Shopify','<code>_thumb.jpg</code> (master) i <code>_ramka_thumb.jpg</code>. 800×1200 JPEG. Skopiowane do <code>shopify_thumbs/</code> przy push.') +
            card('📄','PDF master × 6','13×18, 21×30, 30×40, 40×50, 50×70, 70×100 cm. 300 DPI, CMYK-safe.') +
            card('📄','PDF ramka × 6','Te same rozmiary z ramką passepartout. Prefix <code>_ramka</code>.') +
            card('🖼️','Mockup frame','<code>TytułSlug_mockup_frame.jpg</code> — packshot w czarnej ramce na białym tle.') +
            card('🖼️','Mockup interior','<code>TytułSlug_mockup_interior.jpg</code> — plakat w ramce w wnętrzu dopasowanym do kategorii (kuchnia, biuro, kawiarnia…).') +
          '</div>' +

          '<p class="info-section-title">Folder plakatu po zatwierdzeniu (komplet)</p>' +
          '<div class="info-cards">' +
            card('📁','Struktura folderu','<code>TytułPlakatu.png</code><br><code>TytułPlakatu_ramka.png</code><br><code>TytułPlakatu_thumb.jpg</code><br><code>TytułPlakatu_ramka_thumb.jpg</code><br><code>TytułPlakatu_13x18.pdf</code> … <code>_70x100.pdf</code><br><code>TytułPlakatu_ramka_13x18.pdf</code> … <code>_70x100.pdf</code><br><code>TytułSlug_mockup_frame.jpg</code><br><code>TytułSlug_mockup_interior.jpg</code>') +
          '</div>' +

        '</div>' +

        // ── PANEL 3: Biblioteka ──────────────────────────────────
        '<div class="info-panel" id="itab-library">' +

          '<p class="info-section-title">Źródło danych — posters_inventory.json</p>' +
          '<div class="info-flow">' +
            step('💾','inventory.json','Główna baza: lista wszystkich plakatów z metadanymi, ścieżkami PDF, statusem','') +
            arrow() +
            step('🔗','API /api/posters','Serwer grupuje plakaty wg klucza dedup (ścieżka obrazu). Duplikaty → jeden rekord primary','accent') +
            arrow() +
            step('📐','flattenPosters()','Frontend spłaszcza grupę kategorii → płaską listę. Sortowanie: niezatwierdzone pierwsze','') +
            arrow() +
            step('🃏','Siatka kart','Renderowane jako karty z thumb, tytułem, kategorią, stylem i linkami PDF','green') +
          '</div>' +

          '<p class="info-section-title">Filtry w lewym panelu</p>' +
          '<div class="info-cards">' +
            card('🔍','Szukaj','Tytuł, kategoria, styl — pole tekstowe filtruje na żywo (debounce 120ms)') +
            card('📂','Kategoria','Lista wszystkich kategorii z liczbą plakatów. Klik → filtr.') +
            card('🎨','Styl','Abstract, Illustration, Line art, Minimalism, Photography itd.') +
            card('✅','Status druku','Nowy (niewybrany), Zatwierdzony (gotowy do druku). Domyślnie: niezatwierdzone na górze.') +
          '</div>' +

          '<p class="info-section-title">Modal plakatu — zakładki</p>' +
          '<div class="info-cards">' +
            card('🌐','Pełny widok','Wszystkie sekcje naraz: meta, listing, zatwierdzenie, prompt, pliki, mockupy.') +
            card('⚙️','Workflow','Tytuł + kategoria/styl + shop listing + prompt. Widok roboczy.') +
            card('🖨️','Druk premium','Zatwierdzenie do druku + narzędzie przenoszenia plakatu między kategoriami.') +
            card('📁','Pliki','Warianty PDF (6 rozmiarów + ramka) + warianty pliku (PNG, ramka PNG) + info techniczne + mockupy.') +
          '</div>' +

          '<p class="info-section-title">Zatwierdzanie do druku</p>' +
          '<div class="info-cards">' +
            card('☑️','Checkbox','„Zatwierdzony do druku" zapisuje <code>approvedForPrint: true</code> w inventory + API PATCH.') +
            card('🛒','Eksport','Tylko zatwierdzone trafiają do CSV Shopify (opcja „tylko nowe" lub „wszystkie").') +
            card('🔝','Sortowanie','Niezatwierdzone zawsze na górze siatki — łatwo widać co czeka na decyzję.') +
          '</div>' +

        '</div>' +

        // ── PANEL 4: Eksport Shopify ─────────────────────────────
        '<div class="info-panel" id="itab-export">' +

          '<p class="info-section-title">Flow — Eksport do Shopify (zakładka 3)</p>' +
          '<div class="info-flow">' +
            step('⚙️','Ustawienia CSV','Wybierasz rozmiary (13×18…70×100), ceny, opcję „tylko nowe" lub „wszystkie"','') +
            arrow() +
            step('📋','Skrypt export','<code>scripts/exportShopifyCsv.js</code> — czyta inventory, buduje wiersze CSV','accent') +
            arrow() +
            step('🖼️','Obrazy','Image 1 = thumb master, Image 2 = thumb ramka, Image 3 = mockup frame, Image 4 = mockup interior','accent') +
            arrow() +
            step('📦','CSV Shopify','Gotowy plik z kolumnami Handle, Title, Description, Vendor, Type, Tags, Image, Variants','green') +
            arrow() +
            step('⬆️','Import Shopify','Wgrywasz CSV w panelu Shopify → Products → Import. Nowe produkty lub aktualizacja istniejących.','green') +
          '</div>' +

          '<p class="info-section-title">Struktura jednego produktu w CSV</p>' +
          '<div class="info-cards">' +
            card('🏷️','Handle','URL-slug tytułu plakatu, np. <code>waves-crashing-on-dunes</code>. Unikalny identyfikator produktu.') +
            card('📝','Title / Body','Tytuł plakatu + opis (shop listing z biblioteki). Generowany przez GPT przy tworzeniu.') +
            card('🖼️','Images 1–4','1: master thumb, 2: ramka thumb, 3: mockup frame (packshot), 4: mockup interior (wnętrze wg kategorii). Image 3+4 tylko gdy istnieją.') +
            card('📐','Warianty','Każdy rozmiar (13×18, 21×30…) = osobny wariant z ceną i SKU. Do 6 wariantów na produkt.') +
            card('🏷️','Tags','Automatycznie: kategoria + styl + „poster" + „print". Ułatwiają filtrowanie w Shopify.') +
            card('📊','Inventory','Quantity ustawiane domyślnie na 999 (druk na żądanie). Można zmienić w ustawieniach.') +
          '</div>' +

          '<p class="info-section-title">Opcje eksportu</p>' +
          '<div class="info-cards">' +
            card('🆕','Tylko nowe','Eksportuje plakaty bez flagi <code>shopifyExportedAt</code> — czyli jeszcze nieeksportowane.') +
            card('📋','Wszystkie','Wszystkie zatwierdzone plakaty, niezależnie od historii eksportu.') +
            card('🕐','Timestamped','Plik CSV z datą w nazwie, np. <code>shopify_2026-06-29.csv</code>.') +
          '</div>' +

        '</div>' +

        // ── PANEL 5: Mockupy GPT ─────────────────────────────────
        '<div class="info-panel" id="itab-mockups">' +

          '<p class="info-section-title">Flow — Generowanie mockupów (modal plakatu → Mockupy Shopify)</p>' +
          '<div class="info-flow">' +
            step('🖱️','Klik przycisku','„Generuj mockupy" w sekcji Mockupy Shopify w modalu plakatu','') +
            arrow() +
            step('📡','POST API','/api/posters/:id/generate-mockups — serwer pobiera dane plakatu z inventory','accent') +
            arrow() +
            step('📐','Resize mastera','Sharp skaluje PNG do max 1024×1536 px (limit OpenAI API) przed wysłaniem','') +
            arrow() +
            step('🤖','GPT Image 2','Dwa osobne wywołania: images.edit() z modelem gpt-image-2. Każde ~15–30 sek','accent') +
            arrow() +
            step('💾','Zapis plików','JPEG 800×1200 zapisywany obok mastera w tym samym folderze plakatu','green') +
            arrow() +
            step('📋','Inventory','Ścieżki zapisane w <code>poster.mockups.frame</code> i <code>.interior</code> + timestamp','green') +
          '</div>' +

          '<p class="info-section-title">Dwa generowane mockupy</p>' +
          '<div class="info-cards">' +
            card('🖼️','Packshot ramka <span class="info-badge info-badge--gray">_mockup_frame.jpg</span>','Plakat w czarnej galeriowej ramce na białym/jasno-szarym tle. Miękki cień. Format produktowy dla Shopify (Image Position 3).') +
            card('🛋️','Wnętrze <span class="info-badge info-badge--gray">_mockup_interior.jpg</span>','Plakat w ramce na ścianie w kontekście dopasowanym do kategorii i tytułu — np. kuchnia dla „Kuchnia i jedzenie”, biuro lub siłownia domowa dla sportu, kawiarnia dla kawy. Lifestyle shot (Image Position 4).') +
          '</div>' +

          '<p class="info-section-title">Nazewnictwo plików mockupów</p>' +
          '<div class="info-cards">' +
            card('📁','Format nazwy','<code>{TytułSlug}_mockup_frame.jpg</code><br><code>{TytułSlug}_mockup_interior.jpg</code><br>Np. <code>Waves_Crashing_on_Dunes_mockup_frame.jpg</code>') +
            card('🚫','Wykluczone ze skanera','Pliki <code>*_mockup_frame.*</code> i <code>*_mockup_interior.*</code> nie są traktowane jako nowe plakaty przy skanowaniu folderu.') +
            card('💰','Koszt API','~$0.04–0.08 za jeden mockup × 2 = ~$0.10–0.16 za komplet dla jednego plakatu.') +
            card('⏱️','Czas generowania','30–60 sekund łącznie (dwa wywołania po kolei). Pasek postępu w terminalu SSE.') +
          '</div>' +

          '<p class="info-section-title">Gdzie mockupy są widoczne</p>' +
          '<div class="info-cards">' +
            card('👁️','Prawy panel modalu','Thumby PACKSHOT i SALON obok MASTER i RAMKA — klikalny podgląd pełnej wersji.') +
            card('📋','Zakładka Pliki','Sekcja Warianty pliku → wiersze Packshot ramka i Salon z klikalnymi linkami.') +
            card('📋','Zakładka Pełny widok','Sekcja Mockupy Shopify z pełnymi obrazami i przyciskiem Regeneruj.') +
            card('🛒','CSV Shopify','Image Position 3 (frame) i 4 (interior) — tylko gdy pliki faktycznie istnieją na dysku.') +
          '</div>' +

        '</div>' +

      '</div>' + // info-modal-body
    '</div>'; // info-modal

  document.body.appendChild(infoModal);

  // Info modal tab switching
  infoModal.querySelectorAll('.info-modal-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = btn.getAttribute('data-itab');
      infoModal.querySelectorAll('.info-modal-tab').forEach(function(b) {
        b.classList.toggle('is-active', b === btn);
      });
      infoModal.querySelectorAll('.info-panel').forEach(function(p) {
        p.classList.toggle('is-active', p.id === 'itab-' + tab);
      });
    });
  });

  document.getElementById('btnOpenInfo').addEventListener('click', function() {
    infoModal.hidden = false;
  });
  document.getElementById('btnCloseInfo').addEventListener('click', function() {
    infoModal.hidden = true;
  });
  infoModal.addEventListener('click', function(e) {
    if (e.target === infoModal) infoModal.hidden = true;
  });

  // Helper functions for building info modal HTML
  function step(icon, label, desc, color) {
    return '<div class="info-flow-step">' +
      '<div class="info-flow-icon' + (color ? ' info-flow-icon--' + color : '') + '">' + icon + '</div>' +
      '<div class="info-flow-label">' + label + '</div>' +
      '<div class="info-flow-sub">' + desc + '</div>' +
      '</div>';
  }
  function arrow() {
    return '<div class="info-flow-arrow">→</div>';
  }
  function card(icon, title, desc) {
    return '<div class="info-card">' +
      '<span class="info-card-icon">' + icon + '</span>' +
      '<div class="info-card-title">' + title + '</div>' +
      '<div class="info-card-desc">' + desc + '</div>' +
      '</div>';
  }

  // ── Settings helpers ─────────────────────────────────────
  function reloadGeneratorCategories(categories) {
    ['studioCategory', 'studioUploadCategory'].forEach(function(id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      var current = sel.value;
      sel.innerHTML = categories.map(function(c) {
        return '<option value="' + c + '"' + (c === current ? ' selected' : '') + '>' + c + '</option>';
      }).join('');
    });
  }

  function reloadGeneratorStyles(styles) {
    ['studioStyle', 'studioUploadStyle'].forEach(function(id) {
      var sel = document.getElementById(id);
      if (!sel) return;
      var current = sel.value;
      sel.innerHTML = styles.map(function(s) {
        return '<option value="' + s + '"' + (s === current ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
    });
  }

  function renderCategoriesList(categories, extra) {
    var extraNames = (extra || []).map(function(e) { return e.name; });
    var el = document.getElementById('settingCategoriesList');
    if (!el) return;
    el.innerHTML = categories.map(function(c) {
      var isExtra = extraNames.includes(c);
      return '<span class="settings-tag' + (isExtra ? ' settings-tag--user' : '') + '">' +
        c +
        (isExtra ? '<button class="settings-tag-del" data-cat="' + encodeURIComponent(c) + '" title="Usuń">×</button>' : '') +
        '</span>';
    }).join('');
    el.querySelectorAll('.settings-tag-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        fetch('/api/user-settings/categories/' + btn.dataset.cat, { method: 'DELETE' })
          .then(function(r) { return r.json(); })
          .then(function() { loadSettingsData(); });
      });
    });
  }

  function renderStylesList(styles, extraStyles) {
    var el = document.getElementById('settingStylesList');
    if (!el) return;
    el.innerHTML = styles.map(function(s) {
      var isExtra = (extraStyles || []).includes(s);
      return '<span class="settings-tag' + (isExtra ? ' settings-tag--user' : '') + '">' +
        s +
        (isExtra ? '<button class="settings-tag-del" data-style="' + encodeURIComponent(s) + '" title="Usuń">×</button>' : '') +
        '</span>';
    }).join('');
    el.querySelectorAll('.settings-tag-del').forEach(function(btn) {
      btn.addEventListener('click', function() {
        fetch('/api/user-settings/styles/' + btn.dataset.style, { method: 'DELETE' })
          .then(function(r) { return r.json(); })
          .then(function() { loadSettingsData(); });
      });
    });
  }

  function renderPriceTable(prices) {
    var el = document.getElementById('settingsPriceTable');
    if (!el) return;
    var formats = ['13x18','21x30','30x40','40x50','50x70','70x100'];
    el.innerHTML = formats.map(function(fmt) {
      var val = (prices && prices[fmt]) ? prices[fmt] : '';
      return '<div class="price-row">' +
        '<span class="price-format">' + fmt.replace('x','×') + ' cm</span>' +
        '<div class="price-input-wrap">' +
          '<input class="price-input" type="number" step="0.01" min="0" data-fmt="' + fmt + '" value="' + val + '" />' +
          '<span class="price-currency">PLN</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  var _settingsCache = null;

  function loadSettingsData() {
    Promise.all([
      fetch('/api/settings').then(function(r){ return r.json(); }),
      fetch('/api/generation-config').then(function(r){ return r.json(); }),
      fetch('/api/shopify/export-settings').then(function(r){ return r.json(); }),
    ]).then(function(results) {
      var sys = results[0], gen = results[1], shopify = results[2];
      _settingsCache = { sys: sys, gen: gen, shopify: shopify };

      // API tab
      var keyEl = document.getElementById('settingApiKey');
      if (keyEl) keyEl.innerHTML = sys.openaiKeySet
        ? '<span class="settings-badge settings-badge--green">✓ Aktywny</span><code class="settings-key-mask">' + sys.openaiKeyMasked + '</code>'
        : '<span class="settings-badge settings-badge--red">✗ Brak klucza</span>';
      var imgEl = document.getElementById('settingImageModel');
      if (imgEl) imgEl.innerHTML = '<span class="settings-badge settings-badge--ink">' + sys.imageModel + '</span>';
      var prmEl = document.getElementById('settingPromptModel');
      if (prmEl) prmEl.innerHTML = '<span class="settings-badge settings-badge--ink">' + sys.promptModel + '</span>';
      var nodeEl = document.getElementById('settingNodeVersion');
      if (nodeEl) nodeEl.innerHTML = '<span class="settings-badge">' + sys.nodeVersion + '</span>';
      var llmEl = document.getElementById('settingLlmProviders');
      if (llmEl) llmEl.innerHTML = (sys.llmProviders || []).map(function(p) {
        return '<span class="settings-badge settings-badge--green">' + p + '</span>';
      }).join(' ') || '<span class="settings-badge">brak</span>';

      // Categories tab
      renderCategoriesList(gen.categories || [], gen.extraCategories || []);

      // Styles tab
      renderStylesList(gen.artStyles || [], gen.extraStyles || []);

      // Defaults dropdowns
      var defCatSel = document.getElementById('settingDefaultCategory');
      var defStySel = document.getElementById('settingDefaultStyle');
      if (defCatSel) {
        defCatSel.innerHTML = '<option value="">— brak —</option>' +
          (gen.categories || []).map(function(c) {
            return '<option value="' + c + '"' + (gen.defaults && gen.defaults.category === c ? ' selected' : '') + '>' + c + '</option>';
          }).join('');
      }
      if (defStySel) {
        defStySel.innerHTML = '<option value="">— brak —</option>' +
          (gen.artStyles || []).map(function(s) {
            return '<option value="' + s + '"' + (gen.defaults && gen.defaults.style === s ? ' selected' : '') + '>' + s + '</option>';
          }).join('');
      }

      // Price table
      renderPriceTable(shopify.prices);

      // Propagate to live generator
      reloadGeneratorCategories(gen.categories || []);
      reloadGeneratorStyles(gen.artStyles || []);
    });
  }

  // Settings open/close
  document.getElementById('btnOpenSettings').addEventListener('click', function() {
    settingsModal.hidden = false;
    loadSettingsData();
  });
  document.getElementById('btnCloseSettings').addEventListener('click', function() {
    settingsModal.hidden = true;
  });
  settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) settingsModal.hidden = true;
  });

  // Settings tabs
  settingsModal.querySelectorAll('.settings-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      settingsModal.querySelectorAll('.settings-tab').forEach(function(t) { t.classList.remove('is-active'); });
      settingsModal.querySelectorAll('.settings-tab-panel').forEach(function(p) { p.hidden = true; });
      tab.classList.add('is-active');
      var panel = settingsModal.querySelector('[data-stab-panel="' + tab.dataset.stab + '"]');
      if (panel) panel.hidden = false;
    });
  });

  // Add category
  document.getElementById('btnAddCategory').addEventListener('click', function() {
    var name = document.getElementById('newCategoryName').value.trim();
    var hint = document.getElementById('newCategoryHint').value.trim();
    var fb = document.getElementById('categoryFeedback');
    if (!name) { fb.textContent = 'Wpisz nazwę kategorii.'; fb.className = 'settings-add-feedback settings-add-feedback--error'; return; }
    fetch('/api/user-settings/categories/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, hint: hint }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.ok) {
        fb.textContent = '✓ Kategoria „' + name + '" dodana.';
        fb.className = 'settings-add-feedback settings-add-feedback--ok';
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryHint').value = '';
        loadSettingsData();
      } else {
        fb.textContent = '✗ ' + (d.error || 'Błąd');
        fb.className = 'settings-add-feedback settings-add-feedback--error';
      }
    });
  });

  // Add style
  document.getElementById('btnAddStyle').addEventListener('click', function() {
    var name = document.getElementById('newStyleName').value.trim();
    var fb = document.getElementById('styleFeedback');
    if (!name) { fb.textContent = 'Wpisz nazwę stylu.'; fb.className = 'settings-add-feedback settings-add-feedback--error'; return; }
    fetch('/api/user-settings/styles/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.ok) {
        fb.textContent = '✓ Styl „' + name + '" dodany.';
        fb.className = 'settings-add-feedback settings-add-feedback--ok';
        document.getElementById('newStyleName').value = '';
        loadSettingsData();
      } else {
        fb.textContent = '✗ ' + (d.error || 'Błąd');
        fb.className = 'settings-add-feedback settings-add-feedback--error';
      }
    });
  });

  // Save defaults
  document.getElementById('btnSaveDefaults').addEventListener('click', function() {
    var fb = document.getElementById('defaultsFeedback');
    var cat = document.getElementById('settingDefaultCategory').value;
    var sty = document.getElementById('settingDefaultStyle').value;
    fetch('/api/user-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultCategory: cat, defaultStyle: sty }),
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.ok) {
        fb.textContent = '✓ Zapisano domyślne.';
        fb.className = 'settings-add-feedback settings-add-feedback--ok';
        // Apply to generator
        var catSel = document.getElementById('studioCategory');
        if (catSel && cat) catSel.value = cat;
        var stySel = document.getElementById('studioStyle');
        if (stySel && sty) stySel.value = sty;
      }
    });
  });

  // Export quick actions
  document.getElementById('settingBtnExportApproved').addEventListener('click', function() {
    var fb = document.getElementById('settingExportStatus');
    fb.textContent = 'Eksportowanie…';
    fetch('/api/shopify/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) })
      .then(function(r){ return r.json(); })
      .then(function(d){ fb.textContent = d.ok ? '✓ Gotowe' : '✗ ' + (d.error || 'Błąd'); });
  });
  document.getElementById('settingBtnExportAll').addEventListener('click', function() {
    var fb = document.getElementById('settingExportStatus');
    fb.textContent = 'Eksportowanie…';
    fetch('/api/shopify/export', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ all: true }) })
      .then(function(r){ return r.json(); })
      .then(function(d){ fb.textContent = d.ok ? '✓ Gotowe' : '✗ ' + (d.error || 'Błąd'); });
  });
  document.getElementById('settingBtnSyncThumbs').addEventListener('click', function() {
    var fb = document.getElementById('settingExportStatus');
    fb.textContent = 'Sync w toku…';
    fetch('/api/shopify/thumbs-push', { method: 'POST' })
      .then(function(r){ return r.json(); })
      .then(function(d){ fb.textContent = d.ok ? '✓ Sync zakończony' : '✗ ' + (d.error || 'Błąd'); })
      .catch(function(){ fb.textContent = '✗ Błąd połączenia'; });
  });

  // Save prices from settings
  document.getElementById('settingsBtnSavePrice').addEventListener('click', function() {
    var fb = document.getElementById('priceFeedback');
    var prices = {};
    document.querySelectorAll('#settingsPriceTable .price-input').forEach(function(inp) {
      prices[inp.dataset.fmt] = inp.value;
    });
    fetch('/api/shopify/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saveSettings: true, prices: prices }),
    }).then(function(r){ return r.json(); })
      .then(function(d){
        fb.textContent = d.ok ? '✓ Cennik zapisany.' : '✗ ' + (d.error || 'Błąd');
        fb.className = 'settings-add-feedback ' + (d.ok ? 'settings-add-feedback--ok' : 'settings-add-feedback--error');
      });
  });

  // 2. Create tab panels
  var dashPanel = document.createElement('div');
  dashPanel.className = 'figma-panel';
  dashPanel.dataset.tabPanel = 'dashboard';

  var pageContainer = document.createElement('div');
  pageContainer.className = 'figma-page';
  dashPanel.appendChild(pageContainer);

  var exportPanel = document.createElement('div');
  exportPanel.className = 'figma-panel';
  exportPanel.dataset.tabPanel = 'export';
  exportPanel.hidden = true;

  var libPanel = document.createElement('div');
  libPanel.className = 'figma-panel';
  libPanel.dataset.tabPanel = 'library';
  libPanel.hidden = true;

  // 3. Move sections
  var studio = document.getElementById('studio');
  var statsRow = document.getElementById('statsRow');
  var libraryBrowse = document.getElementById('libraryBrowse');
  var masthead = document.querySelector('.masthead');

  if (studio) pageContainer.appendChild(studio);
  if (statsRow) libPanel.appendChild(statsRow);
  if (libraryBrowse) libPanel.appendChild(libraryBrowse);

  // 4. Move nav action buttons from masthead to figma nav
  var navActions = document.getElementById('figmaNavActions');
  var themeToggle = document.getElementById('themeToggle');
  var updatedAt = document.getElementById('updatedAt');
  var refreshBtn = document.getElementById('refreshBtn');
  if (navActions) {
    if (themeToggle) navActions.appendChild(themeToggle);
    if (updatedAt) navActions.appendChild(updatedAt);
    if (refreshBtn) navActions.appendChild(refreshBtn);
  }

  // 5. Insert panels into body after nav
  nav.after(dashPanel);
  dashPanel.after(exportPanel);
  exportPanel.after(libPanel);

  // 6. Tab switching logic
  nav.querySelectorAll('.figma-tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.dataset.tab;
      nav.querySelectorAll('.figma-tab').forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      dashPanel.hidden = (tab !== 'dashboard');
      exportPanel.hidden = (tab !== 'export');
      libPanel.hidden = (tab !== 'library');
    });
  });

  // 7. If URL hash is #library, switch tab
  if (window.location.hash === '#library') {
    nav.querySelector('[data-tab="library"]').click();
  }

  // 8. Restructure dashboard into Generator + Shopify sections
  var studioEl = document.getElementById('studio');
  if (!studioEl) return;

  // --- Extract existing DOM nodes ---
  var inner      = studioEl.querySelector('.studio-pro-inner');
  var eyebrow    = studioEl.querySelector('.studio-pro-eyebrow');
  var heading    = studioEl.querySelector('#studio-heading');
  var sub        = studioEl.querySelector('.studio-pro-sub');
  var shopifyBox = studioEl.querySelector('.studio-shopify-export');
  var panelUpload = document.getElementById('studioPanelUpload');
  var panelMan   = document.getElementById('studioPanelManual');
  var panelAuto  = document.getElementById('studioPanelAuto');

  // Detach all from studioEl
  [eyebrow, heading, sub, shopifyBox, panelUpload, panelMan, panelAuto].forEach(function(n){ if(n && n.parentNode) n.parentNode.removeChild(n); });

  // --- SECTION A: Generator (lime) ---
  studioEl.innerHTML = '';
  studioEl.className = 'dash-generator color-block color-block--lime';

  var genHeader = document.createElement('div');
  genHeader.className = 'gen-header';
  var ey = document.createElement('p');
  ey.className = 'studio-pro-eyebrow';
  ey.textContent = 'Generator';
  var h2 = document.createElement('h2');
  h2.id = 'studio-heading';
  h2.className = 'studio-pro-hero';
  h2.textContent = 'Generuj plakaty';
  genHeader.appendChild(ey);
  genHeader.appendChild(h2);
  studioEl.appendChild(genHeader);

  // ── Three-flow selector ──────────────────────────────────
  var flowSelector = document.createElement('div');
  flowSelector.className = 'gen-flow-selector';
  studioEl.appendChild(flowSelector);

  function makeFlowOption(id, icon, title, desc) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = id;
    btn.className = 'gen-flow-option';
    btn.innerHTML =
      '<div class="gen-flow-opt-icon">' + icon + '</div>' +
      '<div><div class="gen-flow-opt-title">' + title + '</div>' +
      '<div class="gen-flow-opt-desc">' + desc + '</div></div>';
    return btn;
  }

  var optUpload = makeFlowOption('genFlowUpload', '📸', 'Dodaj własne zdjęcie', 'Wgraj PNG/JPG/WEBP z dysku prosto do biblioteki');
  var optManual = makeFlowOption('genFlowManual', '🎨', 'Generator manualny', 'Prompt → GPT Image 2 → podgląd → akceptacja');
  var optAuto   = makeFlowOption('genFlowAuto',   '⚡', 'Generator automatyczny', 'Batch generacja całych kategorii bez podglądu');
  flowSelector.appendChild(optUpload);
  flowSelector.appendChild(optManual);
  flowSelector.appendChild(optAuto);

  // Click handler via event delegation on selector — registered immediately after creation
  flowSelector.addEventListener('click', function(e) {
    var opt = e.target.closest('.gen-flow-option');
    if (!opt) return;
    var flowMap = { genFlowUpload: 'upload', genFlowManual: 'manual', genFlowAuto: 'auto' };
    var mode = flowMap[opt.id];
    if (!mode) return;
    // Update option active states
    [optUpload, optManual, optAuto].forEach(function(o) { o.classList.toggle('is-active', o === opt); });
    // Update panel active states
    var panelMap = { upload: wrapUpload, manual: wrapManual, auto: wrapAuto };
    Object.keys(panelMap).forEach(function(k) {
      if (panelMap[k]) panelMap[k].classList.toggle('is-active', k === mode);
    });
    // Persist
    try { localStorage.setItem('plakatyStudioMode', mode); } catch(_) {}
  });

  // ── Flow content area ────────────────────────────────────
  var flowContent = document.createElement('div');
  flowContent.className = 'gen-flow-content';
  studioEl.appendChild(flowContent);

  function wrapFlowPanel(id, panel) {
    var wrap = document.createElement('div');
    wrap.className = 'gen-flow-panel';
    wrap.id = id;
    if (panel) {
      panel.removeAttribute('hidden');
      wrap.appendChild(panel);
    }
    flowContent.appendChild(wrap);
    return wrap;
  }

  var wrapUpload = wrapFlowPanel('genFlowPanelUpload', panelUpload);
  var wrapManual = wrapFlowPanel('genFlowPanelManual', panelMan);
  var wrapAuto   = wrapFlowPanel('genFlowPanelAuto',   panelAuto);

  // Restore saved flow on load
  (function() {
    var saved = '';
    try { saved = localStorage.getItem('plakatyStudioMode') || ''; } catch(_) {}
    var flowMap = { upload: [optUpload, wrapUpload], manual: [optManual, wrapManual], auto: [optAuto, wrapAuto] };
    var mode = flowMap[saved] ? saved : 'manual';
    var pair = flowMap[mode];
    if (pair) { pair[0].classList.add('is-active'); pair[1].classList.add('is-active'); }
  })();

  // --- Live log terminal panel ---
  var logPanel = document.createElement('div');
  logPanel.className = 'gen-log-panel';
  logPanel.id = 'genLogPanel';
  logPanel.innerHTML =
    '<div class="gen-log-header" id="genLogHeader">' +
      '<span class="gen-log-header-dot" id="genLogDot"></span>' +
      '<span class="gen-log-header-title">Logi generacji — API &amp; pipeline</span>' +
      '<div class="gen-log-header-actions">' +
        '<button type="button" class="gen-log-btn" id="genLogClearBtn">Wyczyść</button>' +
        '<button type="button" class="gen-log-btn" id="genLogScrollBtn" title="Przewiń na dół">↓</button>' +
      '</div>' +
      '<span class="gen-log-toggle-icon" id="genLogToggleIcon">▼</span>' +
    '</div>' +
    '<div class="gen-log-body" id="genLogBody">' +
      '<div class="gen-log-empty" id="genLogEmpty">Czekam na generację…</div>' +
    '</div>';
  pageContainer.appendChild(logPanel);

  // ── Log terminal JS ──────────────────────────────────────────────────────
  (function() {
    var body = document.getElementById('genLogBody');
    var dot  = document.getElementById('genLogDot');
    var empty = document.getElementById('genLogEmpty');
    var panel = document.getElementById('genLogPanel');
    var header = document.getElementById('genLogHeader');
    var clearBtn = document.getElementById('genLogClearBtn');
    var scrollBtn = document.getElementById('genLogScrollBtn');
    var lineCount = 0;
    var collapsed = false;
    var es = null;

    function fmtTime(ts) {
      var d = new Date(ts);
      return d.toTimeString().slice(0,8);
    }

    function appendLine(level, msg, ts) {
      if (empty) { empty.remove(); empty = null; }
      var line = document.createElement('div');
      line.className = 'gen-log-line gen-log-line--' + level;
      var tsSpan = document.createElement('span');
      tsSpan.className = 'gen-log-ts';
      tsSpan.textContent = fmtTime(ts || Date.now());
      var msgSpan = document.createElement('span');
      msgSpan.className = 'gen-log-msg';
      // Highlight key words
      var text = String(msg);
      if (/^\s*(->|OK|✓|✗|x |Saved|Prompt|Generating|Retry|Passe|Safe|mockup|PDF|thumb|Wrote|Created)/i.test(text)) {
        line.classList.add('gen-log-line--step');
      }
      msgSpan.textContent = text;
      line.appendChild(tsSpan);
      line.appendChild(msgSpan);
      body.appendChild(line);
      lineCount++;
      // Auto-scroll
      if (!collapsed) body.scrollTop = body.scrollHeight;
    }

    function connect() {
      if (es) { es.close(); }
      es = new EventSource('/api/logs/stream');
      dot.classList.add('is-active');
      es.onmessage = function(e) {
        try {
          var d = JSON.parse(e.data);
          appendLine(d.level || 'log', d.msg, d.ts);
        } catch(_) {}
      };
      es.onerror = function() {
        dot.classList.remove('is-active');
        appendLine('system', '── Połączenie przerwane. Rekonektuję… ──', Date.now());
        setTimeout(connect, 3000);
      };
    }

    connect();

    header.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      collapsed = !collapsed;
      panel.classList.toggle('is-collapsed', collapsed);
    });

    clearBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      body.innerHTML = '';
      lineCount = 0;
      empty = document.createElement('div');
      empty.className = 'gen-log-empty';
      empty.textContent = 'Wyczyść. Czekam na generację…';
      body.appendChild(empty);
    });

    scrollBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      body.scrollTop = body.scrollHeight;
    });
  })();
  // ────────────────────────────────────────────────────────────────────────

  // --- SECTION B: Shopify & Operacje (coral block) ---
  var shopifySection = document.createElement('section');
  shopifySection.className = 'dash-shopify color-block color-block--coral';
  shopifySection.setAttribute('aria-label', 'Shopify i operacje');

  var shopifyHead = document.createElement('div');
  shopifyHead.className = 'shopify-head';
  shopifyHead.innerHTML =
    '<p class="studio-pro-eyebrow">Shopify & Operacje</p>' +
    '<h2 class="shopify-section-title">Eksport i synchronizacja</h2>';
  shopifySection.appendChild(shopifyHead);

  // Shopify three-column ops
  var shopifyOps = document.createElement('div');
  shopifyOps.className = 'shopify-ops';
  shopifySection.appendChild(shopifyOps);

  // --- Col 1: Eksport CSV ---
  var colExport = document.createElement('div');
  colExport.className = 'shopify-col shopify-col--export';
  colExport.innerHTML = '<h4 class="shopify-col-label">Eksport CSV</h4>';

  if (shopifyBox) {
    // Query from detached shopifyBox, not document
    var btnApproved  = shopifyBox.querySelector('#btnShopifyExportApproved');
    var btnAll       = shopifyBox.querySelector('#btnShopifyExportAll');
    var btnReadiness = shopifyBox.querySelector('#btnShopifyReadiness');
    var csvLink      = shopifyBox.querySelector('#shopifyCsvOpenLink');
    var exportStatus = shopifyBox.querySelector('#shopifyExportStatus');
    var readStatus   = shopifyBox.querySelector('#shopifyReadinessStatus');
    var sizeRow      = shopifyBox.querySelector('#shopifySizeRow');
    var cbEl         = shopifyBox.querySelector('#shopifyOnlyNewToggle');

    var exportBtns = document.createElement('div');
    exportBtns.className = 'shopify-export-btns';
    if (btnApproved) exportBtns.appendChild(btnApproved);
    if (btnAll)      exportBtns.appendChild(btnAll);
    colExport.appendChild(exportBtns);

    if (cbEl) {
      var checkWrap = document.createElement('div');
      checkWrap.className = 'shopify-check-wrap';
      checkWrap.appendChild(cbEl.closest('label') || cbEl.parentElement);
      colExport.appendChild(checkWrap);
    }

    if (sizeRow) colExport.appendChild(sizeRow);

    var exportMeta = document.createElement('div');
    exportMeta.className = 'shopify-export-meta';
    if (csvLink)      exportMeta.appendChild(csvLink);
    if (btnReadiness) exportMeta.appendChild(btnReadiness);
    if (exportStatus) exportMeta.appendChild(exportStatus);
    if (readStatus)   exportMeta.appendChild(readStatus);
    colExport.appendChild(exportMeta);
  }
  shopifyOps.appendChild(colExport);

  // --- Col 2: Sync ---
  var colSync = document.createElement('div');
  colSync.className = 'shopify-col shopify-col--sync';
  colSync.innerHTML = '<h4 class="shopify-col-label">Synchronizacja</h4>';
  if (shopifyBox) {
    var btnThumbsPush = shopifyBox.querySelector('#btnShopifyThumbsPush');
    if (btnThumbsPush) {
      btnThumbsPush.className = 'shopify-sync-btn';
      colSync.appendChild(btnThumbsPush);
    }
  }
  var syncDesc = document.createElement('p');
  syncDesc.className = 'shopify-sync-desc';
  syncDesc.textContent = 'Generuje miniatury dla zatwierdzonych plakatów i wysyła je do Shopify CDN.';
  colSync.appendChild(syncDesc);
  shopifyOps.appendChild(colSync);

  // --- Col 3: Cennik ---
  var colPrice = document.createElement('div');
  colPrice.className = 'shopify-col shopify-col--price';
  colPrice.innerHTML = '<h4 class="shopify-col-label">Cennik</h4>';

  var priceTable = document.createElement('div');
  priceTable.className = 'price-table';

  var formats = ['13x18','21x30','30x40','40x50','50x70','70x100'];
  formats.forEach(function(fmt) {
    var row = document.createElement('div');
    row.className = 'price-row';
    var lbl = document.createElement('span');
    lbl.className = 'price-format';
    lbl.textContent = fmt.replace('x','×') + ' cm';
    var inp = shopifyBox ? shopifyBox.querySelector('#shopifyPrice' + fmt) : null;
    var inputWrap = document.createElement('div');
    inputWrap.className = 'price-input-wrap';
    if (inp) {
      inp.className = 'price-input';
      inputWrap.appendChild(inp);
    }
    var cur = document.createElement('span');
    cur.className = 'price-currency';
    cur.textContent = 'PLN';
    inputWrap.appendChild(cur);
    row.appendChild(lbl);
    row.appendChild(inputWrap);
    priceTable.appendChild(row);
  });
  colPrice.appendChild(priceTable);

  var savePriceWrap = document.createElement('div');
  savePriceWrap.className = 'price-save-wrap';
  if (shopifyBox) {
    var btnSave = shopifyBox.querySelector('#btnShopifySaveSettings');
    if (btnSave) {
      btnSave.className = 'price-save-btn';
      btnSave.textContent = 'Zapisz cennik';
      savePriceWrap.appendChild(btnSave);
    }
  }
  colPrice.appendChild(savePriceWrap);
  shopifyOps.appendChild(colPrice);

  // Shopify section goes into its own export panel
  var exportPageWrap = document.createElement('div');
  exportPageWrap.className = 'figma-page';
  exportPageWrap.appendChild(shopifySection);
  exportPanel.appendChild(exportPageWrap);
});
