import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, getErrorMessage } from '../../shared/api/client';
import type { RecommendationHistory } from '../../shared/api/types';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { BottomNavigationIcon } from '../../shared/ui/BottomNavigationIcon';
import { EmptyCollectionState } from '../../shared/ui/EmptyCollectionState';
import { SavedActivityCard } from '../../shared/ui/SavedActivityCard';

function displayDate(value: string) {
  return new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

function displayDuration(minutes: number | null) {
  if (minutes == null) return 'длительность не указана';
  if (minutes < 60) return `от ${minutes} минут`;
  return `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ''}`;
}

function actionLabel(action: RecommendationHistory['action']) {
  if (action === 'accepted') return 'Выбрано';
  if (action === 'skipped') return 'Пропущено';
  return 'Предложено';
}

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - 32, 430);
  const [history, setHistory] = useState<RecommendationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setHistory(await api.getHistory());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            width: contentWidth,
            paddingTop: Math.max(28, insets.top + 28),
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader />
        {loading ? <ActivityIndicator style={styles.loading} color="#48075B" /> : error && history.length === 0 ? (
          <View style={styles.errorState}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Text style={styles.retry} onPress={() => void load()}>повторить</Text>
          </View>
        ) : history.length ? (
          <View style={styles.historyContent}>
            <Text accessibilityRole="header" style={styles.title}>ИСТОРИЯ АКТИВНОСТЕЙ</Text>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <View style={styles.list}>
              {history.map(entry => (
                <View key={entry.id} style={styles.entry}>
                  <Text style={styles.date}>{`${displayDate(entry.created_at)} · ${actionLabel(entry.action)}`}</Text>
                  <SavedActivityCard
                    title={entry.activity.title}
                    note={entry.activity.description}
                    duration={displayDuration(entry.activity.duration_min)}
                    price={['бесплатно', 'до 500 ₽', 'до 1500 ₽', 'до 3000 ₽'][entry.activity.budget_level] ?? 'платно'}
                    imageUrl={entry.activity.image_url}
                  />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <EmptyCollectionState
            icon={<View style={styles.clockIcon}><BottomNavigationIcon name="history" focused={false} /></View>}
            title="Первая идея ещё впереди"
            description="Здесь появятся твои рекомендации и выбранные занятия"
            actionTitle="НАЙТИ СВОЮ ИДЕЮ"
            onAction={() => router.push('/(tabs)/home')}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', backgroundColor: '#C4C8E1' },
  scroll: { flex: 1, width: '100%' },
  content: { alignSelf: 'center', flexGrow: 1 },
  loading: { marginTop: 40 },
  errorState: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 20 },
  error: { color: '#A1284A', fontFamily: 'EtudeNoireBold', textAlign: 'center', marginTop: 14 },
  retry: { color: '#393D76', fontFamily: 'BulbasaurSP', marginTop: 16 },
  historyContent: { marginTop: 27 },
  title: { color: '#FFFFFF', fontFamily: 'BulbasaurSP', fontSize: 17, textAlign: 'center' },
  list: { gap: 14, marginTop: 12 },
  entry: { gap: 4 },
  date: { marginLeft: 14, color: '#39396E', fontFamily: 'EtudeNoireBold', fontSize: 10 },
  clockIcon: { transform: [{ scale: 1.2 }] },
});
