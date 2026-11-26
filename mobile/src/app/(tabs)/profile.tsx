import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboarding as palette } from '../../shared/theme/onboarding';
import { InterestGrid } from '../../shared/ui/InterestGrid';
import { SectionTitle } from '../../shared/ui/SectionTitle';
import { api, categoriesFromActivities, getErrorMessage } from '../../shared/api/client';
import type { Category } from '../../shared/api/types';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [activities, interests] = await Promise.all([api.getActivities(), api.getInterests()]);
      setCategories(categoriesFromActivities(activities));
      setSelected(interests.interests.map(category => String(category.id)));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleInterest(id: string) {
    const next = selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id];
    setSelected(next);
    setError('');
    try {
      const result = await api.updateInterests(next.map(Number));
      setSelected(result.interests.map(category => String(category.id)));
    } catch (requestError) {
      setSelected(selected);
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(24, insets.top + 8) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.name}>ТВОЁ ИМЯ</Text>
        </View>
        <SectionTitle style={styles.interestsTitle}>ЧТО ТЕБЕ ИНТЕРЕСНО?</SectionTitle>
        {loading ? <ActivityIndicator color="#48075B" /> : <InterestGrid options={categories.map(category => ({ id: String(category.id), label: category.name }))} selectedIds={selected} onToggle={id => void toggleInterest(id)} gap={10} style={styles.grid} />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: palette.white,
  },
  scroll: {
    width: '100%',
    maxWidth: 430,
    backgroundColor: palette.white,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 28,
  },
  avatarPlaceholder: {
    width: 98,
    height: 98,
    borderRadius: 11,
    backgroundColor: '#DFD2F2',
  },
  name: {
    flex: 1,
    color: palette.ink,
    fontFamily: 'BulbasaurSP',
    fontSize: 22,
    textAlign: 'center',
  },
  interestsTitle: {
    color: palette.ink,
    fontSize: 18,
    lineHeight: 22,
    textAlign: 'center',
    marginHorizontal: -6,
    marginBottom: 18,
  },
  grid: {
    marginHorizontal: 10,
  },
  error: { color: '#A1284A', fontFamily: 'EtudeNoireBold', textAlign: 'center', marginTop: 12 },
});
