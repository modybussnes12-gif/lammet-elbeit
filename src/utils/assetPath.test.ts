import test from 'node:test';
import assert from 'node:assert/strict';
import { appAsset, resolveAppPath } from './assetPath';

test('resolveAppPath keeps external, data, and blob URLs untouched', () => {
  assert.equal(resolveAppPath('https://cdn.example.com/a.jpg'), 'https://cdn.example.com/a.jpg');
  assert.equal(resolveAppPath('http://example.com/v.mp4'), 'http://example.com/v.mp4');
  assert.equal(resolveAppPath('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');
  assert.equal(resolveAppPath('//cdn.example.com/x.js'), '//cdn.example.com/x.js');
});

test('resolveAppPath normalizes local paths against root and subpath bases', () => {
  assert.equal(
    appAsset('/src/assets/images/hero.jpg', '/'),
    '/src/assets/images/hero.jpg'
  );
  assert.equal(
    appAsset('src/assets/images/hero.jpg', '/'),
    '/src/assets/images/hero.jpg'
  );
  assert.equal(
    appAsset('public/downloads/lammet-elbeit-source.zip', '/lammet/'),
    '/lammet/downloads/lammet-elbeit-source.zip'
  );
  assert.equal(
    appAsset('./tizen/config.xml', './'),
    './tizen/config.xml'
  );
});
