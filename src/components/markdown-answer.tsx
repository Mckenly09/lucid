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
  paragraph: (node, children) => <Text key={node.key}>{children}</Text>,
  heading1: heading,
  heading2: heading,
  heading3: heading,
  heading4: heading,
  text: (node) => <RNText key={node.key}>{node.content}</RNText>,
  textgroup: (node, children) => <RNText key={node.key}>{children}</RNText>,
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
        <View className="flex-1 gap-2">{children}</View>
      </View>
    );
  },
  blockquote: (node, children) => (
    <View key={node.key} className="border-l-2 border-ink/20 pl-3">
      {children}
    </View>
  ),
  hr: (node) => <View key={node.key} className="h-px bg-ink/10" />,
};

function heading(node: ASTNode, children: React.ReactNode[]) {
  return (
    <Text key={node.key} variant="label" className="mt-2">
      {children}
    </Text>
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
