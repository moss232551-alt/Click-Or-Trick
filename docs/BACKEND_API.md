# Click Or Trick Backend API

Base URL: `https://clickortrickapi.pgthegod.space/api`

## Authentication
All endpoints are currently public. Protect them behind auth gateways before production use.

## Endpoints

### Health Check
- **GET** `/health`
- **Response**: `{ "status": "ok", "timestamp": 1730000000000 }`

### Generate Challenge
- **POST** `/challenges/generate`
- **Body (optional)**
```json
{
  "type": "email",
  "difficulty": "medium",
  "target": "e-commerce",
  "tactic": "fake invoice"
}
```
- **Response**
```json
{
  "id": "lK92sjD81sXz",
  "type": "email",
  "difficulty": "medium",
  "target": "e-commerce",
  "tactic": "fake invoice",
  "from": "billing@amaze-shop.co",
  "subject": "Your Invoice #87422 — Please confirm",
  "body": "Dear customer ...",
  "attachments": ["invoice87422.pdf"],
  "source": "ai",
  "clueCount": 2,
  "hasAnswer": true,
  "hasExplanation": true
}
```

**Notes**
- Missing fields are randomized across the 4 dimensions (type/difficulty/target/tactic).
- When `OPENAI_API_KEY` is present, responses come from GPT.
- Without a key, the API falls back to curated samples so the app remains playable offline.
- Answers, explanations, and actual clue text never leave the server—clients only receive counts and must submit results or request clues to learn more.

### List Built-in Samples
- **GET** `/challenges/samples`
- **Response**
```json
{
  "count": 3,
  "items": [ { "id": "sample-email-easy", "subject": "Reset your Facebook password now", "clueCount": 2 } ]
}
```
Use this endpoint for "no-internet" demo mode.

### Reveal a Clue
- **POST** `/challenges/clues/reveal` (requires Bearer token)
- **Body**
```json
{
  "levelId": "3-1",
  "challengeId": "lK92sjD81sXz",
  "clueIndex": 0
}
```
- **Response**
```json
{
  "status": "ok",
  "cost": 24,
  "clueIndex": 0,
  "clue": "Domain does not match the official vendor."
}
```
The server validates that the player owns enough score to pay the clue cost, debits their profile, and returns only the requested clue text.

### Record Player Result
- **POST** `/challenges/results`
- **Body**
```json
{
  "challengeId": "lK92sjD81sXz",
  "playerId": "analyst-09",
  "playerAnswer": "suspicious",
  "playerExplanation": "Domain is wrong and invoice attachment is unexpected.",
  "correctAnswer": "malicious",
  "responseTimeMs": 18000,
  "scoreDelta": -5,
  "metadata": {
    "mode": "quiz",
    "locale": "th"
  }
}
```
- **Response**
```json
{
  "status": "stored",
  "correctAnswer": "malicious",
  "feedback": {
    "verdict": "incorrect",
    "playerAnswer": "suspicious",
    "correctAnswer": "malicious",
    "explanation": "Invoice attachment plus mismatch domain shows intent to steal payment data.",
    "playerFeedback": "Good catch on the domain, but invoices with attachments plus payment failures point to malware—mark as malicious.",
    "keyClues": ["unknown domain", "invoice attachment"],
    "source": "ai"
  }
}
```
`playerExplanation` is required so trainees justify each decision. When an OpenAI key is configured, Click Or Trick critiques the explanation and returns coaching feedback. Without a key, the backend falls back to deterministic checks while still echoing the correct answer. The attempt always persists in MySQL unless the database write fails.

## MySQL Schema
- `challenges` – caches every generated scenario, including fallback prompts (`payload` column stores the raw JSON).
- `results` – records player submissions, response time, and mode metadata.

Set `MYSQL_*` variables inside `.env`, then run:
```bash
npm run db:init
```
This command ensures both tables exist before starting the API server.

## Running Locally
```bash
npm install
cp .env.example .env
npm run dev
```
Use `npm start` for production builds (no hot reload).

## ReDoc / OpenAPI
- Authoritative spec: `docs/openapi.yaml`.
- Build human-friendly docs: `npm run docs:build` (outputs `docs/api.html`).
