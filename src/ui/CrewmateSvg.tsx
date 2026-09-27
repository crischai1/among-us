import { colorOf } from '../../shared/colors';
import { hatOf } from '../../shared/cosmetics';

interface Props {
  color: number;
  /** Index into HATS. */
  hat?: number;
  size?: number;
  dead?: boolean;
  ghost?: boolean;
  facing?: 1 | -1;
  className?: string;
  style?: React.CSSProperties;
}

/** SVG crewmate for menus, meeting cards and cutscenes (matches the canvas drawing). */
export function CrewmateSvg({ color, hat = 0, size = 48, dead, ghost, facing = 1, className, style }: Props) {
  const c = colorOf(color);
  return (
    <svg
      width={size}
      height={size * 1.1}
      viewBox="-22 -44 44 48"
      className={className}
      style={{ transform: facing === -1 ? 'scaleX(-1)' : undefined, opacity: ghost ? 0.55 : 1, overflow: 'visible', ...style }}
      aria-hidden
    >
      <g stroke="#0b0b10" strokeWidth={2.4} strokeLinejoin="round">
        {dead ? (
          <>
            <rect x={-2} y={-26} width={5} height={14} rx={2} fill="#f2f2f2" />
            <circle cx={-1.5} cy={-27} r={3.2} fill="#f2f2f2" />
            <circle cx={2.5} cy={-27} r={3.2} fill="#f2f2f2" />
            <rect x={-9} y={-12} width={10} height={12} rx={3} fill={c.shadow} />
            <rect x={3} y={-12} width={10} height={12} rx={3} fill={c.body} />
            <path d="M-11 -8 L-11 -17 L-7 -20 L-3 -17 L1 -20 L5 -17 L9 -20 L13 -17 L13 -8 Z" fill={c.body} />
          </>
        ) : (
          <>
            {!ghost && <rect x={-9} y={-12} width={10} height={12} rx={3} fill={c.shadow} />}
            <rect x={-17} y={-31} width={9} height={19} rx={3} fill={c.shadow} />
            <path d={ghost ? 'M-11 -8 L-11 -25 C-11 -41 13 -41 13 -25 L13 -8 Q10 -2 7 -6 Q4 0 1 -6 Q-2 0 -5 -6 Q-8 -2 -11 -8 Z' : 'M-11 -8 L-11 -25 C-11 -41 13 -41 13 -25 L13 -8 Z'} fill={c.body} />
            <path d="M-11 -8 L-11 -25 C-11 -30 -9 -33 -6 -35 C-8 -25 -6 -14 -3 -8 Z" fill={c.shadow} stroke="none" />
            {!ghost && <rect x={3} y={-12} width={10} height={12} rx={3} fill={c.body} />}
            <ellipse cx={6} cy={-26} rx={9} ry={6} fill="#4e7a93" />
            <ellipse cx={6.5} cy={-27} rx={7.5} ry={4.3} fill="#93c9e0" stroke="none" />
            <ellipse cx={9} cy={-28.5} rx={3.2} ry={1.6} fill="rgba(255,255,255,0.9)" stroke="none" />
            {hatOf(hat).parts.map((p, i) => (
              <path
                key={i}
                d={p.d}
                fill={p.fill === 'body' ? c.body : p.fill === 'shadow' ? c.shadow : p.fill}
                stroke={p.stroke}
                strokeWidth={p.width}
                strokeLinecap="round"
              />
            ))}
          </>
        )}
      </g>
    </svg>
  );
}
