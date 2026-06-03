// 纯音测听核心功能
const airFrequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
const boneFrequencies = [250, 500, 1000, 2000, 4000];
const testSequence = ['1000', '2000', '4000', '8000', '1000-repeat', '500', '250', '125'];
const boneTestSequence = ['1000', '2000', '4000', '1000-repeat', '500', '250'];

// 考试案例数据（5个）
const testCases = [
    {
        id: 1,
        name: '正常听力',
        description: '双耳听力正常，无听力损失',
        thresholds: {
            right: {
                air: { 125: 10, 250: 10, 500: 10, 1000: 10, 2000: 10, 4000: 10, 8000: 15 },
                bone: { 250: 5, 500: 5, 1000: 5, 2000: 5, 4000: 10 }
            },
            left: {
                air: { 125: 10, 250: 10, 500: 10, 1000: 10, 2000: 10, 4000: 10, 8000: 15 },
                bone: { 250: 5, 500: 5, 1000: 5, 2000: 5, 4000: 10 }
            }
        }
    },
    {
        id: 2,
        name: '轻度感音神经性聋',
        description: '双耳轻度感音神经性听力损失',
        thresholds: {
            right: {
                air: { 125: 20, 250: 25, 500: 30, 1000: 35, 2000: 45, 4000: 55, 8000: 65 },
                bone: { 250: 20, 500: 25, 1000: 30, 2000: 40, 4000: 50 }
            },
            left: {
                air: { 125: 25, 250: 30, 500: 35, 1000: 40, 2000: 50, 4000: 60, 8000: 70 },
                bone: { 250: 25, 500: 30, 1000: 35, 2000: 45, 4000: 55 }
            }
        }
    },
    {
        id: 3,
        name: '中度传导性聋',
        description: '右耳中度传导性听力损失',
        thresholds: {
            right: {
                air: { 125: 50, 250: 55, 500: 60, 1000: 55, 2000: 50, 4000: 45, 8000: 40 },
                bone: { 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 20 }
            },
            left: {
                air: { 125: 15, 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 20, 8000: 25 },
                bone: { 250: 5, 500: 5, 1000: 5, 2000: 10, 4000: 15 }
            }
        }
    },
    {
        id: 4,
        name: '混合性聋',
        description: '双耳混合性听力损失',
        thresholds: {
            right: {
                air: { 125: 60, 250: 65, 500: 70, 1000: 65, 2000: 60, 4000: 70, 8000: 80 },
                bone: { 250: 30, 500: 35, 1000: 40, 2000: 45, 4000: 50 }
            },
            left: {
                air: { 125: 55, 250: 60, 500: 65, 1000: 60, 2000: 55, 4000: 65, 8000: 75 },
                bone: { 250: 25, 500: 30, 1000: 35, 2000: 40, 4000: 45 }
            }
        }
    },
    {
        id: 5,
        name: '重度感音神经性聋',
        description: '双耳重度感音神经性听力损失',
        thresholds: {
            right: {
                air: { 125: 70, 250: 75, 500: 80, 1000: 85, 2000: 90, 4000: 95, 8000: 100 },
                bone: { 250: 65, 500: 70, 1000: 75, 2000: 80, 4000: 85 }
            },
            left: {
                air: { 125: 65, 250: 70, 500: 75, 1000: 80, 2000: 85, 4000: 90, 8000: 95 },
                bone: { 250: 60, 500: 65, 1000: 70, 2000: 75, 4000: 80 }
            }
        }
    }
];

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
    frequencySelected: true, // 默认频率已选择（初始为1000Hz）
    currentCase: null
};

let audioContext = null;

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(frequency, duration) {
    initAudio();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    const db = state.currentLevel;
    const linearGain = Math.pow(10, (db - 40) / 20) * 0.15;
    const gain = Math.min(linearGain, 0.5);
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(gain, audioContext.currentTime + 0.05);
    gainNode.gain.setValueAtTime(gain, audioContext.currentTime + duration / 1000 - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration / 1000);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
}

