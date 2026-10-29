# Változásnapló

[English](CHANGELOG.md) · **Magyar**

A Saecula minden lényeges változása itt szerepel. A formátum a
[Keep a Changelog](https://keepachangelog.com/hu/1.1.0/) ajánlását követi, a
verziószámozás a [szemantikus verziózást](https://semver.org/lang/hu/).
Az 1.0 előtt egy új mérföldkő vagy nagyobb funkciócsomag a középső
(minor) számot növeli, a csak javításokat tartalmazó kiadás az utolsót (patch).

## [Kiadatlan]

Még nincs.

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

[Kiadatlan]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/releases/tag/v0.1.0
