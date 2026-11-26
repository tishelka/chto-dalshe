import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

type Props = {
  title: string;
  note: string;
  duration: string;
  price: string;
  image: ImageSourcePropType;
};

export function SavedActivityCard({ title, note, duration, price, image }: Props) {
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
});
