import { checkLicense, licenseFromText, licenseFromUrl } from './license.ts';

it('reads CC licenses from a LICENSE file and a license URL', () => {
  expect(licenseFromText('Attribution-NonCommercial-ShareAlike 4.0 International\n\n===')).toBe('CC BY-NC-SA 4.0');
  expect(licenseFromText('Attribution 4.0 International\n')).toBe('CC BY 4.0');
  expect(licenseFromText('MIT License\n\nCopyright')).toBeNull();
  expect(licenseFromUrl('http://creativecommons.org/licenses/by-nc-sa/4.0/')).toBe('CC BY-NC-SA 4.0');
  expect(licenseFromUrl('https://creativecommons.org/licenses/by/4.0/')).toBe('CC BY 4.0');
});

const ok = { declared: 'CC BY-NC-SA 4.0', commercial: false, evalOnly: false };

it('passes when every place the source states its license agrees with sources.json', () => {
  expect(() => checkLicense({ ...ok, found: ['CC BY-NC-SA 4.0', 'CC BY-NC-SA 4.0'] })).not.toThrow();
});

it('stops on a mismatch, an unreadable license, or a NonCommercial license in a commercial app', () => {
  expect(() => checkLicense({ ...ok, found: ['CC BY 4.0'] })).toThrow(/mismatch/);
  expect(() => checkLicense({ ...ok, found: [null] })).toThrow(/known license/);
  expect(() => checkLicense({ ...ok, commercial: true, found: ['CC BY-NC-SA 4.0'] })).toThrow(/APP_COMMERCIAL/);
  expect(() => checkLicense({ ...ok, declared: 'CC BY 4.0', commercial: true, found: ['CC BY 4.0'] })).not.toThrow();
});

it('never ships eval-only sources', () => {
  expect(() => checkLicense({ ...ok, evalOnly: true, found: ['CC BY-NC-SA 4.0'] })).toThrow(/eval-only/);
});
