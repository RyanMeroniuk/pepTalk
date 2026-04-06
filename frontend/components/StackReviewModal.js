import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MarkdownBubble from './MarkdownBubble';

const API_URL = 'http://10.0.0.239:8000';

export default function StackReviewModal({ visible, onClose, stack }) {
  const [graphData, setGraphData] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  const fetchGraphReview = async () => {
    setLoadingGraph(true);
    setGraphData(null);
    setAiReview(null);

    try {
      const res = await fetch(`${API_URL}/stack-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: stack.map((s) => ({
            item: s.item,
            category: s.category,
            dose: s.dose,
          })),
        }),
      });
      const data = await res.json();
      setGraphData(data);
    } catch (err) {
      setGraphData({ error: err.message });
    } finally {
      setLoadingGraph(false);
    }
  };

  const fetchAIReview = async () => {
    setLoadingAI(true);
    try {
      const res = await fetch(`${API_URL}/chat/stack-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stack: stack.map((s) => ({
            item: s.item,
            category: s.category,
            dose: s.dose,
          })),
        }),
      });

      const rawText = await res.text();
      const lines = rawText.split('\n');
      let fullReply = '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'token') fullReply += event.content;
          else if (event.type === 'error') throw new Error(event.content);
        } catch (e) {}
      }

      fullReply = fullReply.replace(/\n{1,3}---\n*Sources?:.*$/s, '').trim();
      setAiReview(fullReply || 'No response.');
    } catch (err) {
      setAiReview(`Error: ${err.message}`);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleOpen = () => {
    if (!graphData && !loadingGraph) {
      fetchGraphReview();
    }
  };

  // Trigger fetch when modal becomes visible
  if (visible && !graphData && !loadingGraph) {
    setTimeout(handleOpen, 0);
  }

  const handleClose = () => {
    setGraphData(null);
    setAiReview(null);
    onClose();
  };

  const renderConflicts = () => {
    if (!graphData?.conflicts?.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="warning" size={18} color="#ef4444" />
          <Text style={styles.sectionTitleRed}>Conflicts</Text>
        </View>
        {graphData.conflicts.map((c, i) => (
          <View key={i} style={styles.conflictCard}>
            <Text style={styles.conflictItems}>{c.items.join(' + ')}</Text>
            <View style={styles.row}>
              <View style={[styles.severityBadge, severityColor(c.severity)]}>
                <Text style={styles.severityText}>{c.severity || 'unknown'}</Text>
              </View>
              <Text style={styles.conflictType}>{c.relationship}</Text>
            </View>
            {c.mechanism ? <Text style={styles.mechanism}>{c.mechanism}</Text> : null}
            {c.management ? <Text style={styles.management}>{c.management}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  const renderTimingConflicts = () => {
    if (!graphData?.timing_conflicts?.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={18} color="#eab308" />
          <Text style={styles.sectionTitleYellow}>Timing Issues</Text>
        </View>
        {graphData.timing_conflicts.map((t, i) => (
          <View key={i} style={styles.timingCard}>
            <Text style={styles.conflictItems}>{t.items.join(' + ')}</Text>
            <Text style={styles.mechanism}>{t.rule}</Text>
            {t.mechanism ? <Text style={styles.mechanism}>{t.mechanism}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  const renderSynergies = () => {
    if (!graphData?.synergies?.length) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
          <Text style={styles.sectionTitleGreen}>Synergies</Text>
        </View>
        {graphData.synergies.map((s, i) => (
          <View key={i} style={styles.synergyCard}>
            <Text style={styles.synergyItems}>{s.items.join(' + ')}</Text>
            {s.mechanism ? <Text style={styles.mechanism}>{s.mechanism}</Text> : null}
          </View>
        ))}
      </View>
    );
  };

  const renderNoIssues = () => {
    if (!graphData) return null;
    if (graphData.conflicts?.length || graphData.timing_conflicts?.length || graphData.synergies?.length) return null;
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkmark-circle" size={40} color="#22c55e" />
        <Text style={styles.emptyText}>No known conflicts or synergies found between your stack items.</Text>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Stack Review</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loadingGraph && (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Analyzing your stack...</Text>
            </View>
          )}

          {graphData?.error && (
            <Text style={styles.errorText}>Error: {graphData.error}</Text>
          )}

          {graphData && !graphData.error && (
            <>
              {renderConflicts()}
              {renderTimingConflicts()}
              {renderSynergies()}
              {renderNoIssues()}

              {/* AI Deep Dive */}
              {!aiReview && !loadingAI && (
                <TouchableOpacity style={styles.aiBtn} onPress={fetchAIReview}>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={styles.aiBtnText}>Get AI Analysis</Text>
                </TouchableOpacity>
              )}

              {loadingAI && (
                <View style={styles.aiLoadingState}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <Text style={styles.loadingText}>AI is reviewing your stack...</Text>
                </View>
              )}

              {aiReview && (
                <View style={styles.aiSection}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="sparkles" size={18} color="#a78bfa" />
                    <Text style={styles.sectionTitlePurple}>AI Analysis</Text>
                  </View>
                  <View style={styles.aiCard}>
                    <MarkdownBubble>{aiReview}</MarkdownBubble>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function severityColor(severity) {
  switch (severity?.toLowerCase()) {
    case 'high':
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
    case 'moderate':
      return { backgroundColor: 'rgba(234, 179, 8, 0.2)' };
    case 'low':
    case 'theoretical':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
    default:
      return { backgroundColor: 'rgba(136, 136, 136, 0.2)' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: '#2563eb',
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitleRed: {
    color: '#ef4444',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitleYellow: {
    color: '#eab308',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitleGreen: {
    color: '#22c55e',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionTitlePurple: {
    color: '#a78bfa',
    fontSize: 17,
    fontWeight: '700',
  },
  conflictCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  timingCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#eab308',
  },
  synergyCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  conflictItems: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  synergyItems: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: {
    color: '#ddd',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  conflictType: {
    color: '#888',
    fontSize: 12,
  },
  mechanism: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  management: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 280,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 8,
  },
  aiBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  aiLoadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  aiSection: {
    marginTop: 8,
  },
  aiCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#a78bfa',
  },
});
