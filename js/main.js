const airFrequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
const boneFrequencies = [250, 500, 1000, 2000, 4000];
const testSequence = ['1000', '2000', '4000', '8000', '1000-repeat', '500', '250', '125'];
const boneTestSequence = ['1000', '2000', '4000', '1000-repeat', '500', '250'];
const state = {
    testType: 'air',
    ear: 'right',
    currentFrequencyIndex: 3,
    currentLevel: 40,
    results: {
        right: { air: {}, bone: {} },
        left: { air: {}, bone: {} }
    },
    testedPoints: new Set(),
    currentSequenceIndex: 0,
    earSelected: false,
    frequencySelected: false
};

function showTip(tipId, message) {
    const tipElement = document.getElementById(tipId);
    const contentElement = document.getElementById(tipId + 'Content');
    if (contentElement) {
        contentElement.textContent = message;
    }
    if (tipElement) {
        tipElement.classList.add('show');
    }
}

function hideTip(tipId) {
    const tipElement = document.getElementById(tipId);
    if (tipElement) {
        tipElement.classList.remove('show');
    }
}
let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function presentStimulus() {
    // 操作防错提示
    if (!state.earSelected) {
        hideTip('statusTip');
        showTip('errorTip', '请先选择测试耳');
        setTimeout(() => hideTip('errorTip'), 3000);
        return;
    }
    if (!state.frequencySelected) {
        hideTip('statusTip');
        showTip('errorTip', '请先选择测试频率');
        setTimeout(() => hideTip('errorTip'), 3000);
        return;
    }
    
    hideTip('errorTip');
    
    // 状态反馈提示
    showTip('statusTip', '正在播放纯音');
    
    initAudio();
    const frequency = parseInt(document.getElementById('currentFrequency').textContent);
    playTone(frequency, 1000);
    animateStimulusBtn();
    
    setTimeout(() => hideTip('statusTip'), 1500);
}

function playTone(frequency, duration) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    const db = state.currentLevel;
    const linearGain = Math.pow(10, (db - 40) / 20) * 0.15;
    const maxGain = 0.5;
    const gain = Math.min(linearGain, maxGain);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.05);
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime + duration / 1000 - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

function animateStimulusBtn() {
    const btn = document.querySelector('.stimulus-btn');
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = 'scale(1)';
    }, 100);
}

