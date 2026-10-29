import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/sync-play.css';
import { fetchChallenge, submitResult, revealClue } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { resolveLevels } from '../utils/levelUtils';
import type { Challenge, LevelDefinition, MentorFeedback, Verdict } from '../types';
import Modal from '../components/Modal';
import LanguageToggle from '../components/LanguageToggle';
import type { TranslationShape } from '../i18n';

const verdictOptions: Verdict[] = ['safe', 'suspicious', 'malicious'];

type TemplateParams = Record<string, string | number>;
type StatusDescriptor<K extends string> =
  | { kind: 'key'; key: K; params?: TemplateParams }
  | { kind: 'raw'; text: string }
  | null;
type SyncStatusKey = keyof TranslationShape['sync']['states'];
type ModalMessageKey = keyof TranslationShape['sync']['modal']['messages'];
type SubmissionDescriptor =
  | { status: 'success' | 'error'; kind: 'key'; key: ModalMessageKey; params?: TemplateParams }
  | { status: 'success' | 'error'; kind: 'raw'; message: string };

const buildPlayerId = () => {
  if (typeof window === 'undefined') return 'web-sync';
  const KEY = 'clickortrick-sync-player';
  const stored = window.localStorage.getItem(KEY);
  if (stored) return stored;
  const generated = `sync-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(KEY, generated);
  return generated;
};

const SyncPlay = () => {
  const { profile: profileState, refreshProfile } = useAuth();
  const { strings, format } = useLanguage();
  const navCopy = strings.common.nav;
  const brand = strings.common.brand;
  const syncCopy = strings.sync;
  const [searchParams] = useSearchParams();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [status, setStatus] = useState<StatusDescriptor<SyncStatusKey>>({ kind: 'key', key: 'chooseLevel' });
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>('suspicious');
  const [explanation, setExplanation] = useState('');
  const [feedback, setFeedback] = useState<MentorFeedback | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionDescriptor | null>(null);
  const [lastExplanation, setLastExplanation] = useState('');
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [revealedClues, setRevealedClues] = useState<Array<string | null>>([]);
  const [clueStatus, setClueStatus] = useState<StatusDescriptor<SyncStatusKey>>(null);
  const setStatusKey = useCallback((key: SyncStatusKey, params?: TemplateParams) => {
    setStatus({ kind: 'key', key, params });
  }, []);

  const setStatusRaw = useCallback((text: string) => {
    setStatus(text ? { kind: 'raw', text } : null);
  }, []);

  const statusText = useMemo(() => {
    if (!status) return '';
    return status.kind === 'raw' ? status.text : format(syncCopy.states[status.key], status.params);
  }, [status, format, syncCopy]);

  const setClueStatusKey = useCallback((key: SyncStatusKey, params?: TemplateParams) => {
    setClueStatus({ kind: 'key', key, params });
  }, []);

  const setClueStatusRaw = useCallback((text: string) => {
    setClueStatus(text ? { kind: 'raw', text } : null);
  }, []);

  const clueStatusText = useMemo(() => {
    if (!clueStatus) return '';
    return clueStatus.kind === 'raw' ? clueStatus.text : format(syncCopy.states[clueStatus.key], clueStatus.params);
  }, [clueStatus, format, syncCopy]);

  const levels = useMemo<LevelDefinition[]>(
    () => resolveLevels(profileState?.levels, { unlockAllFallback: false }),
    [profileState?.levels],
  );
  const levelParam = searchParams.get('level');
  const selectedLevel: LevelDefinition | null = levelParam
    ? levels.find((level) => level.id === levelParam) || null
    : null;
  const requestedMissing = Boolean(levelParam && !selectedLevel);
  const hasUnlockedLevels = useMemo(() => levels.some((level) => level.status === 'unlocked'), [levels]);
  const [anonPlayerId] = useState(buildPlayerId);
  const playerId = profileState?.profile?.userId ? String(profileState.profile.userId) : anonPlayerId;
  const canSync = Boolean(selectedLevel && selectedLevel.status === 'unlocked');
  const unlockScore = selectedLevel?.scoreReward ?? 120;
  const tierLabel = selectedLevel ? (selectedLevel.difficulty === 'hard' ? syncCopy.tier.elite : syncCopy.tier.regular) : '';
  const pointsHint = selectedLevel
    ? format(syncCopy.pointsHint, { points: unlockScore.toLocaleString(), tierLabel })
    : syncCopy.pointsHintFallback;
  const clueMultiplier = selectedLevel?.difficulty === 'hard' ? 0.25 : selectedLevel?.difficulty === 'medium' ? 0.18 : 0.12;
  const clueCost = selectedLevel ? Math.ceil((selectedLevel.scoreReward || 100) * clueMultiplier) : 0;

  const syncChallenge = useCallback(
    async (level: LevelDefinition | null) => {
      if (!level) {
        setStatusKey(hasUnlockedLevels ? 'pickMission' : 'allClear');
        return;
      }
      if (level.status !== 'unlocked') {
        setStatusKey('lockedMission');
        return;
      }
      setLoading(true);
      setStatusKey('syncing', { level: level.label });
      setFeedback(null);
      setSubmissionResult(null);
      setResultModalOpen(false);
      setClueStatus(null);
      setRevealedClues([]);
      setChallenge(null);
      try {
        const data = await fetchChallenge({
          levelId: level.id,
          difficulty: level.difficulty,
          type: level.type,
          target: level.target,
          tactic: level.tactic,
          playerLevel: profileState?.profile?.level ?? 1,
          playerKey: playerId,
        });
        if (!data) {
          setChallenge(null);
          setStatusKey('noMission');
          return;
        }
        setChallenge(data);
        setStatusKey('synced');
        setFeedback(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message) {
          setStatusRaw(message);
        } else {
          setStatusKey('unable');
        }
        setChallenge(null);
      } finally {
        setLoading(false);
      }
    },
    [playerId, profileState?.profile?.level, hasUnlockedLevels, setStatusKey, setStatusRaw],
  );

  useEffect(() => {
    setChallenge(null);
    setRevealedClues([]);
    setClueStatus(null);
    setSubmissionResult(null);
    setResultModalOpen(false);
    setFeedback(null);
    setLoading(false);

    if (requestedMissing) {
      setStatusKey('invalidLink');
      return;
    }
    if (!selectedLevel) {
      setStatusKey(hasUnlockedLevels ? 'pickMission' : 'allClear');
      return;
    }
    if (selectedLevel.status !== 'unlocked') {
      setStatusKey('lockedMission');
      return;
    }
    setStatusKey('readyToSync');
  }, [requestedMissing, selectedLevel?.id, selectedLevel?.status, hasUnlockedLevels, setStatusKey]);

  useEffect(() => {
    setRevealedClues(new Array(challenge?.clueCount || 0).fill(null));
    setClueStatus(null);
  }, [challenge?.id, challenge?.clueCount]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!challenge || !selectedLevel) {
      setStatusKey('selectBeforeSubmit');
      return;
    }
    const explanationText = explanation.trim();
    setLoading(true);
    setStatusKey('sendingVerdict');
    setLastExplanation(explanationText);
    const payload = {
      challengeId: challenge.id,
      playerId,
      playerAnswer: verdict,
      playerExplanation: explanationText,
      responseTimeMs: Math.floor(Math.random() * 5000),
      scoreDelta: selectedLevel.scoreReward,
      metadata: {
        levelId: selectedLevel.id,
      },
    };
    try {
      const result = await submitResult(payload);
      if (result?.feedback) {
        setFeedback(result.feedback);
        setStatusKey('mentorVerdict', { verdict: result.feedback.verdict });
        setSubmissionResult({
          status: 'success',
          kind: 'key',
          key: 'mentorVerdict',
          params: { verdict: result.feedback.verdict },
        });
      } else {
        setStatusKey('stored');
        setSubmissionResult({ status: 'success', kind: 'key', key: 'loggedNoFeedback' });
      }
      if (profileState) {
        await refreshProfile();
      }
      setExplanation('');
      setResultModalOpen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message) {
        setStatusRaw(message);
        setSubmissionResult({ status: 'error', kind: 'raw', message });
      } else {
        setStatusKey('submissionFailed');
        setSubmissionResult({ status: 'error', kind: 'key', key: 'submissionFailed' });
      }
      setResultModalOpen(true);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const attachments = useMemo(() => challenge?.attachments ?? [], [challenge]);
  const submissionTitle = submissionResult?.status === 'success' ? syncCopy.modal.successTitle : syncCopy.modal.errorTitle;
  const submissionMessage = submissionResult
    ? submissionResult.kind === 'raw'
      ? submissionResult.message
      : format(syncCopy.modal.messages[submissionResult.key], submissionResult.params)
    : syncCopy.modal.unknown;
  const summaryStatusLabel = submissionResult?.status === 'error'
    ? syncCopy.modal.summary.errorStatus
    : syncCopy.modal.summary.successStatus;
  const summaryToneClass = submissionResult?.status === 'error' ? 'error' : 'success';

  return (
    <div className="sync-screen" style={{ backgroundImage: 'url(/bg.png)', backgroundSize: 'cover', minHeight: '100vh' }}>
      <header className="sync-nav nav-theme">
        <div className="nav-theme-brand">
          <img src="/clickortrick.png" alt="Click Or Trick logo" className="nav-logo" />
          {brand}
        </div>
        <nav className="nav-theme-links">
          <Link to="/">{navCopy.home}</Link>
          <Link to="/levels">{navCopy.levels}</Link>
        </nav>
        <LanguageToggle />
      </header>
      <div className="sync-grid">
        <section className="sync-panel challenge-panel">
          <header>
            <h2>{syncCopy.header.challenge}</h2>
            <span>{challenge ? challenge.type?.toUpperCase() : '—'}</span>
          </header>
          {statusText ? <p className="challenge-status">{statusText}</p> : null}
          {requestedMissing ? (
            <p className="challenge-empty">{syncCopy.challengeEmpty.invalid}</p>
          ) : !selectedLevel ? (
            <p className="challenge-empty">
              {hasUnlockedLevels ? syncCopy.challengeEmpty.noLevel : syncCopy.states.allClear}
            </p>
          ) : selectedLevel.status !== 'unlocked' ? (
            <p className="challenge-empty">{syncCopy.challengeEmpty.locked}</p>
          ) : loading ? (
            <div className="challenge-skeleton">
              <div />
              <div />
              <div />
            </div>
          ) : challenge ? (
            <div className="challenge-body">
              <p className="challenge-subject">{challenge.subject}</p>
              <p className="challenge-meta">{syncCopy.challengeMeta.from} {challenge.from}</p>
              <pre>{challenge.body}</pre>
              {attachments.length ? (
                <p className="challenge-attachments">{syncCopy.attachments} {attachments.join(', ')}</p>
              ) : null}
              <button type="button" className="fresh-mission" onClick={() => void syncChallenge(selectedLevel)}>
                {syncCopy.actions.newMission}
              </button>
            </div>
          ) : (
            <div className="challenge-ready">
              <p>
                {status?.kind === 'raw' || (status?.kind === 'key' && status.key !== 'readyToSync') ? statusText : syncCopy.states.readyToSync}
              </p>
              <button type="button" className="fresh-mission" onClick={() => selectedLevel && void syncChallenge(selectedLevel)}>
                {syncCopy.actions.syncNow}
              </button>
            </div>
          )}
          {challenge?.clueCount ? (
            <div className="clue-panel">
              <h3>{syncCopy.clues.title}</h3>
              <p className="clue-hint">{format(syncCopy.clues.hint, { cost: clueCost.toLocaleString() })}</p>
              <ul>
                {Array.from({ length: challenge.clueCount }, (_, index) => (
                  <li key={`${challenge.id}-clue-${index}`}>
                    {revealedClues[index] ? (
                      <span>{revealedClues[index]}</span>
                    ) : (
                      <button
                        type="button"
                        disabled={!selectedLevel || !canSync}
                        onClick={async () => {
                          if (!selectedLevel || !challenge || revealedClues[index]) return;
                          if (!profileState?.profile) {
                            setClueStatusKey('loginBeforeClue');
                            return;
                          }
                          if ((profileState.profile.score || 0) < clueCost) {
                            setClueStatusKey('notEnoughPoints');
                            return;
                          }
                          try {
                            const response = await revealClue({
                              levelId: selectedLevel.id,
                              challengeId: challenge.id,
                              clueIndex: index,
                            });
                            setRevealedClues((prev) => {
                              const next = [...prev];
                              next[index] = response?.clue || null;
                              return next;
                            });
                            if (response?.clue) {
                              setClueStatusKey('clueUnlocked', { clue: response.clue });
                            } else {
                              setClueStatusKey('clueUnlockedGeneric');
                            }
                            await refreshProfile();
                          } catch (error) {
                            const message = error instanceof Error ? error.message : '';
                            if (message) {
                              setClueStatusRaw(message);
                            } else {
                              setClueStatusKey('clueFailed');
                            }
                          }
                        }}
                      >
                        {format(syncCopy.actions.revealClue, { cost: clueCost.toLocaleString() })}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {clueStatusText ? <p className="clue-status">{clueStatusText}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="sync-panel verdict-panel">
          <header>
            <h2>{syncCopy.header.verdict}</h2>
            <span>{syncCopy.header.liveScoring}</span>
          </header>
          <form onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="verdict">
              {syncCopy.verdictLabel}
            </label>
            <select
              id="verdict"
              value={verdict}
              onChange={(event) => setVerdict(event.target.value as Verdict)}
              disabled={!challenge}
            >
              {verdictOptions.map((option) => (
                <option key={option} value={option}>
                  {syncCopy.verdict[option]}
                </option>
              ))}
            </select>
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              placeholder={syncCopy.actions.textareaPlaceholder}
              disabled={!challenge}
            />
            <button type="submit" disabled={!challenge || explanation.trim().length < 10}>
              {loading ? syncCopy.actions.deployBusy : syncCopy.actions.deployIdle}
            </button>
          </form>
          <p className="points-hint">{pointsHint}</p>
          {feedback ? (
            <div className="feedback-card">
              <strong>{feedback.verdict}</strong>
              <p>{feedback.explanation}</p>
            </div>
          ) : null}
        </section>
      </div>
      <Modal open={resultModalOpen} title={submissionTitle} onClose={() => setResultModalOpen(false)}>
        <div className="result-modal-content">
          <div className={`result-modal-summary ${summaryToneClass}`}>
            <div className="summary-item">
              <p className="summary-label">{syncCopy.modal.summary.verdictLabel}</p>
              <strong>{feedback?.verdict || '—'}</strong>
            </div>
            <div className="summary-item">
              <p className="summary-label">{syncCopy.modal.summary.statusLabel}</p>
              <strong>{summaryStatusLabel}</strong>
            </div>
          </div>
          <p>{submissionMessage}</p>
          {feedback?.explanation ? (
            <div className="result-modal-feedback">
              <p className="summary-label">{syncCopy.modal.summary.explanationLabel}</p>
              <p>{feedback.explanation}</p>
            </div>
          ) : null}
          {lastExplanation ? (
            <div className="result-player-explanation">
              <p className="summary-label">{syncCopy.modal.yourExplanation}</p>
              <p>{lastExplanation}</p>
            </div>
          ) : null}
          <div className="result-modal-links">
            <Link to="/levels" onClick={() => setResultModalOpen(false)}>
              {syncCopy.modal.levelProgress}
            </Link>
            <button type="button" onClick={() => setResultModalOpen(false)}>
              {syncCopy.modal.close}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SyncPlay;
