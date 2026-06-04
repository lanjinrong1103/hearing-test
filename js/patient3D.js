// c:\Users\admin\Desktop\hearing-test\js\patient3D.js
class Patient3D {
    constructor(containerId, modelPath = null) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.patientGroup = null;
        this.leftArm = null;
        this.rightArm = null;
        this.leftLeg = null;
        this.rightLeg = null;
        this.leftEarcup = null;
        this.rightEarcup = null;
        this.soundWaveLeft = null;
        this.soundWaveRight = null;
        this.head = null;
        this.animationId = null;
        this.modelPath = modelPath; // GLB模型路径
        this.isGLBModel = false; // 是否使用GLB模型
        
        // 默认患者听力阈值数据（正常听力）
        this.hearingThresholds = {
            right: {
                air: { 125: 15, 250: 10, 500: 10, 1000: 10, 2000: 15, 4000: 20, 8000: 25 },
                bone: { 250: 5, 500: 5, 1000: 5, 2000: 10, 4000: 15 }
            },
            left: {
                air: { 125: 10, 250: 10, 500: 10, 1000: 5, 2000: 10, 4000: 15, 8000: 20 },
                bone: { 250: 5, 500: 5, 1000: 5, 2000: 5, 4000: 10 }
            }
        };
        
        this.init();
    }
    
    // 设置听力阈值（供案例模块调用）
    setHearingThresholds(thresholds) {
        if (thresholds) {
            this.hearingThresholds = JSON.parse(JSON.stringify(thresholds));
            console.log('✓ 听力阈值已更新:', this.hearingThresholds);
        }
    }
    
    init() {
        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);
        
        // 创建相机
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 1.5, 4.0);
        this.camera.lookAt(0, 0.5, 0);
        
        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(4, 6, 4);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-3, 3, -2);
        this.scene.add(fillLight);
        
        // 添加半球光改善环境照明
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x333333, 0.5);
        this.scene.add(hemisphereLight);
        
        // 创建或加载患者模型
        console.log('模型路径:', this.modelPath);
        console.log('THREE.GLTFLoader是否可用:', typeof THREE.GLTFLoader !== 'undefined');
        
        if (this.modelPath && typeof THREE.GLTFLoader !== 'undefined') {
            console.log('尝试加载GLB模型:', this.modelPath);
            this.loadGLBModel();
        } else {
            if (!this.modelPath) {
                console.log('未指定模型路径，使用默认代码生成模型');
            } else {
                console.log('GLTFLoader不可用，使用默认代码生成模型');
            }
            this.createPatient();
        }
        
        // 开始动画循环
        this.animate();
        
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    // 加载GLB模型
    async loadGLBModel() {
    const self = this;
    console.log('🔄 使用 fetch 方式加载模型');
    try {
        const response = await fetch(this.modelPath);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        console.log('✅ 文件下载完成，大小:', arrayBuffer.byteLength, '字节');

        const loader = new THREE.GLTFLoader();
        loader.parse(
            arrayBuffer,
            '',
            function(gltf) {
                console.log('✅ parse 成功，gltf.scene:', gltf.scene);
                self.patientGroup = gltf.scene;

                self.patientGroup.scale.set(2.2, 2.2, 2.2);
                self.patientGroup.position.set(0, 0.9, 0.9);
                self.patientGroup.rotation.set(-0.0873, 0.0873, 0.0000);

                self.patientGroup.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                self.scene.add(self.patientGroup);
                console.log('✅ 模型已添加到场景');

                try { self.findBodyParts(); } catch(e) { console.error('❌ findBodyParts 出错:', e); }
                try { self.createSoundWaves(); } catch(e) { console.error('❌ createSoundWaves 出错:', e); }

                console.log('✅ GLB模型加载成功并添加到场景');
            },
            function(error) {
                console.error('❌ parse 失败:', error);
                self.createPatient();
            }
        );
    } catch (error) {
        console.error('❌ 下载失败:', error);
        self.createPatient();
    }
}
    
    // 查找GLB模型中的身体部件（改进版本）
    findBodyParts() {
        if (!this.patientGroup) return;
        
        let meshCount = 0;
        this.patientGroup.traverse((child) => {
            if (child.isMesh || child.isGroup) {
                meshCount++;
                const name = child.name.toLowerCase();
                console.log(`发现部件: ${child.name}`);
                
                // 尝试多种命名方式
                if (name.includes('head') || name.includes('face')) this.head = child;
                else if (name.includes('leftarm') || name.includes('left_arm') || name.includes('arm_left') || name.includes('l_arm') || name.includes('upper_arm_l')) this.leftArm = child;
                else if (name.includes('rightarm') || name.includes('right_arm') || name.includes('arm_right') || name.includes('r_arm') || name.includes('upper_arm_r')) this.rightArm = child;
                else if (name.includes('leftearcup') || name.includes('left_ear') || name.includes('ear_left')) this.leftEarcup = child;
                else if (name.includes('rightearcup') || name.includes('right_ear') || name.includes('ear_right')) this.rightEarcup = child;
                else if (!this.leftArm && (name.includes('arm') || name.includes('upper'))) this.leftArm = child; // 更宽松的备用匹配
            }
        });
        
        console.log(`=== 身体部件识别结果 ===`);
        console.log(`总部件数: ${meshCount}`);
        console.log('head:', this.head ? this.head.name : '未找到');
        console.log('leftArm:', this.leftArm ? this.leftArm.name : '未找到');
        console.log('rightArm:', this.rightArm ? this.rightArm.name : '未找到');
        
        // 如果找不到手臂，创建备用手臂
        if (!this.leftArm || !this.rightArm) {
            console.log('⚠️ GLB模型中未找到手臂，创建备用手臂');
            this.createBackupArms();
        }
    }
    
    // 创建备用手臂（当GLB模型中找不到手臂时使用）
    createBackupArms() {
        // 创建左臂
        const armGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 16);
        const armMat = new THREE.MeshStandardMaterial({
            color: 0xffd5b8,
            roughness: 0.7,
            metalness: 0.05
        });
        
        this.leftArm = new THREE.Mesh(armGeo, armMat);
        this.leftArm.position.set(-0.35, 1.0, 0.1);
        this.leftArm.rotation.z = -0.3;
        this.leftArm.castShadow = true;
        this.patientGroup.add(this.leftArm);
        
        // 创建右臂
        this.rightArm = new THREE.Mesh(armGeo.clone(), armMat.clone());
        this.rightArm.position.set(0.35, 1.0, 0.1);
        this.rightArm.rotation.z = 0.3;
        this.rightArm.castShadow = true;
        this.patientGroup.add(this.rightArm);
        
        console.log('✓ 已创建备用手臂');
    }
    
    createPatient() {
        this.patientGroup = new THREE.Group();
        
        // === 创建身体 ===
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.42, 1.1, 32);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: 0x2563eb,
            roughness: 0.6,
            metalness: 0.1
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.4;
        body.castShadow = true;
        body.receiveShadow = true;
        this.patientGroup.add(body);
        
        // === 创建头部 ===
        const headGeo = new THREE.SphereGeometry(0.45, 32, 32);
        const headMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd5b8,
            roughness: 0.7,
            metalness: 0.05
        });
        this.head = new THREE.Mesh(headGeo, headMat);
        this.head.position.y = 1.4;
        this.head.castShadow = true;
        this.head.receiveShadow = true;
        this.patientGroup.add(this.head);
        
        // === 创建头发 ===
        const hairGeo = new THREE.SphereGeometry(0.47, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
        const hairMat = new THREE.MeshStandardMaterial({ 
            color: 0x3d2914,
            roughness: 0.7,
            metalness: 0.1
        });
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.y = 1.4;
        hair.position.z = 0.02;
        hair.castShadow = true;
        this.patientGroup.add(hair);
        
        // === 创建面部特征 ===
        this.createFace();
        
        // === 创建手臂 ===
        const armGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.85, 16);
        const skinMat = new THREE.MeshStandardMaterial({ 
            color: 0xffd5b8,
            roughness: 0.7
        });
        
        // 左臂
        this.leftArm = new THREE.Mesh(armGeo, skinMat);
        this.leftArm.position.set(-0.45, 1.0, 0);
        this.leftArm.rotation.z = Math.PI / 8;
        this.leftArm.castShadow = true;
        this.leftArm.receiveShadow = true;
        this.patientGroup.add(this.leftArm);
        
        // 右手臂
        this.rightArm = new THREE.Mesh(armGeo, skinMat);
        this.rightArm.position.set(0.45, 1.0, 0);
        this.rightArm.rotation.z = -Math.PI / 8;
        this.rightArm.castShadow = true;
        this.rightArm.receiveShadow = true;
        this.patientGroup.add(this.rightArm);
        
        // === 创建手部 ===
        this.createHands();
        
        // === 创建腿部 ===
        const legGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.9, 16);
        const pantsMat = new THREE.MeshStandardMaterial({ 
            color: 0x1e293b,
            roughness: 0.6
        });
        
        // 左腿
        this.leftLeg = new THREE.Mesh(legGeo, pantsMat);
        this.leftLeg.position.set(-0.15, -0.15, 0);
        this.leftLeg.castShadow = true;
        this.leftLeg.receiveShadow = true;
        this.patientGroup.add(this.leftLeg);
        
        // 右腿
        this.rightLeg = new THREE.Mesh(legGeo, pantsMat);
        this.rightLeg.position.set(0.15, -0.15, 0);
        this.rightLeg.castShadow = true;
        this.rightLeg.receiveShadow = true;
        this.patientGroup.add(this.rightLeg);
        
        // === 创建鞋子 ===
        this.createShoes();
        
        // === 创建耳机 ===
        this.createHeadphones();
        
        // === 创建声波效果 ===
        this.createSoundWaves();
        
        this.scene.add(this.patientGroup);
    }
    
    createFace() {
        // === 创建眼睛 ===
        const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        
        // 左眼
        const leftEye = new THREE.Mesh(eyeGeo, whiteMat);
        leftEye.position.set(-0.18, 1.5, 0.4);
        leftEye.castShadow = true;
        this.head.add(leftEye);
        
        const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), pupilMat);
        leftPupil.position.set(-0.18, 1.5, 0.42);
        this.head.add(leftPupil);
        
        // 右眼
        const rightEye = new THREE.Mesh(eyeGeo, whiteMat);
        rightEye.position.set(0.18, 1.5, 0.4);
        rightEye.castShadow = true;
        this.head.add(rightEye);
        
        const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), pupilMat);
        rightPupil.position.set(0.18, 1.5, 0.42);
        this.head.add(rightPupil);
        
        // === 创建眉毛 ===
        const browGeo = new THREE.BoxGeometry(0.18, 0.02, 0.02);
        const browMat = new THREE.MeshStandardMaterial({ color: 0x3d2914 });
        
        const leftBrow = new THREE.Mesh(browGeo, browMat);
        leftBrow.position.set(-0.18, 1.62, 0.38);
        leftBrow.rotation.z = -0.1;
        this.head.add(leftBrow);
        
        const rightBrow = new THREE.Mesh(browGeo, browMat);
        rightBrow.position.set(0.18, 1.62, 0.38);
        rightBrow.rotation.z = 0.1;
        this.head.add(rightBrow);
        
        // === 创建鼻子 ===
        const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
        const noseMat = new THREE.MeshStandardMaterial({ color: 0xffcba4 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.set(0, 1.4, 0.42);
        nose.castShadow = true;
        this.head.add(nose);
        
        // === 创建嘴巴 ===
        const mouthGeo = new THREE.BoxGeometry(0.18, 0.03, 0.08);
        const mouthMat = new THREE.MeshStandardMaterial({ color: 0xb45309 });
        const mouth = new THREE.Mesh(mouthGeo, mouthMat);
        mouth.position.set(0, 1.32, 0.4);
        mouth.rotation.x = -0.1;
        this.head.add(mouth);
        
        // === 创建耳朵 ===
        const earGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const earMat = new THREE.MeshStandardMaterial({ color: 0xffd5b8 });
        
        const leftEar = new THREE.Mesh(earGeo, earMat);
        leftEar.position.set(-0.46, 1.35, 0);
        leftEar.scale.set(0.8, 1, 0.5);
        this.head.add(leftEar);
        
        const rightEar = new THREE.Mesh(earGeo, earMat);
        rightEar.position.set(0.46, 1.35, 0);
        rightEar.scale.set(0.8, 1, 0.5);
        this.head.add(rightEar);
    }
    
    createHands() {
        const handGeo = new THREE.SphereGeometry(0.09, 16, 16);
        const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd5b8 });
        
        // 左手
        const leftHand = new THREE.Mesh(handGeo, skinMat);
        leftHand.position.set(-0.7, 0.55, 0);
        leftHand.castShadow = true;
        this.patientGroup.add(leftHand);
        
        // 右手
        const rightHand = new THREE.Mesh(handGeo, skinMat);
        rightHand.position.set(0.7, 0.55, 0);
        rightHand.castShadow = true;
        this.patientGroup.add(rightHand);
    }
    
    createShoes() {
        const shoeGeo = new THREE.BoxGeometry(0.2, 0.08, 0.12);
        const shoeMat = new THREE.MeshStandardMaterial({ 
            color: 0x1f2937,
            metalness: 0.3
        });
        
        // 左鞋
        const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
        leftShoe.position.set(-0.15, -0.68, 0);
        leftShoe.castShadow = true;
        this.patientGroup.add(leftShoe);
        
        // 右鞋
        const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
        rightShoe.position.set(0.15, -0.68, 0);
        rightShoe.castShadow = true;
        this.patientGroup.add(rightShoe);
    }
    
    createHeadphones() {
        // 耳机头带
        const bandGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 24);
        const bandMat = new THREE.MeshStandardMaterial({ 
            color: 0x1f2937,
            metalness: 0.7,
            roughness: 0.3
        });
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.rotation.x = Math.PI / 2;
        band.position.y = 1.4;
        band.castShadow = true;
        this.patientGroup.add(band);
        
        // 耳罩支架
        const armGeo = new THREE.BoxGeometry(0.03, 0.15, 0.03);
        const armMat = new THREE.MeshStandardMaterial({ 
            color: 0x374151,
            metalness: 0.6
        });
        
        const leftArm = new THREE.Mesh(armGeo, armMat);
        leftArm.position.set(-0.42, 1.25, 0.15);
        leftArm.rotation.z = Math.PI / 6;
        this.patientGroup.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeo, armMat);
        rightArm.position.set(0.42, 1.25, 0.15);
        rightArm.rotation.z = -Math.PI / 6;
        this.patientGroup.add(rightArm);
        
        // 耳罩
        const earcupGeo = new THREE.SphereGeometry(0.18, 16, 16);
        const earcupMat = new THREE.MeshStandardMaterial({ 
            color: 0x4b5563,
            metalness: 0.6,
            roughness: 0.3
        });
        
        this.leftEarcup = new THREE.Mesh(earcupGeo, earcupMat);
        this.leftEarcup.position.set(-0.48, 1.38, 0.38);
        this.leftEarcup.castShadow = true;
        this.patientGroup.add(this.leftEarcup);
        
        this.rightEarcup = new THREE.Mesh(earcupGeo, earcupMat);
        this.rightEarcup.position.set(0.48, 1.38, 0.38);
        this.rightEarcup.castShadow = true;
        this.patientGroup.add(this.rightEarcup);
        
        // 耳罩网面
        const grillGeo = new THREE.CircleGeometry(0.12, 16);
        const grillMat = new THREE.MeshStandardMaterial({ 
            color: 0x6b7280,
            metalness: 0.8,
            roughness: 0.2,
            side: THREE.DoubleSide
        });
        
        const leftGrill = new THREE.Mesh(grillGeo, grillMat);
        leftGrill.position.set(-0.59, 1.38, 0.45);
        leftGrill.rotation.y = Math.PI;
        this.patientGroup.add(leftGrill);
        
        const rightGrill = new THREE.Mesh(grillGeo, grillMat);
        rightGrill.position.set(0.59, 1.38, 0.45);
        this.patientGroup.add(rightGrill);
    }
    
    createSoundWaves() {
        const waveGeo = new THREE.RingGeometry(0.2, 0.3, 32);
        const waveMat = new THREE.MeshBasicMaterial({
            color: 0x667eea,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide
        });
        
        this.soundWaveLeft = new THREE.Mesh(waveGeo, waveMat.clone());
        this.soundWaveLeft.position.set(-0.55, 1.38, 0.65);
        this.soundWaveLeft.rotation.x = -Math.PI / 2;
        this.soundWaveLeft.visible = false;
        this.patientGroup.add(this.soundWaveLeft);
        
        this.soundWaveRight = new THREE.Mesh(waveGeo, waveMat.clone());
        this.soundWaveRight.position.set(0.55, 1.38, 0.65);
        this.soundWaveRight.rotation.x = -Math.PI / 2;
        this.soundWaveRight.visible = false;
        this.patientGroup.add(this.soundWaveRight);
    }
    
    playSound(side) {
        const wave = side === 'left' ? this.soundWaveLeft : this.soundWaveRight;
        const earcup = side === 'left' ? this.leftEarcup : this.rightEarcup;
        
        if (!wave || !earcup) return;
        
        // 播放声波动画
        wave.visible = true;
        wave.scale.set(1, 1, 1);
        wave.material.opacity = 0.7;
        
        const animateWave = () => {
            wave.scale.multiplyScalar(1.08);
            wave.material.opacity -= 0.03;
            
            if (wave.material.opacity > 0) {
                requestAnimationFrame(animateWave);
            } else {
                wave.visible = false;
                wave.material.opacity = 0;
            }
        };
        animateWave();
        
        // 耳罩发光效果
        earcup.material.emissive = new THREE.Color(0x667eea);
        earcup.material.emissiveIntensity = 0.6;
        setTimeout(() => {
            earcup.material.emissiveIntensity = 0;
        }, 600);
    }
    
    raiseHand(side) {
        let arm = side === 'left' ? this.leftArm : this.rightArm;
        
        console.log(`=== 举手动画 ===`);
        console.log(`手臂: ${side}, 对象类型:`, arm?.type);
        console.log(`手臂旋转初始值:`, arm?.rotation);
        
        if (!arm) {
            console.warn('未找到手臂部件');
            return;
        }
        
        // 尝试多种旋转方式
        const startRotation = arm.rotation.clone();
        
        // 根据模型类型选择合适的旋转轴（GLB模型常用Z轴）
        let targetRotation = { ...startRotation };
        
        // 尝试Z轴旋转
        if (side === 'left') {
            targetRotation.z = -Math.PI / 2; // 左臂向上举
        } else {
            targetRotation.z = Math.PI / 2; // 右臂向上举
        }
        
        console.log(`目标旋转:`, targetRotation);
        
        const duration = 400;
        const startTime = Date.now();
        
        const animateHand = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            // 插值旋转所有轴
            arm.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
            arm.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
            arm.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animateHand);
            } else {
                // 保持举手状态1秒后放下
                setTimeout(() => {
                    const returnStartTime = Date.now();
                    const returnAnimate = () => {
                        const returnElapsed = Date.now() - returnStartTime;
                        const returnProgress = Math.min(returnElapsed / duration, 1);
                        const returnEase = 1 - Math.pow(1 - returnProgress, 3);
                        
                        arm.rotation.x = targetRotation.x + (startRotation.x - targetRotation.x) * returnEase;
                        arm.rotation.y = targetRotation.y + (startRotation.y - targetRotation.y) * returnEase;
                        arm.rotation.z = targetRotation.z + (startRotation.z - targetRotation.z) * returnEase;
                        
                        if (returnProgress < 1) {
                            requestAnimationFrame(returnAnimate);
                        }
                    };
                    returnAnimate();
                }, 1000);
            }
        };
        
        animateHand();
        console.log(`✓ ${side}手举手动画开始`);
    }
    
    // 检查患者是否能听到声音并响应
    checkHearing(ear, frequency, level, testType = 'air') {
        console.log(`=== 检查听力 ===`);
        console.log(`耳别: ${ear}, 频率: ${frequency}Hz, 声强: ${level}dB, 测试类型: ${testType}`);
        
        // 获取该患者的阈值
        const threshold = this.hearingThresholds[ear]?.[testType]?.[frequency];
        
        console.log(`阈值数据:`, this.hearingThresholds[ear]?.[testType]);
        console.log(`当前频率阈值: ${threshold}dB`);
        
        if (threshold === undefined) {
            console.log(`⚠️ 未找到 ${frequency}Hz 的阈值数据`);
            return false;
        }
        
        console.log(`比较结果: 声强(${level}dB) ${level >= threshold ? '≥' : '<'} 阈值(${threshold}dB)`);
        
        // 如果声强大于等于阈值，患者能听到
        if (level >= threshold) {
            console.log(`✓ 患者能听到！开始左右移动`);
            
            this.playSound(ear);
            this.reactToSound(ear); // 调用左右移动响应
            return true;
        } else {
            console.log(`✗ 患者听不到`);
            this.playSound(ear); // 仍然播放声波效果，但不举手
            return false;
        }
    }
    
    nodHead() {
        console.log(`=== 点头动画 ===`);
        console.log(`head对象:`, this.head);
        
        // 如果没有找到头部，尝试更宽松的查找
        if (!this.head && this.patientGroup) {
            console.log('未找到头部，尝试查找...');
            
            let meshCount = 0;
            this.patientGroup.traverse((child) => {
                if (child.isMesh || child.isGroup) {
                    meshCount++;
                    const name = child.name.toLowerCase();
                    console.log(`发现部件: ${child.name}`);
                    
                    // 更宽松的头部匹配
                    if (!this.head && (name.includes('head') || name.includes('face') || name.includes('head_') || name.includes('_head') || meshCount === 1)) {
                        this.head = child;
                        console.log(`找到头部: ${child.name}`);
                    }
                }
            });
            
            console.log(`总部件数: ${meshCount}`);
        }
        
        if (!this.head) {
            console.warn('未找到头部部件，使用整个患者模型作为头部');
            // 使用整个患者模型作为头部
            this.head = this.patientGroup;
        }
        
        console.log(`开始点头，头部旋转初始值:`, this.head.rotation);
        
        const startRotation = this.head.rotation.x;
        const duration = 220;
        
        const animateNod = (direction) => {
            const startTime = Date.now();
            const targetRotation = direction === 'down' ? -0.3 : 0;
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                this.head.rotation.x = startRotation + (targetRotation - startRotation) * progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else if (direction === 'down') {
                    setTimeout(() => animateNod('up'), 250);
                }
            };
            animate();
        };
        
        animateNod('down');
        console.log('✓ 点头动画开始');
    }
    
    // 整体身体响应（当患者听到声音时，做一个明显的左右移动）
    reactToSound(ear) {
        console.log(`=== 身体响应 ===`);
        
        if (!this.patientGroup) {
            console.warn('未找到患者模型');
            return;
        }
        
        // 保存原始位置
        const startX = this.patientGroup.position.x;
        
        // 根据耳朵决定移动方向
        const targetX = ear === 'left' ? startX - 0.2 : startX + 0.2; // 左耳听到向左移，右耳听到向右移
        
        const duration = 200;
        const startTime = Date.now();
        
        // 向目标方向移动
        const animateMove = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            this.patientGroup.position.x = startX + (targetX - startX) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animateMove);
            } else {
                // 保持一下然后返回
                setTimeout(() => {
                    const returnStartTime = Date.now();
                    const animateReturn = () => {
                        const returnElapsed = Date.now() - returnStartTime;
                        const returnProgress = Math.min(returnElapsed / duration, 1);
                        const returnEase = 1 - Math.pow(1 - returnProgress, 3);
                        
                        this.patientGroup.position.x = targetX + (startX - targetX) * returnEase;
                        
                        if (returnProgress < 1) {
                            requestAnimationFrame(animateReturn);
                        }
                    };
                    animateReturn();
                }, 300);
            }
        };
        
        animateMove();
        console.log(`✓ 患者响应动画开始 (${ear}耳)`);
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
        window.removeEventListener('resize', this.onWindowResize);
    }
}