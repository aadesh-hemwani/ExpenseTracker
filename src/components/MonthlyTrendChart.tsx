import { useMemo, useState, memo } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    LabelList,
    TooltipProps,
} from "recharts";
import { formatCurrency } from "../utils/formatUtils";

const CustomTooltip = memo(({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-[#1a1b1e]/90 backdrop-blur-xl p-4 border border-white/20 dark:border-white/5 shadow-2xl rounded-2xl flex flex-col gap-1 min-w-[120px]">
                <p className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-[0.15em]">{label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(payload[0].value as number)}
                </p>
                <div className="w-6 h-[2px] bg-accent rounded-full mt-1.5" />
            </div>
        );
    }
    return null;
});

CustomTooltip.displayName = "CustomTooltip";

export interface MonthlyTrendChartProps {
    data: { name: string; total: number; key: string }[];
    gridColor: string;
    textColor: string;
    accentColor: string;
    accentColors: any;
}

const MonthlyTrendChart = memo(({
    data,
    gridColor,
    textColor,
    accentColor,
    accentColors,
}: MonthlyTrendChartProps) => {
    const maxTotal = useMemo(() => Math.max(...data.map((d) => d.total || 0)), [data]);
    const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
    const primaryColor = useMemo(() => accentColors[accentColor]?.default || "#6366f1", [accentColor, accentColors]);

    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 25, right: 0, left: 30, bottom: 0 }}
                onMouseMove={(state) => {
                    if (state.activeTooltipIndex !== undefined && state.activeTooltipIndex !== null) {
                        setHoveredIndex(state.activeTooltipIndex);
                    } else {
                        setHoveredIndex(null);
                    }
                }}
                onMouseLeave={() => setHoveredIndex(null)}
            >
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={0.7} />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity={0.15} />
                    </linearGradient>
                    <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={1} />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity={0.5} />
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <CartesianGrid
                    strokeDasharray="4 4"
                    vertical={false}
                    stroke={gridColor}
                    strokeOpacity={0.35}
                />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                        const isZero = data.find(d => d.name === payload.value)?.total === 0;
                        return (
                            <text
                                x={x}
                                y={y + 16}
                                fill={textColor}
                                textAnchor="middle"
                                fontSize={10}
                                fontWeight={isZero ? 500 : 700}
                                opacity={isZero ? 0.35 : 0.75}
                                className="uppercase tracking-wider font-bold"
                            >
                                {payload.value}
                            </text>
                        );
                    }}
                />
                <YAxis
                    hide
                    axisLine={false}
                    tickLine={false}
                />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={false}
                />
                <Bar
                    dataKey="total"
                    radius={[6, 6, 0, 0]}
                    barSize={28}
                    animationDuration={1000}
                    animationBegin={0}
                >
                    <LabelList
                        dataKey="total"
                        position="top"
                        content={(props: any) => {
                            const { x, y, width, value, index } = props;
                            const isHighlighted = data[index]?.total === maxTotal || data[index]?.key === currentMonthKey;
                            if (value === 0 || !isHighlighted) return null;
                            
                            const isDimmed = hoveredIndex !== null && hoveredIndex !== index;
                            
                            return (
                                <text
                                    x={(x as number) + (width as number) / 2}
                                    y={(y as number) - 8}
                                    fill={primaryColor}
                                    textAnchor="middle"
                                    fontSize={9}
                                    fontWeight="black"
                                    opacity={isDimmed ? 0.2 : 0.9}
                                    className="drop-shadow-sm font-bold tracking-wider"
                                >
                                    {formatCurrency(value)}
                                </text>
                            );
                        }}
                    />
                    {data.map((entry, index) => {
                        const isMax = entry.total === maxTotal && maxTotal > 0;
                        const isCurrent = entry.key === currentMonthKey;
                        const isHighlighted = isMax || isCurrent;
                        const isZero = entry.total === 0;

                        const isHovered = hoveredIndex === index;
                        const isAnyHovered = hoveredIndex !== null;

                        const opacity = isHovered 
                            ? 1 
                            : isAnyHovered 
                                ? 0.15 
                                : (isHighlighted ? 0.9 : (isZero ? 0.1 : 0.45));

                        return (
                            <Cell
                                key={`cell-${index}`}
                                fill={isHighlighted ? "url(#highlightGradient)" : "url(#barGradient)"}
                                fillOpacity={opacity}
                                filter={isHovered && !isZero ? "url(#glow)" : "none"}
                                className="transition-all duration-300 cursor-pointer"
                            />
                        );
                    })}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
});

MonthlyTrendChart.displayName = "MonthlyTrendChart";

export default MonthlyTrendChart;