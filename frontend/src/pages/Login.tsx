import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LanguageToggle from '../components/LanguageToggle';
import '../styles/legacy.css';
import '../styles/auth.css';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationShape } from '../i18n';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://clickortrick.pgthegod.space/api';
const API_ROOT = API_BASE.replace(/\/api\/?$/, '');
const API_ORIGIN = new URL(API_ROOT).origin;
type LoginStatusKey = keyof TranslationShape['login']['statuses'];

const LegacyLogin = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [statusKey, setStatusKey] = useState<LoginStatusKey | null>(null);
  const [statusOverride, setStatusOverride] = useState('');
  const [processing, setProcessing] = useState(false);
  const { signIn, adoptToken } = useAuth();
  const { strings } = useLanguage();
  const copy = strings.login;

  const clearStatus = () => {
    setStatusKey(null);
    setStatusOverride('');
  };

  const showStatusKey = (key: LoginStatusKey) => {
    setStatusKey(key);
    setStatusOverride('');
  };

  const showStatusOverride = (message: string) => {
    setStatusOverride(message);
    setStatusKey(null);
  };

  const statusMessage = statusOverride || (statusKey ? copy.statuses[statusKey] : '');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      showStatusKey('missing');
      return;
    }
    setProcessing(true);
    clearStatus();
    signIn({ identifier, password })
      .then(() => {
        showStatusKey('success');
        setTimeout(() => navigate('/home'), 600);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : '';
        if (message) {
          showStatusOverride(message);
        } else {
          showStatusKey('genericError');
        }
      })
      .finally(() => setProcessing(false));
  };

  const openOAuthWindow = (provider: 'discord' | 'google') => {
    const width = 520;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    window.open(
      `${API_ROOT}/api/auth/${provider}/login`,
      `${provider}-oauth`,
      `width=${width},height=${height},left=${left},top=${top}`,
    );
  };

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const allowedOrigins = [window.location.origin, API_ORIGIN];
      if (!allowedOrigins.includes(event.origin)) return;
      if (event.data?.type === 'oauth-success' && typeof event.data.token === 'string') {
        adoptToken(event.data.token);
        showStatusKey('socialSuccess');
        setTimeout(() => navigate('/home'), 800);
      } else if (event.data?.type === 'oauth-error') {
        if (event.data.message) {
          showStatusOverride(event.data.message);
        } else {
          showStatusKey('socialFail');
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [adoptToken, navigate]);

  return (
    <div className="auth-shell" style={{ backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', minHeight: '100vh' }}>
      <div className="auth-card">
        <div className="auth-card-language">
          <LanguageToggle />
        </div>
        <div className="guard-banner">{copy.banner}</div>
        <header>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </header>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-identifier">{copy.labels.identifier}</label>
          <input
            id="login-identifier"
            type="text"
            placeholder={copy.placeholders.identifier}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />

          <label htmlFor="login-password">{copy.labels.password}</label>
          <input
            id="login-password"
            type="password"
            placeholder={copy.placeholders.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button className="auth-submit" type="submit" disabled={processing}>
            {processing ? copy.submit.busy : copy.submit.idle}
          </button>
        </form>

        <div className="auth-alt">
          {copy.alt.question} <Link to="/create-account">{copy.alt.action}</Link>
        </div>

        <button className="discord-btn" type="button" onClick={() => openOAuthWindow('discord')}>
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/discord.svg" alt="Discord" />
          {copy.oauth.discord}
        </button>

        <button className="google-btn" type="button" onClick={() => openOAuthWindow('google')}>
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/google.svg" alt="Google" />
          {copy.oauth.google}
        </button>

        {statusMessage ? <p className="auth-alert">{statusMessage}</p> : null}
      </div>
    </div>
  );
};

export default LegacyLogin;
