document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('schedule-form');
    const ganttChart = document.getElementById('gantt-chart');
    const clearButton = document.getElementById('clear-output');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const arrivalTimes = document.getElementById('arrival-times').value.split(',').map(Number);
        const serviceTimes = document.getElementById('service-times').value.split(',').map(Number);
        const algorithm = document.getElementById('algorithm').value;
        const priority = document.getElementById('priority').value.split(',').map(Number);
        const quantum = Number(document.getElementById('quantum').value) || 1;
        const contextSwitch = Number(document.getElementById('context-switch').value) || 0;

        const result = executeAlgorithm(algorithm, arrivalTimes, serviceTimes, priority, quantum, contextSwitch);
        displayResult(result, arrivalTimes, serviceTimes);
    });

    clearButton.addEventListener('click', () => {
        ganttChart.innerHTML = '';
        form.reset();
    });
});

function executeAlgorithm(algorithm, arrivalTimes, serviceTimes, priority, quantum, contextSwitch) {
    const processCount = arrivalTimes.length;
    let timeline = Array.from({ length: processCount }, () => []);
    let finishTime = Array(processCount).fill(0);
    let turnAroundTime = Array(processCount).fill(0);
    let normTurn = Array(processCount).fill(0);

    switch (algorithm) {
        case 'First come first served (FCFS)': {
            let currentTimeFCFS = 0;
            for (let i = 0; i < processCount; i++) {
                if (arrivalTimes[i] > currentTimeFCFS) {
                    currentTimeFCFS = arrivalTimes[i];
                }
                for (let j = 0; j < serviceTimes[i]; j++) {
                    timeline[i].push(`P${i + 1}`);
                }
                finishTime[i] = currentTimeFCFS + serviceTimes[i];
                turnAroundTime[i] = finishTime[i] - arrivalTimes[i];
                normTurn[i] = turnAroundTime[i] / serviceTimes[i];
                currentTimeFCFS += serviceTimes[i];
                if (i < processCount - 1) currentTimeFCFS += contextSwitch;
            }
            break;
        }

        case 'Shortest Job First (Non-Preemptive)': {
            let remainingProcessesSJFNP = Array.from({ length: processCount }, (_, index) => index);
            let timeSJFNP = 0;

            while (remainingProcessesSJFNP.length > 0) {
                let indexSJFNP = remainingProcessesSJFNP.reduce((minIndex, currentIndex) =>
                    (arrivalTimes[currentIndex] <= timeSJFNP && serviceTimes[currentIndex] < serviceTimes[minIndex]) ? currentIndex : minIndex,
                    remainingProcessesSJFNP[0]
                );

                let procSJFNP = indexSJFNP;
                for (let j = 0; j < serviceTimes[procSJFNP]; j++) {
                    timeline[procSJFNP].push(`P${procSJFNP + 1}`);
                }
                timeSJFNP += serviceTimes[procSJFNP];
                finishTime[procSJFNP] = timeSJFNP;
                turnAroundTime[procSJFNP] = finishTime[procSJFNP] - arrivalTimes[procSJFNP];
                normTurn[procSJFNP] = turnAroundTime[procSJFNP] / serviceTimes[procSJFNP];
                remainingProcessesSJFNP.splice(remainingProcessesSJFNP.indexOf(procSJFNP), 1);
                if (remainingProcessesSJFNP.length > 0) timeSJFNP += contextSwitch;
            }
            break;
        }

        case 'Shortest Job First (Preemptive)': {
            let remainingTimeSJF = [...serviceTimes];
            let timeSJF = 0;
            let queueSJF = [];

            while (queueSJF.length > 0 || timeSJF < Math.max(...arrivalTimes)) {
                for (let i = 0; i < processCount; i++) {
                    if (arrivalTimes[i] <= timeSJF && remainingTimeSJF[i] > 0) {
                        queueSJF.push(i);
                    }
                }

                let processSJF = queueSJF.length > 0 ? queueSJF.shift() : -1;
                if (processSJF === -1) {
                    timeSJF = Math.min(...arrivalTimes.filter(a => a > timeSJF), Math.max(...arrivalTimes));
                } else {
                    let quantumTime = Math.min(remainingTimeSJF[processSJF], quantum);
                    for (let j = 0; j < quantumTime; j++) {
                        timeline[processSJF].push(`P${processSJF + 1}`);
                    }
                    remainingTimeSJF[processSJF] -= quantumTime;
                    timeSJF += quantumTime;
                    if (remainingTimeSJF[processSJF] > 0) {
                        queueSJF.push(processSJF);
                    } else {
                        finishTime[processSJF] = timeSJF;
                        turnAroundTime[processSJF] = finishTime[processSJF] - arrivalTimes[processSJF];
                        normTurn[processSJF] = turnAroundTime[processSJF] / serviceTimes[processSJF];
                    }
                }
            }
            break;
        }

        case 'Priority scheduling (Non-Preemptive)': {
            let remainingProcessesPNP = Array.from({ length: processCount }, (_, index) => index);
            let timePNP = 0;

            while (remainingProcessesPNP.length > 0) {
                let indexPNP = remainingProcessesPNP.reduce((maxIndex, currentIndex) =>
                    (arrivalTimes[currentIndex] <= timePNP && priority[currentIndex] > priority[maxIndex]) ? currentIndex : maxIndex,
                    remainingProcessesPNP[0]
                );

                let procPNP = indexPNP;
                for (let j = 0; j < serviceTimes[procPNP]; j++) {
                    timeline[procPNP].push(`P${procPNP + 1}`);
                }
                timePNP += serviceTimes[procPNP];
                finishTime[procPNP] = timePNP;
                turnAroundTime[procPNP] = finishTime[procPNP] - arrivalTimes[procPNP];
                normTurn[procPNP] = turnAroundTime[procPNP] / serviceTimes[procPNP];
                remainingProcessesPNP.splice(remainingProcessesPNP.indexOf(procPNP), 1);
                if (remainingProcessesPNP.length > 0) timePNP += contextSwitch;
            }
            break;
        }

        case 'Priority scheduling (Preemptive)': {
            let remainingTimePSP = [...serviceTimes];
            let timePSP = 0;
            let queuePSP = [];

            while (queuePSP.length > 0 || timePSP < Math.max(...arrivalTimes)) {
                for (let i = 0; i < processCount; i++) {
                    if (arrivalTimes[i] <= timePSP && remainingTimePSP[i] > 0) {
                        queuePSP.push(i);
                    }
                }

                let processPSP = queuePSP.length > 0 ? queuePSP.shift() : -1;
                if (processPSP === -1) {
                    timePSP = Math.min(...arrivalTimes.filter(a => a > timePSP), Math.max(...arrivalTimes));
                } else {
                    let quantumTime = Math.min(remainingTimePSP[processPSP], quantum);
                    for (let j = 0; j < quantumTime; j++) {
                        timeline[processPSP].push(`P${processPSP + 1}`);
                    }
                    remainingTimePSP[processPSP] -= quantumTime;
                    timePSP += quantumTime;
                    if (remainingTimePSP[processPSP] > 0) {
                        queuePSP.push(processPSP);
                    } else {
                        finishTime[processPSP] = timePSP;
                        turnAroundTime[processPSP] = finishTime[processPSP] - arrivalTimes[processPSP];
                        normTurn[processPSP] = turnAroundTime[processPSP] / serviceTimes[processPSP];
                    }
                }
            }
            break;
        }

        case 'Round Robin': {
            let queueRR = [];
            let remainingTimeRR = [...serviceTimes];
            let currentTimeRR = 0;
            let idxRR = 0;

            while (queueRR.length > 0 || idxRR < processCount) {
                while (idxRR < processCount && arrivalTimes[idxRR] <= currentTimeRR) {
                    queueRR.push(idxRR);
                    idxRR++;
                }

                if (queueRR.length > 0) {
                    let currentProcessRR = queueRR.shift();
                    let quantumTimeRR = Math.min(quantum, remainingTimeRR[currentProcessRR]);
                    for (let i = 0; i < quantumTimeRR; i++) {
                        timeline[currentProcessRR].push(`P${currentProcessRR + 1}`);
                    }
                    remainingTimeRR[currentProcessRR] -= quantumTimeRR;
                    currentTimeRR += quantumTimeRR;
                    if (remainingTimeRR[currentProcessRR] > 0) {
                        queueRR.push(currentProcessRR);
                    } else {
                        finishTime[currentProcessRR] = currentTimeRR;
                        turnAroundTime[currentProcessRR] = finishTime[currentProcessRR] - arrivalTimes[currentProcessRR];
                        normTurn[currentProcessRR] = turnAroundTime[currentProcessRR] / serviceTimes[currentProcessRR];
                    }
                } else {
                    currentTimeRR++;
                }
            }
            break;
        }

        default:
            console.error('Unknown algorithm');
            break;
    }

    return { timeline, finishTime, turnAroundTime, normTurn, arrivalTimes, serviceTimes };
}

