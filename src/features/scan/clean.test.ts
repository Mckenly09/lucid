import { cleanScan } from './clean';

describe('cleanScan', () => {
  it('joins broken lines and removes the number', () => {
    expect(cleanScan('3. A car travels 120 km in 2 hours. What is its\naverage speed in km/h?')).toEqual({
      text: 'A car travels 120 km in 2 hours. What is its average speed in km/h?',
      note: 'Removed the number "3." from the start',
    });
  });

  it.each(['a) ', '12) ', '(iv) ', 'iv. ', 'B. ', '(2) '])('removes leading %j', (n) => {
    expect(cleanScan(`${n}Ano ang pang-uri?`).text).toBe('Ano ang pang-uri?');
  });

  it('keeps numbers that are part of the question', () => {
    expect(cleanScan('3.5 m/s is how many km/h?')).toEqual({
      text: '3.5 m/s is how many km/h?',
    });
    expect(cleanScan('2x + 5 = 17')).toEqual({ text: '2x + 5 = 17' });
  });

  it('does not empty a line that is only a number', () => {
    expect(cleanScan('3. ').text).toBe('3.');
  });

  it('fixes double spaces and keeps math symbols', () => {
    expect(cleanScan('Solve  x² −  4 = 0  when x ≥ 0;   √9 = ?  ½ × π').text).toBe(
      'Solve x² − 4 = 0 when x ≥ 0; √9 = ? ½ × π',
    );
  });

  it('joins a word split with a hyphen, but not a real hyphen', () => {
    expect(cleanScan('What is the veloc-\nity of light?').text).toBe('What is the velocity of light?');
    expect(cleanScan('What is Covid-\n19?').text).toBe('What is Covid-19?');
    expect(cleanScan('Ano ang pang-\nuri sa pangungusap?').text).toBe('Ano ang pang-uri sa pangungusap?');
  });

  it('keeps multiple-choice options on their own lines', () => {
    expect(cleanScan('1. What is 2 + 2?\na) 3\nb) 4\nc) 5').text).toBe('What is 2 + 2?\na) 3\nb) 4\nc) 5');
  });

  it('drops blank lines and returns empty text for nothing', () => {
    expect(cleanScan('  \n\n ')).toEqual({ text: '' });
    expect(cleanScan('Line one\n\nline two').text).toBe('Line one line two');
  });
});
