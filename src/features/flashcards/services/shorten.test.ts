import { shortenAnswer } from './shorten';

it('takes the labelled answer line from a math answer', () => {
  const answer = '1. Given: 2x + 5 = 17\n2. Steps: subtract 5, divide by 2\n3. **Answer:** x = 6\n4. Check: 2(6) + 5 = 17';
  expect(shortenAnswer(answer)).toEqual({ text: 'x = 6', shortened: true });
});

it('takes the short answer from a science answer', () => {
  const answer = 'Short answer: Plants use sunlight to make their own food.\n\nExplanation: chlorophyll…';
  expect(shortenAnswer(answer).text).toBe('Plants use sunlight to make their own food.');
});

it('keeps a short plain answer as is', () => {
  expect(shortenAnswer('Ang pang-uri ay salitang naglalarawan.')).toEqual({
    text: 'Ang pang-uri ay salitang naglalarawan.',
    shortened: false,
  });
});

it('cuts a long first paragraph at a sentence end', () => {
  const long = `${'This is a sentence about photosynthesis. '.repeat(8)}`;
  const { text, shortened } = shortenAnswer(long);
  expect(shortened).toBe(true);
  expect(text.length).toBeLessThanOrEqual(200);
  expect(text.endsWith('.')).toBe(true);
});

it('keeps math symbols that look like markdown', () => {
  expect(shortenAnswer('**Answer:** 2*3 = 6, so x_1 = 6').text).toBe('2*3 = 6, so x_1 = 6');
});
