import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';
import LanguageToggle from '../components/LanguageToggle';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { resolveLevels } from '../utils/levelUtils';
import type { LevelDefinition } from '../types';
import '../styles/levels-legacy.css';

type ModalView = 'score' | null;

const LegacyLevels = () => {
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapInnerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const { profile: profileState } = useAuth();
  const { strings } = useLanguage();
  const navCopy = strings.common.nav;
  const brand = strings.common.brand;
  const levelCopy = strings.levels;
  const scoreboardCopy = strings.common.scoreboard;
  const mergedLevels = useMemo<LevelDefinition[]>(() => resolveLevels(profileState?.levels), [profileState?.levels]);
  const unlockedLevels = mergedLevels.filter((level) => level.status !== 'locked');
  const pickLatestLevel = useCallback(() => {
    const unlocked = mergedLevels.filter((level) => level.status === 'unlocked');
    if (unlocked.length) return unlocked[unlocked.length - 1];
    const completed = mergedLevels.filter((level) => level.status === 'completed');
    if (completed.length) return completed[completed.length - 1];
    return mergedLevels[0];
  }, [mergedLevels]);

  useEffect(() => {
    const fallback = pickLatestLevel();
    if (!selectedLevelId && fallback) {
      setSelectedLevelId(fallback.id);
      return;
    }
    const current = mergedLevels.find((level) => level.id === selectedLevelId);
    if ((!current || current.status === 'locked') && fallback) {
      setSelectedLevelId(fallback.id);
    }
  }, [selectedLevelId, mergedLevels, pickLatestLevel]);
  const selectedLevel = selectedLevelId
    ? mergedLevels.find((level) => level.id === selectedLevelId) || null
    : null;
  const canLaunchLevel = Boolean(selectedLevel && selectedLevel.status === 'unlocked');
  const playLink = canLaunchLevel && selectedLevel ? `/sync?level=${selectedLevel.id}` : '#';
  const scoreboard = profileState?.scoreboard ?? [];
  const scoreStatus = scoreboard.length ? '' : profileState ? scoreboardCopy.noMissions : scoreboardCopy.loginPrompt;
  const profileLevel = profileState?.profile?.level ?? 1;
  const profileScore = profileState?.profile?.score ?? 0;
  const xpProgress = Math.min(100, ((profileState?.profile?.xp ?? 0) % 200) / 2);
  const [activeModal, setActiveModal] = useState<ModalView>(null);

  useEffect(() => {
    const mapWrapper = mapWrapperRef.current;
    const mapInner = mapInnerRef.current;
    const svg = svgRef.current;
    if (!mapWrapper || !mapInner || !svg) return;

    const nodes = Array.from(mapInner.querySelectorAll<HTMLDivElement>('.level-node'));
    let isDragging = false;
    let startX = 0;
    let lastTranslateX = 0;
    let currentTranslateX = 0;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const getBounds = () => {
      const wrapperWidth = mapWrapper.clientWidth;
      const innerWidth = mapInner.scrollWidth;
      if (innerWidth <= wrapperWidth) return { min: 0, max: 0 };
      return { min: wrapperWidth - innerWidth, max: 0 };
    };

    const drawLines = () => {
      const mapRect = mapInner.getBoundingClientRect();
      const width = mapRect.width;
      const height = mapRect.height;
      svg.setAttribute('width', `${width}`);
      svg.setAttribute('height', `${height}`);
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }
      const svgNS = 'http://www.w3.org/2000/svg';
      for (let i = 0; i < nodes.length - 1; i += 1) {
        const aRect = nodes[i].getBoundingClientRect();
        const bRect = nodes[i + 1].getBoundingClientRect();
        const x1 = aRect.right - mapRect.left;
        const y1 = aRect.top + aRect.height / 2 - mapRect.top;
        const x2 = bRect.left - mapRect.left;
        const y2 = bRect.top + bRect.height / 2 - mapRect.top;
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', `${x1}`);
        line.setAttribute('y1', `${y1}`);
        line.setAttribute('x2', `${x2}`);
        line.setAttribute('y2', `${y2}`);
        svg.appendChild(line);
      }
    };

    const refreshLayout = () => {
      drawLines();
      const { min, max } = getBounds();
      currentTranslateX = clamp(currentTranslateX, min, max);
      lastTranslateX = currentTranslateX;
      mapInner.style.transform = `translateX(${currentTranslateX}px)`;
    };

    const startDrag = (clientX: number) => {
      isDragging = true;
      startX = clientX;
      mapInner.classList.add('dragging');
    };

    const updateDrag = (clientX: number) => {
      if (!isDragging) return;
      const delta = clientX - startX;
      const { min, max } = getBounds();
      currentTranslateX = clamp(lastTranslateX + delta, min, max);
      mapInner.style.transform = `translateX(${currentTranslateX}px)`;
      drawLines();
    };

    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      lastTranslateX = currentTranslateX;
      mapInner.classList.remove('dragging');
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      startDrag(event.clientX);
    };

    const handleMouseMove = (event: MouseEvent) => {
      updateDrag(event.clientX);
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      startDrag(event.touches[0].clientX);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging || event.touches.length !== 1) return;
      updateDrag(event.touches[0].clientX);
    };

    mapWrapper.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', endDrag);
    mapWrapper.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', endDrag);
    window.addEventListener('resize', refreshLayout);

    refreshLayout();

    return () => {
      mapWrapper.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', endDrag);
      mapWrapper.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', endDrag);
      window.removeEventListener('resize', refreshLayout);
    };
  }, []);

  const handleNodeClick = (config: LevelDefinition) => {
    setSelectedLevelId(config.id);
  };

  const openModal = (view: ModalView) => setActiveModal(view);

  return (
    <div className="level-page" style={{ backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', minHeight: '100vh' }}>
      <header className="level-navbar nav-theme">
        <div className="nav-theme-brand">
          <img src="/clickortrick.png" alt="Click Or Trick logo" className="nav-logo" />
          {brand}
        </div>
        <nav className="level-nav-links nav-theme-links">
          <Link to="/">{navCopy.home}</Link>
          <Link to="/levels" className="active">
            {navCopy.map}
          </Link>
        </nav>
        <LanguageToggle />
      </header>
      <div className="app">
        <section className="left-panel">
          <header className="profile-header">
            {/* <div className="avatar-circle" /> */}
            <div className="title-block">
              <div className="game-name">{brand}</div>
              <div className="underline" />
              <div className="page-title">{navCopy.levels}</div>
            </div>
          </header>

          <div className="info-card">
            <h3>{levelCopy.infoCards.chooseTitle}</h3>
            <p>{levelCopy.infoCards.chooseBody}</p>
          </div>

          <div className="info-card">
            <h3>{levelCopy.infoCards.alertsTitle}</h3>
            <p>{levelCopy.infoCards.alertsBody}</p>
          </div>
          <div className="info-card level-details-card">
            <h3>{selectedLevel?.label || levelCopy.details.titleFallback}</h3>
            {selectedLevel ? (
              <ul>
                <li>
                  {levelCopy.details.id}: <strong>{selectedLevel.id}</strong>
                </li>
                <li>
                  {levelCopy.details.difficulty}: {selectedLevel.difficulty.toUpperCase()}
                </li>
                <li>
                  {levelCopy.details.type}: {selectedLevel.type} · {levelCopy.details.target}: {selectedLevel.target}
                </li>
                <li>
                  {levelCopy.details.tactic}:{' '}
                  <em>{selectedLevel.tactic}</em>
                </li>
                <li>
                  {levelCopy.details.rewards}: {selectedLevel.xpReward} {levelCopy.details.xpSuffix} /{' '}
                  {selectedLevel.scoreReward} {levelCopy.details.pointSuffix}
                </li>
                <li>
                  {levelCopy.details.status}: {levelCopy.statusLabels[selectedLevel.status]}
                </li>
              </ul>
            ) : (
              <p>{levelCopy.details.selectPrompt}</p>
            )}
            <Link
              to={playLink}
              className={`play-level-btn ${canLaunchLevel ? '' : 'disabled'}`}
              onClick={(event) => {
                if (!canLaunchLevel) event.preventDefault();
              }}
            >
              {canLaunchLevel ? levelCopy.actions.play : levelCopy.actions.locked}
            </Link>
          </div>
          <div className="info-card rules-card">
            <h3>{levelCopy.rules.title}</h3>
            <ul>
              {levelCopy.rules.items.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
          <button type="button" className="level-score-btn" onClick={() => openModal('score')}>
            {levelCopy.actions.openScoreFeed}
          </button>
          {!profileState ? <p className="level-hint">{levelCopy.actions.loginHint}</p> : null}
        </section>

        <section className="map-area">
          <div className="map-wrapper" ref={mapWrapperRef}>
            <div className="map-inner" id="level-map" ref={mapInnerRef}>
              <svg className="map-lines-svg" ref={svgRef} />
              {mergedLevels.map((config) => (
                <button
                  type="button"
                  className={`level-node node-${config.id} ${selectedLevel?.id === config.id ? 'active' : ''} ${config.status}`}
                  key={config.id}
                  onClick={() => handleNodeClick(config)}
                  disabled={config.status === 'locked'}
                >
                  <span>{config.id}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <footer className="bottom-bar">
          <div className="bottom-left">
            {/* <div className="diamond-icon" /> */}
            <div>
              <div className="level-text">{levelCopy.footer.level}</div>
              <div className="level-number">{profileLevel}</div>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpProgress}%` }} />
            </div>
          </div>

          <div className="bottom-center">
            {levelCopy.footer.score} : <span>{profileScore.toLocaleString()} {levelCopy.footer.scoreSuffix}</span>
          </div>

          <div className="bottom-right">
            <Link
              to={playLink}
              className={`round-btn ${canLaunchLevel ? '' : 'disabled'}`}
              aria-label={levelCopy.footer.launchAria}
              onClick={(event) => {
                if (!canLaunchLevel) event.preventDefault();
              }}
            >
              ▶
            </Link>
            <button
              className="round-btn"
              type="button"
              aria-label={levelCopy.footer.scoreAria}
              onClick={() => openModal('score')}
            >
              ★
            </button>
          </div>
        </footer>
      </div>

      <Modal open={activeModal === 'score'} title={levelCopy.scoreboard.modalTitle} onClose={() => setActiveModal(null)}>
        {scoreboard.length ? (
          <ul className="score-feed">
            {scoreboard.map((entry) => (
              <li key={entry.username}>
                <strong>{entry.displayName || entry.username}</strong>
                <span>
                  {levelCopy.footer.level} {entry.level} · {entry.score.toLocaleString()} {scoreboardCopy.points}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{scoreStatus}</p>
        )}
      </Modal>

    </div>
  );
};

export default LegacyLevels;
