/**
 * Katalog RAM z prawdziwymi cenami sklepu — zrodlo prawdy dla kazdego
 * przyszlego produktu, ktory wlicza rame w cene (kind: 'gallery-framed').
 *
 * Ceny pobrane ze sklepu (Storefront API, produkty z tagiem type_frame)
 * we wrzesniu 2026. NIE wolno ich zgadywac ani wyprowadzac z niczego
 * innego — to sa realne SKU, ktore istnieja w Shopify i ktore trzeba
 * fizycznie spakowac przy wysylce.
 *
 * Rozmiar 70x100 nie ma ramy w ofercie — ten sam powod, dla ktorego
 * plakaty w tym rozmiarze tez nie sa realnie sprzedawane (patrz
 * DEFAULT_SIZE_PRICES w exportShopifyCsv.js).
 */

'use strict';

const RAMKI = [
  // material, kolor, handle-fragment, ceny wg rozmiaru
  { material: 'aluminium', kolor: 'czarny-mat', handlePrefix: 'ramka-aluminiowa-czarna-mat',
    ceny: { '13x18': 22, '21x30': 34, '30x40': 65, '40x50': 92, '50x70': 115 } },
  { material: 'aluminium', kolor: 'zloty', handlePrefix: 'ramka-aluminiowa-zlota',
    ceny: { '13x18': 22, '21x30': 34, '30x40': 65, '40x50': 92, '50x70': 115 } },
  { material: 'aluminium', kolor: 'srebrny', handlePrefix: 'ramka-aluminiowa-srebrna',
    ceny: { '13x18': 22, '21x30': 34, '30x40': 65, '40x50': 92, '50x70': 115 } },
  { material: 'aluminium', kolor: 'miedziany', handlePrefix: 'ramka-aluminiowa-miedziana',
    ceny: { '13x18': 24, '21x30': 37, '30x40': 72, '40x50': 102, '50x70': 125 } },
  { material: 'drewno', kolor: 'dab', handlePrefix: 'ramka-drewniana-dab',
    ceny: { '13x18': 24, '30x40': 72, '40x50': 102, '50x70': 125 } },
  { material: 'drewno', kolor: 'bialy', handlePrefix: 'ramka-drewniana-biala',
    ceny: { '13x18': 22, '21x30': 34, '30x40': 65, '40x50': 92, '50x70': 115 } },
  { material: 'drewno', kolor: 'czarny', handlePrefix: 'ramka-drewniana-czarna',
    // Handle w zywym sklepie dla 50x70 lamie konwencje 'ramka-*' (jest
    // 'black-wood-frame-50x70-cm', po angielsku) — zapisany osobno w
    // handleOverride, zeby eksport/pobieranie stanu uzywaly PRAWDZIWEGO
    // handle, a nie zgadywaly go z handlePrefix + rozmiar jak dla reszty.
    ceny: { '13x18': 22, '50x70': 115 },
    handleOverride: { '50x70': 'black-wood-frame-50x70-cm' } },
];

/**
 * @param {string} kolor np. 'czarny-mat'
 * @param {string} rozmiar np. '13x18'
 * @returns {number} cena ramy w zl
 */
function cenaRamy(kolor, rozmiar) {
  const r = RAMKI.find((x) => x.kolor === kolor);
  if (!r) throw new Error('Nieznany kolor ramy: ' + kolor);
  const cena = r.ceny[rozmiar];
  if (!cena) throw new Error('Rama "' + kolor + '" nie istnieje w rozmiarze ' + rozmiar);
  return cena;
}

/** @returns {{material:string, kolor:string, handlePrefix:string}} */
function opisRamy(kolor) {
  const r = RAMKI.find((x) => x.kolor === kolor);
  if (!r) throw new Error('Nieznany kolor ramy: ' + kolor);
  return { material: r.material, kolor: r.kolor, handlePrefix: r.handlePrefix };
}

/**
 * PRAWDZIWY handle Shopify dla danego koloru+rozmiaru — z handleOverride,
 * jesli sklep akurat lamie konwencje 'handlePrefix-rozmiar-cm' (patrz
 * czarny/drewno/50x70), inaczej wyliczony z handlePrefix. Kazdy skrypt,
 * ktory buduje handle ramy, MA uzywac tej funkcji, nie sklejac stringa
 * recznie — inaczej jeden nowy wyjatek jak ten trzeba bylo naprawiac
 * w kilku miejscach naraz.
 * @param {string} kolor
 * @param {string} rozmiar
 * @returns {string}
 */
function handleRamy(kolor, rozmiar) {
  const r = RAMKI.find((x) => x.kolor === kolor);
  if (!r) throw new Error('Nieznany kolor ramy: ' + kolor);
  if (r.handleOverride && r.handleOverride[rozmiar]) return r.handleOverride[rozmiar];
  return r.handlePrefix + '-' + rozmiar + '-cm';
}

module.exports = { RAMKI, cenaRamy, opisRamy, handleRamy };
