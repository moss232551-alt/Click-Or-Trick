const { z } = require('zod');
const userService = require('../services/userService');
const profileService = require('../services/profileService');
const config = require('../config');

const credentialsSchema = z
  .object({
    username: z.string().trim().min(3).max(32),
    email: z.string().email(),
    password: z.string().min(6).max(128),
  })
  .strict();

const loginSchema = z
  .object({
    identifier: z.string().min(3),
    password: z.string().min(6),
  })
  .strict();

const register = async (req, res, next) => {
  try {
    const payload = credentialsSchema.parse(req.body || {});
    const existingEmail = await userService.findUserByEmail(payload.email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const existingUsername = await userService.findUserByUsername(payload.username);
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    const user = await userService.createUser(payload);
    await profileService.ensureProfile(user.id, user.username);
    const token = userService.issueToken({ sub: user.id, username: user.username });
    const profile = await profileService.getFullProfile(user.id);
    res.status(201).json({ token, ...profile });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body || {});
    const identifier = payload.identifier.trim().toLowerCase();
    const user =
      (await userService.findUserByEmail(identifier)) ||
      (await userService.findUserByUsername(payload.identifier.trim()));
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isValid = await userService.verifyPassword(payload.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await profileService.ensureProfile(user.id, user.username);
    const token = userService.issueToken({ sub: user.id, username: user.username });
    const profile = await profileService.getFullProfile(user.id);
    res.json({ token, ...profile });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const profile = await profileService.getFullProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

const buildOAuthResponseHtml = (payload) => {
  const safeOrigin = config.oauth.frontendBaseUrl;
  const data = JSON.stringify(payload);
  return `<!DOCTYPE html>
  <html>
    <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
      <script>
        (function () {
          if (window.opener) {
            window.opener.postMessage(${data}, '${safeOrigin}');
            window.close();
          }
        })();
      </script>
      <p>${payload.message || 'You can return to the main window.'}</p>
    </body>
  </html>`;
};

const processOAuthLogin = async ({ provider, providerUserId, username, email }) => {
  let user = await userService.findUserByOAuth(provider, providerUserId);
  if (!user) {
    const normalizedEmail = email?.toLowerCase() || `${providerUserId}@${provider}.clickortrick`;
    user = (normalizedEmail && (await userService.findUserByEmail(normalizedEmail))) || null;
    if (!user) {
      const safeUsername = await userService.ensureUniqueUsername(username || `${provider}_agent`);
      const password = userService.generateRandomPassword();
      const created = await userService.createUser({
        username: safeUsername,
        email: normalizedEmail,
        password,
      });
      user = await userService.findUserById(created.id);
    }
    await userService.linkOAuthAccount({ userId: user.id, provider, providerUserId });
  }
  await profileService.ensureProfile(user.id, user.username);
  const token = userService.issueToken({ sub: user.id, username: user.username });
  return token;
};

const startDiscordOAuth = (req, res) => {
  if (!config.oauth.discord.clientId || !config.oauth.discord.redirectUri) {
    return res.status(500).json({ error: 'Discord OAuth is not configured.' });
  }
  const params = new URLSearchParams({
    client_id: config.oauth.discord.clientId,
    redirect_uri: config.oauth.discord.redirectUri,
    response_type: 'code',
    scope: 'identify email',
    prompt: 'consent',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
};

const discordCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send(
      buildOAuthResponseHtml({ type: 'oauth-error', message: 'Missing authorization code from Discord.' }),
    );
  }
  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.oauth.discord.clientId,
        client_secret: config.oauth.discord.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.oauth.discord.redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Discord token exchange failed.');
    }
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userResponse.json();
    if (!userResponse.ok) {
      throw new Error('Failed to fetch Discord profile.');
    }
    const issuedToken = await processOAuthLogin({
      provider: 'discord',
      providerUserId: profile.id,
      username: profile.username,
      email: profile.email,
    });
    return res.send(buildOAuthResponseHtml({ type: 'oauth-success', token: issuedToken }));
  } catch (error) {
    return res.send(
      buildOAuthResponseHtml({
        type: 'oauth-error',
        message: error instanceof Error ? error.message : 'Discord login failed.',
      }),
    );
  }
};

const startGoogleOAuth = (req, res) => {
  if (!config.oauth.google.clientId || !config.oauth.google.redirectUri) {
    return res.status(500).json({ error: 'Google OAuth is not configured.' });
  }
  const params = new URLSearchParams({
    client_id: config.oauth.google.clientId,
    redirect_uri: config.oauth.google.redirectUri,
    response_type: 'code',
    scope: 'profile email',
    access_type: 'online',
    prompt: 'consent',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

const googleCallback = async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.send(
      buildOAuthResponseHtml({ type: 'oauth-error', message: 'Missing authorization code from Google.' }),
    );
  }
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.oauth.google.clientId,
        client_secret: config.oauth.google.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.oauth.google.redirectUri,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || 'Google token exchange failed.');
    }
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await userResponse.json();
    if (!userResponse.ok) {
      throw new Error('Failed to fetch Google profile.');
    }
    const issuedToken = await processOAuthLogin({
      provider: 'google',
      providerUserId: profile.id,
      username: profile.name || profile.email?.split('@')[0] || 'google_user',
      email: profile.email,
    });
    return res.send(buildOAuthResponseHtml({ type: 'oauth-success', token: issuedToken }));
  } catch (error) {
    return res.send(
      buildOAuthResponseHtml({
        type: 'oauth-error',
        message: error instanceof Error ? error.message : 'Google login failed.',
      }),
    );
  }
};

module.exports = {
  register,
  login,
  me,
  startDiscordOAuth,
  discordCallback,
  startGoogleOAuth,
  googleCallback,
};
