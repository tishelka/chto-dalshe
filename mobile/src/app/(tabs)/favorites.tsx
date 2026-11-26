import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api, getErrorMessage } from '../../shared/api/client';
import type { Favorite } from '../../shared/api/types';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { EmptyCollectionState } from '../../shared/ui/EmptyCollectionState';
import { SavedActivityCard } from '../../shared/ui/SavedActivityCard';

function displayDuration(minutes: number | null) {
  if (minutes == null) return 'длительность не указана';
  if (minutes < 60) return `от ${minutes} минут`;
  return `${Math.floor(minutes / 60)} ч${minutes % 60 ? ` ${minutes % 60} мин` : ''}`;
}

function displayBudget(level: number) {
  return ['бесплатно', 'до 500 ₽', 'до 1500 ₽', 'до 3000 ₽'][level] ?? 'платно';
}

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - 32, 430);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFavorites(await api.getFavorites());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function removeFavorite(activityId: number) {
    const previous = favorites;
    setFavorites(current => current.filter(favorite => favorite.activity_id !== activityId));
    setError('');
    try {
      await api.removeFavorite(activityId);
    } catch (requestError) {
      setFavorites(previous);
      setError(getErrorMessage(requestError));
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
            paddingTop: Math.max(28, insets.top + 28),
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader />
        {loading ? <ActivityIndicator style={styles.loading} color="#48075B" /> : error && favorites.length === 0 ? (
          <View style={styles.errorState}>
            <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
            <Text style={styles.retry} onPress={() => void load()}>повторить</Text>
          </View>
        ) : favorites.length ? (
          <View style={styles.favoritesContent}>
            <Text accessibilityRole="header" style={styles.title}>избранное</Text>
            {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <View style={styles.list}>
              {favorites.map(favorite => (
                <SavedActivityCard
                  key={favorite.id}
                  title={favorite.activity.title}
                  note={favorite.activity.description}
                  duration={displayDuration(favorite.activity.duration_min)}
                  price={displayBudget(favorite.activity.budget_level)}
                  image={require('../../../assets/images/recommendation-dummy.png')}
                  onRemove={() => void removeFavorite(favorite.activity_id)}
                />
              ))}
            </View>
          </View>
        ) : (
          <EmptyCollectionState
            icon={<Text accessible={false} style={styles.heart}>♥</Text>}
            title="Здесь пока пусто"
            description="Здесь ты можешь сохранять интересные занятия, чтобы не потерять их"
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
  favoritesContent: { marginTop: 27 },
  title: { color: '#48075B', fontFamily: 'BulbasaurSP', fontSize: 19, textAlign: 'center' },
  list: { gap: 14, marginTop: 25 },
  heart: { color: '#39396E', fontSize: 60, lineHeight: 66 },
});
