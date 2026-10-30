import { supportedBySource } from './check';

const q = (question: string, answer: string) => ({ question, choices: [answer, 'x', 'y', 'z'], correct: 0, why: '' });

const BIO =
  'Different forms of the same gene are called alleles. In incomplete dominance, a red and a white flower ' +
  'produce pink flowers. Human body cells have 46 chromosomes, in 23 pairs.';

describe('supportedBySource', () => {
  it('keeps answers whose words are in the source, allowing plural and -ing forms', () => {
    expect(supportedBySource(q('Different forms of a gene are…', 'Alleles'), BIO)).toBe(true);
    expect(supportedBySource(q('Red × white in incomplete dominance gives…', 'Pink flowers'), BIO)).toBe(true);
  });

  it('rejects an answer the source never mentions', () => {
    expect(supportedBySource(q('What carries genes?', 'Ribosomes'), BIO)).toBe(false);
    expect(supportedBySource(q('Who found genes?', 'Gregor Mendel'), BIO)).toBe(false);
  });

  it('needs numbers in the answer to be in the source', () => {
    expect(supportedBySource(q('How many chromosomes in a body cell?', '46 (23 pairs)'), BIO)).toBe(true);
    expect(supportedBySource(q('How many chromosomes in a body cell?', '48'), BIO)).toBe(false);
  });

  it('accepts a computed answer that mathjs confirms, and rejects wrong arithmetic', () => {
    const algebra = 'To multiply, line up the numbers. Speed is distance divided by time.';
    expect(supportedBySource(q('What is 120 / 2?', '60'), algebra)).toBe(true);
    expect(supportedBySource(q('What is 120 / 2?', '50'), algebra)).toBe(false);
    // Wrong arithmetic is rejected even when the number happens to be in the source.
    expect(supportedBySource(q('What is 12 × 4?', '46'), BIO)).toBe(false);
  });

  it('works for Filipino and ignores filler words', () => {
    const fil = 'Ang pang-uri ay salitang naglalarawan sa pangngalan.';
    expect(supportedBySource(q('Ano ang pang-uri?', 'Salitang naglalarawan'), fil)).toBe(true);
    expect(supportedBySource(q('Ano ang pandiwa?', 'Salitang kilos'), fil)).toBe(false);
  });

  it('matches whole words, not pieces of longer ones', () => {
    const chem = 'Solutions are mixtures. Salt is not an element and is well known.';
    expect(supportedBySource(q('What carries a charge?', 'Ions'), chem)).toBe(false);
    expect(supportedBySource(q('Is salt an element?', 'No'), chem)).toBe(false);
    expect(supportedBySource(q('What are mixtures?', 'Solutions'), chem)).toBe(true);
    expect(supportedBySource(q('Charged atom?', 'Ions'), 'An ion is a charged atom.')).toBe(true);
  });

  it('handles a short answer with no real words', () => {
    expect(supportedBySource(q('Is it true?', 'Oo'), 'Oo, tama.')).toBe(true);
  });
});
