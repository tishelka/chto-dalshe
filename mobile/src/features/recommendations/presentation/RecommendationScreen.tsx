import { useCallback, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton } from '../../../shared/ui/ActionButton';
import { RecommendationIcon, type RecommendationIconName } from './RecommendationIcon';
import { api, getErrorMessage } from '../../../shared/api/client';
import type { Activity, SearchParams } from '../../../shared/api/types';

type SwipeDirection = 'left' | 'right';

const iconFacts: { icon: RecommendationIconName; key: 'duration' | 'category' | 'budget' | 'place' }[] = [
  { icon: 'clock', key: 'duration' },
  { icon: 'category', key: 'category' },
  { icon: 'budget', key: 'budget' },
  { icon: 'place', key: 'place' },
];

function formatActivity(activity: Activity) {
  const duration = activity.duration_min == null
    ? 'не указано'
    : activity.duration_min < 60
      ? `от ${activity.duration_min} минут`
      : `${Math.floor(activity.duration_min / 60)} ч${activity.duration_min % 60 ? ` ${activity.duration_min % 60} мин` : ''}`;
  const budget = ['бесплатно', 'до 500 ₽', 'до 1500 ₽', 'до 3000 ₽'][activity.budget_level] ?? 'платно';
  return {
    duration,
    category: activity.category?.name ?? 'Активность',
    budget,
    place: activity.is_outdoor ? 'на улице' : 'в помещении',
  };
}

function filterActivities(activities: Activity[], params: SearchParams | null) {
  if (!params) return activities;
  return activities.filter(activity =>
    (!params.category_ids?.length || params.category_ids.includes(activity.category_id)) &&
    (params.duration_min == null || activity.duration_min == null || activity.duration_min <= params.duration_min) &&
    (params.budget_level == null || activity.budget_level <= params.budget_level) &&
    (params.is_outdoor == null || activity.is_outdoor === params.is_outdoor)
  );
}

