import { parseCollection, parseModule } from './cnxml.ts';

const MODULE = `<document xmlns="http://cnx.rice.edu/cnxml" xmlns:m="http://www.w3.org/1998/Math/MathML">
<title>Phases and Classification of Matter</title>
<metadata xmlns:md="http://cnx.rice.edu/mdml"><md:abstract><para>By the end of this section</para></md:abstract></metadata>
<content>
<para id="p1"><term>Matter</term> is anything that has mass (<link target-id="fig1"/>). Water is H<sub>2</sub>O and sodium ion is Na<sup>+</sup>.</para>
<figure id="fig1"><media alt="a beaker"><image src="x.jpg"/></media><caption>Three states</caption></figure>
<note class="chemistry link-to-learning"><para>Visit this website.</para></note>
<section id="s1"><title>Mixtures</title>
<para>Kinds of mixtures:</para>
<list><item>homogeneous</item><item>heterogeneous</item></list>
<example><para><title>Example 1.1</title></para><para>Find density: <m:math><m:mrow><m:mi>d</m:mi><m:mo>=</m:mo><m:mfrac><m:mrow><m:mn>10</m:mn><m:mtext>g</m:mtext></m:mrow><m:mn>2</m:mn></m:mfrac></m:mrow></m:math> and <m:math><m:msup><m:mi>x</m:mi><m:mn>2</m:mn></m:msup></m:math> and <m:math><m:msqrt><m:mn>9</m:mn></m:msqrt></m:math>.</para></example>
</section>
<section class="exercises"><title>Chemistry End of Chapter Exercises</title><exercise><problem><para>Why?</para></problem></exercise></section>
<note class="os-teacher"><para>Teacher support: ask students.</para></note>
<note class="worked-example"><title>Falling rock</title><exercise><problem><para>A rock falls 20 m.</para></problem><solution><para>KE = 1960 J.</para></solution></exercise></note>
<note class="watch-physics"><para>Watch this video.</para></note>
<section class="multiple-choice"><title>Check</title><para>Pick one.</para></section>
</content>
</document>`;

it('turns a module into sections of plain text, dropping figures, links and exercises', () => {
  const m = parseModule('m1', MODULE);
  expect(m.title).toBe('Phases and Classification of Matter');
  expect(m.sections.map((s) => s.title)).toEqual(['Phases and Classification of Matter', 'Mixtures']);
  // A worked example's <exercise> is kept; a practice <exercise> ("Why?") is not.
  expect(m.sections[0].paragraphs).toEqual([
    'Matter is anything that has mass. Water is H2O and sodium ion is Na^+.',
    'Falling rock:',
    'A rock falls 20 m.',
    'KE = 1960 J.',
  ]);
  expect(m.sections[1].paragraphs).toEqual([
    'Kinds of mixtures:',
    '- homogeneous',
    '- heterogeneous',
    'Example 1.1',
    'Find density: d = 10g/2 and x^2 and sqrt(9).',
  ]);
  expect(JSON.stringify(m)).not.toMatch(/beaker|Three states|Visit this website|Why\?|By the end|Teacher support|video|Pick one/);
});

it('reads chapters, module order and the declared license from a collection', () => {
  const col = parseCollection(`<col:collection xmlns:col="http://cnx.rice.edu/collxml" xmlns:md="http://cnx.rice.edu/mdml">
<metadata><md:title>Chemistry 2e</md:title><md:license url="http://creativecommons.org/licenses/by-nc-sa/4.0/">CC</md:license></metadata>
<col:content><col:module document="m0"/>
<col:subcollection><md:title>Essential Ideas</md:title><col:content><col:module document="m1"/><col:module document="m2"/></col:content></col:subcollection>
<col:subcollection><md:title>Unit 2</md:title><col:content><col:subcollection><md:title>Gases</md:title><col:content><col:module document="m3"/></col:content></col:subcollection></col:content></col:subcollection>
</col:content></col:collection>`);
  expect(col.title).toBe('Chemistry 2e');
  expect(col.licenseUrl).toBe('http://creativecommons.org/licenses/by-nc-sa/4.0/');
  expect(col.chapters).toEqual([
    { title: 'Essential Ideas', modules: ['m1', 'm2'] },
    { title: 'Gases', modules: ['m3'] },
  ]);
});

it('reads pretty-printed MathML (whitespace between elements)', () => {
  const xml = `<document xmlns:m="http://www.w3.org/1998/Math/MathML"><title>Energy</title><content><para>
<m:math>
  <m:mrow>
    <m:mi>K</m:mi><m:msub> <m:mi>E</m:mi> <m:mn>1</m:mn> </m:msub>
    <m:mo>=</m:mo>
    <m:mfrac> <m:mn>1</m:mn> <m:mn>2</m:mn> </m:mfrac>
    <m:mi>m</m:mi><m:msup> <m:mi>v</m:mi> <m:mn>2</m:mn> </m:msup>
  </m:mrow>
</m:math></para></content></document>`;
  const text = parseModule('m', xml).sections[0].paragraphs[0];
  expect(text.replace(/\s+/g, ' ')).toBe('KE1 = 1/2mv^2');
});
