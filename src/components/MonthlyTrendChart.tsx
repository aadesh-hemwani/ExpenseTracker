import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from "recharts";
import { formatCurrency } from "../utils/formatUtils";

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-black p-3 border border-gray-100 dark:border-gray-800 shadow-xl rounded-xl">
                <p className="text-xs text-gray-400 font-semibold mb-1">{label}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(payload[0].value)}
                </p>
            </div>
        );
    }
    return null;
};

export interface MonthlyTrendChartProps {
    data: any[];
    gridColor: string;
    textColor: string;
    cursorColor: string;
    accentColor: string;
    accentColors: any;
}

const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
    data,
    gridColor,
    textColor,
    cursorColor,
    accentColor,
    accentColors,
}) => {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
            >
                <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={gridColor}
                />
                <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: textColor, fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: textColor, fontSize: 12 }}
                />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: cursorColor }}
                />
                <Bar dataKey="total" radius={[6, 6, 6, 6]} barSize={32}>
                    {data.map((_, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={accentColors[accentColor]?.default || "#6366f1"}
                            fillOpacity={index === data.length - 1 ? 1 : 0.3}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default MonthlyTrendChart;
