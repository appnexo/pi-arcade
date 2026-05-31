# Railway deploy

This project is ready to deploy on Railway Hobby with Node.js and PostgreSQL.

## 1. Create services

1. Create a new Railway project from the GitHub repository.
2. Add a PostgreSQL database service.
3. In the Node.js service, attach the database or copy the `DATABASE_URL`.

## 2. Environment variables

Set these variables in the Railway Node.js service:

```env
NODE_ENV=production
PI_SANDBOX=true
PI_API_KEY=your_pi_api_key_here
SPIN_COST=0.1
HOUSE_EDGE=0.20
APP_SECRET=replace_with_a_long_random_string
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Use `PI_SANDBOX=true` while testing with Pi Sandbox. Change it to `false` only when you are ready for real Pi payments.

## 3. Start command

Railway uses:

```bash
npm start
```

That command runs database setup and then starts the server.

## 4. Health check

Railway checks:

```text
/api/health
```

Expected response:

```json
{ "status": "ok" }
```

## 5. Pi Browser/domain checklist

After Railway deploys the app:

1. Copy the public Railway URL.
2. Add your custom domain when you are ready.
3. Configure that domain in the Pi Developer Portal.
4. Keep `frontend/public/validation-key.txt` available at the root URL.
5. Confirm that `/Privacy.html` and `/Terms.html` are reachable.

Do not switch to real Pi payments until the complete Sandbox flow works:

```text
Pi.authenticate -> backend /v2/me verification -> payment approval -> payment completion with txid -> spin
```
