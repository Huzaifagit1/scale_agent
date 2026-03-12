# Imóveis App — GHL Multi-Property Form

A Next.js web app that lets your GHL contacts submit multiple property listings through a personalized, no-login link.

## How it works

1. Your GHL bot sends the contact a link like:
   ```
   https://your-domain.com/imoveis?c=CONTACT_ID
   ```
2. The page loads their name and any existing properties from GHL Custom Objects
3. They fill out forms for one or more properties
4. Each property is saved as a new **Imóveis** Custom Object record, associated to the contact

---

## Setup

### 1. Clone & Install
```bash
npm install
```

### 2. Environment Variables
Create a `.env.local` file:
```env
GHL_API_KEY=your_private_integration_token
GHL_LOCATION_ID=xWbTcKk2acWXn4MbANTk
GHL_OBJECT_ID=698794a0e95e971b723a93fb
```

### 3. Run locally
```bash
npm run dev
# Visit: http://localhost:3000/imoveis?c=TEST_CONTACT_ID
```

---

## Deploy to Vercel (Recommended)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. In **Environment Variables**, add:
   - `GHL_API_KEY` = your private token
   - `GHL_LOCATION_ID` = `xWbTcKk2acWXn4MbANTk`
   - `GHL_OBJECT_ID` = `698794a0e95e971b723a93fb`
4. Deploy — Vercel gives you a URL like `https://imoveis-xyz.vercel.app`

---

## GHL Bot Setup

In your GHL conversation AI, when a lead is created, send a message like:

> Olá {{contact.first_name}}! Para agilizar o processo, preencha as informações dos seus imóveis neste link:
> https://your-domain.com/imoveis?c={{contact.id}}

That `{{contact.id}}` is the GHL merge tag for the contact's ID.

---

## GHL API Notes

The app uses these GHL API endpoints:
- `GET /contacts/:id` — load contact name
- `GET /objects/:objectId/records?associatedContactId=:id` — load existing properties
- `POST /objects/:objectId/records` — create new property
- `PUT /objects/:objectId/records/:id` — update existing property
- `POST /objects/:objectId/records/:id/associations` — link property to contact

If the association endpoint structure differs in your GHL version, check:
**Settings → Custom Objects → Imóveis → Associations** for the exact label key.

---

## Customizing Fields

Edit `src/lib/fields.ts` to add, remove, or reorder form fields. Each field maps to a GHL custom field key.

To add a new field:
```ts
{ key: 'meu_campo', ghlId: 'GHL_FIELD_ID', label: 'Meu Campo', type: 'TEXT' }
```

Field types: `TEXT`, `NUMERICAL`, `MONETORY`, `CHECKBOX`, `RADIO`, `LARGE_TEXT`
