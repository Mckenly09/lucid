import { parseHtml } from './html.ts';

const page = `<html><head><title>Layers of the Atmosphere | NOAA</title><script>var x = "<p>no</p>";</script></head><body>
<header class="site-header"><nav><ul><li>Home<li>Weather</ul></nav></header>
<div class="not-navigation"><main>
  <h1>Layers of the Atmosphere</h1>
  <div class="breadcrumbs">Home &gt; JetStream</div>
  <p>The atmosphere is divided into five layers based on temperature.</p>
  <figure><img src="a.png"><figcaption>Diagram of the layers of the atmosphere.</figcaption></figure>
  <h2>Troposphere</h2>
  <p>This is the lowest layer, where nearly all weather occurs.</p>
  <ul><li>It holds about 75&nbsp;% of the air.<li>Temperature drops with height.</ul>
  <table><tr><th>Intensity</th><th>Description</th></tr><tr><td>I</td><td><ul><li>Scarcely felt.</li><li>Objects sway.</li></ul></td></tr></table>
  <div class="share-buttons">Share this page on social media sites now</div>
</main></div>
<footer>U.S. Department of Commerce</footer></body></html>`;

it('keeps the article as sections and drops menus, figures, scripts and share bars', () => {
  expect(parseHtml('p', page)).toEqual({
    id: 'p',
    title: 'Layers of the Atmosphere',
    sections: [
      { title: 'Layers of the Atmosphere', paragraphs: ['The atmosphere is divided into five layers based on temperature.'] },
      {
        title: 'Troposphere',
        paragraphs: [
          'This is the lowest layer, where nearly all weather occurs.',
          '- It holds about 75 % of the air.',
          '- Temperature drops with height.',
          'I; Scarcely felt. Objects sway.',
        ],
      },
    ],
  });
});

it('trims with start/end markers, even inside a block, and takes a title override', () => {
  const html = `<title>PAGASA</title><body><p>Contents: Formation Effects Volcanoes destroy and volcanoes create.</p>
<p>Ash and lava build new land over many years.</p><p>Related Resources for Educators and more links</p></body>`;
  const m = parseHtml('p', html, { title: 'Volcanoes', start: 'Volcanoes destroy', end: 'Related Resources' });
  expect(m.title).toBe('Volcanoes');
  expect(m.sections[0].paragraphs).toEqual(['Volcanoes destroy and volcanoes create.', 'Ash and lava build new land over many years.']);
  expect(() => parseHtml('p', html, { end: 'missing words' })).toThrow('end marker not found');
});
