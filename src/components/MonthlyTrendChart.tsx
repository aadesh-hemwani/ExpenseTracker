import React, { useMemo, memo } from "react";
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
            <div className="bg-white/10 dark:bg-gray-900/90 backdrop-blur-xl p-3 border border-gray-100/10 dark:border-white/10 shadow-2xl rounded-2xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-lg font-black text-gray-900 dark:text-white">
                    {formatCurrency(payload[0].value as number)}
                </p>
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
    cursorColor: string;
    accentColor: string;
    accentColors: any;
}

const MonthlyTrendChart = memo(({
    data,
    gridColor,
    textColor,
    cursorColor,
    accentColor,
    accentColors,
}: MonthlyTrendChartProps) => {
    const maxTotal = useMemo(() => Math.max(...data.map((d) => d.total || 0)), [data]);
    const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);
    const primaryColor = useMemo(() => accentColors[accentColor]?.default || "#6366f1", [accentColor, accentColors]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 25, right: 0, left: 30, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="highlightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={primaryColor} stopOpacity={1} />
                        <stop offset="100%" stopColor={primaryColor} stopOpacity={0.6} />
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
                    strokeOpacity={0.4}
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
                                fontSize={11}
                                fontWeight={isZero ? 400 : 600}
                                opacity={isZero ? 0.3 : 0.8}
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
                    cursor={{ fill: cursorColor, opacity: 0.1 }}
                />
                <Bar
                    dataKey="total"
                    radius={[8, 8, 8, 8]}
                    barSize={32}
                    animationDuration={1200}
                    animationBegin={0}
                >
                    <LabelList
                        dataKey="total"
                        position="top"
                        content={(props: any) => {
                            const { x, y, width, value, index } = props;
                            const isHighlighted = data[index]?.total === maxTotal || data[index]?.key === currentMonthKey;
                            if (value === 0 || !isHighlighted) return null;
                            return (
                                <text
                                    x={(x as number) + (width as number) / 2}
                                    y={(y as number) - 10}
                                    fill={primaryColor}
                                    textAnchor="middle"
                                    fontSize={10}
                                    fontWeight="bold"
                                    className="drop-shadow-sm"
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

                        return (
                            <Cell
                                key={`cell-${index}`}
                                fill={isHighlighted ? "url(#highlightGradient)" : "url(#barGradient)"}
                                fillOpacity={isHighlighted ? 1 : (isZero ? 0.1 : 0.4)}
                                filter={isHighlighted ? "url(#glow)" : "none"}
                                className="transition-all duration-500"
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