
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Paper, Text, Checkbox } from '@mantine/core';
import DeckGL from '@deck.gl/react';
import { IconLayer } from '@deck.gl/layers';
import { FlyToInterpolator, WebMercatorViewport } from '@deck.gl/core';
import { Map } from 'react-map-gl/maplibre';
import { Plus, Minus, X } from '@untitled-ui/icons-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import shipIcon from '../assets/Icons/ShipIcon.svg';

import UnattributedRaw from '../assets/Icons/UnattributedIcon.svg?raw';
import DarkRaw from '../assets/Icons/DarkIcon.svg?raw';
import LightRaw from '../assets/Icons/LightIcon.svg?raw';
import AisRaw from '../assets/Icons/AisIcon.svg?raw';
import SpoofingPositionRaw from '../assets/Icons/SpoofingPositionIcon.svg?raw';
import STSDefaultRaw from '../assets/Icons/STSDefault.svg?raw';
import ActiveHaloRaw from '../assets/Icons/ActiveHalo.svg?raw';

const DARK_BASEMAP = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// deck.gl rasterizes each icon into a texture atlas at the SVG's intrinsic pixel
// size, so a 14×22 SVG scaled up to display size looks blurry. Render the SVG to
// a supersampled bitmap (via a sized data URL) so markers stay crisp.
const SUPERSAMPLE = 4;

