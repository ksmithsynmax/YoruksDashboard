
import { useState } from 'react';
import { Paper, Text, Stack, Group, Divider, Modal } from '@mantine/core';
import { TypeBadge } from './TypeBadge';

// Match each badge to the exact fill color of its detection icon on the map.
const TYPE_COLORS = {
  Dark: '#FFA500',
  Unattributed: '#F75349',
  Light: '#00A3E3',
  AIS: '#00EB6C',
  Spoofing: '#FF6D99',
  STS: '#00A3E3',
};


// Spoofing, STS, and vessel detections are different record shapes, so resolve
// the real type from the layer it came from (if known) or its distinct fields.
function resolveType(d) {
  if (d._layerType === 'spoofing') return 'Spoofing';
  if (d._layerType === 'sts') return 'STS';
  if (d._layerType && ['Dark', 'Light', 'Unattributed', 'AIS'].includes(d._layerType)) return d._layerType;
  if (d.event_id != null || d.status === 'complete_sts_event') return 'STS';
  if (d.description != null && d.length == null) return 'Spoofing';
  if (d.detection_type) return d.detection_type;
  if (d.dark) return 'Dark';
  if (d.name) return 'Light';
  return 'Unattributed';
}

function formatPosition(d) {
  const lat = d.lat ?? d.latitude;
  const lon = d.lon ?? d.longitude;
  if (lat == null || lon == null) return '—';
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

export function SatelliteChip({ detection, bare = false }) {
  const type = detection ? resolveType(detection) : null;

  const content = !detection ? (
    <Text c="#888f9e" ta="center">Click a detection on the map to view details</Text>
  ) : (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={600} c="white">SATELLITE IMAGE CHIP</Text>
        <TypeBadge color={TYPE_COLORS[type] || '#888f9e'}>{type}</TypeBadge>
      </Group>

      <ChipImage detection={detection} />

      {type === 'Spoofing' ? (
        <SpoofingDetails d={detection} />
      ) : type === 'STS' ? (
        <StsDetails d={detection} />
      ) : (
        <DetectionDetails d={detection} />
      )}
    </Stack>
  );

  if (bare) return content;

  return (
    <Paper p={detection ? 'md' : 'lg'} radius={8} style={{ background: '#181926', border: '1px solid #393c56' }}>
      {content}
    </Paper>
  );
}

function ChipImage({ detection }) {
  const [opened, setOpened] = useState(false);

  if (detection.image_url) {
    const name =
      detection.name ||
      detection.name_1 ||
      detection.name_2 ||
      (detection.object_id ? `OID ${detection.object_id}` : 'Detection');
    return (
      <>
        <img
          src={detection.image_url}
          alt=""
          onClick={() => setOpened(true)}
          style={{
            width: '100%',
            height: 200,
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        />
        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={`Satellite Imagery - ${name}`}
          size="lg"
          centered
          styles={{
            content: { background: '#181926' },
            header: { background: '#181926', borderBottom: '1px solid #393c56' },
            title: { color: '#ffffff', fontWeight: 600 },
            close: { color: '#ffffff' },
            body: { background: '#181926', padding: 0 },
          }}
        >
          <img
            src={detection.image_url}
            alt=""
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Modal>
      </>
    );
  }
  const note = 'Image Unavailable';
  return (
    <div
      style={{
        border: '1px dashed #393c56',
        borderRadius: 8,
        minHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <SatelliteOffIcon size={40} color="#c1c2c5" />
      <Text c="#888f9e" size="sm">{note}</Text>
    </div>
  );
}

function SatelliteOffIcon({ size = 40, color = '#888f9e' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4.68359 39.4335L4.7793 39.9227C4.52729 39.9725 4.2666 39.9999 4 39.9999C3.73304 39.9999 3.47205 39.9726 3.21973 39.9227L3.41309 38.9432C3.60189 38.9806 3.79849 38.9999 4 38.9999C4.20149 38.9999 4.39814 38.9806 4.58691 38.9432L4.68359 39.4335ZM1.50488 37.6659C1.7242 37.9935 2.0064 38.2757 2.33398 38.495L2.05469 38.91L2.05566 38.911L1.77734 39.3251C1.34124 39.033 0.965768 38.6578 0.673828 38.2216L1.50488 37.6659ZM6.91016 37.9442L7.1748 38.121L7.3252 38.2216C7.03325 38.6577 6.65773 39.0331 6.22168 39.3251L6.0625 39.0868L5.94434 38.911L5.66602 38.495C5.99341 38.2757 6.27591 37.9933 6.49512 37.6659L6.91016 37.9442ZM4 34.9999C4.55197 35.0001 4.99981 35.4479 5 35.9999C5 36.552 4.55209 36.9997 4 36.9999C3.44772 36.9999 3 36.5522 3 35.9999C3.00019 35.4478 3.44783 34.9999 4 34.9999ZM1.05664 35.413C1.01929 35.6018 1.00002 35.7984 1 35.9999C1 36.2014 1.0193 36.398 1.05664 36.5868L0.566406 36.6835L0.0761719 36.7792C0.026423 36.5272 0 36.2665 0 35.9999C1.77227e-05 35.7928 0.0155487 35.5891 0.0458984 35.3905L0.0761719 35.2196L1.05664 35.413ZM7.92285 35.2196C7.97276 35.4719 7.99998 35.7329 8 35.9999C8 36.2665 7.9726 36.5272 7.92285 36.7792L7.43359 36.6835L6.94336 36.5868C6.98068 36.398 7 36.2014 7 35.9999C6.99998 35.7984 6.98071 35.6018 6.94336 35.413L7.92285 35.2196ZM1.98047 32.9774L2.33398 33.5048C2.00655 33.724 1.72415 34.0065 1.50488 34.3339L0.878906 33.9149L0.673828 33.7772C0.965762 33.3413 1.34142 32.9656 1.77734 32.6737L1.98047 32.9774ZM6.22168 32.6737C6.65782 32.9656 7.03315 33.3412 7.3252 33.7772L7.12109 33.9149L6.49512 34.3339C6.27584 34.0064 5.99353 33.7241 5.66602 33.5048L6.01953 32.9774L6.22168 32.6737ZM4 31.9999C4.26654 31.9999 4.52735 32.0263 4.7793 32.0761L4.58691 33.0565C4.39814 33.0192 4.20149 32.9999 4 32.9999C3.79853 32.9999 3.60185 33.0192 3.41309 33.0565L3.21973 32.0761C3.47195 32.0262 3.73315 31.9999 4 31.9999ZM9.91895 22.7001C10.1434 22.5516 10.4477 22.5763 10.6455 22.7743C10.8427 22.9725 10.8679 23.2773 10.7197 23.5018L10.6455 23.5927C9.06056 25.1795 9.06109 27.7594 10.6455 29.3524L10.7969 29.497C12.3906 30.9374 14.8582 30.8889 16.3994 29.3524C16.6255 29.1265 16.9898 29.1264 17.2158 29.3524L17.2568 29.3925C17.4219 29.5901 17.438 29.8703 17.2988 30.0809L17.2246 30.1718C16.203 31.1945 14.8679 31.6989 13.5264 31.6991C12.1853 31.6991 10.8491 31.1871 9.82715 30.1708C7.79086 28.1311 7.79126 24.8139 9.82812 22.7743L9.91895 22.7001ZM12.0518 24.9589C12.271 24.8141 12.5649 24.8357 12.7627 25.0214L12.7686 25.0321L12.7861 25.0497C12.9833 25.2478 13.0085 25.5527 12.8604 25.7772L12.7861 25.8681C12.6056 26.0488 12.501 26.2914 12.501 26.5516C12.5012 26.8115 12.6058 27.0538 12.7861 27.2343L12.7871 27.2352C13.1583 27.598 13.7936 27.6003 14.1592 27.2343L14.25 27.16C14.4744 27.0117 14.7788 27.0363 14.9766 27.2343C15.1736 27.4324 15.1988 27.7373 15.0508 27.9618L14.9766 28.0526C14.574 28.4544 14.0422 28.6734 13.4688 28.6737C12.9667 28.6737 12.4963 28.5066 12.1172 28.1952L11.9609 28.0526C11.5596 27.6495 11.341 27.1172 11.3408 26.5429C11.3409 25.968 11.5584 25.4361 11.9609 25.0331L12.0518 24.9589ZM35.8984 0.679578C36.8036 -0.226506 38.3949 -0.226546 39.2998 0.679578L39.46 0.856335C39.8105 1.28471 39.9999 1.81795 40 2.37782C39.9998 3.0179 39.753 3.62323 39.2998 4.07704C38.8458 4.53155 38.2407 4.78482 37.6025 4.78505C37.1994 4.78499 36.8155 4.67564 36.4697 4.48915L36.3711 4.43641L33.7441 7.0663L33.6523 7.15907L33.7314 7.26259C35.2365 9.24505 35.1433 12.0682 33.4395 13.9413L33.2695 14.12L29.7539 17.6395L29.8594 17.746L31.2178 19.1054L31.3232 19.2118L31.9844 18.5507L32.1387 18.41C32.939 17.7568 34.1213 17.804 34.8672 18.5507L39.1992 22.8876C39.5675 23.2719 39.7686 23.7689 39.7686 24.2997C39.7684 24.7767 39.6076 25.2275 39.3076 25.5927L39.1699 25.744L37.0303 27.8856C36.6426 28.2737 36.1331 28.484 35.5889 28.4843C35.1128 28.4843 34.6625 28.3232 34.2979 28.0233L34.1465 27.8856L29.8467 23.5809C29.051 22.7843 29.051 21.4909 29.8467 20.6942L30.4014 20.1395L30.5068 20.0331L30.4014 19.9266L28.9365 18.4608L28.8311 18.5673L24.1504 23.2528C24.0347 23.3687 23.8916 23.4215 23.7383 23.4218C23.5891 23.4218 23.444 23.3647 23.3252 23.2528L22.3721 22.2987L22.3828 22.6766C22.4226 23.9824 21.982 25.3012 21.0566 26.3329L20.8652 26.535C20.7494 26.651 20.6056 26.7038 20.4521 26.704C20.3031 26.7039 20.1587 26.6468 20.04 26.535L13.4688 19.9569C13.2427 19.7305 13.2428 19.365 13.4688 19.1386L13.6709 18.9462C14.7016 18.0187 16.0181 17.5781 17.3223 17.6181L17.7002 17.6298L17.4336 17.3622L16.7471 16.6757C16.5211 16.4492 16.521 16.0837 16.7471 15.8573L21.4277 11.1718L21.5332 11.0653L20.0693 9.60048L19.9639 9.49403L19.3027 10.1552C18.9089 10.5494 18.384 10.7536 17.8604 10.7538C17.4017 10.7537 16.9443 10.602 16.5732 10.2968L16.4189 10.1552L12.1191 5.85048C11.7313 5.46217 11.5207 4.95138 11.5205 4.40614C11.5206 3.86071 11.7312 3.35023 12.1191 2.9618L14.2588 0.820203L14.4082 0.685437C15.1912 0.055455 16.4239 0.100666 17.1416 0.820203L21.4414 5.12489L21.5811 5.28016C22.1894 6.02798 22.1897 7.10868 21.5811 7.85634L21.4414 8.01161L20.7812 8.67274L20.8867 8.77919L22.2451 10.1386L22.3506 10.245L25.8672 6.7245L26.0449 6.55458C27.9162 4.84829 30.7357 4.75509 32.7158 6.26259L32.8203 6.34169L32.9121 6.24891L35.5391 3.61903L35.4863 3.52137C35.2998 3.17514 35.1906 2.79048 35.1904 2.38661C35.1904 1.73999 35.4368 1.14127 35.8975 0.678601L35.8984 0.679578ZM33.4277 19.1122C33.2267 19.1123 33.0342 19.1808 32.873 19.3085L32.8057 19.3661L30.6631 21.5116C30.3203 21.8552 30.3202 22.4103 30.6631 22.7538L34.9639 27.0585L35.0303 27.119C35.3754 27.4002 35.8835 27.3805 36.2051 27.0585L38.3447 24.9169L38.4053 24.8495C38.6198 24.5861 38.6577 24.2275 38.5215 23.9296H38.6084L34.0527 19.369C33.8852 19.2014 33.6555 19.1124 33.4277 19.1122ZM19.8408 19.7772C18.439 18.5485 16.3857 18.4376 14.8799 19.4677L14.7305 19.5702L20.4258 25.2714L20.5273 25.121L20.623 24.9725C21.5474 23.4747 21.4112 21.5132 20.2178 20.1552L20.0957 20.0214L19.9746 19.9003L19.8408 19.7772ZM32.2949 7.3827C30.7526 5.98791 28.3925 5.98832 26.8447 7.3827L26.6934 7.52626L18.085 16.1444L17.9795 16.2509L20.75 19.0253L20.7568 19.0302L20.7588 19.0331C20.7608 19.0347 20.7646 19.0372 20.7676 19.0399C20.7747 19.0465 20.7852 19.0564 20.7959 19.0663C20.8184 19.0872 20.8444 19.1118 20.8604 19.1278C20.8754 19.1429 20.89 19.1587 20.9062 19.1766C20.9222 19.1943 20.9417 19.216 20.9629 19.2372L23.7344 22.0116L23.8398 21.9052L32.5537 13.1825L32.5488 13.1776C33.9814 11.6352 33.9955 9.24375 32.5908 7.67958L32.4463 7.52723L32.2949 7.3827ZM15.7021 1.37196C15.5008 1.37197 15.3078 1.43932 15.1465 1.56727L15.0801 1.62587L15.0771 1.62782L12.9375 3.7704C12.5945 4.11399 12.5945 4.66901 12.9375 5.01259L17.2373 9.31727L17.3047 9.37782C17.6328 9.64514 18.1074 9.64008 18.4297 9.36219H18.4434L18.4873 9.31727L20.627 7.17567L20.6875 7.10927C20.9502 6.78719 20.9496 6.32229 20.6875 5.99989L20.627 5.93251L16.3271 1.62782C16.1596 1.46014 15.9299 1.37218 15.7021 1.37196ZM37.6064 1.12391C37.3164 1.12391 37.0378 1.22529 36.8174 1.40712L36.7266 1.49012C36.5302 1.68683 36.4048 1.94419 36.3711 2.22059H36.3594V2.37001C36.3596 2.70165 36.4921 3.01873 36.7256 3.25087L36.8184 3.33387C37.3007 3.72253 38.0473 3.69643 38.4863 3.24989L38.4854 3.24891C38.7163 3.01729 38.8514 2.70174 38.8516 2.37001C38.8515 2.03855 38.7175 1.72134 38.4844 1.48915C38.2531 1.25818 37.9376 1.12422 37.6064 1.12391Z"
        fill={color}
      />
    </svg>
  );
}

function DetectionDetails({ d }) {
  return (
    <Stack gap={4}>
      <DetailRow label="OID" value={d.object_id ?? '—'} />
      <DetailRow label="Vessel" value={d.name || '—'} />
      <DetailRow label="IMO / MMSI" value={`${d.imo || '—'} / ${d.mmsi || '—'}`} />
      <DetailRow label="Flag" value={d.flag_short_code || '—'} />
      <DetailRow label="Size" value={d.length != null ? `${d.length}m × ${d.width ?? '—'}m` : '—'} />
      <DetailRow label="Heading" value={d.heading != null ? `${d.heading}°` : '—'} />
      <DetailRow label="Provider" value={d.provider || '—'} />
      <DetailRow label="Acquired" value={d.acquired ? new Date(d.acquired).toLocaleString() : '—'} />
    </Stack>
  );
}

function SpoofingDetails({ d }) {
  return (
    <Stack gap={4}>
      <DetailRow label="Vessel" value={d.name || '—'} />
      <DetailRow label="IMO / MMSI" value={`${d.imo || '—'} / ${d.mmsi || '—'}`} />
      <DetailRow label="Flag" value={d.flag_short_code || '—'} />
      <DetailRow label="Anomaly" value={d.description || '—'} />
      <DetailRow label="Position" value={formatPosition(d)} />
      <DetailRow label="Time" value={d.timestamp ? new Date(d.timestamp).toLocaleString() : '—'} />
    </Stack>
  );
}

function StsDetails({ d }) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="#888f9e" fw={600}>VESSEL 1</Text>
      <DetailRow label="Name" value={d.name_1 || '—'} />
      <DetailRow label="MMSI" value={d.mmsi_1 || '—'} />
      <DetailRow label="Flag / Type" value={`${d.flag_1 || '—'} / ${d.type_1 || '—'}`} />

      <Divider my={4} color="#393c56" />

      <Text size="xs" c="#888f9e" fw={600}>VESSEL 2</Text>
      <DetailRow label="Name" value={d.name_2 || '—'} />
      <DetailRow label="MMSI" value={d.mmsi_2 || '—'} />
      <DetailRow label="Flag / Type" value={`${d.flag_2 || '—'} / ${d.type_2 || '—'}`} />

      <Divider my={4} color="#393c56" />

      <DetailRow label="Status" value={d.status ? d.status.replace(/_/g, ' ') : '—'} />
      <DetailRow label="Position" value={formatPosition(d)} />
      <DetailRow label="Time" value={d.timestamp_display || '—'} />
    </Stack>
  );
}

function DetailRow({ label, value }) {
  return (
    <Group justify="space-between">
      <Text size="xs" c="#888f9e">{label}</Text>
      <Text size="xs" c="white" fw={500}>{value}</Text>
    </Group>
  );
}
