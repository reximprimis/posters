/**
 * Linia ciecia CutContour dla plottera tnacego.
 *
 * Plotter nie czyta grafiki — szuka w PDF sciezki wektorowej pomalowanej
 * KOLOREM DODATKOWYM (spot) o nazwie "CutContour". Kolor procesowy CMYK o tych
 * samych skladowych zostalby wydrukowany jako rozowa ramka i zignorowany przez
 * noz. Dlatego kolor musi byc separacja, nie CMYK-iem.
 *
 * PDFKit nie ma API ani do separacji, ani do warstw, wiec obie rzeczy skladamy
 * z surowych obiektow PDF:
 *
 *   1. Funkcja tint transform (FunctionType 2) — mowi, czym zastapic spot przy
 *      podgladzie i druku bez separacji: C0 to 0% farby, C1 to 100%.
 *   2. Przestrzen /Separation /CutContour /DeviceCMYK z ta funkcja.
 *   3. Grupa OCG o nazwie "cut" — osobna warstwa, ktora RIP i operator moga
 *      wylaczyc, nie ruszajac grafiki.
 *   4. Prostokat rysowany operatorami: re + S (obrys bez wypelnienia).
 *
 * Grafiki nie dotykamy w zaden sposob — linia jest osobnym obiektem
 * rysowanym PO obrazie i nie podlega rasteryzacji.
 */

'use strict';

/** Punkty PDF na milimetr. Bez zaokraglen — 0,1 mm linii to 0,283 pt. */
const PT_NA_MM = 72 / 25.4;

/** Skladowe CMYK przy 100% krycia spotu: C3 M93 Y0 K0. */
const CUT_CMYK = [0.03, 0.93, 0, 0];

/** Grubosc linii ciecia w milimetrach. */
const GRUBOSC_MM = 0.1;

/** Nazwa separacji — plotter szuka dokladnie tego ciagu. */
const NAZWA_SPOTU = 'CutContour';

/** Nazwa warstwy widoczna w panelu warstw. */
const NAZWA_WARSTWY = 'cut';

/**
 * @param {number} mm
 * @returns {number} punkty PDF
 */
function mmNaPt(mm) {
  return mm * PT_NA_MM;
}

/**
 * Rejestruje separacje i warstwe w dokumencie. Wolane raz na dokument.
 *
 * @param {object} doc dokument PDFKit
 * @returns {{ csName: string, ocName: string, ocgRef: object }}
 */
function przygotujZasoby(doc) {
  // Funkcja tint: 0 → brak farby, 1 → pelne CUT_CMYK. Typ 2 to interpolacja
  // wykladnicza; przy N=1 jest liniowa, czyli dokladnie to, czego chcemy.
  const funkcja = doc.ref({
    FunctionType: 2,
    Domain: [0, 1],
    C0: [0, 0, 0, 0],
    C1: CUT_CMYK,
    N: 1,
  });
  funkcja.end();

  const separacja = doc.ref([
    'Separation',
    NAZWA_SPOTU,
    'DeviceCMYK',
    funkcja,
  ]);
  separacja.end();

  // new String, nie zwykly string: PDFKit zamienia prymitywny string na obiekt
  // Name (/cut), a specyfikacja PDF wymaga w /Name OCG TEKSTU ((cut)).
  // Przy zapisie jako Name czytniki potrafia nie pokazac warstwy w panelu.
  const ocg = doc.ref({
    Type: 'OCG',
    Name: new String(NAZWA_WARSTWY), // eslint-disable-line no-new-wrappers
  });
  ocg.end();

  // Katalog musi wiedziec o warstwie, inaczej czytniki jej nie pokaza
  // w panelu warstw, a niektore RIP-y zignoruja zawartosc grupy.
  doc._root.data.OCProperties = {
    OCGs: [ocg],
    D: { Order: [ocg], ON: [ocg] },
  };

  const zasoby = doc.page.resources.data;
  zasoby.ColorSpace = { ...(zasoby.ColorSpace || {}), CutCS: separacja };
  zasoby.Properties = { ...(zasoby.Properties || {}), CutOC: ocg };

  return { csName: 'CutCS', ocName: 'CutOC', ocgRef: ocg };
}

