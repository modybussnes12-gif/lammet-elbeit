import test from 'node:test';
import assert from 'node:assert/strict';
import { fromLegacyEpisode, toLegacyEpisode } from './episodeAdapter';

test('fromLegacyEpisode maps legacy photo/event types, upload sourceAliases, and Firestore Timestamp', () => {
  const item = fromLegacyEpisode('ep-1', {
    title: 'رحلة العيلة',
    seriesTitle: 'ذكريات 2020',
    contentType: 'photo',
    sourceType: 'image-upload',
    imageUrl: 'https://cdn.example.com/photo.jpg',
    mediaUrl: 'https://cdn.example.com/photo.jpg',
    eventDate: '2020-05-12',
    timelineStatus: 'تاريخ مؤكد',
    timelineOrder: 5,
    storagePath: 'memories/ep-1.jpg',
    published: true,
    createdAt: { toMillis: () => 1700000000000 },
  });

  assert.equal(item.id, 'ep-1');
  assert.equal(item.contentType, 'memory');
  assert.equal(item.sourceType, 'image-url');
  assert.equal(item.posterUrl, 'https://cdn.example.com/photo.jpg');
  assert.equal(item.story, 'ذكريات 2020');
  assert.equal(item.createdAt, 1700000000000);
  assert.equal(item.published, true);
});

test('toLegacyEpisode preserves unknown legacy fields, contentType, and inactive URLs', () => {
  const adapted = fromLegacyEpisode('ep-2', {
    title: 'قصة قديمة',
    contentType: 'event',
    sourceType: 'event',
    videoUrl: 'https://cdn.example.com/backup.mp4',
    posterUrl: 'https://cdn.example.com/poster.jpg',
    eventDate: '1998-01-01',
    timelineOrder: 12,
    customLegacyTag: 'keep-me',
    published: true,
    createdAt: 1600000000000,
  });

  const back = toLegacyEpisode({
    ...adapted,
    title: 'قصة قديمة محدثة',
  });

  assert.equal(back.contentType, 'event');
  assert.equal(back.sourceType, 'event');
  assert.equal(back.videoUrl, 'https://cdn.example.com/backup.mp4');
  assert.equal(back.eventDate, '1998-01-01');
  assert.equal(back.customLegacyTag, 'keep-me');
  assert.equal(back.title, 'قصة قديمة محدثة');
});

test('toLegacyEpisode maps demo sourceType to reading for legacy compatibility', () => {
  const out = toLegacyEpisode({
    id: 'new-1',
    title: 'حكاية',
    story: 'لمة البيت',
    contentType: 'story',
    category: 'قصص الصالحين',
    description: 'وصف',
    sourceType: 'demo',
    published: true,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  });
  assert.equal(out.sourceType, 'reading');
});
