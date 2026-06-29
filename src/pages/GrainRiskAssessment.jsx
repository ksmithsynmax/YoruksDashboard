
import { useState, useMemo, useEffect } from 'react';
import { Stack, Text, Paper, Group } from '@mantine/core';
import { TypeBadge } from '../components/TypeBadge';
import { useMultipleDatasets } from '../hooks/useDataset';
import { KpiCard } from '../components/KpiCard';
import { DetectionTable } from '../components/DetectionTable';
import { DetectionMap } from '../components/DetectionMap';
import { SatelliteChip } from '../components/SatelliteChip';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { ViewSwitcher } from '../components/ViewSwitcher';
import theiaLogo from '../assets/TheiaLogo.svg';
import unattributedIcon from '../assets/Icons/UnattributedIcon.svg';
import darkIcon from '../assets/Icons/DarkIcon.svg';
import lightIcon from '../assets/Icons/LightIcon.svg';

const DATASETS = [
  'port_mariupol',
  'port_berdyansk',
  'port_feodosia',
  'port_kerch',
  'port_novorossiysk_unattr',
  'port_novorossiysk_light',
];

const RISK_COLORS = { HIGH: '#F75349', MODERATE: '#FFA500', LOW: '#22c55e' };

const PORTS = [
  { key: 'mariupol', name: 'Mariupol', lat: '46.95°N', lon: '37.55°E', desc: 'Major Azov Sea grain terminal', center: [37.55, 46.95], zoom: 10, datasets: ['port_mariupol'] },
  { key: 'berdyansk', name: 'Berdyansk', lat: '46.76°N', lon: '36.80°E', desc: 'Azov Sea port', center: [36.80, 46.76], zoom: 10, datasets: ['port_berdyansk'] },
  { key: 'feodosia', name: 'Feodosia', lat: '45.04°N', lon: '35.40°E', desc: 'Crimean grain port', center: [35.40, 45.04], zoom: 11, datasets: ['port_feodosia'] },
  { key: 'kerch', name: 'Kerch', lat: '45.35°N', lon: '36.47°E', desc: 'Kerch Strait gateway', center: [36.47, 45.35], zoom: 9, datasets: ['port_kerch'] },
  { key: 'novorossiysk', name: 'Novorossiysk', lat: '44.72°N', lon: '37.78°E', desc: "Russia's largest Black Sea port", center: [37.78, 44.72], zoom: 10, datasets: ['port_novorossiysk_unattr', 'port_novorossiysk_light'] },
];

