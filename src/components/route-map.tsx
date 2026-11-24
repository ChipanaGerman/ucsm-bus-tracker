"use client";

import { useState } from "react";
import {
  BusFront,
  Minus,
  Plus,
  LocateFixed,
  Layers,
  GraduationCap,
} from "lucide-react";
import type { BusRoute } from "@/lib/routes";

type Props = {
  route: BusRoute;
  selected: number;
  progress: number | null;
  onSelect: (index: number) => void;
};

export default function RouteMap({
  route,
  selected,
  progress,
  onSelect,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [labels, setLabels] = useState(true);
  const path = route.schematic.map((p) => p.join(",")).join(" ");
  const index =
    progress === null
      ? 0
      : Math.min(
          route.schematic.length - 2,
          Math.floor(progress * (route.schematic.length - 1)),
        );
  const fraction =
    progress === null ? 0 : progress * (route.schematic.length - 1) - index;
  const a = route.schematic[index],
    b = route.schematic[index + 1];
  const bus = [
    a[0] + (b[0] - a[0]) * fraction,
    a[1] + (b[1] - a[1]) * fraction,
  ];
  const selectedPoint = route.schematic[selected];
  return (
    <div
      className="route-map"
      style={{ "--route-color": route.color } as React.CSSProperties}
    >
      <div className="map-topline">
        <span className="map-tag">
          <span className="dot" />
          {route.name}
        </span>
        <span className="map-tag secondary">Vista esquemática</span>
      </div>
      <svg
        className="map-art"
        viewBox="260 40 860 690"
        aria-label={`Esquema interactivo de ${route.name}. Puntos de referencia, no coordenadas geográficas.`}
        role="img"
      >
        <defs>
          <pattern
            id="blocks"
            width="95"
            height="78"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-18)"
          >
            <rect width="95" height="78" fill="#f3f4ef" />
            <rect
              x="7"
              y="7"
              width="81"
              height="64"
              rx="9"
              fill="#e9ece5"
              stroke="#e3e7df"
            />
            <path d="M48 8V70M8 40H87" stroke="#f0f2ec" strokeWidth="4" />
          </pattern>
          <filter id="shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodOpacity=".12" />
          </filter>
        </defs>
        <g
          transform={`translate(${690 * (1 - zoom)},${375 * (1 - zoom)}) scale(${zoom})`}
        >
          <rect
            x="100"
            y="-300"
            width="1500"
            height="1600"
            fill="url(#blocks)"
          />
          <path
            d="M295 30C390 135 395 195 440 260S550 330 580 400S625 510 640 575S715 680 760 760"
            fill="none"
            stroke="#cbdedc"
            strokeWidth="24"
          />
          <path
            d="M295 30C390 135 395 195 440 260S550 330 580 400S625 510 640 575S715 680 760 760"
            fill="none"
            stroke="#dcebea"
            strokeWidth="12"
          />
          <path
            d="M270 345L1040 110M340 620L1110 350M480 10L830 720M290 230L1060 540M710 20L1000 690"
            fill="none"
            stroke="#d8ddd3"
            strokeWidth="15"
          />
          <path
            d="M270 345L1040 110M340 620L1110 350M480 10L830 720M290 230L1060 540M710 20L1000 690"
            fill="none"
            stroke="#fffef9"
            strokeWidth="10"
          />
          <path
            d="M880 530l68-23 35 61-67 27Z M450 130l45-15 23 39-47 17Z M650 250l45-10 12 40-45 10Z"
            fill="#d5e5cb"
          />
          {labels && (
            <g
              fill="#939b8c"
              fontFamily="Arial, sans-serif"
              fontSize="13"
              letterSpacing="3"
            >
              <text x="695" y="85">
                CAYMA
              </text>
              <text x="420" y="240" transform="rotate(-18 420 240)">
                CERRO COLORADO
              </text>
              <text x="890" y="325">
                CERCADO
              </text>
              <text x="420" y="650">
                SACHACA
              </text>
              <text x="850" y="620">
                AREQUIPA
              </text>
            </g>
          )}
          <polyline
            points={path}
            fill="none"
            stroke="white"
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={path}
            fill="none"
            stroke={route.color}
            strokeOpacity=".22"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={path}
            fill="none"
            stroke={route.color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1 0"
          />
          {route.schematic.map(([x, y], i) => (
            <g
              key={`${route.id}-${i}`}
              role="button"
              tabIndex={0}
              aria-label={`Seleccionar ${route.points[i].name}`}
              onClick={() => onSelect(i)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(i);
                }
              }}
              className="map-point"
            >
              <circle cx={x} cy={y} r="15" fill="transparent" />
              <circle
                cx={x}
                cy={y}
                r={selected === i ? 8 : 4.5}
                fill={selected === i ? route.color : "white"}
                stroke={route.color}
                strokeWidth="2.5"
              />
            </g>
          ))}
          <g transform={`translate(${selectedPoint[0]},${selectedPoint[1]})`}>
            <circle r="20" fill={route.color} opacity=".12" />
            <rect
              x="-75"
              y="25"
              width="150"
              height="28"
              rx="7"
              fill="white"
              filter="url(#shadow)"
            />
            <text
              y="43"
              textAnchor="middle"
              fill="#263e35"
              fontSize="10"
              fontWeight="600"
            >
              {route.points[selected].name.length > 25
                ? route.points[selected].name.slice(0, 24) + "…"
                : route.points[selected].name}
            </text>
          </g>
          <g transform="translate(785,580)">
            <rect
              x="0"
              y="0"
              width="88"
              height="45"
              rx="10"
              fill="#e0eddf"
              stroke="#bdd4bb"
            />
            <text
              x="44"
              y="27"
              textAnchor="middle"
              fontSize="13"
              fontWeight="700"
              fill="#366a4a"
            >
              UCSM
            </text>
          </g>
          {progress !== null && (
            <g
              transform={`translate(${bus[0]},${bus[1]})`}
              className="bus-marker"
            >
              <circle r="29" fill={route.color} opacity=".1" />
              <circle r="22" fill="white" filter="url(#shadow)" />
              <circle r="18" fill={route.color} />
              <g transform="translate(-10,-10)">
                <BusFront
                  width="20"
                  height="20"
                  stroke="white"
                  strokeWidth="1.8"
                />
              </g>
            </g>
          )}
        </g>
      </svg>
      <div className="map-controls">
        <button
          aria-label="Acercar mapa"
          onClick={() => setZoom((z) => Math.min(1.7, z + 0.2))}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label="Alejar mapa"
          onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
        >
          <Minus size={18} />
        </button>
        <span />
        <button aria-label="Centrar recorrido" onClick={() => setZoom(1)}>
          <LocateFixed size={18} />
        </button>
        <button
          aria-label={labels ? "Ocultar etiquetas" : "Mostrar etiquetas"}
          aria-pressed={labels}
          onClick={() => setLabels((v) => !v)}
        >
          <Layers size={18} />
        </button>
      </div>
      <div className="map-campus">
        <GraduationCap size={17} />
        <span>Campus Umacollo</span>
      </div>
      <div className="map-legend">
        <span>
          <i style={{ background: route.color }} />
          Recorrido
        </span>
        <span>
          <i className="legend-ring" />
          Referencia
        </span>
        {progress !== null && (
          <span>
            <BusFront size={13} />
            Bus simulado
          </span>
        )}
      </div>
      <span className="map-footnote">
        Esquema ilustrativo · Sin georreferenciación
      </span>
    </div>
  );
}
