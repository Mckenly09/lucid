import { parseMarkdown } from './markdown.ts';

it('turns a note file into sections of plain text', () => {
  const md = `<!-- Reviewer: check the examples. -->
# Subject-Verb Agreement

A verb must **agree** with its subject.

## Singular and plural
A singular subject takes a singular verb:
*The dog barks.*

- Use *is* with one person or thing.
- Use *are* with two or more.

## Tricky subjects
See [the guide](https://example.com) for more.
1. Find the subject.
2. Check its number.
`;
  expect(parseMarkdown('eng7-subject-verb', md)).toEqual({
    id: 'eng7-subject-verb',
    title: 'Subject-Verb Agreement',
    sections: [
      { title: 'Subject-Verb Agreement', paragraphs: ['A verb must agree with its subject.'] },
      {
        title: 'Singular and plural',
        paragraphs: ['A singular subject takes a singular verb: The dog barks.', '- Use is with one person or thing.', '- Use are with two or more.'],
      },
      { title: 'Tricky subjects', paragraphs: ['See the guide for more.', '1. Find the subject.', '2. Check its number.'] },
    ],
  });
});

it('keeps math-like underscores and lone asterisks', () => {
  expect(parseMarkdown('x', '# T\n\nsnake_case_name and 2 * 3').sections[0].paragraphs).toEqual(['snake_case_name and 2 * 3']);
});