function setTestType(type) {
    state.testType = type;
    document.querySelectorAll('.test-type-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.btn-${type}`).classList.add('active');
    document.getElementById('statusTestType').textContent = type === 'air' ? '气导' : '骨导';
    resetTest();
    updateSequenceDisplay();
    drawAudiogram();
}

function setEar(ear) {
    state.ear = ear;
    state.earSelected = true;
    hideTip('errorTip');
    showTip('statusTip', `已选择${ear === 'right' ? '右耳' : '左耳'}测试`);
    setTimeout(() => hideTip('statusTip'), 2000);
    document.querySelectorAll('.ear-selector button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.btn-${ear}`).classList.add('active');
    document.getElementById('statusEar').textContent = ear === 'right' ? '右耳' : '左耳';
    resetTest();
}

function adjustFrequency(direction) {
    const frequencies = state.testType === 'air' ? airFrequencies : boneFrequencies;
    const newIndex = state.currentFrequencyIndex + direction;
    if (newIndex >= 0 && newIndex < frequencies.length) {
        state.currentFrequencyIndex = newIndex;
        state.frequencySelected = true;
        const freq = frequencies[newIndex];
        hideTip('errorTip');
        showTip('statusTip', `已选择频率: ${freq}Hz`);
        setTimeout(() => hideTip('statusTip'), 1500);
        document.getElementById('currentFrequency').textContent = freq;
        document.getElementById('statusFrequency').textContent = freq + ' Hz';
    }
}

function adjustLevel(delta) {
    const newLevel = state.currentLevel + delta;
    if (newLevel >= -10 && newLevel <= 120) {
        state.currentLevel = newLevel;
        document.getElementById('currentLevel').textContent = newLevel;
        document.getElementById('statusLevel').textContent = newLevel + ' dB HL';
    }
}

function recordResponse(heard) {
    const frequency = parseInt(document.getElementById('currentFrequency').textContent);
    const key = `${state.ear}-${state.testType}-${frequency}`;
    if (heard) {
        state.results[state.ear][state.testType][frequency] = state.currentLevel;
        state.testedPoints.add(key);
    } else {
        if (state.currentLevel >= 120) {
            state.results[state.ear][state.testType][frequency] = 120;
            state.testedPoints.add(key);
        }
    }
    document.getElementById('statusTested').textContent = state.testedPoints.size;
    drawAudiogram();
}

function confirmThreshold() {
    const frequency = parseInt(document.getElementById('currentFrequency').textContent);
    const key = `${state.ear}-${state.testType}-${frequency}`;
    state.results[state.ear][state.testType][frequency] = state.currentLevel;
    state.testedPoints.add(key);
    document.getElementById('statusTested').textContent = state.testedPoints.size;
    drawAudiogram();
    
    // 状态反馈提示：该频率测试完成
    showTip('statusTip', `该频率(${frequency}Hz)测试完成`);
    setTimeout(() => hideTip('statusTip'), 2000);
    
    autoAdvance(true);
}

function autoAdvance(heard) {
    if (state.currentLevel >= 120 && !heard) {
        return;
    }
    const currentFrequency = parseInt(document.getElementById('currentFrequency').textContent);
    const currentThreshold = state.results[state.ear][state.testType][currentFrequency];
    
    if (state.testType === 'air') {
        const nextIndex = state.currentSequenceIndex + 1;
        if (nextIndex < testSequence.length) {
            state.currentSequenceIndex = nextIndex;
            const nextFreq = testSequence[nextIndex];
            const freqValue = parseInt(nextFreq.replace('-repeat', ''));
            state.currentFrequencyIndex = airFrequencies.indexOf(freqValue);
            if (state.currentFrequencyIndex === -1) {
                state.currentFrequencyIndex = 3;
            }
            document.getElementById('currentFrequency').textContent = airFrequencies[state.currentFrequencyIndex];
            document.getElementById('statusFrequency').textContent = airFrequencies[state.currentFrequencyIndex] + ' Hz';
            state.currentLevel = currentThreshold || 40;
            document.getElementById('currentLevel').textContent = state.currentLevel;
            document.getElementById('statusLevel').textContent = state.currentLevel + ' dB HL';
            updateSequenceDisplay();
        } else {
            showResults();
        }
    } else {
        const nextIndex = state.currentSequenceIndex + 1;
        if (nextIndex < boneTestSequence.length) {
            state.currentSequenceIndex = nextIndex;
            const nextFreq = boneTestSequence[nextIndex];
            const freqValue = parseInt(nextFreq.replace('-repeat', ''));
            state.currentFrequencyIndex = boneFrequencies.indexOf(freqValue);
            if (state.currentFrequencyIndex === -1) {
                state.currentFrequencyIndex = 2;
            }
            document.getElementById('currentFrequency').textContent = boneFrequencies[state.currentFrequencyIndex];
            document.getElementById('statusFrequency').textContent = boneFrequencies[state.currentFrequencyIndex] + ' Hz';
            state.currentLevel = currentThreshold || 40;
            document.getElementById('currentLevel').textContent = state.currentLevel;
            document.getElementById('statusLevel').textContent = state.currentLevel + ' dB HL';
            updateSequenceDisplay();
        } else {
            showResults();
        }
    }
}

function resetTest() {
    state.currentSequenceIndex = 0;
    state.currentLevel = 40;
    state.currentFrequencyIndex = state.testType === 'air' ? 3 : 2;
    document.getElementById('currentFrequency').textContent = state.testType === 'air' ? airFrequencies[3] : boneFrequencies[2];
    document.getElementById('currentLevel').textContent = '40';
    document.getElementById('statusFrequency').textContent = document.getElementById('currentFrequency').textContent + ' Hz';
    document.getElementById('statusLevel').textContent = '40 dB HL';
    updateSequenceDisplay();
}

function updateSequenceDisplay() {
    const list = document.getElementById('sequenceList');
    const sequence = state.testType === 'air' ? testSequence : boneTestSequence;
    list.innerHTML = sequence.map((freq, index) => {
        let displayFreq = freq.replace('-repeat', '(复测)');
        let className = 'sequence-item';
        if (index < state.currentSequenceIndex) {
            className += ' completed';
        } else if (index === state.currentSequenceIndex) {
            className += ' current';
        }
        return `<span class="${className}">${displayFreq}Hz</span>`;
    }).join('');
}

function showResults() {
    // 状态反馈提示：全部频率测试已结束
    showTip('statusTip', '全部频率测试已结束');
    setTimeout(() => hideTip('statusTip'), 3000);
    
    document.getElementById('resultsSummary').style.display = 'block';
    const rightACTHL = calculateTHL(state.results.right.air);
    const leftACTHL = calculateTHL(state.results.left.air);
    const rightBCTHL = calculateTHL(state.results.right.bone);
    const leftBCTHL = calculateTHL(state.results.left.bone);
    
    document.getElementById('rightACTHL').textContent = rightACTHL !== null ? rightACTHL : 'N/A';
    document.getElementById('leftACTHL').textContent = leftACTHL !== null ? leftACTHL : 'N/A';
    document.getElementById('rightBCTHL').textContent = rightBCTHL !== null ? rightBCTHL : 'N/A';
    document.getElementById('leftBCTHL').textContent = leftBCTHL !== null ? leftBCTHL : 'N/A';
    
    const betterEar = rightACTHL !== null && leftACTHL !== null ? (rightACTHL < leftACTHL ? '右耳' : '左耳') : (rightACTHL !== null ? '右耳' : '左耳');
    const betterEarTHL = rightACTHL !== null && leftACTHL !== null ? Math.min(rightACTHL, leftACTHL) : (rightACTHL !== null ? rightACTHL : leftACTHL);
    
    if (betterEarTHL !== null) {
        const degree = getHearingLossDegree(betterEarTHL);
        document.getElementById('hearingLossDegree').textContent = degree.text;
        document.getElementById('hearingLossDegree').className = `value ${degree.class}`;
        document.getElementById('hearingLossEar').textContent = betterEar;
    }
}

function calculateTHL(results) {
    const frequencies = [500, 1000, 2000, 4000];
    const values = frequencies.map(f => results[f]).filter(v => v !== undefined);
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
}

function getHearingLossDegree(thl) {
    if (thl <= 25) return { text: '正常', class: 'threshold-normal' };
    if (thl <= 40) return { text: '轻度', class: 'threshold-mild' };
    if (thl <= 60) return { text: '中度', class: 'threshold-moderate' };
    if (thl <= 80) return { text: '中重度', class: 'threshold-severe' };
    if (thl <= 90) return { text: '重度', class: 'threshold-severe' };
    return { text: '极重度/完全聋', class: 'threshold-profound' };
}

function drawAudiogram() {
    const canvas = document.getElementById('audiogram');
    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // 使用容器内部可用空间，减去边距防止溢出
    const availableWidth = Math.max(rect.width - 30, 300);
    const availableHeight = 420;
    
    // 设置canvas实际像素尺寸（2倍分辨率用于高清显示）
    canvas.width = availableWidth * 2;
    canvas.height = availableHeight * 2;
    
    // 设置canvas显示尺寸
    canvas.style.width = availableWidth + 'px';
    canvas.style.height = availableHeight + 'px';
    
    ctx.scale(2, 2);
    
    const width = availableWidth;
    const height = availableHeight;
    const padding = { top: 40, right: 50, bottom: 60, left: 70 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // 清除画布并设置裁剪区域
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.clip();

    const frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
    const dbLevels = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
    });
    dbLevels.forEach((db, i) => {
        const y = padding.top + (i * graphHeight / (dbLevels.length - 1));
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    });

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = '12px Microsoft YaHei';
    ctx.textAlign = 'center';
    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        ctx.fillText(freq.toString(), x, height - padding.bottom + 20);
    });
    ctx.textAlign = 'right';
    dbLevels.forEach((db, i) => {
        const y = padding.top + (i * graphHeight / (dbLevels.length - 1));
        ctx.fillText(db.toString(), padding.left - 10, y + 4);
    });

    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('听力级 (dB HL)', 0, 0);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillText('频率 (Hz)', width / 2, height - 10);

    drawLines(ctx, frequencies, padding, graphWidth, graphHeight);

    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        if (state.testType === 'air' || freq >= 250) {
            if (state.results.right.air[freq] !== undefined) {
                drawAirSymbol(ctx, x, state.results.right.air[freq], padding, graphWidth, graphHeight, 'right');
            }
            if (state.results.left.air[freq] !== undefined) {
                drawAirSymbol(ctx, x, state.results.left.air[freq], padding, graphWidth, graphHeight, 'left');
            }
        }
    });

    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        // 始终绘制骨导符号，不受当前测试类型限制
        if (freq >= 250 && freq <= 4000) {
            if (state.results.right.bone[freq] !== undefined) {
                drawBoneSymbol(ctx, x, state.results.right.bone[freq], padding, graphWidth, graphHeight, 'right');
            }
            if (state.results.left.bone[freq] !== undefined) {
                drawBoneSymbol(ctx, x, state.results.left.bone[freq], padding, graphWidth, graphHeight, 'left');
            }
        }
    });
    
    // 恢复裁剪区域
    ctx.restore();
}

