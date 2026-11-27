# Változásnapló

[English](CHANGELOG.md) · **Magyar**

A Saecula minden lényeges változása itt szerepel. A formátum a
[Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) ajánlását követi, a
verziószámozás a [szemantikus verziózást](https://semver.org/lang/hu/).
Az 1.0 előtt egy új mérföldkő vagy nagyobb funkciócsomag a középső
(minor) számot növeli, a csak javításokat tartalmazó kiadás az utolsót (patch).

## [Kiadatlan]

### Új

- **Csapatok:** a beállításban legfeljebb `AI-k száma − 1` gépi szövetséges
  választható. A szövetségesek nem harcolnak egymással és nem térítik egymást,
  közös a látásuk, és csapatként nyernek vagy veszítenek (a hódítás, a Csoda és
  az idő is a csapatot számolja). A szövetséges AI az ellenséges csapatot
  támadja; a pontszám-panel és a játék vége képernyő jelöli a szövetségeseket.
- **Fegyverszünet:** választható 10 vagy 20 perc. Amíg tart, a különböző
  csapatok játékosai nem sebezhetik és nem téríthetik egymást, az AI nem indít
  támadást, a támadó parancs mozgásra vált. Az óra alatt visszaszámláló fut.
- **Kezdő nyersanyag:** normál (200 étel, 200 fa, 100 arany), magas vagy
  halálmeccs.
- **Játéksebesség:** 1×, 1,5× vagy 2× játékidő; a kamera valós sebességgel
  görget.
- A mentések a 10-es verzióra lépnek; a régi mentések az új beállítások
  alapértékeivel töltődnek be.

- **Biztosíték grafikus hibára:** ha a böngésző visszaveszi a játék grafikus
  memóriáját (elvesztett WebGL-kontextus), a futó meccs megáll és az
  automatikus mentés helyére mentődik, egy kártya elmondja, mi történt, és az
  „Újratöltés és folytatás” onnan folytatja, ahol abbamaradt.

### Változott

- **Textúra-keret:** szárazföldi térképen továbbra is 256 MB, tengeres
  térképen 400 MB, ahol minden nép hajója a képernyőn lehet (a tulajdonos
  döntése).

### Javítva

- **A Közepes, Nehéz és Mesteri AI vízi térképen** 10 helyett 8 falusinál
  építi meg a kikötőjét. A nyitó portya előtti visszatartás kb. 9 falusinál
  megállította a falusi-képzést, így a kikötő csak a portyák után készült el,
  és a vízi meccset az döntötte el, kinek volt véletlenül kikötője.

### Fejlesztőknek

- Egy teszt minden mentési verzió (1–9) valódi mentését betölti, tovább
  futtatja és újra elmenti.
- Mérőszkriptek: a `naval6` forgatókönyv (128×128 Szigetvilág, hat játékos),
  a `--ships`, a térkép szerinti textúra-keret ellenőrzése és a
  `contextlost.mjs`.

## [0.9.2] — 2026-11-08

Apró javítások.

### Javítva

- A **Szigetvilág** kis térképen, hat játékossal néhány magon (pl. 273)
  nem tudott elkészülni; most minden kezdőhely aranyerei elférnek a saját
  szigetén, és a kikötőhely nem kerül a városháza tövébe. A szigetek
  továbbra sem érnek össze. Ugyanaz a mag más térképet ad, mint a 0.9.1-ben
  a 64×64-es, hat játékosos Szigetvilágon, néhány 64×64-es, hat játékosos
  Beltengeren és ritkán egy 64×64-es, hat játékosos Véletlen térképen. Minden
  más sablon, és minden sablon 64×64-es két- és háromjátékos, valamint
  96×96-os négy- és hatjátékos és 128×128-as hatjátékos térképe változatlan.
  A mentéseket nem érinti (a mentés a terepet tárolja).
- A **Közepes AI** minden néppel időben kiképzi a két szerzetesét: a sereg
  előtt képzi őket (továbbra is csak az ágyú-takarékosság fölötti aranyból).
  A Nehéz és a Mesteri AI változatlan.
- A szállítóhajó leírása a befogadóképességet a játék beállításából veszi,
  nem beírt számként.

### Hozzáadva

- Fejlesztőknek: kérésre futó körmérkőzés Nehéz AI-kkal vízi térképen
  (`BALANCE=water`, 96×96 Beltenger), amely népenkénti győzelmi arányt ír ki.

## [0.9.1] — 2026-11-08

Az egyedi egységek és a népek egyensúlyának ellenőrzése az M11–M14 után.

### Változott

- A **kozák** (orosz) életereje 60 helyett 50, támadása 6 helyett 5:
  azonos költségen már nem győzi le a kardforgatót, a felderítő
  ellenegységét, és az orosz AI már nem nyer négyből három meccset.
  Gyors portyázó marad.
- A **spanyol** aranygyűjtési bónusz +15 % helyett +25 %; az AI-k
  egymás elleni meccseiben a spanyol volt a leggyengébb nép.
- A 0.9.0-s mentések ugyanúgy betöltődnek: a 60 életerővel mentett kozák
  megtartja a 60-at (ezt most teszt őrzi); az újonnan képzett kozák 50-et kap.

### Hozzáadva

- Egyensúly-ellenőrzés fejlesztőknek: egyenlő költségű párviadal-teszt
  (a CI-ben fut), amely minden egyedi egységet a leváltott egység közelében
  tart, és az annak ellenegységeitől kikap; valamint a nyolc nép AI-meccseinek
  körmérkőzése (csak `BALANCE=1` mellett), amely népenként kiírja a
  győzelmi arányt.
- `npm run smoke:input`: függőség nélküli, fej nélküli Chrome-os ellenőrzés
  a húzással és kattintással kijelölésre, a jobb klikkes és a Ctrl+klikkes
  parancsra, futó fejlesztői szerver mellett (`scripts/smoke/`).

### Javítva

- Az ugyanarra a szállítóhajóra újra beszállásra küldött egység ismét a
  hajóhoz megy, nem áll egy helyben.
- A szoros mindkét partja mellett, vagy a célja közelében csak a túlpart
  mellett álló szállítóhajó arra a szárazföldre teszi ki az egységeit,
  amelyen a cél van (előbb átevez arra a partra).
- A hajó már nem adja fel azonnal a támadást, ha a célja rövid időre
  elérhetetlenné válik a vízről (egy falusi a part mögé, majd vissza
  sétál); csak akkor adja fel, ha a cél egy ideig elérhetetlen marad.
- A hajók úgy találják meg a vizet, amelyen hajózhatnak, hogy nem vizsgálják
  át minden alkalommal az egész tengert; ez megszünteti a képkocka-akadásokat
  a nagy vízi térképeken, ahol sok a tétlen hajó.
- A térképgenerátor kikötőhelyei ugyanazt a partminimumot követik, mint a
  kikötő elhelyezése.

## [0.9.0] — 2026-11-01

Hajók és vízi térképek (M14 mérföldkő).

### Hozzáadva

- Négy hajó, amelyet az új **kikötő** képez (a parton áll, egyik oldala nyílt
  vízzel határos): a **halászhajó** halrajokból gyűjt ételt, és a kikötőbe
  viszi; a **szállítóhajó** legfeljebb öt szárazföldi egységet visz; a
  **gálya** hajókra és a partra lő; a **fregatt** (felvilágosodás) hajókat és
  épületeket rombol. Minden nép a saját színeivel festi a hajótestet, a
  vitorla a tulajdonos színét mutatja.
- **Szállítás**: szárazföldi egységekkel kijelölve jobb klikk egy saját
  szállítóhajóra: beszállnak (a hajó eléjük megy); megrakott hajóval jobb
  klikk a szárazföldre: ott partra teszi őket, vagy **Kirakodás** gomb. Az
  elsüllyedt szállítóhajó rakománya is elvész.
- A hajók csak vízen járnak. Közelharci egység hajót nem támadhat, szerzetes
  nem téríthet; az íjászok, a tornyok és a többi hajó igen.
- **Halrajok** a vízen, és két új térképtípus: **Beltenger** (középen tó,
  körbe járható part) és **Szigetvilág** (mindenki saját szigeten, a sereg
  csak hajóval kel át). Minden kezdőhelynek van kikötőhelye és hala.
- Az AI kikötőt épít, ha van vize, halászik, gályákból (és fregattokból) álló
  flottát tart, a szigeteken pedig szállítóhajóval partra teszi a seregét.
- Beszállás- és kirakodás-kurzor, hajóhangok.
- A mentések sémaváltozata 9 (a régebbi mentések ugyanúgy betöltődnek).

### Javítva

- **Szigetvilág**: kis térképen öt-hat játékossal a szomszédos szigetek már
  nem nőnek össze egy szárazfölddé; nagy térképen két-három játékossal a
  szigetek már nem csupa erdők, és a térkép ismét elkészül.
- A szűk szorosban kirakodó szállítóhajó csak arra a partra teszi ki az
  egységeit, amely felé hajózott, sosem a túlpartra.
- A kirakodás-kurzor minden olyan szárazföldi mező fölött látszik, ahol a
  megrakott szállítóhajó kirakodna, akkor is, ha egység vagy nyersanyag áll
  ott.
- Az AI hajói már nem üldöznek olyan célt, amelynek vizéhez nem jutnak el
  (szárazföld mögötti tó), és a hajó feladja az elérhetetlen cél támadását.
- A Nehéz és a Mesteri AI portyája már nem indul a tengeren túli falusiakra.

## [0.8.1] — 2026-11-01

Javítások a 0.4.0–0.8.0 code review-ja alapján.

### Javítva

- A szerzetesed által áttérített egység már nem marad az AI irányítása
  alatt; az AI korábban tovább adott neki parancsot, és felülírta a
  tieidet.
- Az elérhetetlen célra (például víz túlpartjára) küldött szerzetes most
  azonnal feladja a térítést és helyben marad. Korábban minden
  képkockában újratervezte az útvonalát, amivel feleslegesen fogyasztotta
  a közös útkeresési keretet. Az AI szerzetese egy percig nem próbálkozik
  újra ugyanazzal a céllal.
- Az AI támadó hulláma, oldaltámadása és portyája elengedi a tőle
  áttérített egységeket.
- Az új épületalap alá került egység azon az oldalon lép le, amerről
  elérheti a célját; az ott álló szerzetes már nem adja fel a másik
  oldalról elérhető célt.
- A mentés megőrzi, mely célokat adta fel az AI szerzetese. A mentések
  sémaváltozata 8; a 0.8.0 ezeket nem nyitja meg, a régebbi mentések
  ugyanúgy betöltődnek.
- Ha töltődő szerzetessel egy ellenségre jobb klikkelsz, a szerzetes oda
  megy, ahogy a kurzor jelzi, és a parancs nem vész el.
- A felvilágosodásból induló küldetés a kezdőkora grafikáját tölti be. Az
  1. kori grafikát, amelyet semmi sem mutat, nem festi meg, és a valódi
  grafika sem az első másodpercekben készül.
- Egy még zárolt küldetés importált mentésének megnyerése már nem teszi
  teljesítetté a küldetést soron kívül.
- Ha egy küldetés térképe nem generálható, a skirmish beállítás-képernyő
  már nem válik rejtett küldetéssé.
- A kampány célpanelje már nem rajzolja újra másodpercenként az egész
  HUD-ot.

## [0.8.0] — 2026-11-01

Háromküldetéses kampány (M13 mérföldkő).

### Új

- **Kampány** a főmenüben. Három küldetés rögzített térképpel és
  felállással, sorban nyílnak meg; a teljesítettek újrajátszhatók.
  1. *Az első kolostor* (magyarok, 1 könnyű ellenfél): lépj a középkorba,
     építs kolostort, képezz két szerzetest.
  2. *A határ őrei* (angolok, Erődítmény, 2 közepes ellenfél, középkorból
     indulva): tarts ki 20 percig, és építs négy őrtornyot.
  3. *Csodák kora* (olaszok, Szigetek, 2 nehéz ellenfél, a
     felvilágosodásban, bőséges kincstárral): nyerd meg a meccset
     hódítással vagy Csodával.
- Minden küldetés magyar eligazítással indul, amely felsorolja a célokat.
- Játék közben a HUD célpanelje kipipálja a teljesített célokat, és
  mindegyikről értesítés jelenik meg.
- A küldetés megnyerhető az összes cél teljesítésével vagy hódítással, és
  elveszik, ha elesik a városházad. A játék vége képernyő a küldetés
  zárószövegét mutatja.
- Az előrehaladást a böngésző őrzi.

### Változott

- A mentés `schemaVersion` értéke 7 lett: a folyamatban lévő küldetés
  megőrzi a céljait. A régebbi mentések automatikus migrációval töltődnek
  be.

## [0.7.0] — 2026-11-01

Bővített fejlődési fa (M12 mérföldkő).

### Új

- **Tíz új technológia:**
  - Városháza: Talicska (falusiak +10% sebesség) és Taposókerekes daru (az
    építés 20%-kal gyorsabb).
  - Istálló: Lótenyésztés (lovasság +10% sebesség) és Lovas vértezet
    (lovasság +15% életerő).
  - Laktanya: Erőltetett menet (gyalogság további +10% sebesség) és Sorozás
    (laktanya, lőtér és istálló 25%-kal gyorsabban képez).
  - Kovácsműhely: Kémia (+1 távolsági támadás a muskétásoknak és az
    ágyúknak).
  - Kolostor: Szentség (szerzetesek +50% életerő), Buzgóság (szerzetesek
    +15% sebesség) és Megvilágosodás (térítés után feleannyi várakozás).
- A parancspanelek és a fejlődési fa mutatják őket, a kolostor kutatóhely
  lesz.
- A Közepes, Nehéz és Mesteri AI akkor kutatja őket, ha a fő listájáról
  semmi sem indítható, és csak abból az aranyból, amit a serege nem tesz
  félre.

### Változott

- A mentés `schemaVersion` értéke 6 lett. A régebbi mentések automatikus
  migrációval töltődnek be.

## [0.6.0] — 2026-11-01

Szerzetesek és kolostorok (M11 mérföldkő).

### Új

- **Szerzetes** minden népnek, a középkortól. Az új **Kolostorban** (3×3)
  képezhető aranyért. A szerzetes nem harcol:
  - Amíg áll, a közelében a legsérültebb saját egységet gyógyítja.
  - Ha vele egy ellenséges egységre jobb klikkelsz, **térítés** indul. A
    szerzetes odamegy, hat másodpercig imádkozik, és az egység átáll
    hozzád. A saját népe szerinti kinézete megmarad, a korábbi parancsai
    törlődnek. Utána a szerzetesnek 20 másodperc kell, mielőtt újra
    téríthetne.
  - Szerzetest és épületet nem lehet téríteni.
  - A térítés pontszámban úgy számít, mint egy elpusztított egység.
- Minden nép kolostora a saját építészetével készül: palettával, tetővel,
  a hagymakupolás stílusoknál hagymakupolával. Van templomhajója,
  harangtornya, kerengője és szálláshelye.
- Térítés-kurzor, halk harangszó, és értesítés, ha egy egységedet
  áttérítik, vagy egy ellenséges egység átáll hozzád.
- A Közepes, Nehéz és Mesteri AI a középkorban kolostort épít, és két
  szerzetest tart. A szerzetesek a sereggel mennek, gyógyítják, és a
  közelükbe érő ellenséges egységeket térítik.

### Változott

- A mentés `schemaVersion` értéke 5 lett. A régebbi mentések automatikus
  migrációval töltődnek be.

## [0.5.0] — 2026-11-01

Megosztható mentések és mérőszkriptek (M10 mérföldkő).

### Új

- **Mentés megosztása**: a betöltési listában (főmenü és szünet) minden
  használható mentés mellett van egy exportgomb, amely JSON-fájlként
  letölti. Az „Importálás fájlból” gomb egy ilyen fájlt azonnal betölt. A
  fájl ugyanazt az ellenőrzést kapja, mint a tárolt mentés (a régebbit
  migrálja). Túl nagy (16 MB fölötti), sérült, nem mentés vagy újabb
  verzióval készült fájlnál magyar üzenet jelenik meg, és nem töltődik be
  semmi.
- **Mérőszkriptek** a `scripts/perf/` mappában: az `npm run perf:texmem` a
  textúra-memóriát méri nagyításonként, az `npm run perf:frame` a
  képkockaidőt (Playwright a fejlesztői szerveren; lásd
  `scripts/perf/README.hu.md`).

## [0.4.0] — 2026-11-01

Időgyőzelem és könnyebb terep-textúrák kicsinyített nézetben (M9 mérföldkő).

### Új

- **Időgyőzelem**: 60 játékperc után a legmagasabb pontszámú, még talpon
  lévő játékos nyer. Holtversenynél az nyer, aki több ellenséges értéket
  pusztított el, utána a kisebb játékosszám. A hódítás és a Csoda az
  időkorlát előtt továbbra is nyerhet.
- A győzelmi beállításnak négy értéke van: Hódítás, Hódítás vagy Csoda (az
  alapértelmezés, ahogy eddig), Hódítás vagy idő és Mind.
- Időkorlátos meccsen a HUD mutatja a hátralévő időt és az éllovast. Az
  utolsó öt percben az óra kiemelve látszik, és értesítés jelenik meg. A
  játék vége képernyő és a játéknapló az új okot („Idő”) is mutatja.
- Az utolsó öt percben a pontszámban vezető AI nem indít új támadó
  hullámot.

### Változott

- 0,65 és 0,97 közötti nagyításon a nézet közelében a terep háromnegyedes
  felbontású textúrát kap a teljes helyett. Képernyőn ugyanolyan éles, mint
  a fél felbontás 0,65-ön. Egy 6 játékosos, 128×128-as Szigetek térképen mérve
  a terep ebben a nagyítási sávban 49 → 33 MB-ot foglal 1280×720-on, és
  75 → 45 MB-ot 1728×963-on.
- A mentés `schemaVersion` értéke 4 lett. A régebbi mentések automatikus
  migrációval töltődnek be, a győzelmi beállításuk megmarad.

## [0.3.0] — 2026-10-30

Minden népnek van egyedi egysége és állandó bónusza (M8 mérföldkő).

### Új

- **Egyedi egységek**: minden nép az egyik alap egységét a sajátjára váltja
  le, ugyanabban az épületben és korban képezve: magyar huszár (a lovagot
  váltja le), angol hosszúíjász (számszeríjász), német landsknecht
  (lándzsás), francia királyi muskétás (muskétás), spanyol konkvisztádor
  (könnyűlovas), olasz légiós (kardforgató), orosz kozák (felderítő) és finn
  sissi (íjász). Mindnek saját statisztikája és jellegzetes sziluettje van.
  A nép a leváltott egységet nem képezheti, így a textúra-keret nem nő. Az AI
  a nép saját egységét képzi.
- **Népbónuszok**: magyar lovas egységek +10% sebesség, angol farm +15% étel,
  német épületek +15% HP, francia istállóban képzett egységek +15% HP,
  spanyol aranygyűjtés +15%, olasz építés 15%-kal gyorsabb, orosz fagyűjtés
  +15%, finn gyalogság +10% sebesség.
- A nép-választó, a fejlődési fa („egyedi” jelvénnyel) és a képző gombok a nép
  egyedi egységét mutatják; a választó a bónuszt is.

### Változott

- A mentés `schemaVersion` értéke 3. A régi mentések automatikus
  migrációval töltődnek be, egységeik megmaradnak akkor is, ha a népük
  azóta mást képez.

## [0.2.0] — 2026-10-29

Az első kiadás **Saecula** néven: nyolc nép, mentés, hang, és az első teljes
tesztjáték javításai.

### Új

- **Nyolc nép** (M4–M5 mérföldkő): a magyarok mellé az angol, német, francia,
  spanyol, olasz, orosz és finn nép. Mindegyiknek mindhárom korban saját
  építészete, falai, egységviselete, címere és Csodája van. A népek csak
  megjelenésben különböznek.
- Népválasztás a játékosnak és az AI-nak (alapból „Vegyes”).
- **Mentés és betöltés** (M6): öt mentési hely és ötpercenkénti automatikus
  mentés IndexedDB-be; verziózott, ellenőrzött mentésfájl migrációkkal;
  érthető üzenet sérült vagy újabb mentésnél.
- **Szünet menü** mentéssel, betöltéssel, beállításokkal és kilépéssel.
- **Procedurális hang**: térbeli hangeffektek, hangszám-korlát és koronkénti
  generatív zene nyugodt, harci, győzelmi és vereség-hangulattal.
- **Beállítások**: fő-, zene-, effekt- és értesítés-hangerő, némítás, a
  kamera-billentyűk átállítása.
- **Csoda-győzelem**: egy kész Csodát tíz percig megtartani. Az AI is épít
  Csodát, és az ellenséges Csodát támadja elsőként.
- **Mesteri** AI-szint és három AI-személyiség (rohamozó, gazdálkodó,
  védekező).
- **Környezetfüggő kurzorok** mozgáshoz, gyűjtéshez (fejsze, csákány, kosár),
  építéshez, támadáshoz és tiltott célhoz (M7).
- **Érintőpad-támogatás**: két ujjas mozgatás és csippentéses nagyítás,
  görgetési mód beállítással (automatikus, nagyítás, mozgatás).
- **Irányítás lap** a beállításokban: parancs-gesztus (a jobb klikk mellett
  Ctrl, Cmd, Alt vagy semmi) és átállítható billentyűk a Haza, a pontszám,
  a falusi-panel, a fejlődési fa és a törlés számára.
- **Épületek törlése** megerősítéssel; legfeljebb 50 %-os készültségig a
  költség `round((1 − készültség) × 80)` százaléka visszajár, és a sorban álló
  egységek és a folyamatban lévő fejlesztés ára is.
- **Fejlődési fa**: mit nyitnak meg az egyes korok.
- **Oldalpanel** élő pontszámtáblával minden játékosra és falusi-áttekintéssel;
  egy sorra kattintva kijelölődnek azok a falusiak.
- **Kamera-gombok**: Haza (végiglép a városházáidon) és térkép-nagyítás.
- **Meccsnapló és Statisztika** képernyő: minden befejezett meccs helyben
  tárolódik, győzelmi aránnyal, átlagos hosszal, nép és nehézség szerinti
  bontással és JSON-exporttal.
- A főmenü mutatja a játék verzióját.
- Projektdokumentumok angolul és magyarul: README, változásnapló,
  közreműködési útmutató, magatartási kódex, közreműködők listája; MIT licenc;
  folyamatos integráció, issue- és pull request-sablonok.

### Változott

- A játék neve mostantól **Saecula** (korábbi munkacím: IsoRTS). A belső
  tároló-kulcsok a régi nevet tartják meg, így a meglévő mentések, beállítások
  és meccsnaplók megmaradnak.
- Dinamikusabb zene: ritmusréteg, a játék intenzitását követő sűrűség és
  hangerő, változatosabb frázisok és tempó.
- A mentés formátuma `schemaVersion` 2 (a meccs-statisztikát is tartalmazza);
  az 1-es verziójú mentések automatikusan átalakulnak.

### Javítva

- A falusiak nem ragadnak be, ha épületalapot raksz rájuk, vagy ha egymás
  mellett állnak; az építő mindig eléri az építkezést.
- Több falusi dolgozhat egy építkezésen, és félkész épülethez később is
  lehet segítőt küldeni.
- A ködben rejtőző ellenség nem változtatja meg a kurzort, és nem fogad
  parancsot.
- A felület fölötti csippentés nem nagyítja többé az egész böngészőoldalt.

## [0.1.0] — 2026-10-27

A játszható alapverzió (M0–M3 mérföldkő) a grafikai átdolgozással.

### Új

- Izometrikus térkép-megjelenítés, kamera (billentyűk, képernyőszél,
  nagyítás) és csempe-koordinátarendszer.
- Gazdaság: étel, fa és arany; a falusiak gyűjtenek, építenek, farmolnak.
- Épületek: városháza, ház, farm, faraktár, bányászkunyhó, laktanya, lőtér,
  istálló, kovácsműhely, őrtorony, fal, ágyúöntöde és Csoda.
- Egységek három korban: falusi, felderítő, kardforgató, íjász, lovag,
  lándzsás, számszeríjász, muskétás, ágyú és könnyűlovas.
- A\* útkeresés, harc életerő-csíkkal és halál-animációval, háborús köd.
- AI ellenfelek három nehézségi szinten: építenek, kort váltanak, támadnak.
- Korváltás a római korból a középkoron át a felvilágosodásig,
  kovácsműhely-fejlesztésekkel.
- Hódításos győzelem; játékbeállítás (nép, térképtípus, méret, ellenfelek,
  nehézség); játék vége képernyő statisztikával.
- Térképsablonok: Mezőség, Vadon, Szigetek, Erődítmény, Véletlen.
- Grafikai átdolgozás: procedurálisan generált terep, épületek és egységek,
  2D fények normal map-ekkel, napszakváltás, vetett árnyékok és meleg tónusú
  üvegpaneles felület.

[Kiadatlan]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.9.2...HEAD
[0.9.2]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/releases/tag/v0.1.0
