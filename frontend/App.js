import { useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MarkdownBubble from './components/MarkdownBubble';

// Point at your backend — use your Mac's local IP so your phone can reach it
// To find your IP: run `ipconfig getifaddr en0` in terminal
const API_URL = 'http://10.0.0.239:8000';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const sendPrompt = async () => {
    const text = prompt.trim();
    if (!text || loading) return;

    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          stack: [],
          history: history,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `HTTP ${res.status}`);
      }

      // RN fetch doesn't support streaming, so read the full response
      const rawText = await res.text();
      const lines = rawText.split('\n');
      let fullReply = '';
      let sources = [];

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'token') {
            fullReply += event.content;
          } else if (event.type === 'sources') {
            sources = event.sources || [];
          } else if (event.type === 'error') {
            throw new Error(event.content);
          }
        } catch (parseErr) {
          // Skip malformed SSE lines
        }
      }

      // Strip any source lines the LLM may self-generate
      fullReply = fullReply.replace(/\n{1,3}---\n*Sources?:.*$/s, '').trim();

      setMessages((prev) => [...prev, { role: 'ai', text: fullReply || 'No response.' }]);

      setHistory((prev) => [
        ...prev,
        { role: 'user', content: text },
        { role: 'assistant', content: fullReply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerText}>PepTalk</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.length === 0 && (
          <Text style={styles.placeholder}>Ask me anything...</Text>
        )}
        {messages.map((msg, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {msg.role === 'user' ? (
              <Text style={styles.userText} selectable>
                {msg.text}
              </Text>
            ) : (
              <MarkdownBubble>{msg.text}</MarkdownBubble>
            )}
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <ActivityIndicator size="small" color="#999" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          multiline
          returnKeyType="send"
          onSubmitEditing={sendPrompt}
          blurOnSubmit
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!prompt.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendPrompt}
          disabled={!prompt.trim() || loading}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  placeholder: {
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1e1e1e',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  userText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  aiText: {
    color: '#ddd',
    fontSize: 15,
    lineHeight: 21,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
