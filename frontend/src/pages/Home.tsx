import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import LanguageToggle from '../components/LanguageToggle';
import '../styles/legacy.css';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

type ModalView = 'track' | null;

const LegacyHome = () => {
  const { profile: profileState } = useAuth();
  const { strings } = useLanguage();
  const homeCopy = strings.home;
  const navCopy = strings.common.nav;
  const scoreboardCopy = strings.common.scoreboard;
  const authCopy = strings.common.auth;
  const [activeModal, setActiveModal] = useState<ModalView>(null);

  const scoreboard = profileState?.scoreboard ?? [];
  const totalScore = profileState?.profile?.score ?? 0;
  const userLevel = profileState?.profile?.level ?? 1;
  const userXp = profileState?.profile?.xp ?? 0;
  const xpProgress = Math.min(100, (userXp % 200) / 2);

  const openModal = (view: ModalView) => setActiveModal(view);
  const closeModal = () => setActiveModal(null);
  const totalCompleted = useMemo(
    () => profileState?.levels?.filter((level) => level.status === 'completed').length ?? 0,
    [profileState?.levels],
  );

  return (
    <div className="legacy-page" style={{ flexDirection: 'column', alignItems: 'center' , backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', minHeight: '100vh' }}>
      <header className="navbar nav-theme">
        <div className="nav-theme-brand">
          <img src="/clickortrick.png" alt="Click Or Trick logo" className="nav-logo" />
          {strings.common.brand}
        </div>
        <nav className="menu nav-theme-links">
          <Link to="/" className="active">
            {navCopy.home}
          </Link>
          <Link to="/levels">{navCopy.levels}</Link>
        </nav>
        <LanguageToggle />
      </header>

      <main className="home-grid">
        <section className="hero-panel">
          <div className="hero-left">
            <p className="badge">{homeCopy.hero.badge}</p>
            <h1>
              {homeCopy.hero.title}
              <span> {homeCopy.hero.highlight}</span>
            </h1>
            <p>{homeCopy.hero.description}</p>
            <div className="hero-actions">
              <Link to={profileState ? '/levels' : '/login'} className="play-btn">
                {profileState ? homeCopy.hero.resume : homeCopy.hero.login}
              </Link>
              <button type="button" className="play-btn ghost" onClick={() => openModal('track')}>
                {homeCopy.hero.leaderboard}
              </button>
            </div>
          </div>
          <div className="hero-right">
            <div className="hero-stat">
              <span>{homeCopy.stats.level}</span>
              <strong>{userLevel}</strong>
              <div className="bar">
                <div className="fill" style={{ width: `${xpProgress}%` }} />
              </div>
              <small>{userXp.toLocaleString()} XP</small>
            </div>
            <div className="hero-stat">
              <span>{homeCopy.stats.score}</span>
              <strong>{totalScore.toLocaleString()}</strong>
              <small>
                {profileState ? `${totalCompleted} ${homeCopy.stats.missionsCleared}` : authCopy.loginPrompt}
              </small>
            </div>
          </div>
        </section>

        <section className="status-grid">
          <div className="status-card">
            <h3>{homeCopy.cards.pointTitle}</h3>
            <p>{homeCopy.cards.pointBody}</p>
          </div>
          <div className="status-card">
            <h3>{homeCopy.cards.unlockTitle}</h3>
            <ul>
              {homeCopy.cards.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <div className="status-card">
            <h3>{homeCopy.cards.intelTitle}</h3>
            <p>{profileState ? homeCopy.cards.intelLoggedIn : homeCopy.cards.intelLoggedOut}</p>
            <Link to="/levels">{homeCopy.cards.openMap}</Link>
          </div>
        </section>

        <section className="intel-card">
          <header>
            <div>
              <p className="badge">{homeCopy.liveBoard.badge}</p>
              <h3>{homeCopy.liveBoard.title}</h3>
            </div>
            <button type="button" onClick={() => openModal('track')}>
              {homeCopy.liveBoard.expand}
            </button>
          </header>
          {scoreboard.length ? (
            <ul>
              {scoreboard.slice(0, 4).map((entry) => (
                <li key={entry.username}>
                  <div>
                    <strong>{entry.displayName || entry.username}</strong>
                    <span>
                      {scoreboardCopy.levelShort} {entry.level}
                    </span>
                  </div>
                  <p>
                    {entry.score.toLocaleString()} {scoreboardCopy.points}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>{profileState ? homeCopy.liveBoard.emptySignedIn : homeCopy.liveBoard.emptySignedOut}</p>
          )}
        </section>
      </main>

      <Modal open={activeModal === 'track'} title={homeCopy.liveBoard.modalTitle} onClose={closeModal}>
        {scoreboard.length ? (
          <ul className="score-feed">
            {scoreboard.map((entry) => (
              <li key={entry.username}>
                <strong>{entry.displayName || entry.username}</strong>
                <span>
                  {homeCopy.stats.level} {entry.level} · {entry.score.toLocaleString()} {scoreboardCopy.points}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            {profileState ? homeCopy.liveBoard.modalEmptySignedIn : homeCopy.liveBoard.modalEmptySignedOut}
          </p>
        )}
      </Modal>
    </div>
  );
};

export default LegacyHome;