function presentStimulus() {
    if (!state.earSelected) {
        alert('请先选择测试耳');
        return;
    }
    if (!state.frequencySelected) {
        alert('请先选择测试频率');
        return;
    }
    
    const frequency = parseInt(document.getElementById('currentFrequency').textContent);
    playTone(frequency, 1000);
    // 检查患者是否能听到
checkPatientHearing(frequency);

    
    // 3D声音动画
    if (window.patient3D) {
        const currentEar = document.getElementById('statusEar').textContent;
        window.patient3D.playSound(currentEar === '右耳' ? 'right' : 'left');
    }
}
// 检查患者听力
function checkPatientHearing(frequency) {
    if (!state.currentCase) return;
    
    const ear = state.ear;
    const testType = state.testType;
    const threshold = state.currentCase.thresholds[ear][testType][frequency];
    
    if (threshold !== undefined && state.currentLevel >= threshold) {
        // 患者能听到
        setTimeout(() => {
            window.handlePatientResponse(true);
        }, 500);
    }
}


function setTestType(type) {
    state.testType = type;
    // 尝试更新按钮状态（如果存在）
    document.querySelector('.btn-air')?.classList.remove('active');
    document.querySelector('.btn-bone')?.classList.remove('active');
    document.querySelector(`.btn-${type}`)?.classList.add('active');
    // 更新状态显示
    const statusTestType = document.getElementById('statusTestType');
    if (statusTestType) {
        statusTestType.textContent = type === 'air' ? '气导' : '骨导';
    }
    // 只在存在这些元素时执行
    if (typeof updateSequenceDisplay === 'function') {
        updateSequenceDisplay();
    }
    resetTest();
    drawAudiogram();
}

function setEar(ear) {
    state.ear = ear;
    state.earSelected = true;
    // 尝试更新按钮状态（如果存在）
    document.querySelector('.btn-right')?.classList.remove('active');
    document.querySelector('.btn-left')?.classList.remove('active');
    document.querySelector(`.btn-${ear}`)?.classList.add('active');
    // 更新状态显示
    const statusEar = document.getElementById('statusEar');
    if (statusEar) {
        statusEar.textContent = ear === 'right' ? '右耳' : '左耳';
    }
    resetTest();
}

