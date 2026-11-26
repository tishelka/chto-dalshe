import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { demoActivity } from '../../shared/data/demoActivity';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { EmptyCollectionState } from '../../shared/ui/EmptyCollectionState';
import { SavedActivityCard } from '../../shared/ui/SavedActivityCard';

const favoriteActivities = [demoActivity];

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - 32, 430);
  const hasFavorites = favoriteActivities.length > 0;

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

        {hasFavorites ? (
          <View style={styles.favoritesContent}>
            <Text accessibilityRole="header" style={styles.title}>избранное</Text>
            <View style={styles.list}>
              {favoriteActivities.map(activity => (
                <SavedActivityCard key={activity.id} {...activity} />
              ))}
            </View>
          </View>
        ) : (
          <EmptyCollectionState
            icon={<Text accessible={false} style={styles.heart}>♥</Text>}
            title="Здесь пока пусто"
            description="Здесь ты можешь сохранять интересные занятия, чтобы не потерять их"
            actionTitle="НАЙТИ СВОЮ ИДЕЮ"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#C4C8E1',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
  },
  favoritesContent: {
    marginTop: 27,
  },
  title: {
    color: '#48075B',
    fontFamily: 'BulbasaurSP',
    fontSize: 19,
    textAlign: 'center',
  },
  list: {
    gap: 14,
    marginTop: 25,
  },
  heart: {
    color: '#39396E',
    fontSize: 60,
    lineHeight: 66,
  },
});
