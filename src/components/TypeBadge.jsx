import { Badge } from '@mantine/core';

// A solid badge filled with the detection-type `color` and dark text for contrast.
export function TypeBadge({ color = '#888f9e', size = 'sm', children }) {
  return (
    <Badge
      size={size}
      styles={{
        root: {
          backgroundColor: color,
          color: '#111326',
          border: 'none',
          display: 'inline-flex',
          alignItems: 'center',
        },
        label: {
          display: 'flex',
          alignItems: 'center',
          lineHeight: 1,
        },
      }}
    >
      {children}
    </Badge>
  );
}
