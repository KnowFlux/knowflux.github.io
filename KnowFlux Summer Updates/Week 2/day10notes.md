# Day 10 — Security Upgrade: Hiding the Admin Password

## Goal
Make the admin password completely invisible in the source code so that anyone who reads the repo (on GitHub, for example) cannot find the password or any hash/token that could be used to log in.

## What We Did

### 1. Removed the hardcoded password from `server.py`
- **Before:** `ADMIN_PASSWORD = "Kf$9mXpQ#2vNrL7w"` was written in plaintext in the file.
- **After:** The password is now read from an **environment variable**:
  ```python
  import os
  ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
  ```

### 2. Added a `.env` file reader to `server.py`
- Added a small snippet that reads a `.env` file (if it exists) to set environment variables. This is a convenience for local development — no external packages needed.
- The `.env` file contains one line: `ADMIN_PASSWORD=Kf$9mXpQ#2vNrL7w`
- **Crucial:** `.env` is listed in `.gitignore` so it never gets committed to the repo.

### 3. Reverted the client-side SHA-256 approach
- Earlier we had tried hashing the password in the browser using Web Crypto API and comparing to a hardcoded hash. That was **not** truly secure because the hash itself was visible in the source code and could be reused by an attacker.
- **Reverted to:** Sending the password as plaintext to the server over HTTPS. The server compares it to the password from the environment variable.

### 4. Removed the hardcoded token
- Earlier we added `token == "authenticated-client"` as a fallback. That was a bad idea because anyone who read the code could forge that token.
- **Fixed:** The `_is_authenticated()` method now only accepts server-generated session tokens.

### 5. Created `.gitignore`
- Added `.env` to `.gitignore` to ensure the password file never gets committed.

## Why This Is Secure

| Attack | Old approach (hardcoded token in JS) | New approach (env variable) |
|---|---|---|
| Someone reads `admin.html` | Sees hardcoded token — can log in directly | Sees nothing useful |
| Someone reads `server.py` | Sees password in plaintext | Sees nothing useful |
| Someone clones the repo | Gets the password | Gets nothing — `.env` is not in the repo |
| Someone has shell access to the server | Password is in code | Password is in environment (still accessible, but harder to find) |

## What You Need to Do to Run It

1. Create a file called `.env` in the project root with:
   ```
   ADMIN_PASSWORD=Kf$9mXpQ#2vNrL7w
   ```
2. Make sure `.env` is in `.gitignore` (we already set this up)
3. Run `python3 server.py`

## Deploying to Render Later
No code changes needed. Instead of a `.env` file, you set `ADMIN_PASSWORD` as an environment variable in Render's dashboard. The `os.environ.get()` call works the same way on both local and Render.

## Lesson Learned
**Client-side security is an illusion.** Anything you put in JavaScript (even a hash) is fully visible and reusable by anyone who opens DevTools. The only way to truly hide a secret is to never put it in the client code in the first place. All secrets belong on the server, in environment variables.