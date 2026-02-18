import React from 'react';
import { useEffect, useState } from "react";
import socketIO from 'socket.io-client';
import MinuteOHLCChart from './MinuteOHLCChart';
import AlertGenerator from './AlertGenerator';

const socket = socketIO.connect('ws://localhost:3002', { autoConnect: false, transports: ["websocket"], });

function Home(props) {
    const [isConnected, setIsConnected] = useState(true);
    const [chartData, setChartData] = useState([]);
    const [responseData,setResponseData] = useState([]);

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        socket.connect();
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('data', (value) => {
            setChartData(previous => [...previous, {
                date: new Date(value.timeStamp),
                open: value.open,
                close: value.close,
                high: value.high,
                low: value.low
            }])
        });
        socket.on('statusUpdate', (candle) => {
            candle = JSON.parse(candle);
            if (candle && candle.status) {
                let temp = {
                    timeStamp: new Date(candle.timeStamp),
                    status: candle.status,
                    price: candle.price,
                    orderId: candle.orderId
                }
                setResponseData(previous => [...previous, temp]);
            }
        });
        return () => { socket.off('connect'); socket.off('disconnect'); socket.off('data'); socket.off('statusUpdate'); };
    }, []);

    const tillDate = new Date().setHours(15, 15, 0, 0);
    const fromDate = new Date(tillDate - 24 * 60 * 60 * 1000).setHours(9, 15, 0, 0);
    const rsiUpper = 55;
    const rsiLower = 45;
    

    return (
        <>
            <h1 style={{ background: isConnected ? 'green' : 'red' }}>Home.jsx</h1>
            <div>
                <MinuteOHLCChart data={chartData} tillDate={tillDate} fromDate={fromDate} />
                <AlertGenerator data={chartData} socket={socket} responseData={responseData} tillDate={tillDate} fromDate={fromDate} rsiUpper={rsiUpper} rsiLower={rsiLower}/>
            </div>
        </>
    );
}

export default Home;