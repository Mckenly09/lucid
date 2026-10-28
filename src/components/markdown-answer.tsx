import Markdown, { type ASTNode, type RenderRules } from 'react-native-markdown-display';
import { Text as RNText, View } from 'react-native';

import { Text } from '@/components/text';

// Render through our own Text/View so answers use tokens (the library's default styles are hard-coded black).
const rules: RenderRules = {
  body: (node, children) => (
    <View key={node.key} className="gap-2">
      {children}
    </View>
  ),
  // A list item handles its own highlight, so a loose list's paragraph isn't boxed twice.
  paragraph: (node, children, parents) =>
    isAnswer(node) && !parents.some((p) => p.type === 'list_item') ? (
      <View key={node.key} className={ANSWER_BOX}>
        <Text className="font-semibold">{children}</Text>
      </View>
    ) : (
      <Text key={node.key}>{children}</Text>
    ),
  heading1: heading,
  heading2: heading,
  heading3: heading,
  heading4: heading,
  heading5: heading,
  heading6: heading,
  text: (node) => <RNText key={node.key}>{node.content}</RNText>,
  // Inside a paragraph or heading the group inherits; elsewhere (tight lists, table cells) it must carry the ink color itself.
  textgroup: (node, children, parents) =>
    parents.some((p) => p.type === 'paragraph' || p.type.startsWith('heading')) ? (
      <RNText key={node.key}>{children}</RNText>
    ) : (
      <Text key={node.key}>{children}</Text>
    ),
  link: (node, children) => (
    <RNText key={node.key} className="underline">
      {children}
    </RNText>
  ),
  strong: (node, children) => (
    <RNText key={node.key} className="font-bold">
      {children}
    </RNText>
  ),
  em: (node, children) => (
    <RNText key={node.key} className="italic">
      {children}
    </RNText>
  ),
  code_inline: (node) => (
    <RNText key={node.key} className="font-mono">
      {node.content}
    </RNText>
  ),
  code_block: code,
  fence: code,
  bullet_list: list,
  ordered_list: list,
  list_item: (node, children, parents) => {
    const ordered = parents.some((p) => p.type === 'ordered_list');
    return (
      <View key={node.key} className="flex-row gap-2">
        <Text tone="muted">{ordered ? `${node.index + 1}.` : '•'}</Text>
        <View className={`flex-1 gap-2 ${isAnswer(node) ? ANSWER_BOX : ''}`}>{children}</View>
      </View>
    );
  },
  blockquote: (node, children) => (
    <View key={node.key} className="border-l-2 border-ink/20 pl-3">
      {children}
    </View>
  ),
  hr: (node) => <View key={node.key} className="h-px bg-ink/10" />,
  table: (node, children) => (
    <View key={node.key} className="rounded-sm border border-ink/10">
      {children}
    </View>
  ),
  thead: (node, children) => (
    <View key={node.key} className="bg-ink/5">
      {children}
    </View>
  ),
  tr: (node, children) => (
    <View key={node.key} className="flex-row border-b border-ink/10">
      {children}
    </View>
  ),
  // Cell text arrives as a textgroup (ink Text), so cells are plain boxes; the header row is set apart by thead's tint.
  th: cell,
  td: cell,
};

/** "Answer:", "Final answer:", "Sagot:" or the solver's "Calculator check:" starts the block that gets highlighted. */
const ANSWER_START = /^\s*(?:final answer|answer|sagot|calculator check)\s*:/i;
const ANSWER_BOX = 'rounded-md border border-primary/30 bg-primary/10 px-3 py-2';

const plainText = (node: ASTNode): string => node.content || node.children.map(plainText).join('');
const isAnswer = (node: ASTNode) => ANSWER_START.test(plainText(node));

function heading(node: ASTNode, children: React.ReactNode[]) {
  return (
    <Text key={node.key} variant="label" className="mt-2">
      {children}
    </Text>
  );
}

function cell(node: ASTNode, children: React.ReactNode[]) {
  return (
    <View key={node.key} className="flex-1 p-2">
      {children}
    </View>
  );
}

function code(node: ASTNode) {
  return (
    <View key={node.key} className="rounded-sm bg-ink/5 px-3 py-2">
      <Text variant="mono">{node.content.trimEnd()}</Text>
    </View>
  );
}

function list(node: ASTNode, children: React.ReactNode[]) {
  return (
    <View key={node.key} className="gap-2">
      {children}
    </View>
  );
}

export function MarkdownAnswer({ content }: { content: string }) {
  return <Markdown rules={rules}>{content}</Markdown>;
}
