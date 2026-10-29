import defaultLevels from '../data/defaultLevels';
import type { LevelDefinition } from '../types';

const defaultLevelMap = new Map(defaultLevels.map((level) => [level.id, level]));

interface ResolveOptions {
  unlockAllFallback?: boolean;
}

export const resolveLevels = (
  profileLevels?: LevelDefinition[] | null,
  options: ResolveOptions = {},
): LevelDefinition[] => {
  const { unlockAllFallback = false } = options;
  if (profileLevels?.length) {
    return profileLevels.map((level) => {
      const template = defaultLevelMap.get(level.id);
      return {
        ...template,
        ...level,
        status: level.status || 'locked',
        bestScore: level.bestScore ?? 0,
      };
    });
  }

  return defaultLevels.map((level, index) => ({
    ...level,
    status: unlockAllFallback || index === 0 ? 'unlocked' : 'locked',
    bestScore: 0,
  }));
};

export const getLevelTemplate = (levelId: string) => defaultLevelMap.get(levelId);

export default resolveLevels;
