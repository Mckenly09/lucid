import { detectSubject, isFilipino } from './detect';

describe('detectSubject', () => {
  it.each([
    ['1 + 1', 'math'],
    ['Solve 2x + 5 = 17', 'math'],
    ['What is the area of a circle with r = 7 cm?', 'math'],
    ['Why do plants need sunlight?', 'science'],
    ['Explain photosynthesis', 'science'],
    ["Newton's second law example", 'science'],
    ['Causes of the Philippine Revolution', 'social'],
    ['Who was Jose Rizal?', 'social'],
    ['Simple past vs present perfect', 'english'],
    ['Is this sentence correct: She go to school', 'english'],
    ['Ano ang pang-uri?', 'filipino'],
    ['Magbigay ng halimbawa ng tayutay', 'filipino'],
    ['How do I study better for exams?', 'general'],
  ])('%s → %s', (q, expected) => {
    expect(detectSubject(q)).toBe(expected);
  });

  it('prefers the topic over the language: a science question asked in Filipino', () => {
    expect(detectSubject('Ano ang photosynthesis?')).toBe('science');
  });

  it('matches whole words only', () => {
    expect(detectSubject('cancellation policy')).toBe('general'); // contains "cell"
    expect(detectSubject('meaning of life')).toBe('general'); // contains "mean"
  });
});

describe('isFilipino', () => {
  it('spots a Filipino answer', () => {
    expect(isFilipino('Ang pang-uri ay salitang naglalarawan sa pangngalan.')).toBe(true);
  });

  it('keeps English answers (with a Filipino word or two) as English', () => {
    expect(isFilipino('Plants use sunlight to make food. In Filipino, the sun is araw.')).toBe(false);
    expect(isFilipino('')).toBe(false);
  });
});