export function GrainRiskAssessment({ activeTab, onTabChange }) {
  const { datasets, loading } = useMultipleDatasets(DATASETS);

  // Find latest date across all port data
  const reportDate = useMemo(() => {
    const allData = DATASETS.flatMap((d) => datasets[d] || []);
    const dates = allData.map((r) => r.acquired).filter(Boolean).sort();
    return dates.length > 0 ? dates[dates.length - 1].slice(0, 10) : '—';
  }, [datasets]);

  if (loading) return <Text c="#888f9e">Loading grain risk data…</Text>;

  return (
    <Stack gap={8}>
      <Paper p="xl" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <img src={theiaLogo} alt="Theia" height={40} style={{ display: 'block' }} />
            <Text
              size="xs"
              c="#888f9e"
              fw={700}
              tt="uppercase"
              mt={28}
              style={{ letterSpacing: '0.12em' }}
            >
              Port-by-Port Analysis • Cargo Vessels 90–200m • Optical Satellite Detections
            </Text>
            <Text
              c="white"
              fw={800}
              mt={2}
              mb="md"
              style={{ fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
              Grain Movement Risk Assessment
            </Text>
            <ViewSwitcher active={activeTab} onChange={onTabChange} />
            <Group gap="lg" mt="lg">
              <Group gap={6}><img src={unattributedIcon} alt="" height={16} style={{ display: 'block' }} /><Text size="xs" c="#888f9e">Unattributed (no AIS)</Text></Group>
              <Group gap={6}><img src={darkIcon} alt="" height={16} style={{ display: 'block' }} /><Text size="xs" c="#888f9e">Dark (AIS off)</Text></Group>
              <Group gap={6}><img src={lightIcon} alt="" height={16} style={{ display: 'block' }} /><Text size="xs" c="#888f9e">Light (AIS on)</Text></Group>
            </Group>
          </div>
          <span
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #393c56',
              background: '#181926',
              color: '#888f9e',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Daily Snapshot • {reportDate}
          </span>
        </Group>
      </Paper>

      {PORTS.map((port) => {
        const allData = port.datasets.flatMap((d) => datasets[d] || []);
        const unattr = allData.filter((r) => r.detection_type === 'Unattributed');
        const dark = allData.filter((r) => r.detection_type === 'Dark');
        const light = allData.filter((r) => r.detection_type === 'Light');
        const total = allData.length;
        const risk = total > 100 ? 'HIGH' : total > 20 ? 'MODERATE' : 'LOW';

        return (
          <PortSection
            key={port.key}
            port={port}
            risk={risk}
            counts={{ unattr: unattr.length, dark: dark.length, light: light.length, total }}
            data={allData}
          />
        );
      })}

      {/* Methodology */}
      <Methodology reportDate={reportDate} />

      <DisclaimerFooter />
    </Stack>
  );
}

function PortSection({ port, risk, counts, data }) {
  const [selected, setSelected] = useState(null);

  // Default to the latest detection in this port; keep current if still present.
  useEffect(() => {
    if (data.length === 0) return;
    setSelected((cur) =>
      cur && data.some((r) => r.object_id === cur.object_id) ? cur : latestByDate(data)
    );
  }, [data]);

  const tableData = data.map((r) => ({
    OID: r.object_id,
    Type: r.detection_type || 'Unattributed',
    Acquired: r.acquired?.slice(0, 10) || '—',
    Lat: r.lat?.toFixed(3),
    Lon: r.lon?.toFixed(3),
    'Length(m)': r.length,
    'Width(m)': r.width,
    Hdg: r.heading,
    Vessel: r.name || '—',
    IMO: r.imo || '—',
    Provider: r.provider || '—',
  }));

  // Port-centered view
  const portView = {
    longitude: port.center[0],
    latitude: port.center[1],
    zoom: port.zoom,
  };

  return (
    <Paper p="md" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
      <Group justify="space-between" align="flex-start" mb="sm">
        <div>
          <Text size="sm" fw={700} c="white">{port.name.toUpperCase()}</Text>
          <Text size="xs" c="#888f9e" mt={2}>{port.lat}, {port.lon} • {port.desc}</Text>
        </div>
          <TypeBadge color={RISK_COLORS[risk]}>{risk} RISK</TypeBadge>
      </Group>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}><KpiCard label="Unattributed" value={counts.unattr} iconSrc={unattributedIcon} bg="#181926" /></div>
        <div style={{ flex: 1 }}><KpiCard label="Dark" value={counts.dark} iconSrc={darkIcon} bg="#181926" /></div>
        <div style={{ flex: 1 }}><KpiCard label="Light" value={counts.light} iconSrc={lightIcon} bg="#181926" /></div>
        <div style={{ flex: 1 }}><KpiCard label="Total" value={counts.total} bg="#181926" /></div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div style={{ flex: 2 }}>
          <DetectionMap
            data={data}
            viewState={portView}
            onClick={setSelected}
            selected={selected}
            height="100%"
          />
        </div>
        <div style={{ flex: 1 }}>
          <SatelliteChip detection={selected} />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <DetectionTable
          bare
          data={tableData}
          columns={['OID', 'Type', 'Acquired', 'Lat', 'Lon', 'Length(m)', 'Width(m)', 'Hdg', 'Vessel', 'IMO', 'Provider']}
          onRowClick={(row) => {
            const raw = data.find((r) => r.object_id === row.OID);
            if (raw) setSelected(raw);
          }}
          isRowActive={(row) => selected && row.OID === selected.object_id}
          maxHeight={250}
        />
      </div>
    </Paper>
  );
}

const SCORE_FACTORS = [
  {
    factor: 'Detection Type',
    weight: '40 pts',
    criteria: 'Unattributed = 40 • Dark = 30 • Light = 0',
    rationale:
      'Unattributed vessels have no AIS match — actively concealing identity. Dark vessels turned AIS off deliberately. Light vessels are operating transparently.',
  },
  {
    factor: 'Size Match',
    weight: '30 pts',
    criteria: '150–200 m = 30 • 120–149 m = 25 • 90–119 m = 15',
    rationale:
      'Grain smuggling uses Handysize/Handymax bulk carriers. 150–200 m (Handymax) is the ideal size — large enough for bulk grain, small enough to avoid attention.',
  },
  {
    factor: 'Beam Signature',
    weight: '15 pts',
    criteria: 'Width 20–35 m on 120+ m hull = 15 • 15–19 m = 10 • Narrow / NULL = 0',
    rationale:
      'Bulk carriers have distinctive wide beams (width/length ratio ~0.14–0.20). This separates grain-capable vessels from container ships and tankers of similar length.',
  },
  {
    factor: 'Sensor Confidence',
    weight: '15 pts',
    criteria: 'PlanetScope = 15 • Sentinel-2 = 10 • Sentinel-1 SAR = 5',
    rationale:
      'Higher-resolution optical sensors provide more reliable size/type classification. SAR detects vessels through clouds but cannot confirm width or visual type.',
  },
];

function Methodology({ reportDate }) {
  const cellStyle = {
    padding: '10px 12px',
    borderTop: '1px solid #393c56',
    verticalAlign: 'top',
    color: '#888f9e',
    fontSize: 12,
    lineHeight: 1.5,
  };
  const headStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    background: '#181926',
    color: 'white',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  };

  return (
    <Paper p="md" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
      <Text size="sm" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
        Methodology — Data Collection &amp; Risk Scoring
      </Text>

      <Text size="sm" fw={600} c="white" mt="md">Data Collection</Text>
      <Text size="xs" c="#888f9e" mt={4} style={{ lineHeight: 1.6 }}>
        Port monitoring uses a 50 km radius from each port center. Detections are cargo-type vessels
        90–200 m (Handysize / Handymax grain carriers) from 1001_detections (satellite-verified
        optical imagery). Single-day snapshot: {reportDate}.
      </Text>

      <Text size="xs" c="#888f9e" fw={600} mt="xs">Classification</Text>
      <Stack gap={6} mt={4}>
        <Group gap={8} wrap="nowrap" align="flex-start">
          <img src={unattributedIcon} alt="" height={14} style={{ display: 'block', marginTop: 2, flexShrink: 0 }} />
          <Text size="xs" c="#888f9e" style={{ lineHeight: 1.5 }}>
            <strong style={{ color: 'white' }}>Unattributed</strong> = no synmax_ship_id (cannot be matched to any known vessel — highest suspicion)
          </Text>
        </Group>
        <Group gap={8} wrap="nowrap" align="flex-start">
          <img src={darkIcon} alt="" height={14} style={{ display: 'block', marginTop: 2, flexShrink: 0 }} />
          <Text size="xs" c="#888f9e" style={{ lineHeight: 1.5 }}>
            <strong style={{ color: 'white' }}>Dark</strong> = attributed vessel with AIS off at time of detection
          </Text>
        </Group>
        <Group gap={8} wrap="nowrap" align="flex-start">
          <img src={lightIcon} alt="" height={14} style={{ display: 'block', marginTop: 2, flexShrink: 0 }} />
          <Text size="xs" c="#888f9e" style={{ lineHeight: 1.5 }}>
            <strong style={{ color: 'white' }}>AIS-Light</strong> = AIS active, satellite confirmed position
          </Text>
        </Group>
      </Stack>

      <Text size="sm" fw={600} c="white" mt="lg">Grain Smuggling Risk Score (0–100)</Text>
      <Text size="xs" c="#888f9e" mt={4} style={{ lineHeight: 1.6 }}>
        Each detection is scored on four intelligence factors. Higher scores indicate greater
        likelihood of illicit grain movement.
      </Text>

      <div
        style={{
          marginTop: 12,
          border: '1px solid #393c56',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headStyle}>Factor</th>
              <th style={headStyle}>Weight</th>
              <th style={headStyle}>Scoring Criteria</th>
              <th style={headStyle}>Rationale</th>
            </tr>
          </thead>
          <tbody>
            {SCORE_FACTORS.map((f) => (
              <tr key={f.factor}>
                <td style={{ ...cellStyle, color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.factor}</td>
                <td style={{ ...cellStyle, color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.weight}</td>
                <td style={cellStyle}>{f.criteria}</td>
                <td style={cellStyle}>{f.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Text size="xs" c="#888f9e" mt="md" style={{ lineHeight: 1.6 }}>
        <strong style={{ color: 'white' }}>Interpretation:</strong> A score of 100 = unattributed
        Handymax vessel with bulk carrier beam proportions in high-res PlanetScope imagery — the
        highest-probability smuggling candidate. Ties are broken by vessel length (larger = more
        cargo capacity). Source: 1001_detections satellite optical imagery.
      </Text>
    </Paper>
  );
}

function latestByDate(list) {
  let best = null;
  let bestT = '';
  for (const r of list) {
    const t = r.acquired || r.timestamp || '';
    if (t && t > bestT) {
      bestT = t;
      best = r;
    }
  }
  return best || list[0] || null;
}
