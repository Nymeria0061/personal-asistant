/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chooseVoice, displayName, guessGender, type VoiceInfo } from '../src/lib/voices.ts';

const v = (identifier: string, name: string, language = 'tr-TR', quality = 'Default'): VoiceInfo => ({ identifier, name, language, quality });

const ios = [
  v('com.apple.voice.compact.tr-TR.Yelda', 'Yelda'),
  v('com.apple.voice.enhanced.tr-TR.Cem', 'Cem', 'tr-TR', 'Enhanced'),
  v('com.apple.voice.compact.en-US.Samantha', 'Samantha', 'en-US'),
];
const android = [v('tr-tr-x-cfs-local', 'tr-tr-x-cfs-local', 'tr-TR'), v('tr-tr-x-mfm-local', 'tr-tr-x-mfm-local', 'tr-TR')];

test('guessGender: bilinen adlar', () => {
  assert.equal(guessGender(ios[0]), 'female');
  assert.equal(guessGender(ios[1]), 'male');
  assert.equal(guessGender(v('Microsoft Emel Online (Natural)', 'Microsoft Emel Online (Natural) - Turkish (Turkey)')), 'female');
  assert.equal(guessGender(v('Microsoft Ahmet', 'Microsoft Ahmet - Turkish (Turkey)')), 'male');
  assert.equal(guessGender(v('x', 'tr-tr-x-female_1-local')), 'female');
  assert.equal(guessGender(android[0]), null);
});

test('chooseVoice: kadın / erkek / seçili ses', () => {
  assert.equal(chooseVoice(ios, 'female', null).identifier, ios[0].identifier);
  assert.equal(chooseVoice(ios, 'male', null).identifier, ios[1].identifier);
  assert.equal(chooseVoice(ios, 'female', ios[1].identifier).identifier, ios[1].identifier);
  assert.equal(chooseVoice(ios, 'auto', null).identifier, undefined);
});

test('chooseVoice: cinsiyeti bilinmeyen seslerde perdeyle yaklaşır', () => {
  const f = chooseVoice(android, 'female', null);
  const m = chooseVoice(android, 'male', null);
  assert.ok(f.pitch > 1 && m.pitch < 1);
});

test('displayName: kod gibi adlar numaralanır', () => {
  assert.equal(displayName(android[0], 0), 'Ses 1');
  assert.equal(displayName(ios[0], 0), 'Yelda');
  assert.equal(displayName(v('e', 'Microsoft Emel Online (Natural) - Turkish (Turkey)'), 0), 'Emel');
  assert.equal(displayName(v('g', 'Google Türkçe'), 0), 'Google Türkçe');
});
