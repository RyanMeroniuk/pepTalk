import { Platform, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

const markdownStyles = StyleSheet.create({
  body: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 22,
  },
  heading1: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  heading2: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  heading3: {
    color: '#eee',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 2,
  },
  strong: {
    color: '#fff',
    fontWeight: '700',
  },
  em: {
    fontStyle: 'italic',
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 6,
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
    color: '#888',
    fontSize: 8,
    marginTop: 7,
    marginRight: 8,
  },
  ordered_list_icon: {
    color: '#888',
    fontSize: 14,
    marginRight: 8,
  },
  code_inline: {
    backgroundColor: '#2a2a2a',
    color: '#7dd3fc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  fence: {
    backgroundColor: '#151515',
    color: '#7dd3fc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  code_block: {
    backgroundColor: '#151515',
    color: '#7dd3fc',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    padding: 10,
    borderRadius: 8,
    marginVertical: 6,
  },
  hr: {
    backgroundColor: '#333',
    height: 1,
    marginVertical: 8,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: '#444',
    paddingLeft: 10,
    marginVertical: 4,
  },
  link: {
    color: '#60a5fa',
  },
});

export default function MarkdownBubble({ children }) {
  return (
    <Markdown style={markdownStyles} mergeStyle>
      {children}
    </Markdown>
  );
}
