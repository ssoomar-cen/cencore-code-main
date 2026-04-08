

# Switch Salesforce Auth to OAuth Authorization Code Flow

## Problem
The Salesforce sandbox only has **External Client Apps** available — not traditional Connected Apps. External Client Apps don't support the Username-Password OAuth flow (`grant_type: password`) that the current edge function uses, resulting in `Username-Password Flow Disabled` errors.

## Solution
Switch to the **OAuth 2.0 Authorization Code flow**, which External Client Apps fully support. Instead of entering a username/password in the config dialog, the admin clicks an "Authorize with Salesforce" button, gets redirected to Salesforce to log in, and is redirected back with an authorization code that gets exchanged for tokens.

## Changes

### 1. New Edge Function: `salesforce-auth-callback`
- Receives the authorization code from the Salesforce redirect
- Exchanges it for `access_token` and `refresh_token` using `grant_type=authorization_code`
- Stores the tokens in the integration's `config` column
- Redirects the user back to the CenCore setup page

### 2. Update Edge Function: `salesforce-sync`
- Remove the username-password login logic
- Instead, read `access_token` and `refresh_token` from the stored config
- If the access token is expired, use the refresh token to get a new one
- Update the stored tokens after refresh

### 3. Update Config Dialog (`IntegrationConfigDialog.tsx`)
- For Salesforce, replace username/password/security_token fields with:
  - **Instance URL** (keep — needed to build the authorize URL)
  - **Client ID** (keep)
  - **Client Secret** (keep)
  - **"Authorize with Salesforce" button** — constructs the OAuth authorize URL and opens it
- Show connection status based on whether tokens exist in config

### 4. Update Salesforce Config Fields
- Remove `username`, `password`, `security_token` from the Salesforce field list
- Add a visual indicator showing whether OAuth authorization is complete
- Add a "Re-authorize" button if tokens already exist

### Flow Diagram
```text
Admin clicks "Authorize with Salesforce"
  → Browser opens: https://{instance}/services/oauth2/authorize
      ?client_id=...&redirect_uri=...&response_type=code
  → User logs in to Salesforce sandbox
  → Salesforce redirects to: /salesforce-auth-callback?code=...
  → Edge function exchanges code for tokens
  → Tokens stored in integrations.config
  → User redirected back to CenCore setup page
  → "Connected" badge appears
```

### 5. Salesforce External Client App Setup
The redirect URI for the External Client App should be set to the edge function URL:
`https://twontizanpwgskyertaq.supabase.co/functions/v1/salesforce-auth-callback`

### Technical Details

**New fields stored in config after authorization:**
- `access_token` — for API calls
- `refresh_token` — to renew expired access tokens  
- `token_instance_url` — the instance URL returned by Salesforce
- `authorized_at` — timestamp

**Token refresh logic in `salesforce-sync`:**
- Try the stored access token first
- On 401, use refresh token to get a new access token
- Update stored config with new tokens

