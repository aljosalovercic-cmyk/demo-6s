# 6S presoja — klikljiv prototip

Preprost statični prototip za prikaz zamišljenega poteka 6S presoje. Vključuje 191 vprašanj iz priložene Excelove predloge, navigacijo po desetih sklopih, odgovore DA/NE, komentarje, ukrepe, roke, odgovorne osebe, opombe, fotografije in povzetek.

## Pomembno

- To je demonstracija uporabniške izkušnje, ne produkcijska aplikacija.
- Ni povezave s SharePointom, Dataverse, OneDriveom, Excelom ali e-pošto.
- Osnutek in fotografije se shranijo samo v lokalni pomnilnik trenutnega brskalnika.
- Prototip nima service workerja, zato ne zagotavlja delovanja brez internetne povezave ali sinhronizacije med napravami.
- Ocena v povzetku je poenostavljen prikaz deleža odgovorov DA; ni preverjen izračun iz Excelove datoteke.
- Ne vnašaj osebnih ali zaupnih podatkov.
- Pred objavo na GitHubu preveri, ali je dovoljeno javno objaviti vprašanja iz Excelove predloge. GitHub Pages je lahko javno dostopen.

## Lokalni preizkus

Datoteke `index.html`, `styles.css`, `app.js` in `questions.json` morajo ostati v isti mapi. Prototip odpri prek lokalnega spletnega strežnika (ne z dvojnim klikom na `index.html`), na primer z razširitvijo Live Server v Visual Studio Code.

## Objava na GitHub Pages

1. Ustvari GitHub repozitorij in vanj dodaj te štiri datoteke.
2. V nastavitvah repozitorija odpri **Pages**.
3. Izberi vejo in korensko mapo (`/`) ter shrani.
4. Preizkusi povezavo na telefonu in računalniku.

Objava prototipa na Pages ne doda zalednega strežnika ali sinhronizacije. Vsaka naprava ima svoj lokalni osnutek.