function displayResult(result, arrivalTimes, serviceTimes) {
    const ganttChart = document.getElementById('gantt-chart');
    ganttChart.innerHTML = '';

    const { timeline, finishTime, turnAroundTime, normTurn } = result;
    const chart = document.createElement('div');
    chart.classList.add('gantt-chart');

    timeline.forEach((processTimeline, index) => {
        const bar = document.createElement('div');
        bar.classList.add('gantt-bar');
        bar.style.width = `${processTimeline.length * 20}px`;
        bar.style.backgroundColor = '#007bff';
        bar.style.marginBottom = '5px';
        bar.innerText = `P${index + 1} (${finishTime[index]})`;
        chart.appendChild(bar);
    });

    ganttChart.appendChild(chart);

    // Display scheduling table
    const table = document.createElement('table');
    table.classList.add('schedule-table');
    table.style.width = '100%'; // Make sure the table takes full width

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Process</th>
        <th>Arrival Time</th>
        <th>Service Time</th>
        <th>Finish Time</th>
        <th>Turnaround Time</th>
        <th>Normalized Turnaround Time</th>
    `;
    table.appendChild(headerRow);

    result.finishTime.forEach((_, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>P${index + 1}</td>
            <td>${arrivalTimes[index]}</td>
            <td>${serviceTimes[index]}</td>
            <td>${result.finishTime[index]}</td>
            <td>${result.turnAroundTime[index]}</td>
            <td>${result.normTurn[index].toFixed(2)}</td>
        `;
        table.appendChild(row);
    });

    ganttChart.appendChild(table);
}