export default function RecommendationScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - 28, 420);
  const titleSize = Math.min(35, Math.max(28, contentWidth * 0.084));
  const cardScale = Math.max(0.8, contentWidth / 420);
  const cardHeight = contentWidth * 1.28 + Math.max(0, 330 - contentWidth) * 0.8;
  const imageHeight = contentWidth * 0.46;
  const footerButtonWidth = (contentWidth * 0.8 - 12) / 2;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const currentIndexRef = useRef(0);
  const isAnimating = useRef(false);
  const shownIds = useRef(new Set<number>());
  const position = useRef(new Animated.ValueXY()).current;

  function trackHistory(activityId: number, action: 'shown' | 'accepted' | 'skipped') {
    if (action === 'shown') {
      if (shownIds.current.has(activityId)) return;
      shownIds.current.add(activityId);
    }
    void api.addHistory(activityId, action).catch(requestError => setError(getErrorMessage(requestError)));
  }

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError('');
    setCurrentIndex(0);
    currentIndexRef.current = 0;
    try {
      const [allActivities, favorites, savedParams] = await Promise.all([
        api.getActivities(),
        api.getFavorites(),
        mode === 'search' ? api.getSearchParams() : Promise.resolve(null),
      ]);
      const matches = mode === 'search' ? filterActivities(allActivities, savedParams) : allActivities;
      shownIds.current.clear();
      setActivities(matches);
      setFavoriteIds(favorites.map(favorite => favorite.activity_id));
      if (matches[0]) trackHistory(matches[0].id, 'shown');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { void loadActivities(); }, [loadActivities]);

  async function toggleFavorite(activity: Activity) {
    const isFavorite = favoriteIds.includes(activity.id);
    setError('');
    try {
      if (isFavorite) await api.removeFavorite(activity.id);
      else await api.addFavorite(activity.id);
      setFavoriteIds(current => isFavorite ? current.filter(id => id !== activity.id) : [...current, activity.id]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function showDetails(activity: Activity) {
    try {
      const fullActivity = await api.getActivity(activity.id);
      Alert.alert(fullActivity.title, fullActivity.description);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  const advanceCard = useCallback((direction: SwipeDirection) => {
    if (isAnimating.current || currentIndexRef.current >= activities.length) {
      return;
    }

    isAnimating.current = true;
    const sign = direction === 'right' ? 1 : -1;

    Animated.timing(position, {
      toValue: { x: sign * (width + 100), y: 0 },
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        position.setValue({ x: 0, y: 0 });
        isAnimating.current = false;
        return;
      }

      const nextIndex = currentIndexRef.current + 1;
      const currentActivity = activities[currentIndexRef.current];
      if (currentActivity) trackHistory(currentActivity.id, direction === 'right' ? 'accepted' : 'skipped');
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      if (activities[nextIndex]) trackHistory(activities[nextIndex].id, 'shown');
      position.setValue({ x: 0, y: 0 });
      isAnimating.current = false;
    });
  }, [position, width, activities]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) =>
      Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_event, gesture) => {
      position.setValue({ x: gesture.dx, y: Math.max(-40, Math.min(40, gesture.dy * 0.16)) });
    },
    onPanResponderRelease: (_event, gesture) => {
      const threshold = Math.max(86, width * 0.22);
      const hasFastHorizontalSwipe = Math.abs(gesture.dx) > 30 && Math.abs(gesture.vx) > 0.8;

      if (gesture.dx > threshold || (hasFastHorizontalSwipe && gesture.vx > 0)) {
        advanceCard('right');
        return;
      }

      if (gesture.dx < -threshold || (hasFastHorizontalSwipe && gesture.vx < 0)) {
        advanceCard('left');
        return;
      }

      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 82,
        friction: 10,
      }).start();
    },
  }), [advanceCard, position, width]);

  const rotation = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const activeCardStyle = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate: rotation },
    ],
  };
  const stackedActivities = activities.slice(currentIndex, currentIndex + 3).reverse();
  const finished = currentIndex >= activities.length;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            width: contentWidth,
            paddingTop: Math.max(24, insets.top + 8),
            paddingBottom: 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={[styles.pageTitle, { fontSize: titleSize, lineHeight: titleSize * 1.2 }]}>
          Вот твоя идея!
        </Text>
        {!!error && activities.length > 0 && <Text accessibilityRole="alert" style={styles.requestError}>{error}</Text>}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#48075B" />
        ) : error && activities.length === 0 ? (
          <View style={[styles.finishedState, { minHeight: cardHeight }]}>
            <Text style={styles.finishedTitle}>Не удалось загрузить занятия</Text>
            <Text style={styles.finishedText}>{error}</Text>
            <ActionButton title="Повторить" variant="indigo" onPress={() => void loadActivities()} style={styles.restartButton} labelStyle={styles.acceptLabel} />
          </View>
        ) : finished ? (
          <View style={[styles.finishedState, { minHeight: cardHeight }]}>
            <Text style={styles.finishedTitle}>{activities.length ? 'Идеи закончились' : 'Подходящих идей пока нет'}</Text>
            <Text style={styles.finishedText}>{activities.length ? 'В этой серии больше нет вариантов.' : 'Измени параметры или попробуй удивить себя.'}</Text>
            <ActionButton
              title="Назад к параметрам"
              variant="indigo"
              onPress={() => router.back()}
              style={styles.restartButton}
              labelStyle={styles.acceptLabel}
            />
          </View>
        ) : (
          <>
            <View style={[styles.cardStack, { width: contentWidth, height: cardHeight + 22 }]}>
              {stackedActivities.map((activity, layerIndex) => {
                const depth = stackedActivities.length - layerIndex - 1;
                const isFront = depth === 0;

                return (
                  <Animated.View
                    key={activity.id}
                    {...(isFront ? panResponder.panHandlers : {})}
                    pointerEvents={isFront ? 'auto' : 'none'}
                    style={[
                      styles.cardLayer,
                      {
                        zIndex: layerIndex + 1,
                        elevation: layerIndex + 1,
                        transform: [{ translateY: depth * 10 }, { scale: 1 - depth * 0.035 }],
                      },
                      isFront ? activeCardStyle : undefined,
                    ]}
                  >
                    <ActivityCard activity={activity} cardHeight={cardHeight} imageHeight={imageHeight} scale={cardScale} isFavorite={favoriteIds.includes(activity.id)} onToggleFavorite={() => void toggleFavorite(activity)} onDetails={() => void showDetails(activity)} />
                  </Animated.View>
                );
              })}
            </View>

            <View style={styles.cardActions}>
              <ActionButton
                title="Займусь этим"
                variant="plum"
                icon={<RecommendationIcon name="check" size={29} />}
                onPress={() => advanceCard('right')}
                style={styles.acceptButton}
                labelStyle={styles.acceptLabel}
              />
              <View style={styles.footerButtons}>
                <ActionButton
                  title="Назад"
                  variant="indigo"
                  icon={<RecommendationIcon name="back" size={27} />}
                  onPress={() => router.back()}
                  style={[styles.footerButton, { width: footerButtonWidth }]}
                  labelStyle={styles.footerLabel}
                />
                <ActionButton
                  title="Другое"
                  variant="indigo"
                  icon={<RecommendationIcon name="shuffle" size={27} />}
                  onPress={() => advanceCard('left')}
                  style={[styles.footerButton, { width: footerButtonWidth }]}
                  labelStyle={styles.footerLabel}
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

type ActivityCardProps = {
  activity: Activity;
  cardHeight: number;
  imageHeight: number;
  scale: number;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDetails: () => void;
};

function ActivityCard({ activity, cardHeight, imageHeight, scale, isFavorite, onToggleFavorite, onDetails }: ActivityCardProps) {
  const facts = formatActivity(activity);
  return (
    <View style={[styles.card, { height: cardHeight }]}>
      <View style={[styles.imageFrame, { height: imageHeight }]}>
        <Image
          source={require('../../../../assets/images/recommendation-dummy.png')}
          resizeMode="cover"
          style={styles.image}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'} onPress={onToggleFavorite} style={styles.favorite}>
          <Text style={styles.favoriteIcon}>{isFavorite ? '♥' : '♡'}</Text>
        </Pressable>
      </View>

      <View style={[styles.cardBody, { paddingHorizontal: 17 * scale, paddingTop: 20 * scale, paddingBottom: 20 * scale }]}>
        <Text
          style={[styles.activityTitle, { fontSize: 22 * scale, lineHeight: 28 * scale }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {activity.title}
        </Text>
        <View style={[styles.facts, { marginTop: 20 * scale, gap: 8 * scale }]}>
          {iconFacts.map(({ icon, key }) => (
            <View key={key} style={[styles.factRow, { minHeight: 38 * scale, gap: 13 * scale }]}>
              <View style={[styles.factIcon, { width: 34 * scale }]}>
                <RecommendationIcon name={icon} size={24 * scale} color="#A063B1" />
              </View>
              <Text style={[styles.factLabel, { fontSize: 16 * scale, lineHeight: 19 * scale }]}>{facts[key]}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.detailsRow, { minHeight: 50 * scale, gap: 8 * scale, marginTop: 22 * scale }]}>
          <Text style={[styles.detailsText, { fontSize: 11 * scale, lineHeight: 13 * scale }]} numberOfLines={3}>{activity.description}</Text>
          <ActionButton
            title="Хочу узнать подробнее"
            variant="plum"
            icon={<RecommendationIcon name="arrow-right" size={28} />}
            onPress={onDetails}
            style={[styles.moreButton, { minHeight: 52 * scale, paddingHorizontal: 9 * scale }]}
            labelStyle={[styles.moreLabel, { fontSize: 14 * scale, lineHeight: 15 * scale }]}
          />
        </View>
      </View>
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
  pageTitle: {
    color: '#101014',
    fontFamily: 'BulbasaurSP',
    textAlign: 'center',
    marginBottom: 42,
  },
  requestError: { color: '#A1284A', fontFamily: 'EtudeNoireBold', textAlign: 'center', marginTop: -28, marginBottom: 14 },
  cardStack: {
    alignSelf: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  cardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  card: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#D0A0D9',
  },
  imageFrame: {
    width: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  favorite: {
    position: 'absolute',
    top: 15,
    left: 15,
  },
  favoriteIcon: { color: '#A063B1', fontSize: 40, lineHeight: 46, fontWeight: '700' },
  cardBody: {
    flex: 1,
  },
  activityTitle: {
    color: '#101014',
    fontFamily: 'BulbasaurSP',
    fontSize: 22,
    lineHeight: 28,
  },
  facts: {
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factIcon: {
    alignItems: 'center',
  },
  factLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'BulbasaurSP',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    flex: 1,
    color: '#A063B1',
    fontFamily: 'EtudeNoireBold',
  },
  moreButton: {
    width: '49%',
  },
  moreLabel: {
    fontFamily: 'BulbasaurSP',
    textAlign: 'left',
  },
  cardActions: {
    marginTop: 20,
  },
  acceptButton: {
    width: '80%',
    alignSelf: 'center',
    minHeight: 45,
  },
  acceptLabel: {
    fontFamily: 'BulbasaurSP',
    fontSize: 16,
  },
  footerButtons: {
    width: '80%',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  footerButton: {
    minHeight: 44,
    backgroundColor: '#6872BA',
    paddingHorizontal: 10,
  },
  footerLabel: {
    fontFamily: 'BulbasaurSP',
    fontSize: 15,
  },
  finishedState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderRadius: 30,
    backgroundColor: '#D0A0D9',
  },
  finishedTitle: {
    color: '#101014',
    fontFamily: 'BulbasaurSP',
    fontSize: 26,
    textAlign: 'center',
  },
  finishedText: {
    marginTop: 12,
    marginBottom: 24,
    color: '#FFFFFF',
    fontFamily: 'EtudeNoireBold',
    fontSize: 16,
    textAlign: 'center',
  },
  restartButton: {
    width: '90%',
    minHeight: 48,
  },
});
