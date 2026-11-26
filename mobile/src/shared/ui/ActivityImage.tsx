import { useState } from 'react';
import { Image, type ImageProps } from 'react-native';

import { DEFAULT_ACTIVITY_IMAGE_URL } from '../data/activityImages';

type Props = Omit<ImageProps, 'source'> & {
  imageUrl?: string | null;
};

export function ActivityImage({ imageUrl, ...props }: Props) {
  const requestedUrl = imageUrl?.trim() || DEFAULT_ACTIVITY_IMAGE_URL;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const uri = failedUrl === requestedUrl ? DEFAULT_ACTIVITY_IMAGE_URL : requestedUrl;

  return (
    <Image
      {...props}
      source={{ uri }}
      onError={() => setFailedUrl(requestedUrl)}
    />
  );
}
