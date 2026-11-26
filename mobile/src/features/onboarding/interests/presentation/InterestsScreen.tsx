import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingButton } from '../../../../shared/ui/OnboardingButton';
import { InterestGrid } from '../../../../shared/ui/InterestGrid';
import { onboarding as palette } from '../../../../shared/theme/onboarding';
import { api, getErrorMessage } from '../../../../shared/api/client';
import type { Category } from '../../../../shared/api/types';

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [availableCategories, interests] = await Promise.all([api.getCategories(), api.getInterests()]);
      setCategories(availableCategories);
      setSelected(interests.interests.map(category => String(category.id)));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function toggleInterest(id: string) {
    setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  }

  async function openHome(save = true) {
    if (save) {
      setSaving(true);
      setError('');
      try {
        await api.updateInterests(selected.map(Number));
      } catch (requestError) {
        setError(getErrorMessage(requestError));
        setSaving(false);
        return;
      }
    }
    router.replace('/(tabs)/home');
  }

  return (
    <View style={styles.page}>
      <StatusBar style="dark" />
      <ScrollView style={styles.frame} contentContainerStyle={[styles.content, { paddingTop: Math.max(60, insets.top + 16), paddingBottom: Math.max(60, insets.bottom + 16) }]}>
        <Text accessibilityRole="header" style={styles.title}>ЧТО ТЕБЕ ИНТЕРЕСНО?</Text>
        {loading ? <ActivityIndicator color="#48075B" /> : <InterestGrid options={categories.map(category => ({ id: String(category.id), label: category.name }))} selectedIds={selected} onToggle={toggleInterest} />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <View style={styles.actions}>
          <OnboardingButton title={saving ? 'сохраняем…' : 'продолжить'} onPress={!loading && !saving ? () => void openHome() : undefined} />
          <OnboardingButton title="пропустить" secondary onPress={!loading && !saving ? () => void openHome(false) : undefined} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#EEEDF4', alignItems: 'center' },
  frame: { width: '100%', maxWidth: 430, backgroundColor: palette.white },
  content: { paddingHorizontal: 32 },
  title: { color: '#29285F', fontSize: 24, lineHeight: 29, fontFamily: 'BulbasaurSP', textAlign: 'center', marginHorizontal: -20, marginBottom: 20 },
  actions: { marginTop: 16, marginHorizontal: 12, gap: 10 },
  error: { color: '#A1284A', fontFamily: 'EtudeNoireBold', textAlign: 'center', marginTop: 12 },
});
