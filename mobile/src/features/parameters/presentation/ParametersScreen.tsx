import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '../../../shared/ui/ActionButton';
import { BackButton } from '../../../shared/ui/BackButton';
import { SelectionSection, type SelectionOption } from '../../../shared/ui/SelectionSection';
import { api, getErrorMessage } from '../../../shared/api/client';
import type { SearchParams } from '../../../shared/api/types';

type SelectionGroup = 'time' | 'budget' | 'place';
type SelectionState = Record<SelectionGroup, string[]>;

const options: Record<SelectionGroup, SelectionOption[]> = {
  time: [
    { id: 'under-30-minutes', label: 'до 30 минут' },
    { id: 'about-an-hour', label: 'около часа' },
    { id: 'one-and-half-to-two-hours', label: '1,5 – 2 часа' },
    { id: 'two-to-three-hours', label: '2 – 3 часа' },
    { id: 'over-three-hours', label: 'больше 3 часов' },
    { id: 'any-time', label: 'без ограничений' },
  ],
  budget: [
    { id: 'free', label: 'бесплатно' },
    { id: 'under-500', label: 'до 500 ₽' },
    { id: 'under-1500', label: 'до 1500 ₽' },
    { id: 'under-3000', label: 'до 3000 ₽' },
    { id: 'any-budget', label: 'без ограничений' },
  ],
  place: [
    { id: 'home', label: 'дома' },
    { id: 'outside', label: 'на улице' },
    { id: 'any-place', label: 'неважно' },
  ],
};

export default function ParametersScreen() {
  const [selected, setSelected] = useState<SelectionState>({
    time: [],
    budget: [],
    place: [],
  });
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - 40, 440);
  const gridChipWidth = (contentWidth - 18) / 4;
  const pageTitleFontSize = Math.min(29, Math.max(22, contentWidth * 0.07));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [saved, interests] = await Promise.all([api.getSearchParams(), api.getInterests()]);
      setCategoryIds(interests.interests.map(category => category.id));
      if (!saved) return;
      const restored: SelectionState = { time: [], budget: [], place: [] };
      if (saved.duration_min == null) restored.time = ['any-time'];
      else if (saved.duration_min <= 30) restored.time = ['under-30-minutes'];
      else if (saved.duration_min <= 60) restored.time = ['about-an-hour'];
      else if (saved.duration_min <= 120) restored.time = ['one-and-half-to-two-hours'];
      else if (saved.duration_min <= 180) restored.time = ['two-to-three-hours'];
      else restored.time = ['over-three-hours'];
      if (saved.budget_level == null) restored.budget = ['any-budget'];
      else if (saved.budget_level === 0) restored.budget = ['free'];
      else if (saved.budget_level === 1) restored.budget = ['under-500'];
      else if (saved.budget_level === 2) restored.budget = ['under-1500'];
      else restored.budget = ['under-3000'];
      if (saved.is_outdoor === true) restored.place = ['outside'];
      else if (saved.is_outdoor === false) restored.place = ['home'];
      setSelected(restored);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function updateSelection(group: SelectionGroup, id: string) {
    setSelected(current => {
      const values = current[group];
      const isSingleChoice = group === 'time' || group === 'budget';
      const nextValues = isSingleChoice
        ? [id]
        : values.includes(id) ? values.filter(value => value !== id) : [...values, id];

      return { ...current, [group]: nextValues };
    });
  }

  async function submitSearch() {
    const durationByOption: Record<string, number | undefined> = {
      'under-30-minutes': 30,
      'about-an-hour': 60,
      'one-and-half-to-two-hours': 120,
      'two-to-three-hours': 180,
    };
    const budgetByOption: Record<string, number | undefined> = {
      free: 0,
      'under-500': 1,
      'under-1500': 2,
      'under-3000': 3,
    };
    const hasOutdoor = selected.place.includes('outside');
    const hasIndoor = selected.place.includes('home');
    const hasAnyPlace = selected.place.includes('any-place');
    const params: SearchParams = {
      category_ids: categoryIds.length ? categoryIds : undefined,
      duration_min: durationByOption[selected.time[0]],
      budget_level: budgetByOption[selected.budget[0]],
      is_outdoor: hasAnyPlace || hasOutdoor === hasIndoor ? undefined : hasOutdoor,
    };

    setSaving(true);
    setError('');
    try {
      await api.saveSearchParams(params);
      router.push({ pathname: '/(tabs)/home/recommendation', params: { mode: 'search' } });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            width: contentWidth,
            paddingTop: Math.max(12, insets.top + 8),
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.back()} />
        <Text
          accessibilityRole="header"
          style={[styles.title, { fontSize: pageTitleFontSize, lineHeight: pageTitleFontSize * 1.24 }]}
        >
          Какой план сегодня?
        </Text>
        <SelectionSection
          title="Сколько есть времени?"
          options={options.time}
          selectedIds={selected.time}
          mode="single"
          layout="horizontal"
          onSelect={id => updateSelection('time', id)}
        />
        <SelectionSection
          title="Какой бюджет?"
          options={options.budget}
          selectedIds={selected.budget}
          mode="single"
          layout="horizontal"
          onSelect={id => updateSelection('budget', id)}
        />
        <SelectionSection
          title="Где хочется провести время?"
          options={options.place}
          selectedIds={selected.place}
          mode="multiple"
          layout="wrap"
          onSelect={id => updateSelection('place', id)}
          chipWidth={gridChipWidth}
        />
        {loading && <ActivityIndicator style={styles.status} color="#48075B" />}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <ActionButton
          title={saving ? 'СОХРАНЯЕМ…' : 'ПРЕДЛОЖИТЬ ЗАНЯТИЕ'}
          variant="indigo"
          onPress={!loading && !saving ? () => void submitSearch() : undefined}
          style={styles.submitButton}
          labelStyle={styles.submitLabel}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#E7DFF0',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
  },
  title: {
    marginTop: 24,
    color: '#101014',
    fontFamily: 'BulbasaurSP',
    fontSize: 29,
    lineHeight: 36,
    textAlign: 'center',
  },
  submitButton: {
    minHeight: 48,
    marginTop: 22,
    marginHorizontal: 18,
  },
  submitLabel: {
    fontFamily: 'BulbasaurSP',
    fontSize: 19,
  },
  status: { marginTop: 18 },
  error: { color: '#A1284A', fontFamily: 'EtudeNoireBold', textAlign: 'center', marginTop: 14 },
});
