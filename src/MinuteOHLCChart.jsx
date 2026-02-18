import React from "react";
import ReactApexChart from "react-apexcharts";
import { RSI, SMA } from "technicalindicators";
import moment from 'moment';
// Calculate Heikin-Ashi
export const calculateHeikinAshi = (data) => {
    const haData = [];
    for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const prevHA = haData[i - 1] || {};
        const haClose = (current.open + current.high + current.low + current.close) / 4;
        const haOpen = i === 0 ? (current.open + current.close) / 2 : (prevHA.haOpen + prevHA.haClose) / 2;
        const haHigh = Math.max(current.high, haOpen, haClose);
        const haLow = Math.min(current.low, haOpen, haClose);
        haData.push({ date: current.date, haOpen, haHigh, haLow, haClose, });
    }
    return haData;
};

const MinuteOHLCChart = ({ data, tillDate, fromDate }) => {
    let filteredDataRange = data.filter((dt) => dt.date <= tillDate && dt.date >= fromDate);
    // const haData = calculateHeikinAshi(filteredDataRange);
    // const smaPeriod = 9;
    const rsiPeriod = 15;
    const sma50Period = 50;
    const sma200Period = 200;
    const sma50 = new SMA({ values: data.map((d) => d.close), period: sma50Period, reversedInput: true })
    console.log('Debug sma50 ', sma50);
    const sma200 = new SMA({ values: data.map((d) => d.close), period: sma200Period, reversedInput: true })
    // const sma = new SMA({ values: filteredDataRange.map((d) => d.close), period: smaPeriod, reversedInput: false })
    const rsi = new RSI({ values: filteredDataRange.map((d) => d.close), period: rsiPeriod, reversedInput: true });
    const localFromDate = new Date(tillDate).setHours(9, 15, 0, 0);
    // const heikinAshiSeries = {
    //     name: "Heikin-Ashi",
    //     type: "candlestick",
    //     data: haData.map((d) => ({
    //         x: d.date.getTime(), // Timestamp
    //         y: [d.haOpen, d.haHigh, d.haLow, d.haClose], // Heikin-Ashi OHLC
    //     })),
    // };

    const candleDataSeries = {
        name: "original-candle",
        type: "candlestick",
        data: data.map((d) => ({
            x: d.date.getTime(),
            y: [d.open, d.high, d.low, d.close],
        }))
    }

    // const smaSeries = {
    //     name: "SMA",
    //     type: "line",
    //     data: filteredDataRange.map((d, ind) => ({
    //         x: d.date.getTime(), // Timestamp
    //         y: ind < smaPeriod - 1 ? sma.result[0] : sma.result[ind - (smaPeriod - 1)], // SMA value
    //     })),
    // };

    const sma50Series = {
        name: "SMA50",
        type: "line",
        data: filteredDataRange.map((d, ind) => ({
            x: d.date.getTime(), // Timestamp
            y: ind < sma50Period - 1 ? sma50.result[0] + 400 : sma50.result[ind - (sma50Period - 1)] + 400, // SMA value
        })),
    };

    const sma200Series = {
        name: "SMA200",
        type: "line",
        data: filteredDataRange.map((d, ind) => ({
            x: d.date.getTime(), // Timestamp
            y: ind < sma200Period - 1 ? sma200.result[0] + 400 : sma200.result[ind - (sma200Period - 1)] + 400, // SMA value
        })),
    };

    const rsiSeries = {
        name: "RSI",
        type: "line",
        data: filteredDataRange.map((d, ind) => ({
            x: d.date.getTime(), // Timestamp
            y: ind < rsiPeriod - 1 ? rsi.result[0] : rsi.result[ind - (rsiPeriod - 1)], // RSI value
        })),
    };

    console.log('Debug series ', candleDataSeries, sma50Series, sma200Series, rsiSeries);

    function filterSeriesByDate(series) {
        return { ...series, data: series.data.filter((element) => element.x >= localFromDate && element.x <= tillDate) };
    }

    let series = [filterSeriesByDate(candleDataSeries), filterSeriesByDate(sma50Series), filterSeriesByDate(sma200Series)];
    let series2 = [filterSeriesByDate(rsiSeries)];
    console.log('Debug filterSeriesByDate series ', series, ' series2 ', series2);

    // console.log('Debug series ', heikinAshiSeries, smaSeries, rsiSeries, data);

    const options = {
        chart: {
            type: "candlestick",
        },
        title: {
            text: "original-candle, SMA50, SMA200",
            align: "left",
        },
        xaxis: {
            type: "datetime",
            labels: {
                formatter: (value) => moment(new Date(value)).format('DD/MM/YYYY HH:mm')
            },
        },
        yaxis: [
            {
                title: {
                    text: "Price",
                },
            },
        ],
        plotOptions: {
            candlestick: {
                colors: {
                    upward: "#00B746", // Green for bullish candles
                    downward: "#EF403C", // Red for bearish candles
                },
            },
        },
        stroke: {
            width: [1, 2, 3], // Stroke width for candle, SMA, and RSI
            colors: ['','blue', 'violet']
        },
        colors: ["orange", "blue", "violet"], // Colors for candle, SMA, and RSI
    };

    const optionsRSI = {
        chart: {
            type: "line",
        },
        title: {
            text: "RSI Chart",
            align: "left",
        },
        xaxis: {
            type: "datetime",
            labels: {
                formatter: (value) => moment(new Date(value)).format('DD/MM/YYYY HH:mm')

            },
        },
        yaxis: [
            {
                opposite: false,
                title: {
                    text: "RSI",
                },
            },
        ],
        stroke: {
            width: [2], // Stroke width for RSI
        },
        colors: ["#0000FF"],   // Color for RSI
    };

    return (
        <>
            <ReactApexChart
                options={options}
                series={series}
                type="candlestick"
                height={350}
            />
            <ReactApexChart
                options={optionsRSI}
                series={series2}
                type="line"
                height={350}
            />
        </>
    );
};

export default MinuteOHLCChart;