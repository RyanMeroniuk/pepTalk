// Light-theme markdown renderer for AI answers. The backend streams real
// markdown, so rendering it (vs flattening to plain text) preserves headings,
// bold, and bullet structure — matching the design's rich answer body.

import { Platform, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { COLORS } from '../theme/tokens';

const markdownStyles = StyleSheet.create({
  body: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  heading1: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  heading2: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
  },
  heading3: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  strong: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 8,
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    marginVertical: 2,
  },
  bullet_list_icon: {
    color: COLORS.textTertiary,
    fontSize: 8,
    marginTop: 8,
    marginRight: 10,
  },
  ordered_list_icon: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginRight: 8,
  },
  code_inline: {
    backgroundColor: COLORS.panel,
    color: COLORS.blueDeep,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  fence: {
    backgroundColor: COLORS.panel,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  code_block: {
    backgroundColor: COLORS.panel,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  hr: {
    backgroundColor: COLORS.hairline,
    height: 1,
    marginVertical: 8,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.hairline,
    paddingLeft: 10,
    marginVertical: 4,
  },
  link: {
    color: COLORS.bluePrimary,
  },
});

export default function MarkdownBubble({ children }) {
  return (
    <Markdown style={markdownStyles} mergeStyle>
      {children}
    </Markdown>
  );
}