function adjustFrequency(direction) {
    const frequencies = state.testType === 'air' ? airFrequencies : boneFrequencies;
    const newIndex = state.currentFrequencyIndex + direction;
    if (newIndex >= 0 && newIndex < frequencies.length) {
        state.currentFrequencyIndex = newIndex;
        state.frequencySelected = true;
        const freq = frequencies[newIndex];
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

function confirmThreshold() {
    const frequency = parseInt(document.getElementById('currentFrequency').textContent);
    const key = `${state.ear}-${state.testType}-${frequency}`;
    state.results[state.ear][state.testType][frequency] = state.currentLevel;
    state.testedPoints.add(key);
    document.getElementById('statusTested').textContent = state.testedPoints.size;
    drawAudiogram();
    autoAdvance(true);
}

function autoAdvance(heard) {
    if (state.currentLevel >= 120 && !heard) return;
    
    // 自动推进到下一个频率
    const frequencies = state.testType === 'air' ? airFrequencies : boneFrequencies;
    const nextIndex = state.currentFrequencyIndex + 1;
    
    if (nextIndex < frequencies.length) {
        state.currentFrequencyIndex = nextIndex;
        const freq = frequencies[nextIndex];
        document.getElementById('currentFrequency').textContent = freq;
        document.getElementById('statusFrequency').textContent = freq + ' Hz';
        state.currentLevel = 40;
        document.getElementById('currentLevel').textContent = '40';
        document.getElementById('statusLevel').textContent = '40 dB HL';
    }
}

function resetTest() {
    state.currentLevel = 40;
    state.currentFrequencyIndex = state.testType === 'air' ? 3 : 2;
    const freq = state.testType === 'air' ? airFrequencies[3] : boneFrequencies[2];
    document.getElementById('currentFrequency').textContent = freq;
    document.getElementById('currentLevel').textContent = '40';
    document.getElementById('statusFrequency').textContent = freq + ' Hz';
    document.getElementById('statusLevel').textContent = '40 dB HL';
}
// 随机选择考试案例
function selectRandomCase() {
    const randomIndex = Math.floor(Math.random() * testCases.length);
    state.currentCase = testCases[randomIndex];
    
    // 显示案例信息
    const caseInfoDiv = document.getElementById('caseInfo');
    if (caseInfoDiv) {
        caseInfoDiv.innerHTML = `
            <div style="padding: 15px; background: #f8fafc; border-radius: 12px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                    <h4 style="color: #667eea; margin: 0;">📋 当前考试案例</h4>
                    <button onclick="selectRandomCase()" style="padding: 6px 12px; background: #f59e0b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">🔄 重新分配</button>
                </div>
                <p><strong>案例名称：</strong>${state.currentCase.name}</p>
                <p><strong>案例描述：</strong>${state.currentCase.description}</p>
            </div>
        `;
        caseInfoDiv.classList.add('show');
    }
    
    // 更新3D患者的听力阈值
    if (window.patient3D) {
        window.patient3D.setHearingThresholds(state.currentCase.thresholds);
    }
    
    // 重置测试状态
    state.results = { right: { air: {}, bone: {} }, left: { air: {}, bone: {} } };
    state.testedPoints = new Set();
    document.getElementById('statusTested').textContent = '0';
    resetTest();
    drawAudiogram();
    
    alert(`考试案例已分配：${state.currentCase.name}\n\n${state.currentCase.description}`);
}


// 缓存canvas尺寸，避免每次绘制重新计算
let cachedCanvasWidth = null;
let cachedCanvasHeight = 420;

function drawAudiogram() {
    const canvas = document.getElementById('audiogram');
    const ctx = canvas.getContext('2d');
    
    // 只在首次调用或窗口resize时计算尺寸
    if (cachedCanvasWidth === null) {
        const container = canvas.parentElement;
        const rect = container.getBoundingClientRect();
        cachedCanvasWidth = Math.max(rect.width - 30, 300);
    }
    
    const width = cachedCanvasWidth;
    const height = cachedCanvasHeight;
    
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    ctx.scale(2, 2);
    const padding = { top: 40, right: 50, bottom: 60, left: 70 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);
    
    const frequencies = [125, 250, 500, 1000, 2000, 4000, 8000];
    const dbLevels = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];

    // 绘制网格
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

    // 绘制刻度标签
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

    // 绘制标签
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('听力级 (dB HL)', 0, 0);
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.fillText('频率 (Hz)', width / 2, height - 10);

    // 绘制数据点
    frequencies.forEach((freq, i) => {
        const x = padding.left + (i * graphWidth / (frequencies.length - 1));
        if (state.results.right.air[freq] !== undefined) {
            const y = padding.top + ((state.results.right.air[freq] - (-10)) * graphHeight / 130);
            ctx.fillStyle = '#e74c3c';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('○', x, y);
        }
        if (state.results.left.air[freq] !== undefined) {
            const y = padding.top + ((state.results.left.air[freq] - (-10)) * graphHeight / 130);
            ctx.fillStyle = '#3498db';
            ctx.font = 'bold 20px Arial';
            ctx.fillText('×', x, y);
        }
        if (freq >= 250 && freq <= 4000) {
            if (state.results.right.bone[freq] !== undefined) {
                const y = padding.top + ((state.results.right.bone[freq] - (-10)) * graphHeight / 130);
                ctx.fillStyle = '#e74c3c';
                ctx.font = 'bold 24px Arial';
                ctx.fillText('<', x, y);
            }
            if (state.results.left.bone[freq] !== undefined) {
                const y = padding.top + ((state.results.left.bone[freq] - (-10)) * graphHeight / 130);
                ctx.fillStyle = '#3498db';
                ctx.font = 'bold 24px Arial';
                ctx.fillText('>', x, y);
            }
        }
    });
}

// 页面加载初始化
document.addEventListener('DOMContentLoaded', () => {
    drawAudiogram();
    window.addEventListener('resize', () => {
        cachedCanvasWidth = null;
        drawAudiogram();
    });
    
    // 页面加载时自动分配随机案例
    selectRandomCase();
});


// 外部接口
window.setPatient3D = function(patient) {
    window.patient3D = patient;
    // 当3D患者初始化完成后，如果还没有分配案例，则分配一个
    if (!state.currentCase) {
        selectRandomCase();
    }
};

window.handlePatientResponse = function(heard) {
    if (heard && window.patient3D) {
        const currentEar = document.getElementById('statusEar').textContent;
        const ear = currentEar === '右耳' ? 'right' : 'left';
        // 只做左右移动，不举手点头
        window.patient3D.reactToSound(ear);
    }
};