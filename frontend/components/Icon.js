// PepTalk shared icon set — every line icon used across the app.
// Paths transcribed verbatim from the design prototype's SIcon/Icon/YIcon/RIcon
// factories so the visual language stays consistent.

import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS } from '../theme/tokens';

export default function Icon({
  name,
  size = 18,
  color = COLORS.textPrimary,
  strokeWidth = 1.75,
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
  };
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'plus':
      return (
        <Svg {...common}>
          <Path d="M12 5v14M5 12h14" {...stroke} />
        </Svg>
      );
    case 'syringe':
      return (
        <Svg {...common}>
          <Path d="M18 2l4 4" {...stroke} />
          <Path d="M16 4l4 4-10 10H6v-4l10-10z" {...stroke} />
          <Path d="M8 14l2 2" {...stroke} />
        </Svg>
      );
    case 'spark':
      // 8-point sparkle (used on quick actions + brand mark headers)
      return (
        <Svg {...common}>
          <Path
            d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
            {...stroke}
          />
        </Svg>
      );
    case 'sparkSolid':
      // Filled sparkle (used inside the indigo Review AI card header)
      return (
        <Svg {...common}>
          <Path d="M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5z" {...stroke} />
          <Path d="M19 4v3M21 5h-4" {...stroke} />
        </Svg>
      );
    case 'sun':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="4" {...stroke} />
          <Path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"
            {...stroke}
          />
        </Svg>
      );
    case 'moon':
      return (
        <Svg {...common}>
          <Path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" {...stroke} />
        </Svg>
      );
    case 'check':
      return (
        <Svg {...common}>
          <Path d="M5 12.5l4.5 4.5L19 7" {...stroke} />
        </Svg>
      );
    case 'checkBold':
      return (
        <Svg {...common}>
          <Path d="M5 12l4 4L19 6" {...stroke} />
        </Svg>
      );
    case 'checkCircle':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M8 12.5l3 3 5-6" {...stroke} />
        </Svg>
      );
    case 'more':
      // Three dots — fill instead of stroke; uses currentColor via fill={color}
      return (
        <Svg {...common}>
          <Circle cx="5" cy="12" r="1.4" fill={color} />
          <Circle cx="12" cy="12" r="1.4" fill={color} />
          <Circle cx="19" cy="12" r="1.4" fill={color} />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg {...common}>
          <Rect x="3" y="5" width="18" height="16" rx="2.5" {...stroke} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...stroke} />
        </Svg>
      );
    case 'shield':
      return (
        <Svg {...common}>
          <Path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" {...stroke} />
          <Path d="M9 12l2 2 4-4" {...stroke} />
        </Svg>
      );
    case 'shieldEmpty':
      // Same outline without the inner checkmark — used in review header
      return (
        <Svg {...common}>
          <Path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" {...stroke} />
        </Svg>
      );
    case 'flask':
      return (
        <Svg {...common}>
          <Path
            d="M9 3h6M10 3v6L4.5 19.5A1.5 1.5 0 0 0 5.8 22h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"
            {...stroke}
          />
          <Path d="M7 15h10" {...stroke} />
        </Svg>
      );
    case 'leaf':
      return (
        <Svg {...common}>
          <Path d="M5 21c0-9 6-15 16-16-.5 10-6 16-16 16z" {...stroke} />
          <Path d="M5 21c4-7 9-12 16-16" {...stroke} />
        </Svg>
      );
    case 'alert':
      return (
        <Svg {...common}>
          <Path d="M12 2L1 21h22L12 2z" {...stroke} />
          <Path d="M12 9v5M12 17h.01" {...stroke} />
        </Svg>
      );
    case 'clock':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M12 7v5l3 2" {...stroke} />
        </Svg>
      );
    case 'info':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="9" {...stroke} />
          <Path d="M12 8h.01M11 12h1v5h1" {...stroke} />
        </Svg>
      );
    case 'back':
      return (
        <Svg {...common}>
          <Path d="M15 6l-6 6 6 6" {...stroke} />
        </Svg>
      );
    case 'chevron':
      return (
        <Svg {...common}>
          <Path d="M9 6l6 6-6 6" {...stroke} />
        </Svg>
      );
    case 'x':
      return (
        <Svg {...common}>
          <Path d="M6 6l12 12M18 6L6 18" {...stroke} />
        </Svg>
      );
    case 'arrowUp':
      return (
        <Svg {...common}>
          <Path d="M12 19V5" {...stroke} />
          <Path d="M6 11l6-6 6 6" {...stroke} />
        </Svg>
      );
    case 'fork':
      return (
        <Svg {...common}>
          <Path d="M7 3v8a2 2 0 0 0 2 2v8" {...stroke} />
          <Path d="M11 3v8" {...stroke} />
          <Path d="M15 3c0 6-2 8-2 8s2 0 2 4v6" {...stroke} />
        </Svg>
      );
    case 'flame':
      return (
        <Svg {...common}>
          <Path
            d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4-1 3 1 4 2 4-1-4 1-7 1-10z"
            {...stroke}
          />
        </Svg>
      );
    case 'doc':
      return (
        <Svg {...common}>
          <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" {...stroke} />
          <Path d="M14 3v5h5" {...stroke} />
          <Path d="M9 13h6M9 17h4" {...stroke} />
        </Svg>
      );
    case 'stack':
      return (
        <Svg {...common}>
          <Path d="M12 3l9 5-9 5-9-5 9-5z" {...stroke} />
          <Path d="M3 13l9 5 9-5" {...stroke} />
          <Path d="M3 18l9 5 9-5" {...stroke} opacity={0.5} />
        </Svg>
      );
    case 'mic':
      return (
        <Svg {...common}>
          <Rect x="9" y="3" width="6" height="12" rx="3" {...stroke} />
          <Path d="M5 11a7 7 0 0 0 14 0M12 18v3" {...stroke} />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg {...common}>
          <Path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" {...stroke} />
        </Svg>
      );
    default:
      return null;
  }
}