function buildIcon({ id, raw, w, h, anchor = 'bottom' }) {
  const sw = w * SUPERSAMPLE;
  const sh = h * SUPERSAMPLE;
  const sized = raw
    .replace(/width="[^"]*"/, `width="${sw}"`)
    .replace(/height="[^"]*"/, `height="${sh}"`);
  return {
    id,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`,
    width: sw,
    height: sh,
    anchorX: sw / 2,
    anchorY: anchor === 'bottom' ? sh : sh / 2,
    mask: false,
  };
}

// Detection type → marker icon. Each detection type uses its same-named SVG.
const TYPE_ICONS = {
  Unattributed: buildIcon({ id: 'unattributed', raw: UnattributedRaw, w: 14, h: 22 }),
  Dark:         buildIcon({ id: 'dark', raw: DarkRaw, w: 14, h: 22 }),
  Light:        buildIcon({ id: 'light', raw: LightRaw, w: 14, h: 22 }),
  AIS:          buildIcon({ id: 'ais', raw: AisRaw, w: 14, h: 22 }),
  spoofing:     buildIcon({ id: 'spoofing', raw: SpoofingPositionRaw, w: 21, h: 21, anchor: 'center' }),
  sts:          buildIcon({ id: 'sts', raw: STSDefaultRaw, w: 20, h: 20, anchor: 'center' }),
};

// Glow drawn behind the selected marker to indicate an active/selected state.
const HALO_ICON = buildIcon({ id: 'active-halo', raw: ActiveHaloRaw, w: 50, h: 50, anchor: 'center' });
const HALO_SIZE = 44;
const MARKER_SIZE = 26;

// Detection type → legend entry. Keys match both detection_type values and
// multiLayer `type` values; each uses the same SVG as its map marker.
const svgDataUri = (raw) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;

const LEGEND = {
  Unattributed: { label: 'Unattributed', icon: svgDataUri(UnattributedRaw) },
  Dark: { label: 'Dark', icon: svgDataUri(DarkRaw) },
  Light: { label: 'Light', icon: svgDataUri(LightRaw) },
  AIS: { label: 'AIS', icon: svgDataUri(AisRaw) },
  spoofing: { label: 'Spoofing', icon: svgDataUri(SpoofingPositionRaw) },
  sts: { label: 'STS', icon: svgDataUri(STSDefaultRaw) },
};

function getIcon(d) {
  if (d.detection_type && TYPE_ICONS[d.detection_type]) return TYPE_ICONS[d.detection_type];
  if (d._layerType && TYPE_ICONS[d._layerType]) return TYPE_ICONS[d._layerType];
  return TYPE_ICONS.Unattributed;
}

// Match a selected detection against a map point. The selected object may be a
// copy (e.g. a clicked marker) or a table row, so match on stable ids first.
function isSameDetection(a, b) {
  if (!a || !b) return false;
  if (a.object_id != null && b.object_id != null) return a.object_id === b.object_id;
  if (a.event_id != null && b.event_id != null) return a.event_id === b.event_id;
  const aLon = a.lon ?? a.longitude, aLat = a.lat ?? a.latitude;
  const bLon = b.lon ?? b.longitude, bLat = b.lat ?? b.latitude;
  if (aLon == null || aLat == null) return false;
  return aLon === bLon && aLat === bLat && (a.timestamp ?? null) === (b.timestamp ?? null);
}

/**
 * Reusable deck.gl detection map.
 * 
 * Props:
 *   data        - Array of detection objects with lat/lon
 *   viewState   - { longitude, latitude, zoom } initial view
 *   onClick     - (detection) => void
 *   height      - CSS height (default 400)
 *   layers      - Optional custom layers array (overrides default)
 *   multiLayer  - Array of { data, type } for multi-layer maps (e.g. Intel overview)
 *   selected    - Currently selected detection (renders an active-state halo)
 */
export function DetectionMap({ 
  data = [], 
  viewState, 
  onClick, 
  height = 400,
  multiLayer = null,
  selected = null,
  markerType = null,
}) {
  // Calculate auto viewState from data bounds if not provided
  const autoViewState = useMemo(() => {
    if (viewState) return viewState;
    const allData = multiLayer 
      ? multiLayer.flatMap(l => l.data || []) 
      : data;
    if (!allData.length) return { longitude: 35, latitude: 43, zoom: 5 };
    
    const lats = allData.map(d => d.lat ?? d.latitude).filter(v => v != null);
    const lons = allData.map(d => d.lon ?? d.longitude).filter(v => v != null);
    if (!lats.length) return { longitude: 35, latitude: 43, zoom: 5 };
    
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    const latSpan = maxLat - minLat;
    const lonSpan = maxLon - minLon;
    const span = Math.max(latSpan, lonSpan);
    const zoom = span > 10 ? 4 : span > 5 ? 5 : span > 2 ? 7 : span > 0.5 ? 9 : 11;
    
    return {
      longitude: (minLon + maxLon) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom,
    };
  }, [data, multiLayer, viewState]);

  // Controlled view so we can fly to an off-screen selected detection.
  const containerRef = useRef(null);
  const [view, setView] = useState(autoViewState);
  const viewRef = useRef(view);
  const handleViewStateChange = useCallback(({ viewState }) => {
    viewRef.current = viewState;
    setView(viewState);
  }, []);

  const zoomBy = useCallback((delta) => {
    const cur = viewRef.current;
    setView({
      ...cur,
      zoom: Math.min(Math.max((cur.zoom ?? 6) + delta, 1), 18),
      transitionDuration: 250,
      transitionInterpolator: new FlyToInterpolator({ speed: 2 }),
    });
  }, []);

  const recenter = useCallback(() => {
    setView({
      ...autoViewState,
      transitionDuration: 600,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.6 }),
    });
  }, [autoViewState]);

  // Per-map detection-type filters (toggled via the ship/filter button).
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set());
  const toggleKey = useCallback((k) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  // When a detection is selected (e.g. from a table row) that belongs to this
  // map but is outside the current viewport, smoothly fly to it. If it's already
  // visible, leave the view as-is so clicking a visible marker doesn't jump.
  //
  // Only react to an actual *change* of selection — not to every render. (Some
  // callers don't pass `data`, so the default `[]` is a fresh array each render
  // and would otherwise re-fire this effect and snap the map back after panning.)
  const lastFlownKey = useRef(null);
  useEffect(() => {
    if (!selected) {
      lastFlownKey.current = null;
      return;
    }
    const lon = selected.lon ?? selected.longitude;
    const lat = selected.lat ?? selected.latitude;
    if (lon == null || lat == null) return;

    const key =
      selected.object_id ??
      selected.event_id ??
      `${lon},${lat},${selected.timestamp ?? ''}`;
    if (key === lastFlownKey.current) return;
    lastFlownKey.current = key;

    const all = multiLayer ? multiLayer.flatMap((l) => l.data || []) : data;
    if (!all.some((p) => isSameDetection(p, selected))) return;

    const el = containerRef.current;
    const width = el?.clientWidth || 800;
    const height = el?.clientHeight || 400;
    const cur = viewRef.current;

    let inView = false;
    try {
      const vp = new WebMercatorViewport({ width, height, ...cur });
      const [x, y] = vp.project([lon, lat]);
      const margin = 48;
      inView = x >= margin && x <= width - margin && y >= margin && y <= height - margin;
    } catch {
      inView = false;
    }
    if (inView) return;

    setView({
      ...cur,
      longitude: lon,
      latitude: lat,
      zoom: Math.max(cur.zoom ?? 6, 9),
      transitionDuration: 700,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.6 }),
    });
  }, [selected, data, multiLayer]);

  // Detection type keys actually present on this map (drives legend + filters).
  const presentKeys = useMemo(() => {
    const keys = new Set();
    if (multiLayer) {
      multiLayer.forEach((l) => { if (l.data && l.data.length) keys.add(l.type); });
    } else {
      data.forEach((d) => keys.add(d.detection_type || markerType || 'Unattributed'));
    }
    return [...keys].filter((k) => LEGEND[k]);
  }, [data, multiLayer, markerType]);

  const legendItems = useMemo(
    () => presentKeys.map((k) => ({ key: k, ...LEGEND[k] })),
    [presentKeys]
  );

  const handleClick = useCallback((info) => {
    if (info.object && onClick) {
      onClick(info.object);
    }
  }, [onClick]);

  // Build layers
  const deckLayers = useMemo(() => {
    const sources = multiLayer || [{ data, type: markerType || 'default' }];

    // The filter key for a point: the layer type for multi-layer maps, else the
    // record's own detection type (so single-data maps filter per record).
    const keyOf = (d, sourceType) =>
      sourceType && sourceType !== 'default'
        ? sourceType
        : (d.detection_type || markerType || 'Unattributed');

    // Find the selected detection within this map's own points (if present), so
    // the halo only shows on the map that actually contains it, anchored to that
    // point's real coordinates.
    let selectedPoint = null;
    const markerLayers = sources.map((source, i) => {
      const pts = (source.data || [])
        .map(d => ({ ...d, _layerType: source.type }))
        .filter(d => !hiddenKeys.has(keyOf(d, source.type)));
      if (selected && !selectedPoint) {
        selectedPoint = pts.find(p => isSameDetection(p, selected)) || null;
      }
      
      return new IconLayer({
        id: `detections-${source.type || i}`,
        data: pts,
        getPosition: d => [d.lon ?? d.longitude ?? 0, d.lat ?? d.latitude ?? 0],
        getIcon: d => getIcon(d),
        getSize: MARKER_SIZE,
        sizeUnits: 'pixels',
        billboard: true,
        pickable: true,
        onClick: handleClick,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
      });
    });

    if (!selectedPoint) return markerLayers;

    // Bottom-anchored pins have their body above the geo point, so nudge the halo
    // up to center it on the marker body; center-anchored icons (STS) need no shift.
    const icon = getIcon(selectedPoint);
    const bottomAnchored = icon.anchorY === icon.height;
    const haloOffset = bottomAnchored ? [0, -MARKER_SIZE / 2] : [0, 0];
    const getPosition = d => [d.lon ?? d.longitude ?? 0, d.lat ?? d.latitude ?? 0];

    // Draw the halo above the other markers, then re-draw the selected marker on
    // top, so the active detection clearly pops above any overlapping markers.
    const haloLayer = new IconLayer({
      id: 'active-halo',
      data: [selectedPoint],
      getPosition,
      getIcon: () => HALO_ICON,
      getSize: HALO_SIZE,
      getPixelOffset: haloOffset,
      sizeUnits: 'pixels',
      billboard: true,
      pickable: false,
    });

    const selectedMarkerLayer = new IconLayer({
      id: 'selected-marker',
      data: [selectedPoint],
      getPosition,
      getIcon: d => getIcon(d),
      getSize: MARKER_SIZE,
      sizeUnits: 'pixels',
      billboard: true,
      pickable: false,
    });

    return [...markerLayers, haloLayer, selectedMarkerLayer];
  }, [data, multiLayer, handleClick, selected, markerType, hiddenKeys]);

  if (!data.length && !multiLayer?.some(l => l.data?.length)) {
    return (
      <Paper 
        radius={8} 
        style={{ 
          background: '#181926', 
          border: '1px solid #393c56', 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}
      >
        <Text c="#888f9e" size="sm">No detections to display</Text>
      </Paper>
    );
  }

  return (
    <Paper 
      ref={containerRef}
      radius={8} 
      style={{ 
        background: '#181926', 
        border: '1px solid #393c56', 
        height, 
        position: 'relative', 
        overflow: 'hidden',
        borderRadius: 8,
      }}
    >
      <DeckGL
        viewState={view}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={deckLayers}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        getCursor={({isHovering}) => isHovering ? 'pointer' : 'grab'}
      >
        <Map mapStyle={DARK_BASEMAP} attributionControl={false} />
      </DeckGL>

      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div className="map-ctrl-group">
          <button type="button" className="map-ctrl-btn" aria-label="Zoom in" onClick={() => zoomBy(1)}>
            <Plus width={18} height={18} />
          </button>
          <div className="map-ctrl-divider" />
          <button type="button" className="map-ctrl-btn" aria-label="Zoom out" onClick={() => zoomBy(-1)}>
            <Minus width={18} height={18} />
          </button>
        </div>
        {presentKeys.length > 1 && (
          <div className="map-ctrl-group" data-active={filtersOpen || undefined}>
            <button
              type="button"
              className="map-ctrl-btn"
              aria-label="Ship filters"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <img src={shipIcon} alt="" width={18} height={18} style={{ display: 'block' }} />
            </button>
          </div>
        )}
      </div>

      {filtersOpen && presentKeys.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 50,
            zIndex: 2,
            width: 220,
            background: '#24263C',
            border: '1px solid #393c56',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderBottom: '1px solid #393c56',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>Ship Filters</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setHiddenKeys(new Set())}
                style={{
                  appearance: 'none',
                  background: 'transparent',
                  border: 'none',
                  color: '#888f9e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: 'inherit',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: 0,
                }}
              >
                Reset
              </button>
              <button
                type="button"
                aria-label="Close filters"
                onClick={() => setFiltersOpen(false)}
                style={{
                  appearance: 'none',
                  background: 'transparent',
                  border: 'none',
                  color: '#888f9e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <X width={16} height={16} />
              </button>
            </div>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {presentKeys.map((k) => {
              const item = LEGEND[k];
              return (
                <label
                  key={k}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                >
                  <Checkbox
                    size="xs"
                    color="#006CD7"
                    checked={!hiddenKeys.has(k)}
                    onChange={() => toggleKey(k)}
                  />
                  <img src={item.icon} alt="" style={{ height: 16, width: 'auto', display: 'block' }} />
                  <span style={{ color: '#fff', fontSize: 13 }}>{item.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {legendItems.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 1,
            background: '#181926',
            border: '1px solid #393c56',
            borderRadius: 4,
            padding: '6px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            pointerEvents: 'none',
          }}
        >
          {legendItems.map((it) => (
            <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 18, display: 'flex', justifyContent: 'center' }}>
                <img src={it.icon} alt="" style={{ height: 16, width: 'auto', display: 'block' }} />
              </span>
              <span style={{ fontSize: 11, color: '#ffffff' }}>{it.label}</span>
            </div>
          ))}
        </div>
      )}
    </Paper>
  );
}
