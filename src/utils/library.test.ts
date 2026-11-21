import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYoutubeId,
  filterLibraryItems,
  formatDuration,
  groupLibraryItems,
  normalizeArabicText,
  resolveExternalPlayback,
  safeExternalUrl,
  safeHttpsUrl,
} from './library';
import type { MediaItem } from '../types/media';

const makeItem = (overrides: Partial<MediaItem>): MediaItem => ({
  id: 'id-1',
  title: 'عنوان تجريبي',
  story: 'لمة البيت',
  contentType: 'movie',
  category: 'أفلام عائلية',
  description: 'وصف تجريبي للعمل',
  sourceType: 'demo',
  published: true,
  createdAt: 1000,
  updatedAt: 2000,
  ...overrides,
});

test('groupLibraryItems collapses episodes of the same series into one grouped work', () => {
  const items: MediaItem[] = [
    makeItem({
      id: 'ep-2',
      title: 'البداية الصعبة',
      story: 'حكايات الصحراء',
      contentType: 'series',
      seasonNumber: 1,
      episodeNumber: 2,
      updatedAt: 3000,
    }),
    makeItem({
      id: 'ep-1',
      title: 'الانطلاق',
      story: 'حكايات الصحراء',
      contentType: 'series',
      seasonNumber: 1,
      episodeNumber: 1,
      updatedAt: 2500,
    }),
    makeItem({
      id: 'ep-3',
      title: 'فجر جديد',
      story: 'حكايات الصحراء',
      contentType: 'series',
      seasonNumber: 2,
      episodeNumber: 1,
      updatedAt: 4000,
    }),
    makeItem({
      id: 'mov-1',
      title: 'رحلة النيل',
      contentType: 'movie',
      updatedAt: 1000,
    }),
  ];

  const grouped = groupLibraryItems(items);
  assert.equal(grouped.length, 2);
  const series = grouped[0];
  assert.equal(series.isSeriesGroup, true);
  assert.equal(series.displayTitle, 'حكايات الصحراء');
  assert.equal(series.seasonsCount, 2);
  assert.equal(series.episodesCount, 3);
  assert.deepEqual(
    series.episodes.map((e) => e.id),
    ['ep-1', 'ep-2', 'ep-3']
  );
});

test('filterLibraryItems handles Arabic normalization, kids profile, and published state', () => {
  const items: MediaItem[] = [
    makeItem({
      id: '1',
      title: 'أبطال الأرض',
      category: 'رسوم متحركة',
      ageRating: 'kids',
      published: true,
    }),
    makeItem({
      id: '2',
      title: 'ليلة الغموض',
      category: 'دراما',
      ageRating: 'adults',
      published: true,
    }),
    makeItem({
      id: '3',
      title: 'مسودة قيد التجهيز',
      category: 'أفلام عائلية',
      published: false,
    }),
  ];

  const kidsVisible = filterLibraryItems(items, {
    onlyPublished: true,
    profileId: 'kids',
  });
  assert.deepEqual(
    kidsVisible.map((x) => x.id),
    ['1']
  );

  const searchMatches = filterLibraryItems(items, {
    onlyPublished: true,
    profileId: 'family',
    query: 'ابطال الارض',
  });
  assert.deepEqual(
    searchMatches.map((x) => x.id),
    ['1']
  );
});

test('URL and YouTube extraction safely allow HTTPS/local assets and reject unsafe protocols', () => {
  assert.equal(safeHttpsUrl('javascript:alert(1)'), '');
  assert.equal(safeHttpsUrl('http://example.com/movie.mp4'), '');
  assert.equal(safeHttpsUrl('https://cdn.example.com/movie.mp4'), 'https://cdn.example.com/movie.mp4');
  assert.equal(safeHttpsUrl('/src/assets/images/test.jpg'), '/src/assets/images/test.jpg');
  assert.equal(extractYoutubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYoutubeId('https://www.youtube.com/watch?v=M7lc1UVf-VE'), 'M7lc1UVf-VE');
});

test('formatDuration and normalizeArabicText format cleanly', () => {
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(3665), '1:01:05');
  assert.equal(normalizeArabicText('إسلاميةُ القِصّة'), 'اسلاميه القصه');
});

test('safeExternalUrl and resolveExternalPlayback handle any non-YouTube link smoothly', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), '');
  assert.equal(safeExternalUrl('http://media.example.com/film.mp4'), 'http://media.example.com/film.mp4');
  assert.equal(safeExternalUrl('vimeo.com/76979871'), 'https://vimeo.com/76979871');

  const drive = resolveExternalPlayback('https://drive.google.com/file/d/1AbC_dEfG/view?usp=sharing');
  assert.equal(drive.mode, 'embed');
  assert.equal(drive.playUrl, 'https://drive.google.com/file/d/1AbC_dEfG/preview');
  assert.equal(drive.providerLabel, 'Google Drive');

  const vimeo = resolveExternalPlayback('https://vimeo.com/76979871');
  assert.equal(vimeo.mode, 'embed');
  assert.equal(vimeo.playUrl, 'https://player.vimeo.com/video/76979871?autoplay=1');

  const mp4 = resolveExternalPlayback('https://cdn.example.com/video.mp4?token=123');
  assert.equal(mp4.mode, 'native');
  assert.equal(mp4.playUrl, 'https://cdn.example.com/video.mp4?token=123');

  const web = resolveExternalPlayback('https://archive.org/details/sample-movie');
  assert.equal(web.mode, 'embed');
  assert.equal(web.playUrl, 'https://archive.org/embed/sample-movie');

  const genericSite = resolveExternalPlayback('https://example.org/watch/episode-1');
  assert.equal(genericSite.mode, 'embed');
  assert.equal(genericSite.playUrl, 'https://example.org/watch/episode-1');
  assert.equal(genericSite.openUrl, 'https://example.org/watch/episode-1');
});
