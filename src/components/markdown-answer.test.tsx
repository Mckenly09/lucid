import { render } from '@testing-library/react-native';

import { MarkdownAnswer } from './markdown-answer';

/** Every className around `text`, joined. */
const boxOf = async (content: string, text: string) => {
  let node = (await render(<MarkdownAnswer content={content} />)).getByText(text, { exact: false }).parent;
  const classes: string[] = [];
  for (; node; node = node.parent) classes.push(String(node.props.className ?? ''));
  return classes.join(' ');
};

it('highlights the answer in a paragraph', async () => {
  const content = 'Add the equations.\n\n**Final answer:** x = 3, y = 1';
  expect(await boxOf(content, 'x = 3, y = 1')).toContain('bg-primary/10');
  expect(await boxOf(content, 'Add the equations.')).not.toContain('bg-primary/10');
});

it('highlights the answer step in a numbered list', async () => {
  const content = '1. Steps: 3x = 9\n2. Answer: x = 3';
  expect(await boxOf(content, 'Answer: x = 3')).toContain('bg-primary/10');
  expect(await boxOf(content, 'Steps: 3x = 9')).not.toContain('bg-primary/10');
});