/**
 * Rysuje prostokat linii ciecia.
 *
 * Wspolrzedne w PUNKTACH, w ukladzie PDFKit (poczatek w lewym GORNYM rogu).
 * Operatory PDF licza od lewego DOLNEGO, ale PDFKit naklada wlasna macierz,
 * ktora to odwraca — dlatego podajemy tak samo jak przy doc.rect().
 *
 * @param {object} doc dokument PDFKit
 * @param {{ x: number, y: number, szer: number, wys: number }} prostokat
 */
function rysujLinieCiecia(doc, prostokat) {
  const { csName, ocName } = przygotujZasoby(doc);
  const { x, y, szer, wys } = prostokat;
  const grubosc = mmNaPt(GRUBOSC_MM);

  const linie = [
    'q',
    `/${ocName} /OC BDC`,
    `/${csName} CS`,
    '1 SCN',
    `${grubosc.toFixed(4)} w`,
    // Bez wypelnienia: samo S, nigdy B ani f.
    `${x.toFixed(4)} ${y.toFixed(4)} ${szer.toFixed(4)} ${wys.toFixed(4)} re`,
    'S',
    'EMC',
    'Q',
  ];

  doc.addContent(linie.join('\n'));
}

/**
 * Liczy geometrie strony dla plottera.
 *
 * Zasady (wszystkie wymiary wyliczane, nigdy wpisane na sztywno):
 *   - linia ciecia ma DOKLADNIE wymiar finalny plakatu,
 *   - grafika wychodzi poza ciecie o `bleedMm` w OBU wymiarach,
 *   - strona jest wieksza od grafiki o `marginesMm` z kazdej strony.
 *
 * Bleed musi byc ze WSZYSTKICH stron, nie tylko na dluzszym boku. Przy
 * nadlewce wylacznie w pionie noz na bokach tnie dokladnie po krawedzi
 * grafiki: kazde odchylenie papieru albo tolerancja plottera zostawia tam
 * biale wlosy. Dlatego bleed idzie w obie osie.
 *
 * Dla 500x700 przy bleed 2 i marginesie 1:
 *   ciecie  500 x 700
 *   grafika 502 x 702   (po 1 mm zapasu z kazdej strony)
 *   strona  504 x 704   (po 1 mm marginesu wokol grafiki)
 *
 * @param {number} cutSzerMm szerokosc finalna
 * @param {number} cutWysMm wysokosc finalna
 * @param {{ bleedMm?: number, marginesMm?: number }} [opcje]
 */
function policzGeometrie(cutSzerMm, cutWysMm, opcje = {}) {
  const bleedMm = opcje.bleedMm != null ? Number(opcje.bleedMm) : 2;
  const marginesMm = opcje.marginesMm != null ? Number(opcje.marginesMm) : 1;

  const grafikaSzerMm = cutSzerMm + bleedMm;
  const grafikaWysMm = cutWysMm + bleedMm;

  const stronaSzerMm = grafikaSzerMm + 2 * marginesMm;
  const stronaWysMm = grafikaWysMm + 2 * marginesMm;

  return {
    mm: {
      cut: [cutSzerMm, cutWysMm],
      grafika: [grafikaSzerMm, grafikaWysMm],
      strona: [stronaSzerMm, stronaWysMm],
      bleedMm,
      marginesMm,
    },
    pt: {
      stronaSzer: mmNaPt(stronaSzerMm),
      stronaWys: mmNaPt(stronaWysMm),
      // Grafika wysrodkowana na stronie.
      grafikaX: mmNaPt(marginesMm),
      grafikaY: mmNaPt(marginesMm),
      grafikaSzer: mmNaPt(grafikaSzerMm),
      grafikaWys: mmNaPt(grafikaWysMm),
      // Linia ciecia wysrodkowana wzgledem strony, nie grafiki — to ona
      // wyznacza finalny arkusz.
      cutX: mmNaPt((stronaSzerMm - cutSzerMm) / 2),
      cutY: mmNaPt((stronaWysMm - cutWysMm) / 2),
      cutSzer: mmNaPt(cutSzerMm),
      cutWys: mmNaPt(cutWysMm),
    },
  };
}

module.exports = {
  PT_NA_MM,
  CUT_CMYK,
  GRUBOSC_MM,
  NAZWA_SPOTU,
  NAZWA_WARSTWY,
  mmNaPt,
  policzGeometrie,
  rysujLinieCiecia,
};
