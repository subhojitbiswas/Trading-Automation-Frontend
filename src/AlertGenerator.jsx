import React, { useEffect, useMemo, useState, useRef } from 'react';
// import { calculateHeikinAshi } from './MinuteOHLCChart';
import { SMA, RSI } from 'technicalindicators';
import { Button, Modal, Table } from 'react-bootstrap';
import moment from 'moment';

function AlertGenerator({ data, socket, responseData, tillDate, fromDate, rsiUpper, rsiLower }) {
    // const haSeries = calculateHeikinAshi(data);
    // const smaPeriod = 9;
    const rsiPeriod = 15;
    const sma50Period = 50;
    const sma200Period = 200;
    const sma50 = new SMA({ values: data.map((d) => d.close), period: sma50Period, reversedInput: false })
    const sma50Series = data.map((dt, ind) => ind < sma50Period - 1 ? 0 : sma50.result[ind - (sma50Period - 1)]);
    const sma200 = new SMA({ values: data.map((d) => d.close), period: sma200Period, reversedInput: false })
    const sma200Series = data.map((dt, ind) => ind < sma200Period - 1 ? 0 : sma200.result[ind - (sma200Period - 1)]);
    const rsi = new RSI({ values: data.map((d) => d.close), period: rsiPeriod, reversedInput: false });
    const rsiSeries = data.map((dt, ind) => ind < rsiPeriod - 1 ? 0 : rsi.result[ind - (rsiPeriod - 1)]);
    const [alertArchieve, setAlertArchieve] = useState([]);
    let localFromDate = new Date(tillDate).setHours(9, 15, 0, 0);
    const processedRows = useRef(new Set());
    useEffect(() => {
        processedRows.current.clear();
    }, []);
    useMemo(() => {
        if (data && data.length > 0) {
            let lastBuy = null, lastSell = null, lastExit = null;
            let newAlerts = data.map((ele, ind) => {
                let alert = null;
                if (sma50Series[ind] > 0 && sma200Series[ind] > 0 && rsiSeries[ind] > 0 && ele.date <= tillDate && ele.date >= localFromDate) {
                    if (ele.haOpen > sma50Series[ind] && sma50Series[ind] > sma200Series[ind] && rsiSeries[ind] > rsiUpper) {
                        if (!lastBuy) {
                            lastBuy = { timeStamp: ele.date, price: ele.close, type: 'buy', orderId: 'NA', status: 'raised', profit: 0, cumulativeProfit: 0 };
                            lastExit = null;
                            alert = lastBuy;
                        }
                    }
                    if (ele.haOpen < sma50Series[ind] && sma50Series[ind] < sma200Series[ind] && rsiSeries[ind] < rsiLower) {
                        if (!lastSell) {
                            lastSell = { timeStamp: ele.date, price: ele.close, type: 'sell', orderId: 'NA', status: 'raised', profit: 0, cumulativeProfit: 0 };
                            lastExit = null;
                            alert = lastSell;
                        }
                    }
                    if (rsiSeries[ind] > rsiLower && rsiSeries[ind] < rsiUpper) {
                        if (!lastExit) {
                            if (lastBuy && lastBuy.price) {//latest buy so exit buy profit will be +ve when exit close price is greater 
                                lastBuy = null;
                            } else if (lastSell && lastSell.price) {//latest sell so exit sell profit will be +ve when exit close price is less
                                lastSell = null;
                            } else {
                                console.log('something goes wrong last buy ', lastBuy, ' last sell ', lastSell, ' exit at ', ele);
                            }
                            lastExit = { timeStamp: ele.date, price: ele.close, type: 'Exit', orderId: 'NA', status: 'raised', profit: 0, cumulativeProfit: 0 };
                            alert = lastExit;
                        }
                    }
                }
                return alert;
            }).filter((ele) => ele !== null);
            // newAlerts = newAlerts.filter((ele) => ele.timeStamp <= tillDate && ele.timeStamp >= localFromDate);
            setAlertArchieve(newAlerts);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data])

    useMemo(() => {
        if (alertArchieve && alertArchieve.length > 0 && responseData && responseData.length > 0) {
            let copyAlerts = [...alertArchieve];
            copyAlerts = copyAlerts.map((response) => {
                let matched = responseData.filter((alerts) => {
                    return new Date(response.timeStamp).valueOf() === new Date(alerts.timeStamp).valueOf() && alerts.status === 'completed';
                });
                return { ...response, ...matched[0] };
            })
            copyAlerts = copyAlerts.sort((a, b) => new Date(a.timeStamp) - new Date(b.timeStamp));
            for (let i = 1; i < copyAlerts.length; i++) {
                copyAlerts[i].profit = Math.round(profitCalculator(copyAlerts[i], copyAlerts[i - 1]) * 100) / 100;
                copyAlerts[i].cumulativeProfit = Math.round((copyAlerts[i - 1].cumulativeProfit + copyAlerts[i].profit) * 100) / 100;
            }
            setAlertArchieve(copyAlerts);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, responseData])

    console.log(' final alerts ', alertArchieve);

    setInterval(() => {
        if (alertArchieve && alertArchieve.length > 0 && alertArchieve[0].status) {
            const newRows = alertArchieve.filter(
                row => row.status === 'raised' && !processedRows.current.has(row.timeStamp)
            );
            newRows.forEach(row => {
                processedRows.current.add(row.timeStamp); // Mark row as processed
                // console.log('fetchStatus',row);
                socket.emit('fetchStatus', JSON.stringify(row));
            });
        }
    }, 5 * 1000);


    function profitCalculator(curr, prev) {
        if (curr.type === 'Exit') {
            if (prev.type === 'sell') {
                return prev.price - curr.price;
            } else if (prev.type === 'buy') {
                return curr.price - prev.price;
            } else {
                return 0;
            }
            // return curr.price - prev.price;
        } else {
            return 0;
        }
    }

    const [show, setShow] = useState(false);
    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    return (
        <>
            <Button variant="primary" onClick={handleShow}>
                Display generated orders
            </Button>

            <Modal show={show} onHide={handleClose} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Order Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                                <th>Serial</th>
                                <th>Timestamp</th>
                                <th>Price</th>
                                <th>Type</th>
                                <th>Order ID</th>
                                <th>Status</th>
                                <th>Profit</th>
                                <th>CumulativeProfit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {alertArchieve.map((row, index) => (
                                <tr key={moment(new Date(row.timeStamp)).format('DD/MM/YYYY HH:mm')}>
                                    <td>{index}</td>
                                    <td>{moment(new Date(row.timeStamp)).format('DD/MM/YYYY HH:mm')}</td>
                                    <td>{row.price}</td>
                                    <td>{row.type}</td>
                                    <td>{row.orderId}</td>
                                    <td>{row.status}</td>
                                    <td>{row.profit}</td>
                                    <td>{row.cumulativeProfit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export default AlertGenerator;