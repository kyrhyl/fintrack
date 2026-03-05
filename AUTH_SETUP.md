# Auth Setup

This guide explains how to configure authentication for FinTrack.

## Required Environment Variables

Add these to your `.env.local`:

```env
AUTH_SECRET=<generate-with-script>
AUTH_USER_EMAIL=your-email@example.com
AUTH_USER_PASSWORD_HASH=<bcrypt-hash-of-your-password>
```

## Quick Setup

### 1. Generate AUTH_SECRET

```bash
node -e "const crypto = require('crypto'); console.log('AUTH_SECRET=' + crypto.randomBytes(32).toString('hex'));"
```

### 2. Generate Password Hash

Run this script and enter your desired password when prompted:

```bash
node -e "
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter password to hash: ', (password) => {
  const hash = bcrypt.hashSync(password, 12);
  console.log('\\nAUTH_USER_PASSWORD_HASH=' + hash);
  console.log('\\nAdd this to your .env.local file');
  rl.close();
});
"
```

### 3. Set Your Email

```env
AUTH_USER_EMAIL=your-actual-email@example.com
```

## Example .env.local

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB=fintrack
FINANCE_UI_DATA_SOURCE=api

# Auth Configuration
AUTH_SECRET=be24d39debe4a92b66e4af01ae07b6c5badba7fec47387959c7ee732367b7a9c
AUTH_USER_EMAIL=john@example.com
AUTH_USER_PASSWORD_HASH=$2a$12$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Testing Login

1. Start the dev server: `npm run dev`
2. Go to `/login`
3. Enter the email and password you configured
4. You should be redirected to `/dashboard`
