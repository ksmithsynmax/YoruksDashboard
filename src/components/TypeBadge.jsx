import { Badge } from '@mantine/core';

function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// A badge styled like the active-state pill: white text on a translucent tint of
// `color`, with the solid `color` as a border.
export function TypeBadge({ color = '#888f9e', size = 'sm', children }) {
  return (
    <Badge
      size={size}
      styles={{
        root: {
          backgroundColor: hexToRgba(color, 0.18),
          color: '#ffffff',
          border: `1px solid ${color}`,
        },
      }}
    >
      {children}
    </Badge>
  );
}
