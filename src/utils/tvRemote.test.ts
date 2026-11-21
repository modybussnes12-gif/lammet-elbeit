import test from 'node:test';
import assert from 'node:assert/strict';
import { mapRemoteKey } from './tvRemote';
import {
  groupMemoriesByYear,
  isKidsLimitReached,
  pickNightRecommendations,
  worldForContentType,
} from './library';
import type { GroupedWork, MediaItem, ProfileState } from '../types/media';

test('mapRemoteKey handles Samsung Tizen Return (10009), Media keys, and Color keys', () => {
  assert.equal(mapRemoteKey(10009, 'Unidentified'), 'back');
  assert.equal(mapRemoteKey(10252, 'MediaPlayPause'), 'playPause');
  assert.equal(mapRemoteKey(415, ''), 'play');
  assert.equal(mapRemoteKey(19, ''), 'pause');
  assert.equal(mapRemoteKey(417, ''), 'ff');
  assert.equal(mapRemoteKey(412, ''), 'rw');
  assert.equal(mapRemoteKey(403, ''), 'red');
  assert.equal(mapRemoteKey(406, ''), 'blue');
  assert.equal(mapRemoteKey(13, 'Enter'), 'select');
  assert.equal(mapRemoteKey(37, 'ArrowLeft'), 'left');
});

test('worldForContentType maps types to the 4 clean family worlds', () => {
  assert.equal(worldForContentType('movie'), 'screen');
  assert.equal(worldForContentType('series'), 'screen');
  assert.equal(worldForContentType('video'), 'screen');
  assert.equal(worldForContentType('story'), 'stories');
  assert.equal(worldForContentType('memory'), 'memories');
  assert.equal(worldForContentType('audio'), 'audio');
});

test('pickNightRecommendations and groupMemoriesByYear return deterministic curated outputs', () => {
  const mkWork = (id: string, overrides: Partial<MediaItem>): GroupedWork => {
    const rep: MediaItem = {
      id,
      title: id,
      story: 'لمة البيت',
      contentType: 'movie',
      category: 'أفلام عائلية',
      description: 'وصف',
      sourceType: 'demo',
      published: true,
      createdAt: 1000,
      updatedAt: 2000,
      ...overrides,
    };
    return {
      key: id,
      isSeriesGroup: false,
      representative: rep,
      displayTitle: rep.title,
      posterUrl: '',
      backdropUrl: '',
      seasonsCount: 1,
      episodesCount: 1,
      episodes: [rep],
    };
  };

  const works = [
    mkWork('kids-anim', { ageRating: 'kids', category: 'رسوم متحركة', durationSeconds: 900 }),
    mkWork('adults-drama', { ageRating: 'adults', category: 'دراما', durationSeconds: 5400 }),
    mkWork('doc-space', { contentType: 'video', category: 'وثائقيات', durationSeconds: 1800 }),
  ];

  const kidsPicks = pickNightRecommendations(works, 'kids', 30);
  assert.equal(kidsPicks[0].key, 'kids-anim');
  assert.ok(!kidsPicks.some((w) => w.key === 'adults-drama'));

  const memories = [
    mkWork('m-2023', { contentType: 'memory', releaseYear: '2023' }),
    mkWork('m-2025', { contentType: 'memory', releaseYear: '2025' }),
  ];
  const timeline = groupMemoriesByYear(memories);
  assert.deepEqual(
    timeline.map((t) => t.year),
    ['2025', '2023']
  );
});

test('isKidsLimitReached checks active day usage against configured limit', () => {
  const state: ProfileState = {
    favorites: [],
    watchLater: [],
    progress: {},
    playCounts: {},
    searchHistory: [],
    kidsMinutesUsedToday: 45,
    kidsUsageDate: '2026-11-20',
  };
  assert.equal(isKidsLimitReached(state, 45, '2026-11-20'), true);
  assert.equal(isKidsLimitReached(state, 60, '2026-11-20'), false);
  assert.equal(isKidsLimitReached(state, 45, '2026-11-21'), false);
});
