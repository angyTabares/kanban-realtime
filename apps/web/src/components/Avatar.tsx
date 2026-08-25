export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const palette = [
    '#4f46e5', '#0ea5e9', '#059669', '#d97706',
    '#dc2626', '#7c3aed', '#db2777', '#0891b2',
  ];
  const sum = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const color = palette[sum % palette.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}