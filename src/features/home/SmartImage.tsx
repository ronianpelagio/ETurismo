import React, { useState } from 'react';
import { Image, type ImageResizeMode, type ImageStyle, type StyleProp } from 'react-native';

const PLACEHOLDER = require('../../assets/1.jpeg');

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

export default function SmartImage({ uri, style, resizeMode = 'cover' }: Props) {
  const [hasError, setHasError] = useState(false);
  const isRemoteImage = !hasError && uri?.startsWith('http');

  return (
    <Image
      source={isRemoteImage ? { uri } : PLACEHOLDER}
      style={style}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
    />
  );
}
