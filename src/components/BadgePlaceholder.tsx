import type { GeneratorState } from '../features/generatorSlice';

type BadgePlaceholderProps = Readonly<{
  title: string;
  description: string;
  data: GeneratorState;
}>;

export function BadgePlaceholder({ title, description, data }: BadgePlaceholderProps) {
  const currentStation = data.stnList.find((station) => station.id === data.currentStnId);
  const segmentCount = Math.max(data.stnList.length - 1, 0);
  const stnDis = segmentCount === 0 ? 0 : data.totalLength / segmentCount;

  return (
    <svg viewBox="0 0 640 180" className="badge-svg" role="img" aria-label={title}>
      <rect x="1" y="1" width="638" height="178" rx="22" fill="#ffffff" stroke="#cbd5dc" strokeWidth="2" />
      <rect x="20" y="20" width="160" height="40" rx="14" fill="#dff9f7" stroke="#8bd9d0" />
      <text x="40" y="46" fill="#0b1114" fontSize="22" fontWeight="700">
        {title}
      </text>
      <text x="24" y="92" fill="#51616a" fontSize="20">
        {description}
      </text>
      <text x="24" y="126" fill="#0b1114" fontSize="18">
        当前站点: {currentStation?.chName ?? '未选择'} / {currentStation?.enName ?? 'N/A'}
      </text>
      <text x="24" y="154" fill="#51616a" fontSize="16">
        站点数: {data.stnList.length} | 总长: {data.totalLength}px | 站间距: {stnDis.toFixed(2)}px | 方向: {data.direction}
      </text>
      <circle cx="548" cy="42" r="12" fill={data.idColor} stroke="#9fb0b9" />
      <text x="568" y="47" fill="#51616a" fontSize="14">
        idColor
      </text>
      <text x="462" y="154" fill="#7f8e96" fontSize="14">
        SVG placeholder
      </text>
    </svg>
  );
}