function drawLines(ctx, frequencies, padding, graphWidth, graphHeight) {
    const rightAirPoints = frequencies
        .filter(freq => state.results.right.air[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.right.air[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (rightAirPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(rightAirPoints[0].x, rightAirPoints[0].y);
        for (let i = 1; i < rightAirPoints.length; i++) {
            ctx.lineTo(rightAirPoints[i].x, rightAirPoints[i].y);
        }
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    const leftAirPoints = frequencies
        .filter(freq => state.results.left.air[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.left.air[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (leftAirPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(leftAirPoints[0].x, leftAirPoints[0].y);
        for (let i = 1; i < leftAirPoints.length; i++) {
            ctx.lineTo(leftAirPoints[i].x, leftAirPoints[i].y);
        }
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    const rightBonePoints = frequencies
        .filter(freq => freq >= 250 && freq <= 4000 && state.results.right.bone[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.right.bone[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (rightBonePoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(rightBonePoints[0].x, rightBonePoints[0].y);
        for (let i = 1; i < rightBonePoints.length; i++) {
            ctx.lineTo(rightBonePoints[i].x, rightBonePoints[i].y);
        }
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    const leftBonePoints = frequencies
        .filter(freq => freq >= 250 && freq <= 4000 && state.results.left.bone[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.left.bone[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (leftBonePoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(leftBonePoints[0].x, leftBonePoints[0].y);
        for (let i = 1; i < leftBonePoints.length; i++) {
            ctx.lineTo(leftBonePoints[i].x, leftBonePoints[i].y);
        }
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawAirSymbol(ctx, x, db, padding, graphWidth, graphHeight, ear) {
    const y = padding.top + ((db - (-10)) * graphHeight / (120 - (-10)));
    if (ear === 'right') {
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
    } else {
        ctx.strokeStyle = '#3498db';
        ctx.fillStyle = '#3498db';
    }
    ctx.lineWidth = 2;
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 右耳气导：圆圈 ○，左耳气导：叉号 ×
    ctx.fillText(ear === 'left' ? '×' : '○', x, y);
}

function drawBoneSymbol(ctx, x, db, padding, graphWidth, graphHeight, ear) {
    const y = padding.top + ((db - (-10)) * graphHeight / (120 - (-10)));
    if (ear === 'right') {
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
    } else {
        ctx.strokeStyle = '#3498db';
        ctx.fillStyle = '#3498db';
    }
    ctx.lineWidth = 2;
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 右耳骨导：小于号 <，左耳骨导：大于号 >
    ctx.fillText(ear === 'left' ? '>' : '<', x, y);
}

function resetResults() {
    state.results = {
        right: { air: {}, bone: {} },
        left: { air: {}, bone: {} }
    };
    state.testedPoints = new Set();
    state.currentSequenceIndex = 0;
    document.getElementById('statusTested').textContent = '0';
    document.getElementById('resultsSummary').style.display = 'none';
    resetTest();
    drawAudiogram();
}

function saveResults() {
    const userName = document.getElementById('userName').value || '未知受试者';
    const record = {
        id: Date.now(),
        name: userName,
        date: new Date().toLocaleString('zh-CN'),
        results: state.results,
        testedPoints: Array.from(state.testedPoints)
    };
    
    fetch('data/records.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
    }).then(response => {
        if (response.ok) {
            alert('测试结果保存成功！');
        } else {
            alert('保存失败，请确保服务器已启动');
        }
    }).catch(error => {
        console.error('保存失败:', error);
        alert('保存失败，本地存储不可用');
    });
}

function exportToWord() {
    const userName = document.getElementById('userName').value || '未知';
    const userGender = document.getElementById('userGender').value;
    const userAge = document.getElementById('userAge').value || '未知';
    const testerName = document.getElementById('testerName').value || '未知';
    const testDate = new Date().toLocaleString('zh-CN');
    
    // 只使用手动输入的值（不自动计算）
    const rightACTHL = document.getElementById('manualRightAC')?.value || '未填写';
    const leftACTHL = document.getElementById('manualLeftAC')?.value || '未填写';
    const rightBCTHL = document.getElementById('manualRightBC')?.value || '未填写';
    const leftBCTHL = document.getElementById('manualLeftBC')?.value || '未填写';
    const degree = document.getElementById('manualDegree')?.value || '未评估';
    const lossType = document.getElementById('lossType')?.value || '未评估';
    const suggestions = document.getElementById('suggestions')?.value || '无';
    
    // 创建临时canvas
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const targetWidth = 600;
    const targetHeight = 300;
    tempCanvas.width = targetWidth;
    tempCanvas.height = targetHeight;
    drawAudiogramToCanvas(tempCtx, targetWidth, targetHeight);
    const audiogramImage = tempCanvas.toDataURL('image/png');
    
    // 构建HTML内容
    let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='utf-8'>
        <title>纯音测听报告</title>
        <style>
            body { font-family: 'Microsoft YaHei', serif; font-size: 14px; }
            h1 { text-align: center; font-size: 22px; }
            h2 { border-bottom: 2px solid #3498db; padding-bottom: 8px; margin-top: 25px; }
            .info-table { width: 100%; border-collapse: collapse; }
            .info-table td, .info-table th { padding: 10px; border: 1px solid #ddd; }
            .info-table th { background: #f5f5f5; }
            .result-card { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0; }
            .suggestions-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; }
            .audiogram-wrapper { text-align: center; margin: 20px 0; }
        </style>
    </head>
    <body>
        <h1>🎧 纯音测听报告</h1>
        
        <h2>一、基本信息</h2>
        <table class='info-table'>
            <tr><th>受试者姓名</th><td>${userName}</td><th>性别</th><td>${userGender}</td></tr>
            <tr><th>年龄</th><td>${userAge} 岁</td><th>测试日期</th><td>${testDate}</td></tr>
            <tr><th>测试人员</th><td colspan='3'>${testerName}</td></tr>
        </table>
        
        <h2>二、听力图</h2>
        <div class="audiogram-wrapper">
            <img src="${audiogramImage}" alt="听力图" style="width: 14cm; height: 7cm;" />
        </div>
        
        <h2>三、结果分析</h2>
        
        <h3>3.1 听阈结果</h3>
        <table class='info-table'>
            <tr><th>项目</th><th>右耳</th><th>左耳</th></tr>
            <tr><td>气导听阈 (dB HL)</td><td>${rightACTHL}</td><td>${leftACTHL}</td></tr>
            <tr><td>骨导听阈 (dB HL)</td><td>${rightBCTHL}</td><td>${leftBCTHL}</td></tr>
        </table>
        
        <h3>3.2 听力损失程度</h3>
        <div class="result-card">
            <p>${degree}</p>
        </div>
        
        <h3>3.3 听力损失性质</h3>
        <div class="result-card">
            <p>${lossType}</p>
        </div>
        
        <h3>3.4 建议</h3>
        <div class="suggestions-box">
            <p>${suggestions}</p>
        </div>
    </body>
    </html>
    `;
    
    try {
        const blob = new Blob(['\uFEFF', htmlContent], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `纯音测听报告_${userName}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请检查控制台');
    }
}

// 在临时canvas上绘制听力图
function drawAudiogramToCanvas(ctx, width, height) {
    const padding = { top: 35, right: 45, bottom: 50, left: 60 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制白色背景
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
    const dbLevels = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

    // 绘制网格线
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, height - padding.bottom);
        ctx.stroke();
    });
    dbLevels.forEach((db, i) => {
        const y = padding.top + (i * graphHeight / (dbLevels.length - 1));
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    });

    // 绘制坐标轴
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // 绘制标签
    ctx.fillStyle = '#333';
    ctx.font = '10px Microsoft YaHei';
    ctx.textAlign = 'center';
    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        ctx.fillText(freq.toString(), x, height - padding.bottom + 18);
    });
    ctx.textAlign = 'right';
    dbLevels.forEach((db, i) => {
        const y = padding.top + (i * graphHeight / (dbLevels.length - 1));
        ctx.fillText(db.toString(), padding.left - 8, y + 3);
    });

    // Y轴标题
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('听力级 (dB HL)', 0, 0);
    ctx.restore();

    // X轴标题
    ctx.textAlign = 'center';
    ctx.fillText('频率 (Hz)', width / 2, height - 10);

    // 先绘制连线
    drawLinesToCanvas(ctx, frequencies, padding, graphWidth, graphHeight);

    // 再绘制数据点
    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        if (state.results.right.air[freq] !== undefined) {
            drawAirSymbolToCanvas(ctx, x, state.results.right.air[freq], padding, graphWidth, graphHeight, 'right');
        }
        if (state.results.left.air[freq] !== undefined) {
            drawAirSymbolToCanvas(ctx, x, state.results.left.air[freq], padding, graphWidth, graphHeight, 'left');
        }
        if (freq >= 250 && freq <= 4000) {
            if (state.results.right.bone[freq] !== undefined) {
                drawBoneSymbolToCanvas(ctx, x, state.results.right.bone[freq], padding, graphWidth, graphHeight, 'right');
            }
            if (state.results.left.bone[freq] !== undefined) {
                drawBoneSymbolToCanvas(ctx, x, state.results.left.bone[freq], padding, graphWidth, graphHeight, 'left');
            }
        }
    });
}

// 绘制连线
function drawLinesToCanvas(ctx, frequencies, padding, graphWidth, graphHeight) {
    // 右耳气导连线
    const rightAirPoints = frequencies
        .filter(freq => state.results.right.air[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.right.air[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (rightAirPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(rightAirPoints[0].x, rightAirPoints[0].y);
        for (let i = 1; i < rightAirPoints.length; i++) {
            ctx.lineTo(rightAirPoints[i].x, rightAirPoints[i].y);
        }
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 左耳气导连线
    const leftAirPoints = frequencies
        .filter(freq => state.results.left.air[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.left.air[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (leftAirPoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(leftAirPoints[0].x, leftAirPoints[0].y);
        for (let i = 1; i < leftAirPoints.length; i++) {
            ctx.lineTo(leftAirPoints[i].x, leftAirPoints[i].y);
        }
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 右耳骨导连线（虚线）
    const rightBonePoints = frequencies
        .filter(freq => freq >= 250 && freq <= 4000 && state.results.right.bone[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.right.bone[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (rightBonePoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(rightBonePoints[0].x, rightBonePoints[0].y);
        for (let i = 1; i < rightBonePoints.length; i++) {
            ctx.lineTo(rightBonePoints[i].x, rightBonePoints[i].y);
        }
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 左耳骨导连线（虚线）
    const leftBonePoints = frequencies
        .filter(freq => freq >= 250 && freq <= 4000 && state.results.left.bone[freq] !== undefined)
        .sort((a, b) => a - b)
        .map(freq => {
            const i = [125, 250, 500, 1000, 2000, 4000, 8000].indexOf(freq);
            const x = padding.left + (i * graphWidth / (frequencies.length - 1));
            const y = padding.top + ((state.results.left.bone[freq] - (-10)) * graphHeight / (120 - (-10)));
            return { x, y };
        });
    if (leftBonePoints.length > 1) {
        ctx.beginPath();
        ctx.moveTo(leftBonePoints[0].x, leftBonePoints[0].y);
        for (let i = 1; i < leftBonePoints.length; i++) {
            ctx.lineTo(leftBonePoints[i].x, leftBonePoints[i].y);
        }
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawAirSymbolToCanvas(ctx, x, db, padding, graphWidth, graphHeight, ear) {
    const y = padding.top + ((db - (-10)) * graphHeight / (120 - (-10)));
    if (ear === 'right') {
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
    } else {
        ctx.strokeStyle = '#3498db';
        ctx.fillStyle = '#3498db';
    }
    ctx.lineWidth = 2;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ear === 'left' ? '×' : '○', x, y);
}

function drawBoneSymbolToCanvas(ctx, x, db, padding, graphWidth, graphHeight, ear) {
    const y = padding.top + ((db - (-10)) * graphHeight / (120 - (-10)));
    if (ear === 'right') {
        ctx.strokeStyle = '#e74c3c';
        ctx.fillStyle = '#e74c3c';
    } else {
        ctx.strokeStyle = '#3498db';
        ctx.fillStyle = '#3498db';
    }
    ctx.lineWidth = 2;
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ear === 'left' ? '>' : '<', x, y);
}

// 页面加载时初始化
(function() {
    drawAudiogram();
    updateSequenceDisplay();
    window.addEventListener('resize', drawAudiogram);
})();

// 添加访问日志记录函数
function logAccess(page, action = '访问') {
    const studentId = document.getElementById('userName').value || '未知';
    const studentName = document.getElementById('userName').value || '未知';
    
    fetch('/api/log-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, student_name: studentName, page, action })
    }).catch(() => {});
}

// 修改页面加载初始化代码
(function() {
    drawAudiogram();
    updateSequenceDisplay();
    window.addEventListener('resize', drawAudiogram);
    logAccess('纯音测听页面', '页面加载'); // 记录页面访问
})();