import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

type Props = {
  title: string;
  note: string;
  duration: string;
  price: string;
  image: ImageSourcePropType;
  onRemove?: () => void;
};

export function SavedActivityCard({ title, note, duration, price, image, onRemove }: Props) {
  return (
    <View style={styles.card}>
      <Image source={image} resizeMode="cover" style={styles.image} />
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.title}>{title}</Text>
        <Text numberOfLines={1} style={styles.note}>{note}</Text>
        <View style={styles.details}>
          <Text style={styles.detail}>{duration}</Text>
          <Text style={styles.detail}>{price}</Text>
        </View>
      </View>
      {onRemove && <Pressable accessibilityRole="button" accessibilityLabel="Убрать из избранного" onPress={onRemove} hitSlop={10} style={styles.remove}><Text style={styles.removeText}>×</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  image: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#111116',
    fontFamily: 'BulbasaurSP',
    fontSize: 13,
  },
  note: {
    marginTop: 5,
    color: '#B8A7DA',
    fontFamily: 'EtudeNoireBold',
    fontSize: 10,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 17,
  },
  detail: {
    color: '#48075B',
    fontFamily: 'EtudeNoireBold',
    fontSize: 10,
  },
  remove: { alignSelf: 'flex-start', paddingHorizontal: 4, paddingTop: 1 },
  removeText: { color: '#48075B', fontSize: 24, lineHeight: 24 },
});
