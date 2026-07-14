# PINIT

Građanska aplikacija (prijave problema + **Drive** mjerenje stanja cesta), dispečer platforma i Drive komandni centar. Server je **čisti Node.js — bez ijedne instalacije** (nema `npm install`).

## Sadržaj
- `server.js` — server (Node, bez zavisnosti) · mora ostati na **vrhu repozitorija**
- `public/app.html` — građanska aplikacija (prijave + Drive mjerenje, bojenje ceste)
- `public/platforma.html` — dispečer / komunalne službe (prijave, dodjela, SLA)
- `public/komandni.html` — Drive komandni centar (stanje cesta iz vožnji)
- `render.yaml` — Render konfiguracija (`startCommand: node server.js`)
- `data.json` — nastaje sam pri prvom pokretanju (prijave, radnici, vožnje)

## Adrese
| Ko | Ekran |
|---|---|
| Građanin | `/` (app.html) |
| Dispečer | `/platforma` |
| Grad / uprava | `/komandni` |

## Lokalno
```bash
node server.js
# → http://localhost:3000
```

## Deploy na Render (HTTPS, GPS radi svugdje)
1. Cijeli folder na **GitHub** (`server.js` mora biti u korijenu, ne u podfolderu).
2. render.com → **New → Web Service** → poveži repo → Render prepozna `render.yaml` → **Deploy**.
3. Adrese: `https://IME.onrender.com` (aplikacija), `/platforma`, `/komandni`.

Free plan: server zaspi nakon 15 min (prvi ulaz ~30 s) i `data.json` se briše pri deployu — za test uredu; za pravi pilot dodaje se baza.

> Napomena: GPS/senzori u pregledniku rade samo preko **HTTPS** (Render to daje). Otvaraj u Safariju/Chromeu — ne iz Viber/Instagram ugrađenog preglednika (blokiraju lokaciju).
